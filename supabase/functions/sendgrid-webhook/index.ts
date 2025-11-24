import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Twilio-Email-Event-Webhook-Signature, X-Twilio-Email-Event-Webhook-Timestamp',
};

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  verificationKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(timestamp + payload);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(verificationKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('📨 === SENDGRID WEBHOOK STARTED ===');
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SENDGRID_VERIFICATION_KEY = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const signature = req.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp');
    const payload = await req.text();

    // Only verify signature if verification key is configured
    if (SENDGRID_VERIFICATION_KEY) {
      if (!signature || !timestamp) {
        console.warn('⚠️ Signature verification enabled but headers missing');
        // Allow request to proceed for now (development mode)
        console.log('🔓 Proceeding without signature verification (dev mode)');
      } else {
        const isValid = await verifyWebhookSignature(
          payload,
          signature,
          timestamp,
          SENDGRID_VERIFICATION_KEY
        );

        if (!isValid) {
          console.error('❌ Invalid webhook signature');
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            {
              status: 401,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }
        console.log('✅ Webhook signature verified');
      }
    } else {
      console.warn('⚠️ SENDGRID_WEBHOOK_VERIFICATION_KEY not set - skipping signature verification');
      console.log('🔓 Running in development mode (no signature verification)');
    }

    const events = JSON.parse(payload);
    console.log(`📦 Processing ${events.length} SendGrid event(s)`);

    for (const event of events) {
      const {
        event: eventType,
        email,
        timestamp: eventTimestamp,
        campaign_id,
        contact_id,
        url,
        reason,
        ...metadata
      } = event;

      console.log(`📧 Event: ${eventType} for ${email} (campaign: ${campaign_id || 'N/A'})`);

      // Map SendGrid event types to our event types
      const eventTypeMap: Record<string, string> = {
        'processed': 'sent',
        'delivered': 'delivered',
        'open': 'open',
        'click': 'click',
        'bounce': 'bounce',
        'dropped': 'bounce',
        'deferred': 'deferred',
        'spamreport': 'complaint',
        'unsubscribe': 'unsubscribe',
      };

      const mappedEventType = eventTypeMap[eventType] || eventType;

      // Insert event into email_events table
      const { error: eventError } = await supabase
        .from('email_events')
        .insert({
          campaign_id: campaign_id || null,
          contact_id: contact_id || null,
          email: email,
          event_type: mappedEventType,
          timestamp: new Date(eventTimestamp * 1000).toISOString(),
          metadata: {
            ...metadata,
            url: url || null,
            reason: reason || null,
            original_event_type: eventType,
          },
        });

      if (eventError) {
        console.error(`❌ Failed to insert event: ${eventError.message}`);
      } else {
        console.log(`✅ Event recorded: ${mappedEventType}`);
      }

      // Update campaign statistics if campaign_id exists
      if (campaign_id) {
        switch (mappedEventType) {
          case 'open':
            await supabase.rpc('increment_campaign_stat', {
              p_campaign_id: campaign_id,
              p_stat_name: 'opens'
            });
            
            // Update contact engagement
            if (contact_id) {
              await supabase.rpc('update_contact_engagement', {
                p_contact_id: contact_id,
                p_points: 5
              });
              
              // Update campaign_recipients
              await supabase
                .from('campaign_recipients')
                .update({ opened_at: new Date().toISOString() })
                .eq('campaign_id', campaign_id)
                .eq('contact_id', contact_id)
                .is('opened_at', null);
            }
            break;

          case 'click':
            await supabase.rpc('increment_campaign_stat', {
              p_campaign_id: campaign_id,
              p_stat_name: 'clicks'
            });
            
            // Update contact engagement  
            if (contact_id) {
              await supabase.rpc('update_contact_engagement', {
                p_contact_id: contact_id,
                p_points: 10
              });
              
              // Update campaign_recipients
              await supabase
                .from('campaign_recipients')
                .update({ clicked_at: new Date().toISOString() })
                .eq('campaign_id', campaign_id)
                .eq('contact_id', contact_id)
                .is('clicked_at', null);
            }
            
            // Log link click
            if (url && contact_id) {
              await supabase.from('link_clicks').insert({
                campaign_id: campaign_id,
                contact_id: contact_id,
                url: url,
              });
            }
            break;

          case 'bounce':
            await supabase.rpc('increment_campaign_stat', {
              p_campaign_id: campaign_id,
              p_stat_name: 'bounces'
            });
            
            // Update contact status
            if (contact_id) {
              await supabase
                .from('contacts')
                .update({ status: 'bounced' })
                .eq('id', contact_id);
            }
            break;

          case 'complaint':
            await supabase.rpc('increment_campaign_stat', {
              p_campaign_id: campaign_id,
              p_stat_name: 'complaints'
            });
            
            // Update contact status
            if (contact_id) {
              await supabase
                .from('contacts')
                .update({ status: 'complained' })
                .eq('id', contact_id);
            }
            break;

          case 'unsubscribe':
            await supabase.rpc('increment_campaign_stat', {
              p_campaign_id: campaign_id,
              p_stat_name: 'unsubscribes'
            });
            
            // Update contact status
            if (contact_id) {
              await supabase
                .from('contacts')
                .update({ status: 'unsubscribed' })
                .eq('id', contact_id);
            }
            break;
        }
      }
    }

    console.log('✅ === SENDGRID WEBHOOK COMPLETE ===');

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('❌ === SENDGRID WEBHOOK ERROR ===');
    console.error(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process webhook'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});