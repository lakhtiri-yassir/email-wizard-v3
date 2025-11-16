import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SENDGRID_VERIFICATION_KEY = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const signature = req.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp');
    const payload = await req.text();

    if (SENDGRID_VERIFICATION_KEY && signature && timestamp) {
      const isValid = await verifyWebhookSignature(
        payload,
        signature,
        timestamp,
        SENDGRID_VERIFICATION_KEY
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
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

      console.log('Webhook signature verified');
    } else if (SENDGRID_VERIFICATION_KEY) {
      console.warn('Webhook signature verification enabled but headers missing');
    }

    const events = JSON.parse(payload);

    console.log(`Processing ${events.length} SendGrid events`);

    for (const event of events) {
      const {
        event: eventType,
        email,
        timestamp,
        campaign_id,
        contact_id,
        url,
        reason,
        ...metadata
      } = event;

      const eventTypeMap: Record<string, string> = {
        'processed': 'sent',
        'delivered': 'delivered',
        'open': 'open',
        'click': 'click',
        'bounce': 'bounce',
        'dropped': 'bounce',
        'spamreport': 'spam',
        'unsubscribe': 'unsubscribe'
      };

      const mappedEventType = eventTypeMap[eventType] || eventType;

      await supabase.from('email_events').insert({
        campaign_id,
        contact_id,
        event_type: mappedEventType,
        timestamp: new Date(timestamp * 1000).toISOString(),
        metadata: { ...metadata, url, reason }
      });

      switch (mappedEventType) {
        case 'open':
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: campaign_id,
            p_stat_name: 'opens'
          });
          await supabase.rpc('update_contact_engagement', {
            p_contact_id: contact_id,
            p_points: 5
          });
          await supabase
            .from('campaign_recipients')
            .update({ opened_at: new Date().toISOString() })
            .eq('campaign_id', campaign_id)
            .eq('contact_id', contact_id);
          break;

        case 'click':
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: campaign_id,
            p_stat_name: 'clicks'
          });
          await supabase.rpc('update_contact_engagement', {
            p_contact_id: contact_id,
            p_points: 10
          });
          if (url) {
            await supabase.from('link_clicks').insert({
              campaign_id,
              contact_id,
              url,
              clicked_at: new Date().toISOString()
            });
          }
          await supabase
            .from('campaign_recipients')
            .update({ clicked_at: new Date().toISOString() })
            .eq('campaign_id', campaign_id)
            .eq('contact_id', contact_id);
          break;

        case 'bounce':
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: campaign_id,
            p_stat_name: 'bounces'
          });
          await supabase
            .from('contacts')
            .update({ status: 'bounced' })
            .eq('id', contact_id);
          break;

        case 'spam':
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: campaign_id,
            p_stat_name: 'complaints'
          });
          await supabase
            .from('contacts')
            .update({ status: 'complained' })
            .eq('id', contact_id);
          break;

        case 'unsubscribe':
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: campaign_id,
            p_stat_name: 'unsubscribes'
          });
          await supabase
            .from('contacts')
            .update({ status: 'unsubscribed' })
            .eq('id', contact_id);
          break;
      }
    }

    console.log(`Successfully processed ${events.length} events`);

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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
