/**
 * ============================================================================
 * SENDGRID WEBHOOK HANDLER - FINAL CORRECTED VERSION
 * ============================================================================
 * 
 * CRITICAL FIXES IMPLEMENTED:
 * 1. ✅ ECDSA P-256 signature verification (correct encryption from working code)
 * 2. ✅ Separated recipients_count from delivered_count
 * 3. ✅ Filter proxy-generated opens using 1-second delay after delivery
 * 4. ✅ Store delivery timestamps for time-based filtering
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SENDGRID_WEBHOOK_VERIFICATION_KEY = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY') || '';

/**
 * ============================================================================
 * DER SIGNATURE CONVERSION FUNCTIONS
 * ============================================================================
 */

/**
 * Convert DER-encoded ECDSA signature to raw format (R||S)
 * 
 * DER format: 0x30 [length] 0x02 [r-length] [r-bytes] 0x02 [s-length] [s-bytes]
 * Raw format: [32-byte R][32-byte S] = 64 bytes for P-256
 * 
 * SendGrid sends DER format, Web Crypto API needs raw format
 */
function derToRawSignature(derSignature: Uint8Array): Uint8Array {
  const coordinateLength = 32; // P-256 uses 32-byte coordinates
  const rawSignatureLength = 64; // 32 bytes R + 32 bytes S

  let offset = 0;

  // Check SEQUENCE tag (0x30)
  if (derSignature[offset++] !== 0x30) {
    throw new Error('Invalid DER signature: missing SEQUENCE tag');
  }

  // Skip total length
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

  // Remove leading zero bytes (DER padding)
  while (rBytes.length > coordinateLength && rBytes[0] === 0x00) {
    rBytes = rBytes.slice(1);
  }
  while (sBytes.length > coordinateLength && sBytes[0] === 0x00) {
    sBytes = sBytes.slice(1);
  }

  // Pad to 32 bytes if needed
  const paddedR = new Uint8Array(coordinateLength);
  const paddedS = new Uint8Array(coordinateLength);
  paddedR.set(rBytes, coordinateLength - rBytes.length);
  paddedS.set(sBytes, coordinateLength - sBytes.length);

  // Concatenate R and S
  const rawSignature = new Uint8Array(rawSignatureLength);
  rawSignature.set(paddedR, 0);
  rawSignature.set(paddedS, coordinateLength);

  return rawSignature;
}

/**
 * ============================================================================
 * ECDSA SIGNATURE VERIFICATION (FROM WORKING CODE)
 * ============================================================================
 */

/**
 * Import SendGrid's ECDSA P-256 public key
 */
