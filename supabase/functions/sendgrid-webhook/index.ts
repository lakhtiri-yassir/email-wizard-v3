/**
 * ============================================================================
 * Edge Function: SendGrid Webhook Handler (FIXED VERSION)
 * ============================================================================
 * 
 * Purpose: Process SendGrid event webhooks with ECDSA P-256 signature verification
 * 
 * CRITICAL FIX:
 * - Converts DER-encoded signatures (70-73 bytes) to raw format (64 bytes)
 * - SendGrid sends signatures in DER/ASN.1 format
 * - Web Crypto API requires raw format for verification
 * - The payload MUST be used EXACTLY as received (raw bytes)
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
 * DER SIGNATURE CONVERSION
 * ============================================================================
 */

/**
 * Convert DER-encoded ECDSA signature to raw format (R||S)
 * 
 * DER format (variable length 70-73 bytes for P-256):
 *   0x30 [total-length] 0x02 [r-length] [r-bytes] 0x02 [s-length] [s-bytes]
 * 
 * Raw format (fixed 64 bytes for P-256):
 *   [32-byte-r][32-byte-s]
 * 
 * Why this is needed:
 * - SendGrid sends signatures in DER/ASN.1 format (industry standard)
 * - Web Crypto API expects raw concatenated R||S format
 * - Without conversion, signature verification will always fail
 * 
 * @param derSignature - DER-encoded signature bytes
 * @returns Raw format signature (64 bytes for P-256)
 */
function derToRawSignature(derSignature: Uint8Array): Uint8Array {
  // P-256 uses 32-byte integers for R and S
  const coordinateLength = 32;
  const rawSignatureLength = coordinateLength * 2; // 64 bytes total

  // Parse DER structure
  let offset = 0;

  // Check DER SEQUENCE tag (0x30)
  if (derSignature[offset++] !== 0x30) {
    throw new Error('Invalid DER signature: missing SEQUENCE tag');
  }

  // Skip total length byte
  offset++;

  // Parse R value
  if (derSignature[offset++] !== 0x02) {
    throw new Error('Invalid DER signature: missing INTEGER tag for R');
  }

  const rLength = derSignature[offset++];
  let rBytes = derSignature.slice(offset, offset + rLength);
  offset += rLength;

  // Parse S value  
  if (derSignature[offset++] !== 0x02) {
    throw new Error('Invalid DER signature: missing INTEGER tag for S');
  }

  const sLength = derSignature[offset++];
  let sBytes = derSignature.slice(offset, offset + sLength);

  // Remove leading zero bytes (DER padding for positive integers)
  // DER adds 0x00 prefix if the high bit is set (to indicate positive number)
  while (rBytes.length > coordinateLength && rBytes[0] === 0x00) {
    rBytes = rBytes.slice(1);
  }
  while (sBytes.length > coordinateLength && sBytes[0] === 0x00) {
    sBytes = sBytes.slice(1);
  }

  // Pad to coordinate length if needed (left-pad with zeros)
  const paddedR = new Uint8Array(coordinateLength);
  const paddedS = new Uint8Array(coordinateLength);

  paddedR.set(rBytes, coordinateLength - rBytes.length);
  paddedS.set(sBytes, coordinateLength - sBytes.length);

  // Concatenate R and S into raw format
  const rawSignature = new Uint8Array(rawSignatureLength);
  rawSignature.set(paddedR, 0);
  rawSignature.set(paddedS, coordinateLength);

  return rawSignature;
}

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
 * CRITICAL FIXES:
 * 1. Converts DER-encoded signature to raw format before verification
 * 2. Uses raw payload string exactly as received from SendGrid
 * 
 * SendGrid signs: timestamp + raw_payload_string (including any trailing \n or \r\n)
 * 
 * @param signature - Base64-encoded DER signature from X-Twilio-Email-Event-Webhook-Signature header
 * @param timestamp - Timestamp from X-Twilio-Email-Event-Webhook-Timestamp header
 * @param rawPayload - Raw payload string exactly as received (DO NOT parse/re-stringify)
 * @returns true if signature is valid, false otherwise
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
    
    // Decode the DER signature from base64
    const derSignatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    console.log(`- DER signature length: ${derSignatureBytes.length} bytes`);
    
    // ✅ CRITICAL FIX: Convert DER to raw format (64 bytes for P-256)
    const rawSignatureBytes = derToRawSignature(derSignatureBytes);
    console.log(`- Raw signature length: ${rawSignatureBytes.length} bytes`);
    
    // Verify the signature using ECDSA with SHA-256
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }  // SendGrid uses SHA-256 hash
      },
      publicKey,
      rawSignatureBytes,  // ✅ Now using raw format instead of DER!
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
    // Note: Storing full event payload in metadata JSON column
    const { error: insertError } = await supabase
      .from('email_events')
      .insert({
        campaign_id: campaign_id || null,
        contact_id: contact_id || null,
        email: email,
        event_type: eventType,
        timestamp: new Date(timestamp * 1000).toISOString(),
        metadata: {
          ...event,
          // Add additional tracking fields for easier querying
          url: url || null,
          sendgrid_event_id: sg_message_id || null
        }
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

    console.log(`✅ Processed ${eventType} event for ${email}`);
  } catch (error: any) {
    console.error(`❌ Error processing ${eventType} event:`, error.message);
    throw error;
  }
}

