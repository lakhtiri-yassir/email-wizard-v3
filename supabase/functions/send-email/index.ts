import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ============================================================================
 * MERGE FIELD REPLACEMENT UTILITY
 * ============================================================================
 */
interface Contact {
  email: string;
  contact_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  role?: string | null;
  industry?: string | null;
}

function replacePersonalizationFields(template: string, contact: Contact): string {
  if (!template) return '';
  
  return template
    // Case-insensitive replacement with fallback values
    .replace(/\{\{firstname\}\}/gi, contact.first_name || '[First Name]')
    .replace(/\{\{lastname\}\}/gi, contact.last_name || '[Last Name]')
    .replace(/\{\{company\}\}/gi, contact.company || '[Company]')
    .replace(/\{\{role\}\}/gi, contact.role || '[Role]')
    .replace(/\{\{industry\}\}/gi, contact.industry || '[Industry]')
    .replace(/\{\{email\}\}/gi, contact.email);
}

/**
 * ============================================================================
 * MAIN SEND EMAIL FUNCTION
 * ============================================================================
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📧 === SEND EMAIL FUNCTION STARTED ===');
    
    // Validate environment
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Unauthorized');
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // ========================================================================
    // RATE LIMITING
    // ========================================================================
    console.log('🔒 Checking rate limit...');
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'send-email',
      p_max_requests: 10,
      p_window_minutes: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn('⚠️ Rate limit exceeded');
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

    console.log('✅ Rate limit check passed');

    // ========================================================================
    // PARSE REQUEST
    // ========================================================================
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

    console.log(`📊 Campaign ID: ${campaign_id}`);
    console.log(`📊 Recipients: ${recipients?.length || 0}`);
    console.log(`📧 From: ${from_name} <${from_email}>`);
    console.log(`📝 Subject: ${subject}`);

    // Validate required fields
    if (!campaign_id || !subject || !html_body || !recipients || recipients.length === 0) {
      throw new Error('Missing required fields: campaign_id, subject, html_body, or recipients');
    }

    // ========================================================================
    // QUOTA CHECKING
    // ========================================================================
    console.log('💳 Checking email quota...');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current usage
    const { data: usage } = await supabase
      .from('usage_metrics')
      .select('emails_sent')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    // Get user's plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    // Plan limits
    const planLimits: Record<string, number> = {
      free: 2000,
      pro: 50000,
      pro_plus: 250000
    };

    const currentUsage = usage?.emails_sent || 0;
    const userPlan = profile?.plan_type || 'free';
    const monthlyLimit = planLimits[userPlan] || 2000;
    const remainingQuota = monthlyLimit - currentUsage;

    console.log(`📊 Plan: ${userPlan}`);
    console.log(`📊 Usage: ${currentUsage}/${monthlyLimit}`);
    console.log(`📊 Remaining: ${remainingQuota}`);

    // Check quota
    if (recipients.length > remainingQuota) {
      console.error('❌ Quota exceeded');
      return new Response(
        JSON.stringify({
          error: 'Monthly quota exceeded',
          message: `You have ${remainingQuota} emails remaining this month. This campaign requires ${recipients.length}.`,
          current_usage: currentUsage,
          limit: monthlyLimit,
          requested: recipients.length,
          plan: userPlan
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Quota check passed');

    // ========================================================================
    // PERSONALIZATION DETECTION
    // ========================================================================
    const hasPersonalization = /\{\{\w+\}\}/g.test(html_body) || /\{\{\w+\}\}/g.test(subject);
    console.log(`🎨 Personalization detected: ${hasPersonalization}`);

    // ========================================================================
    // EMAIL SENDING WITH RETRY LOGIC
    // ========================================================================
    const batchSize = 1000;
    let totalSent = 0;
    const failedRecipients: string[] = [];
    const maxRetries = 3;
    const retryDelay = 1000; // Base delay in ms

    console.log(`📦 Processing ${recipients.length} recipients in batches of ${batchSize}`);

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(recipients.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} recipients)`);

      // Build personalizations for this batch
      const personalizations = batch.map((recipient: Contact) => {
        let personalizedSubject = subject;
        let personalizedHtml = html_body;
        let personalizedText = text_body || '';

        // Apply personalization if detected
        if (hasPersonalization) {
          personalizedSubject = replacePersonalizationFields(subject, recipient);
          personalizedHtml = replacePersonalizationFields(html_body, recipient);
          if (text_body) {
            personalizedText = replacePersonalizationFields(text_body, recipient);
          }
        }

        return {
          to: [{ email: recipient.email }],
          subject: personalizedSubject,
          custom_args: {
            contact_id: recipient.contact_id || recipient.email,
            campaign_id: campaign_id,
            user_id: user.id
          }
        };
      });

      // Prepare SendGrid request
      const sendGridPayload = {
        personalizations: personalizations,
        from: {
          email: from_email || user.email,
          name: from_name || 'Mail Wizard'
        },
        reply_to: {
          email: from_email || user.email,
          name: from_name || 'Mail Wizard'
        },
        content: [
          {
            type: 'text/html',
            value: html_body // SendGrid will use personalized versions per recipient
          }
        ],
        tracking_settings: {
          click_tracking: { enable: track_clicks },
          open_tracking: { enable: track_opens },
        }
      };

      // Add text content if provided
      if (text_body) {
        sendGridPayload.content.unshift({
          type: 'text/plain',
          value: text_body
        });
      }

      // Retry logic for this batch
      let sendGridResponse: Response | null = null;
      let retryCount = 0;

      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries + 1} for batch ${batchNumber}`);
          
          sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sendGridPayload),
          });

          if (sendGridResponse.ok) {
            console.log(`✅ Batch ${batchNumber} sent successfully`);
            totalSent += batch.length;
            break; // Success, exit retry loop
          }

          // Check if we should retry
          if (sendGridResponse.status === 429 || sendGridResponse.status >= 500) {
            retryCount++;
            if (retryCount <= maxRetries) {
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              console.warn(`⚠️ Retrying batch ${batchNumber} in ${delay}ms (status: ${sendGridResponse.status})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }

          // Non-retryable error or max retries exceeded
          const errorText = await sendGridResponse.text();
          console.error(`❌ SendGrid error for batch ${batchNumber}:`, errorText);
          batch.forEach((r: Contact) => failedRecipients.push(r.email));
          break;

        } catch (error: any) {
          retryCount++;
          console.error(`❌ Network error for batch ${batchNumber}:`, error.message);
          
          if (retryCount <= maxRetries) {
            const delay = retryDelay * Math.pow(2, retryCount - 1);
            console.warn(`⚠️ Retrying batch ${batchNumber} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            batch.forEach((r: Contact) => failedRecipients.push(r.email));
            break;
          }
        }
      }
    }

    console.log(`📊 Sending complete: ${totalSent} sent, ${failedRecipients.length} failed`);

    // ========================================================================
    // DATABASE UPDATES
    // ========================================================================
    console.log('💾 Updating database...');

    // 1. Insert campaign_recipients records
    const recipientRecords = recipients.map((recipient: Contact) => ({
      campaign_id: campaign_id,
      contact_id: recipient.contact_id || null,
      status: failedRecipients.includes(recipient.email) ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
    }));

    const { error: recipientsError } = await supabase
      .from('campaign_recipients')
      .insert(recipientRecords);

    if (recipientsError) {
      console.error('⚠️ Failed to insert campaign_recipients:', recipientsError);
    } else {
      console.log('✅ campaign_recipients updated');
    }

    // 2. Update campaign status
    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipients_count: totalSent,
      })
      .eq('id', campaign_id);

    if (campaignError) {
      console.error('⚠️ Failed to update campaign:', campaignError);
    } else {
      console.log('✅ Campaign updated');
    }

    // 3. Increment usage metrics
    const { error: usageError } = await supabase.rpc('increment_usage', {
      p_user_id: user.id,
      p_month: currentMonth,
      p_year: currentYear,
      p_emails_sent: totalSent
    });

    if (usageError) {
      console.error('⚠️ Failed to increment usage:', usageError);
    } else {
      console.log('✅ Usage metrics updated');
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================
    console.log('✅ === SEND EMAIL FUNCTION COMPLETE ===');

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaign_id,
        sent: totalSent,
        failed: failedRecipients.length,
        failed_emails: failedRecipients.length > 0 ? failedRecipients : undefined,
        personalized: hasPersonalization,
        usage: {
          current: currentUsage + totalSent,
          limit: monthlyLimit,
          remaining: remainingQuota - totalSent
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('❌ === SEND EMAIL FUNCTION ERROR ===');
    console.error(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send emails',
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});