/**
 * ============================================================================
 * FIXED: SendGrid Webhook Handler
 * ============================================================================
 * 
 * CRITICAL FIX: Properly extract campaign_id and contact_id from webhook payload
 * 
 * Changes Made:
 * 1. Check multiple possible locations for campaign_id (SendGrid transforms field names)
 * 2. Add comprehensive logging of event payload structure
 * 3. Add warnings when IDs are missing
 * 4. Ensure increment_campaign_stat is called correctly
 * 
 * SendGrid Field Name Transformation:
 * - customArgs.campaign_id → event.campaign_id OR event['campaign-id']
 * - customArgs.contact_id → event.contact_id OR event['contact-id']
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SENDGRID_WEBHOOK_VERIFICATION_KEY = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY') || '';

/**
 * Verify SendGrid webhook signature
 */
async function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  payload: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(timestamp + payload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SENDGRID_WEBHOOK_VERIFICATION_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * 🔥 CRITICAL FIX: Extract campaign_id from event with fallbacks
 * SendGrid may transform field names in different ways
 */
function extractCampaignId(event: any): string | null {
  // Try multiple possible locations
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

/**
 * 🔥 CRITICAL FIX: Extract contact_id from event with fallbacks
 */
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
 * Process a single SendGrid event
 */
async function processSendGridEvent(event: any, supabase: any) {
  const eventType = event.event;
  const email = event.email;
  const timestamp = event.timestamp;

  console.log(`📧 Processing ${eventType} event for ${email}`);

  // 🔥 CRITICAL FIX: Extract IDs using helper functions
  const campaign_id = extractCampaignId(event);
  const contact_id = extractContactId(event);

  // 🔥 DIAGNOSTIC LOGGING: Show full event structure
  console.log('🔍 Event Payload Analysis:');
  console.log(`   Event Type: ${eventType}`);
  console.log(`   Email: ${email}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Campaign ID: ${campaign_id || 'NOT FOUND'}`);
  console.log(`   Contact ID: ${contact_id || 'NOT FOUND'}`);
  console.log(`   Available Keys: ${Object.keys(event).join(', ')}`);

  // Warn if IDs are missing
  if (!campaign_id) {
    console.warn(`⚠️  WARNING: No campaign_id found for ${eventType} event to ${email}`);
    console.warn(`   This event will be inserted but not linked to a campaign`);
    console.warn(`   Event object keys:`, Object.keys(event));
  }

  if (!contact_id) {
    console.warn(`⚠️  WARNING: No contact_id found for ${eventType} event to ${email}`);
  }

  try {
    // Convert timestamp to ISO string
    const eventTimestamp = timestamp 
      ? new Date(timestamp * 1000).toISOString() 
      : new Date().toISOString();

    // Insert into email_events table
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
      console.error('❌ ERROR inserting event into email_events:');
      console.error('   Error code:', insertError.code);
      console.error('   Error message:', insertError.message);
      console.error('   Error details:', insertError.details);
      throw insertError;
    }

    console.log(`✅ Event inserted successfully: ID ${insertedEvent.id}`);

    // Update campaign statistics if campaign_id exists
    if (campaign_id) {
      await updateCampaignAnalytics(campaign_id, contact_id, eventType, supabase);
    } else {
      console.log(`⏭️  Skipping campaign analytics update (no campaign_id)`);
    }

    // Handle specific event types
    switch (eventType) {
      case 'bounce':
      case 'dropped':
        if (contact_id) {
          await handleBounce(contact_id, event.reason, supabase);
        }
        break;
      
      case 'spamreport':
        if (contact_id) {
          await handleSpamReport(contact_id, supabase);
        }
        break;
      
      case 'unsubscribe':
        if (contact_id) {
          await handleUnsubscribe(contact_id, email, supabase);
        }
        break;
      
      case 'click':
        if (campaign_id && contact_id && event.url) {
          await handleClick(campaign_id, contact_id, event.url, supabase);
        }
        break;
    }

    console.log(`✅ Completed processing ${eventType} event for ${email}`);
    return true;

  } catch (error: any) {
    console.error(`❌ CRITICAL ERROR processing ${eventType} event:`, error.message);
    console.error('   Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Update campaign analytics
 */
async function updateCampaignAnalytics(
  campaignId: string,
  contactId: string | null,
  eventType: string,
  supabase: any
) {
  console.log(`📊 Updating campaign analytics for ${campaignId}`);
  console.log(`   Event type: ${eventType}`);

  // Map event types to campaign stat fields
  const statFieldMap: { [key: string]: string } = {
    'delivered': 'recipients_count',
    'open': 'opens',
    'click': 'clicks',
    'bounce': 'bounces',
    'dropped': 'bounces',
    'spamreport': 'complaints',
    'unsubscribe': 'unsubscribes'
  };

  const statField = statFieldMap[eventType];
  
  if (!statField) {
    console.log(`   ℹ️  Event type ${eventType} doesn't require stat update`);
    return;
  }

  try {
    // Call the database function
    const { error: rpcError } = await supabase.rpc('increment_campaign_stat', {
      p_campaign_id: campaignId,
      p_stat_field: statField
    });

    if (rpcError) {
      console.error('❌ ERROR calling increment_campaign_stat:');
      console.error('   Error code:', rpcError.code);
      console.error('   Error message:', rpcError.message);
      console.error('   Campaign ID:', campaignId);
      console.error('   Stat field:', statField);
      throw rpcError;
    }

    console.log(`✅ Successfully incremented ${statField} for campaign ${campaignId}`);

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
        const { error: engagementError } = await supabase.rpc('update_contact_engagement', {
          p_contact_id: contactId,
          p_points: points
        });

        if (engagementError) {
          console.error('⚠️  Failed to update contact engagement:', engagementError.message);
          // Don't throw - engagement is non-critical
        } else {
          console.log(`✅ Updated contact engagement: ${points > 0 ? '+' : ''}${points} points`);
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Error updating campaign analytics:`, error.message);
    throw error;
  }
}

/**
 * Handle bounce events
 */
async function handleBounce(contactId: string, reason: string, supabase: any) {
  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'bounced',
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Error marking contact as bounced:', error);
  } else {
    console.log(`✅ Marked contact ${contactId} as bounced`);
  }
}

/**
 * Handle spam report events
 */
async function handleSpamReport(contactId: string, supabase: any) {
  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'complained',
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Error marking contact as complained:', error);
  } else {
    console.log(`✅ Marked contact ${contactId} as complained`);
  }
}

/**
 * Handle unsubscribe events
 */
async function handleUnsubscribe(contactId: string, email: string, supabase: any) {
  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'unsubscribed',
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error('❌ Error marking contact as unsubscribed:', error);
  } else {
    console.log(`✅ Marked contact ${contactId} as unsubscribed`);
  }
}

/**
 * Handle click events
 */
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

  if (error) {
    console.error('❌ Error logging link click:', error);
  } else {
    console.log(`✅ Logged click for URL: ${url}`);
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  console.log('='.repeat(80));
  console.log('📨 SENDGRID WEBHOOK RECEIVED');
  console.log('='.repeat(80));

  try {
    // Get headers
    const signature = req.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp');

    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify signature if configured
    if (SENDGRID_WEBHOOK_VERIFICATION_KEY && signature && timestamp) {
      console.log('🔐 Verifying webhook signature...');
      const isValid = await verifyWebhookSignature(signature, timestamp, rawBody);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return new Response('Unauthorized', { status: 401 });
      }
      
      console.log('✅ Webhook signature verified successfully');
    } else {
      console.log('⚠️  Skipping signature verification (key not configured)');
    }

    // Parse events
    const events = JSON.parse(rawBody);
    console.log(`📊 Received ${events.length} event(s)\n`);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Process each event
    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        await processSendGridEvent(event, supabase);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process event:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully processed: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount}`);
    }
    console.log('='.repeat(80) + '\n');

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error.message);
    console.error('Stack:', error.stack);
    return new Response('Error', { status: 500 });
  }
});