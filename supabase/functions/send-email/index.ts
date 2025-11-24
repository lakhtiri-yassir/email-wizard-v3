import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// Shared verified sending domain (must be verified in SendGrid)
const SHARED_SENDING_DOMAIN = 'em2151.mailwizard.io';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
/**
 * ============================================================================
 * SENDER EMAIL HELPER FUNCTIONS
 * ============================================================================
 */ /**
 * Generates a username slug from email address or user metadata
 */ function generateUsername(userEmail, userMetadata) {
  // Try to get username from metadata first
  if (userMetadata?.username) {
    return userMetadata.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  // Extract username from email (part before @)
  const emailUsername = userEmail.split('@')[0];
  return emailUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
}
/**
 * Checks if user has a verified custom domain in SendGrid
 * Returns the custom domain if verified, null otherwise
 */ async function getVerifiedCustomDomain(userId, supabase) {
  const { data, error } = await supabase.from('sending_domains').select('domain').eq('user_id', userId).eq('verification_status', 'verified').order('verified_at', {
    ascending: false
  }).limit(1).single();
  if (error || !data) {
    console.log(`No verified custom domain for user ${userId}`);
    return null;
  }
  console.log(`✅ Found verified custom domain: ${data.domain}`);
  return data.domain;
}
/**
 * Determines the appropriate sender email based on domain verification status
 * Returns an object with email and name for the sender
 */ async function determineSenderEmail(userId, userEmail, userMetadata, requestedFromEmail, requestedFromName, supabase) {
  // Check if user has verified custom domain
  const customDomain = await getVerifiedCustomDomain(userId, supabase);
  if (customDomain) {
    // User has verified custom domain - use their actual email
    console.log(`📧 Using custom domain sender: ${userEmail}`);
    return {
      email: requestedFromEmail || userEmail,
      name: requestedFromName || userMetadata?.full_name || 'Mail Wizard'
    };
  } else {
    // No custom domain - use shared verified domain with username prefix
    const username = generateUsername(userEmail, userMetadata);
    const generatedEmail = `${username}@${SHARED_SENDING_DOMAIN}`;
    console.log(`📧 Using shared domain sender: ${generatedEmail}`);
    console.log(`📧 Replies will go to: ${requestedFromEmail || userEmail}`);
    return {
      email: generatedEmail,
      name: requestedFromName || userMetadata?.full_name || 'Mail Wizard'
    };
  }
}
function replacePersonalizationFields(template, contact) {
  if (!template) return '';
  return template.replace(/\{\{firstname\}\}/gi, contact.first_name || '[First Name]').replace(/\{\{lastname\}\}/gi, contact.last_name || '[Last Name]').replace(/\{\{company\}\}/gi, contact.company || '[Company]').replace(/\{\{role\}\}/gi, contact.role || '[Role]').replace(/\{\{industry\}\}/gi, contact.industry || '[Industry]').replace(/\{\{email\}\}/gi, contact.email);
}
/**
 * ============================================================================
 * MAIN SEND EMAIL FUNCTION
 * ============================================================================
 */ serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
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
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many send requests. Please try again later.',
        limit: rateLimitResult.limit,
        remaining: 0,
        reset_at: rateLimitResult.reset_at
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.reset_at,
          'Retry-After': String(60 * 60)
        }
      });
    }
    console.log('✅ Rate limit check passed');
    // ========================================================================
    // REQUEST PARSING
    // ========================================================================
    const { campaign_id, from_email: requestedFromEmail, from_name: requestedFromName, subject, html_body, text_body, recipients, track_opens = true, track_clicks = true } = await req.json();
    console.log(`📝 Campaign ID: ${campaign_id}`);
    console.log(`📨 Recipients: ${recipients.length}`);
    // ========================================================================
    // QUOTA VALIDATION
    // ========================================================================
    const { data: profile } = await supabase.from('profiles').select('plan_type').eq('id', user.id).single();
    const userPlan = profile?.plan_type || 'free';
    const planLimits = {
      free: 2000,
      pro: 50000,
      pro_plus: 250000
    };
    const monthlyLimit = planLimits[userPlan];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const { data: usageData } = await supabase.from('usage_metrics').select('emails_sent').eq('user_id', user.id).eq('month', currentMonth).eq('year', currentYear).single();
    const currentUsage = usageData?.emails_sent || 0;
    const remainingQuota = monthlyLimit - currentUsage;
    if (recipients.length > remainingQuota) {
      console.error('❌ Monthly quota exceeded');
      return new Response(JSON.stringify({
        error: 'Monthly quota exceeded',
        message: `Your ${userPlan} plan allows ${monthlyLimit} emails/month. 
          You have ${remainingQuota} remaining. 
          This campaign requires ${recipients.length}.`,
        current_usage: currentUsage,
        limit: monthlyLimit,
        requested: recipients.length,
        plan: userPlan
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ Quota check passed');
    // ========================================================================
    // DETERMINE SENDER EMAIL (CUSTOM DOMAIN OR SHARED DOMAIN)
    // ========================================================================
    console.log('🔍 Determining sender email address...');
    const senderInfo = await determineSenderEmail(user.id, user.email, user.user_metadata, requestedFromEmail, requestedFromName, supabase);
    // Always use user's actual email for replies (regardless of From address)
    const replyToEmail = requestedFromEmail || user.email;
    const replyToName = requestedFromName || user.user_metadata?.full_name || 'Mail Wizard';
    console.log(`📧 From: ${senderInfo.email} <${senderInfo.name}>`);
    console.log(`↩️  Reply-To: ${replyToEmail} <${replyToName}>`);
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
    const failedRecipients = [];
    const maxRetries = 3;
    const retryDelay = 1000;
    console.log(`📦 Processing ${recipients.length} recipients in batches of ${batchSize}`);
    for(let i = 0; i < recipients.length; i += batchSize){
      const batch = recipients.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(recipients.length / batchSize);
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} recipients)`);
      // Build personalizations for this batch
      const personalizations = batch.map((recipient)=>{
        let personalizedSubject = subject;
        let personalizedHtml = html_body;
        let personalizedText = text_body || '';
        if (hasPersonalization) {
          personalizedSubject = replacePersonalizationFields(subject, recipient);
          personalizedHtml = replacePersonalizationFields(html_body, recipient);
          if (text_body) {
            personalizedText = replacePersonalizationFields(text_body, recipient);
          }
        }
        return {
          to: [
            {
              email: recipient.email
            }
          ],
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
          email: senderInfo.email,
          name: senderInfo.name
        },
        reply_to: {
          email: replyToEmail,
          name: replyToName
        },
        content: [
          {
            type: 'text/html',
            value: html_body
          }
        ],
        tracking_settings: {
          click_tracking: {
            enable: track_clicks
          },
          open_tracking: {
            enable: track_opens
          }
        }
      };
      if (text_body) {
        sendGridPayload.content.unshift({
          type: 'text/plain',
          value: text_body
        });
      }
      // Retry logic for this batch
      let sendGridResponse = null;
      let retryCount = 0;
      while(retryCount <= maxRetries){
        try {
          console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries + 1} for batch ${batchNumber}`);
          sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendGridPayload)
          });
          if (sendGridResponse.ok) {
            console.log(`✅ Batch ${batchNumber} sent successfully`);
            totalSent += batch.length;
            // Log events for this batch
            const eventPromises = batch.map((recipient)=>supabase.from('email_events').insert({
                campaign_id: campaign_id,
                contact_id: recipient.contact_id || null,
                email: recipient.email,
                event_type: 'sent',
                timestamp: new Date().toISOString(),
                metadata: {
                  batch: batchNumber
                }
              }));
            await Promise.all(eventPromises);
            // Update campaign_recipients
            const recipientPromises = batch.map((recipient)=>supabase.from('campaign_recipients').upsert({
                campaign_id: campaign_id,
                contact_id: recipient.contact_id,
                status: 'sent',
                sent_at: new Date().toISOString()
              }));
            await Promise.all(recipientPromises);
            break;
          }
          // Retry on rate limit or server errors
          if (sendGridResponse.status === 429 || sendGridResponse.status >= 500) {
            retryCount++;
            if (retryCount <= maxRetries) {
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              console.log(`⏳ Retry ${retryCount}/${maxRetries} after ${delay}ms`);
              await new Promise((resolve)=>setTimeout(resolve, delay));
              continue;
            }
          }
          const error = await sendGridResponse.text();
          throw new Error(`SendGrid error: ${error}`);
        } catch (error) {
          console.error(`❌ SendGrid error for batch ${batchNumber}: ${error.message}`);
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = retryDelay * Math.pow(2, retryCount - 1);
            console.log(`⏳ Retry ${retryCount}/${maxRetries} after ${delay}ms`);
            await new Promise((resolve)=>setTimeout(resolve, delay));
            continue;
          }
          failedRecipients.push(...batch.map((r)=>r.email));
          break;
        }
      }
    }
    // ========================================================================
    // POST-SEND DATABASE UPDATES
    // ========================================================================
    console.log('💾 Updating database...');
    // Update campaign status
    const { error: campaignError } = await supabase.from('campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipients_count: totalSent
    }).eq('id', campaign_id);
    if (campaignError) {
      console.error('⚠️ Failed to update campaign:', campaignError);
    } else {
      console.log('✅ Campaign updated');
    }
    // Increment usage metrics
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
    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaign_id,
      sent: totalSent,
      failed: failedRecipients.length,
      failed_emails: failedRecipients.length > 0 ? failedRecipients : undefined,
      personalized: hasPersonalization,
      sender: {
        from_email: senderInfo.email,
        from_name: senderInfo.name,
        reply_to: replyToEmail,
        using_custom_domain: senderInfo.email !== `${generateUsername(user.email, user.user_metadata)}@${SHARED_SENDING_DOMAIN}`
      },
      usage: {
        current: currentUsage + totalSent,
        limit: monthlyLimit,
        remaining: remainingQuota - totalSent
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('❌ === SEND EMAIL FUNCTION ERROR ===');
    console.error(error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to send emails',
      details: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
