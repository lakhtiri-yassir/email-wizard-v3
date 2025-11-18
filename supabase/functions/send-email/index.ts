import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

// ✅ NEW: Helper function to generate verified sender email
function getVerifiedSenderEmail(userName?: string, userEmail?: string): string {
  // Extract identifier for personalized email address
  let identifier = 'team'; // default fallback
  
  if (userName) {
    // Use first name from user's full name
    identifier = userName
      .toLowerCase()
      .split(' ')[0]
      .replace(/[^a-z0-9]/g, ''); // Remove special characters
  } else if (userEmail) {
    // Use part before @ from user's email
    identifier = userEmail
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
  
  // Use the verified SendGrid domain (em2151.mailwizard.io)
  return `${identifier}@em2151.mailwizard.io`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader!.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check rate limit
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'send-email',
      p_max_requests: 10,
      p_window_minutes: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many send requests. Please try again later.',
          limit: rateLimitResult.limit,
          current: rateLimitResult.current_count,
          reset_at: rateLimitResult.reset_at
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': rateLimitResult.reset_at,
            'Retry-After': String(60 * 60)
          }
        }
      );
    }

    const requestData = await req.json();
    const {
      campaign_id,
      from_email,
      from_name,
      subject,
      html_body,
      text_body,
      recipients,
      track_opens = true,
      track_clicks = true
    } = requestData;

    if (!campaign_id || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ✅ NEW: Get user metadata to generate verified sender email
    const { data: userData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // ✅ NEW: Generate verified sender email using helper function
    const verifiedSenderEmail = getVerifiedSenderEmail(
      userData?.full_name || user.user_metadata?.full_name,
      userData?.email || user.email
    );

    console.log(`✅ Using verified sender: ${verifiedSenderEmail} (reply-to: ${from_email})`);

    // Check quota
    const now = new Date();
    const { data: usage } = await supabase
      .from('usage_metrics')
      .select('emails_sent')
      .eq('user_id', user.id)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    const planLimits: Record<string, number> = {
      free: 2000,
      pro: 50000,
      pro_plus: 250000
    };

    const currentUsage = usage?.emails_sent || 0;
    const monthlyLimit = planLimits[profile?.plan_type || 'free'] || 2000;
    const remainingQuota = monthlyLimit - currentUsage;

    if (recipients.length > remainingQuota) {
      return new Response(
        JSON.stringify({
          error: 'Monthly quota exceeded',
          current_usage: currentUsage,
          limit: monthlyLimit,
          requested: recipients.length
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const batchSize = 1000;
    let totalSent = 0;
    const failedRecipients: string[] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const personalizations = batch.map((recipient: any) => {
        let personalizedSubject = subject;
        let personalizedHtml = html_body;
        let personalizedText = text_body || '';

        Object.keys(recipient).forEach((key) => {
          const value = recipient[key] || '';
          const tag = `{{${key}}}`;
          personalizedSubject = personalizedSubject.replace(new RegExp(tag, 'g'), value);
          personalizedHtml = personalizedHtml.replace(new RegExp(tag, 'g'), value);
          personalizedText = personalizedText.replace(new RegExp(tag, 'g'), value);
        });

        return {
          to: [{ email: recipient.email }],
          subject: personalizedSubject,
          custom_args: {
            contact_id: recipient.contact_id,
            campaign_id: campaign_id,
            user_id: user.id
          }
        };
      });

      let sendGridResponse: Response | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 1000;

      while (retryCount <= maxRetries) {
        try {
          sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              personalizations,
              from: {
                email: verifiedSenderEmail,  // ✅ FIXED: Now uses verified email
                name: from_name
              },
              reply_to: {
                email: from_email,  // ✅ NEW: Replies go to user's actual email
                name: from_name
              },
              content: [
                { type: 'text/plain', value: text_body || html_body.replace(/<[^>]*>/g, '') },
                { type: 'text/html', value: html_body }
              ],
              tracking_settings: {
                click_tracking: { enable: track_clicks },
                open_tracking: { enable: track_opens }
              }
            })
          });

          if (sendGridResponse.ok) {
            break;
          }

          if (sendGridResponse.status === 429 || sendGridResponse.status >= 500) {
            retryCount++;
            if (retryCount <= maxRetries) {
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              console.log(`Retry ${retryCount}/${maxRetries} after ${delay}ms`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }

          const error = await sendGridResponse.text();
          console.error('SendGrid error:', error);
          failedRecipients.push(...batch.map((r: any) => r.email));
          break;
        } catch (error) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const delay = retryDelay * Math.pow(2, retryCount - 1);
            console.log(`Network error, retry ${retryCount}/${maxRetries} after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          console.error('SendGrid network error:', error);
          failedRecipients.push(...batch.map((r: any) => r.email));
          break;
        }
      }

      if (!sendGridResponse || !sendGridResponse.ok) {
        continue;
      }

      const events = batch.map((recipient: any) => ({
        campaign_id,
        contact_id: recipient.contact_id,
        event_type: 'sent',
        timestamp: new Date().toISOString(),
        metadata: { from_email: verifiedSenderEmail, subject }  // ✅ Log verified email
      }));

      await supabase.from('email_events').insert(events);

      const campaignRecipients = batch.map((recipient: any) => ({
        campaign_id,
        contact_id: recipient.contact_id,
        status: 'sent',
        sent_at: new Date().toISOString()
      }));

      await supabase.from('campaign_recipients').insert(campaignRecipients);

      totalSent += batch.length;
    }

    await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipients_count: totalSent
      })
      .eq('id', campaign_id);

    await supabase.rpc('increment_usage', {
      p_user_id: user.id,
      p_month: now.getMonth() + 1,
      p_year: now.getFullYear(),
      p_emails_sent: totalSent
    });

    console.log(`Successfully sent ${totalSent} emails for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        failed: failedRecipients.length,
        failed_recipients: failedRecipients
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});