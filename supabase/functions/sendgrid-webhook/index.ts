/**
 * ============================================================================
 * Edge Function: SendGrid Webhook Handler (FINAL FIX)
 * ============================================================================
 * 
 * Purpose: Process SendGrid event webhooks with ECDSA P-256 signature verification
 * 
 * CRITICAL FIX:
 * - The payload MUST be used EXACTLY as received (raw bytes)
 * - SendGrid includes trailing newlines in the signed payload
 * - DO NOT parse and re-stringify JSON before verification
 * - Verify FIRST with raw body, THEN parse JSON
 * 
 * Security:
 * - Uses Elliptic Curve Digital Signature Algorithm (ECDSA) with P-256 curve
 * - Verifies webhook authenticity using SendGrid's public key
 * - No Authorization header required (webhooks use signature instead)
 * - Returns 401 for invalid signatures
 * 
 * Events Processed:
 * - delivered, open, click, bounce, dropped, spam_report, unsubscribe
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const SENDGRID_WEBHOOK_PUBLIC_KEY = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Twilio-Email-Event-Webhook-Signature, X-Twilio-Email-Event-Webhook-Timestamp'
};

/**
 * ============================================================================
 * ECDSA SIGNATURE VERIFICATION
 * ============================================================================
 */

/**
 * Convert base64 public key to CryptoKey for ECDSA verification
 * SendGrid uses P-256 curve (also known as prime256v1 or secp256r1)
 */
async function importPublicKey(base64PublicKey: string): Promise<CryptoKey> {
  try {
    // Decode base64 to raw bytes
    const binaryDer = Uint8Array.from(atob(base64PublicKey), c => c.charCodeAt(0));
    
    // Import as ECDSA public key with P-256 curve
    const publicKey = await crypto.subtle.importKey(
      'spki',  // SubjectPublicKeyInfo format
      binaryDer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'  // SendGrid uses P-256 curve
      },
      true,
      ['verify']
    );
    
    return publicKey;
  } catch (error) {
    console.error('❌ Error importing public key:', error);
    throw new Error('Failed to import SendGrid public key');
  }
}

/**
 * Verify SendGrid webhook signature using ECDSA
 * 
 * CRITICAL: The payload MUST be the raw string exactly as received from SendGrid
 * Do NOT parse and re-stringify JSON - this changes the bytes and breaks verification
 * 
 * SendGrid signs: timestamp + raw_payload_string (including any trailing \n or \r\n)
 */