/**
 * Update campaign analytics based on event type
 */
async function updateCampaignAnalytics(
  campaignId: string,
  contactId: string,
  eventType: string,
  supabase: any
) {
  // Map event types to campaign_recipients status
  const statusMap: { [key: string]: string } = {
    'delivered': 'delivered',
    'open': 'opened',
    'click': 'clicked',
    'bounce': 'bounced',
    'dropped': 'failed',
    'spam_report': 'spam',
    'unsubscribe': 'unsubscribed'
  };

  const status = statusMap[eventType];
  if (!status) return;

  // Update campaign_recipients
  const { error } = await supabase
    .from('campaign_recipients')
    .update({ status })
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId);

  if (error) {
    console.error('❌ Error updating campaign_recipients:', error);
  }

  // Update campaign statistics
  const statField = `${eventType}_count`;
  const { error: statsError } = await supabase.rpc('increment_campaign_stat', {
    p_campaign_id: campaignId,
    p_stat_field: statField
  });

  if (statsError) {
    console.error('❌ Error updating campaign stats:', statsError);
  }
}

/**
 * Handle bounce events - mark contact as bounced
 */
async function handleBounce(contactId: string, reason: string, supabase: any) {
  if (!contactId) return;

  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'bounced',
      bounce_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Error marking contact as bounced:', error);
  }
}

/**
 * Handle spam report events - mark contact as spam
 */
async function handleSpamReport(contactId: string, supabase: any) {
  if (!contactId) return;

  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'spam_complaint',
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Error marking contact as spam:', error);
  }
}

/**
 * Handle unsubscribe events - mark contact as unsubscribed
 */
async function handleUnsubscribe(contactId: string, email: string, supabase: any) {
  if (!contactId) return;

  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'unsubscribed',
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Error marking contact as unsubscribed:', error);
  }
}

/**
 * Handle click events - track link clicks
 */
async function handleClick(
  campaignId: string,
  contactId: string,
  url: string,
  supabase: any
) {
  if (!campaignId || !contactId || !url) return;

  // Track individual link clicks for analytics
  const { error } = await supabase
    .from('link_clicks')
    .insert({
      campaign_id: campaignId,
      contact_id: contactId,
      url: url,
      clicked_at: new Date().toISOString()
    });

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    console.error('❌ Error tracking link click:', error);
  }
}

/**
 * ============================================================================
 * MAIN HANDLER
 * ============================================================================
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    );
  }

  try {
    console.log('='.repeat(80));
    console.log('📨 SENDGRID WEBHOOK RECEIVED');
    console.log('='.repeat(80));

    // Get signature headers
    const signature = req.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp');

    // ✅ CRITICAL: Get raw body as string BEFORE any parsing
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