async function importPublicKey(base64PublicKey: string): Promise<CryptoKey> {
  try {
    const binaryDer = Uint8Array.from(atob(base64PublicKey), c => c.charCodeAt(0));
    
    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
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
 * Verify webhook signature using ECDSA P-256
 */
async function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  rawPayload: string
): Promise<boolean> {
  if (!SENDGRID_WEBHOOK_VERIFICATION_KEY) {
    console.warn('⚠️  No verification key set - skipping signature verification');
    return true;
  }

  try {
    console.log('🔐 Starting signature verification...');
    
    // Import public key
    const publicKey = await importPublicKey(SENDGRID_WEBHOOK_VERIFICATION_KEY);
    console.log('✅ Public key imported successfully');
    
    // Create signed data (timestamp + payload)
    const encoder = new TextEncoder();
    const data = encoder.encode(timestamp + rawPayload);
    
    console.log('🔍 Verification details:');
    console.log(`   Timestamp: "${timestamp}"`);
    console.log(`   Payload length: ${rawPayload.length} bytes`);
    console.log(`   Combined data length: ${data.length} bytes`);
    
    // Decode DER signature
    const derSignatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    console.log(`   DER signature length: ${derSignatureBytes.length} bytes`);
    
    // Convert DER to raw format
    const rawSignatureBytes = derToRawSignature(derSignatureBytes);
    console.log(`   Raw signature length: ${rawSignatureBytes.length} bytes`);
    
    // Verify signature
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      publicKey,
      rawSignatureBytes,
      data
    );
    
    if (isValid) {
      console.log('✅ Webhook signature verified successfully');
    } else {
      console.error('❌ Invalid webhook signature');
      console.error('   Signature verification failed - possible causes:');
      console.error('   1. Wrong public key');
      console.error('   2. Payload modified in transit');
      console.error('   3. Timestamp mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * ============================================================================
 * EVENT EXTRACTION HELPERS
 * ============================================================================
 */

function extractCampaignId(event: any): string | null {
  const possibleLocations = [
    event.campaign_id,
    event['campaign-id'],
    event.campaign,
    event.customArgs?.campaign_id,
    event.custom_args?.campaign_id,
    event['sg_campaign_id']
  ];

  for (const value of possibleLocations) {
    if (value && typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return null;
}

function extractContactId(event: any): string | null {
  const possibleLocations = [
    event.contact_id,
    event['contact-id'],
    event.contact,
    event.customArgs?.contact_id,
    event.custom_args?.contact_id,
    event['sg_contact_id']
  ];

  for (const value of possibleLocations) {
    if (value && typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return null;
}

/**
 * ============================================================================
 * NEW: HANDLE DELIVERED EVENT - Store timestamp for open filtering
 * ============================================================================
 */
async function handleDelivered(
  campaignId: string,
  email: string,
  timestamp: number,
  supabase: any
) {
  console.log(`📬 Handling delivery for ${email} in campaign ${campaignId.substring(0, 8)}...`);
  
  try {
    const deliveredAt = new Date(timestamp * 1000).toISOString();
    
    const { error } = await supabase
      .from('delivery_timestamps')
      .upsert({
        campaign_id: campaignId,
        email: email,
        delivered_at: deliveredAt
      }, {
        onConflict: 'campaign_id,email'
      });
    
    if (error) {
      console.error('❌ Failed to store delivery timestamp:', error.message);
    } else {
      console.log(`✅ Stored delivery timestamp: ${deliveredAt}`);
    }
  } catch (error: any) {
    console.error('❌ Delivery timestamp storage error:', error.message);
  }
}

/**
 * ============================================================================
 * UPDATED: CAMPAIGN ANALYTICS WITH OPEN FILTERING
 * ============================================================================
 */
async function updateCampaignAnalytics(
  campaignId: string,
  contactId: string | null,
  eventType: string,
  email: string,      // ✅ NEW PARAMETER
  timestamp: number,  // ✅ NEW PARAMETER
  supabase: any
) {
  console.log(`📊 Updating campaign ${campaignId.substring(0, 8)}... for ${eventType}`);

  // ✅ UPDATED: Map 'delivered' to 'delivered_count' instead of 'recipients_count'
  const statFieldMap: { [key: string]: string } = {
    'delivered': 'delivered_count',  // ✅ FIXED: Track confirmed deliveries
    'open': 'opens',
    'click': 'clicks',
    'bounce': 'bounces',
    'dropped': 'bounces',
    'spamreport': 'complaints',
    'unsubscribe': 'unsubscribes'
  };

  const statField = statFieldMap[eventType];
  
  if (!statField) {
    console.log(`   ℹ️  No stat field for ${eventType}`);
    return;
  }

  // ========================================================================
  // ✅ FIXED: FILTER 'OPEN' EVENTS BY TIME DELAY
  // ========================================================================
  if (eventType === 'open') {
    console.log(`🔍 Checking if open is valid (must be >1 second after delivery)`);
    
    try {
      // ✅ FIX: Look up delivery event from email_events table (more reliable)
      // This table is populated BEFORE delivery_timestamps, so timing is accurate
      const { data: deliveryEvent, error: fetchError } = await supabase
        .from('email_events')
        .select('timestamp')
        .eq('campaign_id', campaignId)
        .eq('email', email)
        .eq('event_type', 'delivered')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is okay
        console.error('❌ Error fetching delivery event:', fetchError.message);
      }
      
      if (deliveryEvent) {
        const deliveryTime = new Date(deliveryEvent.timestamp).getTime();
        const openTime = timestamp * 1000; // Convert Unix timestamp to milliseconds
        const timeSinceDelivery = openTime - deliveryTime;
        
        console.log(`⏱️  Delivery: ${new Date(deliveryTime).toISOString()}`);
        console.log(`⏱️  Open: ${new Date(openTime).toISOString()}`);
        console.log(`⏱️  Time since delivery: ${timeSinceDelivery}ms`);
        
        // ✅ CRITICAL: Reject opens within 1 second (1000ms) of delivery
        if (timeSinceDelivery < 1000) {
          console.log(`🚫 REJECTED: Open too soon (${timeSinceDelivery}ms) - likely Gmail/proxy pre-fetch`);
          console.log(`   This open will NOT be counted in statistics`);
          return; // Exit early - don't increment opens counter
        } else {
          console.log(`✅ VALID OPEN: ${timeSinceDelivery}ms after delivery - counting as real user open`);
        }
      } else {
        console.log(`⚠️  No delivery event found for ${email}`);
        console.log(`   Possible reasons: delivery before tracking started, or email bounced`);
        console.log(`   Using conservative approach: allowing this open`);
        // Allow the open - better to count it than miss legitimate opens
      }
    } catch (error: any) {
      console.error(`❌ Error during open validation:`, error.message);
      console.log(`   Defaulting to allowing the open (conservative approach)`);
      // On error, allow the open rather than rejecting it
    }
  }

  // ========================================================================
  // INCREMENT CAMPAIGN STAT
  // ========================================================================
  try {
    const { error: rpcError } = await supabase.rpc('increment_campaign_stat', {
      p_campaign_id: campaignId,
      p_stat_field: statField
    });

    if (rpcError) {
      console.error(`❌ RPC error:`, rpcError.message);
      throw rpcError;
    }

    console.log(`✅ Incremented ${statField} for campaign ${campaignId.substring(0, 8)}...`);

    // Update contact engagement score
    if (contactId) {
      const engagementPoints: { [key: string]: number } = {
        'open': 5,
        'click': 10,
        'bounce': -10,
        'spamreport': -20,
        'unsubscribe': -15
      };

      const points = engagementPoints[eventType];
      
      if (points) {
        await supabase.rpc('update_contact_engagement', {
          p_contact_id: contactId,
          p_points: points
        });
        console.log(`✅ Contact engagement: ${points > 0 ? '+' : ''}${points}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Analytics update error:`, error.message);
    throw error;
  }
}

/**
 * ============================================================================
 * OTHER EVENT HANDLERS (unchanged)
 * ============================================================================
 */
async function handleBounce(contactId: string, reason: string, supabase: any) {
  const { error } = await supabase
    .from('contacts')
    .update({ status: 'bounced', updated_at: new Date().toISOString() })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Bounce update error:', error);
  } else {
    console.log(`✅ Contact marked as bounced`);
  }
}

async function handleSpamReport(contactId: string, supabase: any) {
  const { error } = await supabase
    .from('contacts')
    .update({ status: 'complained', updated_at: new Date().toISOString() })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Spam report error:', error);
  } else {
    console.log(`✅ Contact marked as complained`);
  }
}

async function handleUnsubscribe(contactId: string, email: string, supabase: any) {
  const { error } = await supabase
    .from('contacts')
    .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Unsubscribe error:', error);
  } else {
    console.log(`✅ Contact unsubscribed`);
  }
}

async function handleClick(
  campaignId: string,
  contactId: string,
  url: string,
  supabase: any
) {
  const { error } = await supabase
    .from('link_clicks')
    .insert({
      campaign_id: campaignId,
      contact_id: contactId,
      url: url,
      clicked_at: new Date().toISOString()
    });

  if (error && error.code !== '23505') {
    console.error('❌ Click tracking error:', error);
  } else if (!error) {
    console.log(`✅ Click tracked: ${url.substring(0, 50)}...`);
  }
}

/**
 * ============================================================================
 * EVENT PROCESSING - UPDATED
 * ============================================================================
 */
async function processSendGridEvent(event: any, supabase: any) {
  const eventType = event.event;
  const email = event.email;
  const timestamp = event.timestamp;

  console.log(`\n📧 Processing ${eventType} event for ${email}`);

  const campaign_id = extractCampaignId(event);
  const contact_id = extractContactId(event);

  console.log('🔍 Event Payload Analysis:');
  console.log(`   Event Type: ${eventType}`);
  console.log(`   Email: ${email}`);
  console.log(`   Campaign ID: ${campaign_id || '❌ NOT FOUND'}`);
  console.log(`   Contact ID: ${contact_id || '❌ NOT FOUND'}`);
  console.log(`   Timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);

  if (!campaign_id) {
    console.warn(`⚠️  No campaign_id found - event will not be linked to campaign`);
  }

  try {
    const eventTimestamp = timestamp 
      ? new Date(timestamp * 1000).toISOString() 
      : new Date().toISOString();

    // Insert event into email_events table
    const { data: insertedEvent, error: insertError } = await supabase
      .from('email_events')
      .insert({
        campaign_id: campaign_id,
        contact_id: contact_id,
        email: email,
        event_type: eventType,
        timestamp: eventTimestamp,
        metadata: {
          ...event,
          url: event.url || null,
          reason: event.reason || null,
          sendgrid_event_id: event.sg_message_id || event.sg_event_id || null
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      throw insertError;
    }

    console.log(`✅ Event inserted with ID: ${insertedEvent.id}`);

    // ✅ UPDATED: Update campaign analytics with new parameters
    if (campaign_id) {
      await updateCampaignAnalytics(
        campaign_id, 
        contact_id, 
        eventType,
        email,      // ✅ NEW: Pass email for delivery lookup
        timestamp,  // ✅ NEW: Pass timestamp for time calculation
        supabase
      );
    }

    // ✅ UPDATED: Handle specific event types
    switch (eventType) {
      case 'delivered':
        // ✅ NEW: Store delivery timestamp for open filtering
        if (campaign_id) {
          await handleDelivered(campaign_id, email, timestamp, supabase);
        }
        break;
        
      case 'bounce':
      case 'dropped':
        if (contact_id) await handleBounce(contact_id, event.reason, supabase);
        break;
        
      case 'spamreport':
        if (contact_id) await handleSpamReport(contact_id, supabase);
        break;
        
      case 'unsubscribe':
        if (contact_id) await handleUnsubscribe(contact_id, email, supabase);
        break;
        
      case 'click':
        if (campaign_id && contact_id && event.url) {
          await handleClick(campaign_id, contact_id, event.url, supabase);
        }
        break;
    }

    console.log(`✅ Completed processing ${eventType} event`);
    return true;

  } catch (error: any) {
    console.error(`❌ Processing error:`, error.message);
    throw error;
  }
}

/**
 * ============================================================================
 * MAIN HANDLER
 * ============================================================================
 */
serve(async (req) => {
  console.log('\n' + '='.repeat(80));
  console.log('📨 SENDGRID WEBHOOK RECEIVED');
  console.log('='.repeat(80));

  try {
    const signature = req.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp');
    const rawBody = await req.text();

    console.log('📋 Request info:');
    console.log(`   Signature present: ${!!signature}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Body size: ${rawBody.length} bytes`);

    // Verify signature
    if (signature && timestamp) {
      const isValid = await verifyWebhookSignature(signature, timestamp, rawBody);
      
      if (!isValid) {
        console.error('❌ REJECTED: Invalid signature');
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      console.warn('⚠️  No signature headers - skipping verification');
    }

    // Parse events
    const events = JSON.parse(rawBody);
    console.log(`\n📊 Received ${events.length} event(s)`);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Process events
    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        await processSendGridEvent(event, supabase);
        successCount++;
      } catch (error) {
        console.error(`❌ Event processing failed:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Success: ${successCount} | ❌ Failed: ${errorCount}`);
    console.log('='.repeat(80) + '\n');

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook handler error:', error.message);
    console.error('Stack:', error.stack);
    return new Response('Error', { status: 500 });
  }
});