async function verifySendGridSignature(
  signature: string,
  timestamp: string,
  rawPayload: string
): Promise<boolean> {
  if (!SENDGRID_WEBHOOK_PUBLIC_KEY) {
    console.warn('⚠️  SENDGRID_WEBHOOK_VERIFICATION_KEY not set - skipping signature verification');
    return true; // Allow in development, but warn
  }

  try {
    // Import the public key
    const publicKey = await importPublicKey(SENDGRID_WEBHOOK_PUBLIC_KEY);
    
    // Create the data that was signed: timestamp + raw_payload
    // IMPORTANT: Use the raw payload string exactly as received
    const encoder = new TextEncoder();
    const data = encoder.encode(timestamp + rawPayload);
    
    console.log('🔍 Verification details:');
    console.log(`- Timestamp: "${timestamp}"`);
    console.log(`- Payload length: ${rawPayload.length}`);
    console.log(`- Payload first 100 chars: ${rawPayload.substring(0, 100)}`);
    console.log(`- Payload last 20 chars (hex): ${Array.from(rawPayload.slice(-20)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`- Combined data length: ${data.length}`);
    
    // Decode the signature from base64
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    console.log(`- Signature length: ${signatureBytes.length} bytes`);
    
    // Verify the signature using ECDSA with SHA-256
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }  // SendGrid uses SHA-256 hash
      },
      publicKey,
      signatureBytes,
      data
    );
    
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      console.error('Expected signature components:');
      console.error(`  - timestamp: "${timestamp}"`);
      console.error(`  - payload length: ${rawPayload.length}`);
    } else {
      console.log('✅ Webhook signature verified successfully');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * ============================================================================
 * EVENT PROCESSING
 * ============================================================================
 */

/**
 * Process a single SendGrid event
 */
async function processSendGridEvent(event: any, supabase: any) {
  const {
    event: eventType,
    email,
    timestamp,
    campaign_id,
    contact_id,
    url,
    reason,
    sg_message_id
  } = event;

  console.log(`📧 Processing ${eventType} event for ${email}`);

  try {
    // Insert into email_events table
    const { error: insertError } = await supabase
      .from('email_events')
      .insert({
        campaign_id: campaign_id || null,
        contact_id: contact_id || null,
        email: email,
        event_type: eventType,
        event_data: event,
        url: url || null,
        sendgrid_event_id: sg_message_id || null,
        occurred_at: new Date(timestamp * 1000).toISOString()
      });

    if (insertError) {
      console.error('❌ Error inserting event:', insertError);
      throw insertError;
    }

    // Update campaign analytics if campaign_id exists
    if (campaign_id && contact_id) {
      await updateCampaignAnalytics(campaign_id, contact_id, eventType, supabase);
    }

    // Handle specific event types
    switch (eventType) {
      case 'bounce':
      case 'dropped':
        await handleBounce(contact_id, reason, supabase);
        break;
      
      case 'spam_report':
        await handleSpamReport(contact_id, supabase);
        break;
      
      case 'unsubscribe':
        await handleUnsubscribe(contact_id, email, supabase);
        break;
      
      case 'click':
        await handleClick(campaign_id, contact_id, url, supabase);
        break;
    }

    console.log(`✅ Event processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing event:`, error);
    throw error;
  }
}

/**
 * Update campaign analytics for an event
 */
async function updateCampaignAnalytics(
  campaignId: string,
  contactId: string,
  eventType: string,
  supabase: any
) {
  try {
    // Insert or update campaign_analytics
    const { error } = await supabase
      .from('campaign_analytics')
      .insert({
        campaign_id: campaignId,
        contact_id: contactId,
        event_type: eventType,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('⚠️  Analytics update warning:', error.message);
    }

    // Update campaign statistics
    const columnMap: Record<string, string> = {
      'delivered': 'delivered_count',
      'open': 'opened_count',
      'click': 'clicked_count',
      'bounce': 'bounced_count',
      'spam_report': 'spam_count',
      'unsubscribe': 'unsubscribed_count'
    };

    const column = columnMap[eventType];
    if (column) {
      await supabase.rpc('increment_campaign_stat', {
        p_campaign_id: campaignId,
        p_column: column
      });
    }
  } catch (error) {
    console.warn('⚠️  Analytics error (non-fatal):', error);
  }
}

/**
 * Handle bounce/dropped events
 */
async function handleBounce(contactId: string | null, reason: string, supabase: any) {
  if (!contactId) return;

  try {
    await supabase
      .from('contacts')
      .update({
        status: 'bounced',
        bounce_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);
    
    console.log(`📍 Contact ${contactId} marked as bounced`);
  } catch (error) {
    console.error('❌ Error updating contact bounce status:', error);
  }
}

/**
 * Handle spam report events
 */
async function handleSpamReport(contactId: string | null, supabase: any) {
  if (!contactId) return;

  try {
    await supabase
      .from('contacts')
      .update({
        status: 'complained',
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);
    
    console.log(`⚠️  Contact ${contactId} marked as complained`);
  } catch (error) {
    console.error('❌ Error updating contact spam status:', error);
  }
}

/**
 * Handle unsubscribe events
 */
async function handleUnsubscribe(contactId: string | null, email: string, supabase: any) {
  try {
    if (contactId) {
      await supabase
        .from('contacts')
        .update({
          status: 'unsubscribed',
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);
    } else {
      // If no contact_id, try to find by email
      await supabase
        .from('contacts')
        .update({
          status: 'unsubscribed',
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
    }
    
    console.log(`🚫 Contact unsubscribed: ${email}`);
  } catch (error) {
    console.error('❌ Error updating contact unsubscribe status:', error);
  }
}

/**
 * Handle click events
 */
async function handleClick(
  campaignId: string | null,
  contactId: string | null,
  url: string,
  supabase: any
) {
  if (!campaignId || !url) return;

  try {
    // Log the click
    await supabase
      .from('link_clicks')
      .insert({
        campaign_id: campaignId,
        contact_id: contactId,
        url: url,
        clicked_at: new Date().toISOString()
      });
    
    console.log(`🔗 Click tracked for URL: ${url}`);
  } catch (error) {
    console.warn('⚠️  Click tracking error (non-fatal):', error);
  }
}

/**
 * ============================================================================
 * MAIN WEBHOOK HANDLER
 * ============================================================================
 */

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n' + '='.repeat(80));
    console.log('📨 SENDGRID WEBHOOK RECEIVED');
    console.log('='.repeat(80));

    // Get SendGrid signature headers
    const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
    const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');
    
    // ✅ CRITICAL FIX: Get raw body as string - DO NOT parse JSON yet!
    // SendGrid signs the exact bytes including any trailing newlines
    const rawBody = await req.text();
    
    console.log('📋 Request details:');
    console.log(`- Signature present: ${!!signature}`);
    console.log(`- Timestamp: ${timestamp}`);
    console.log(`- Payload size: ${rawBody.length} bytes`);
    console.log(`- Payload ends with: ${JSON.stringify(rawBody.slice(-5))}`);
    
    // Verify ECDSA signature if headers are present
    if (signature && timestamp) {
      // ✅ Pass the RAW body string, not parsed JSON!
      const isValid = await verifySendGridSignature(signature, timestamp, rawBody);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature - rejecting request');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        );
      }
    } else {
      console.warn('⚠️  No signature headers found');
      if (SENDGRID_WEBHOOK_PUBLIC_KEY) {
        // In production with key set, require signature
        console.error('❌ Signature verification enabled but headers missing');
        return new Response(
          JSON.stringify({ error: 'Missing signature headers' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        );
      }
      console.warn('⚠️  Proceeding without verification (not recommended for production)');
    }

    // ✅ NOW parse JSON AFTER signature verification passed
    const events = JSON.parse(rawBody);
    console.log(`📊 Received ${events.length} event(s)`);

    // Create Supabase client (using service role key - no user auth needed for webhooks)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Process each event
    const results = await Promise.allSettled(
      events.map((event: any) => processSendGridEvent(event, supabase))
    );

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Successfully processed: ${successful}`);
    if (failed > 0) {
      console.error(`❌ Failed to process: ${failed}`);
    }

    console.log('='.repeat(80) + '\n');

    // Always return 200 to SendGrid (even if some events failed)
    // This prevents SendGrid from retrying and creating duplicates
    return new Response(
      JSON.stringify({
        success: true,
        processed: successful,
        failed: failed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error.message);
    console.error('Stack:', error.stack);
    
    // Still return 200 to prevent SendGrid retries
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});