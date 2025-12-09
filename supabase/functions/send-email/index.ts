/**
 * ============================================================================
 * Edge Function: Send Email
 * ============================================================================
 * 
 * Purpose: Handle email sending via SendGrid with custom domain support
 * 
 * Features:
 * - Campaign-specific domain selection
 * - Default domain fallback
 * - Shared domain fallback for users without custom domains
 * - Personalization field replacement
 * - Reply-to handling
 * 
 * Dependencies:
 * - Supabase for database access
 * - SendGrid API for email delivery
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ✅ FIX #1: Use correct verified sending domain from SendGrid
const SHARED_SENDING_DOMAIN = 'mail.mailwizard.io';  // Changed from em2151.mailwizard.io

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * ============================================================================
 * SENDER EMAIL HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Generates a username slug from email address or user metadata
 */
function generateUsername(userEmail: string, userMetadata: any): string {
  // Try to get username from metadata first
  if (userMetadata?.username) {
    return userMetadata.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  // Extract username from email (part before @)
  const emailUsername = userEmail.split('@')[0];
  return emailUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Gets a specific domain by ID for the user
 * Returns domain details if verified, null otherwise
 */
async function getDomainById(userId: string, domainId: string, supabase: any) {
  const { data, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('user_id', userId)
    .eq('id', domainId)
    .eq('verification_status', 'verified')
    .single();

  if (error || !data) {
    console.log(`Domain ${domainId} not found or not verified for user ${userId}`);
    return null;
  }

  console.log(`✅ Found specified verified domain: ${data.domain}`);
  return data;
}

/**
 * Gets user's default verified custom domain
 * Returns the default domain if verified, null otherwise
 */
async function getDefaultCustomDomain(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('user_id', userId)
    .eq('verification_status', 'verified')
    .eq('is_default', true)
    .single();

  if (error || !data) {
    console.log(`No default verified custom domain for user ${userId}`);
    return null;
  }

  console.log(`✅ Found default verified custom domain: ${data.domain}`);
  return data;
}

/**
 * Gets any verified custom domain for the user (fallback)
 * Returns the most recently verified domain, null if none
 */
async function getAnyVerifiedCustomDomain(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('user_id', userId)
    .eq('verification_status', 'verified')
    .order('verified_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log(`No verified custom domain for user ${userId}`);
    return null;
  }

  console.log(`✅ Found verified custom domain: ${data.domain}`);
  return data;
}

/**
 * Determines the appropriate sender email based on domain selection and verification
 * Priority order:
 * 1. Campaign-specified domain (if provided and verified)
 * 2. User's default domain (if verified)
 * 3. Any user verified domain
 * 4. Shared platform domain (fallback)
 */
async function determineSenderEmail(
  userId: string,
  userEmail: string,
  userMetadata: any,
  requestedFromName: string | null,
  campaignDomainId: string | null,
  supabase: any
) {
  // Generate username for personalized sender
  const username = generateUsername(userEmail, userMetadata);
  
  let customDomain = null;

  // Priority 1: Use campaign-specified domain if provided
  if (campaignDomainId) {
    console.log(`🎯 Campaign requests specific domain: ${campaignDomainId}`);
    customDomain = await getDomainById(userId, campaignDomainId, supabase);
  }

  // Priority 2: Use user's default domain
  if (!customDomain) {
    console.log(`🔍 Looking for user default domain...`);
    customDomain = await getDefaultCustomDomain(userId, supabase);
  }

  // Priority 3: Use any verified domain
  if (!customDomain) {
    console.log(`🔍 Looking for any verified domain...`);
    customDomain = await getAnyVerifiedCustomDomain(userId, supabase);
  }

  // ✅ FIX #2: Always construct email with username@domain pattern
  if (customDomain) {
    const fromEmail = `${username}@${customDomain.domain}`;
    console.log(`📧 Using custom domain sender: ${fromEmail}`);
    console.log(`🏷️  Custom domain: ${customDomain.domain}`);
    
    return {
      email: fromEmail,
      name: requestedFromName || userMetadata?.full_name || 'Mail Wizard',
      domain: customDomain.domain,
      isCustomDomain: true
    };
  } else {
    // Fallback: Use shared verified domain with username prefix
    const generatedEmail = `${username}@${SHARED_SENDING_DOMAIN}`;
    console.log(`📧 Using shared domain sender: ${generatedEmail}`);
    console.log(`📨 Replies will go to: ${userEmail}`);
    
    return {
      email: generatedEmail,
      name: requestedFromName || userMetadata?.full_name || 'Mail Wizard',
      domain: SHARED_SENDING_DOMAIN,
      isCustomDomain: false
    };
  }
}

/**
 * Replaces personalization fields in email content
 * Supports both old format {{field}} and new format {{MERGE:field}}
 */
function replacePersonalizationFields(template: string, contact: any): string {
  if (!template) return '';

  let processed = template;

  // New format: {{MERGE:field_name}}
  processed = processed
    .replace(/\{\{MERGE:first_name\}\}/gi, contact.first_name || '')
    .replace(/\{\{MERGE:last_name\}\}/gi, contact.last_name || '')
    .replace(/\{\{MERGE:email\}\}/gi, contact.email || '')
    .replace(/\{\{MERGE:company\}\}/gi, contact.company || '')
    .replace(/\{\{MERGE:role\}\}/gi, contact.role || '')
    .replace(/\{\{MERGE:industry\}\}/gi, contact.industry || '');

  // Old format: {{field}} (for backward compatibility)
  processed = processed
    .replace(/\{\{firstname\}\}/gi, contact.first_name || '')
    .replace(/\{\{lastname\}\}/gi, contact.last_name || '')
    .replace(/\{\{company\}\}/gi, contact.company || '')
    .replace(/\{\{role\}\}/gi, contact.role || '')
    .replace(/\{\{industry\}\}/gi, contact.industry || '')
    .replace(/\{\{email\}\}/gi, contact.email || '');

  return processed;
}

/**
 * Injects system links and variables into email template
 */
function injectSystemLinks(
  html: string,
  campaignId: string,
  contactId: string,
  recipientEmail: string,
  fromEmail: string,
  subject: string,
  companyName: string
): string {
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://mailwizard.io';

  // Generate system URLs
  const unsubscribeUrl = `${frontendUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}&campaign=${campaignId}&contact=${contactId}`;
  const viewInBrowserUrl = `${frontendUrl}/email/view/${campaignId}/${contactId}`;

  // Replace all system merge tags
  return html
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl)
    .replace(/\{\{VIEW_IN_BROWSER_URL\}\}/g, viewInBrowserUrl)
    .replace(/\{\{FROM_EMAIL\}\}/g, fromEmail)
    .replace(/\{\{SUBJECT_LINE\}\}/g, subject)
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName);
}

/**
 * ============================================================================
 * MAIN SEND EMAIL FUNCTION
 * ============================================================================
 */

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL SEND REQUEST');
    console.log('='.repeat(80));

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Parse request body
    const body = await req.json();
    const {
      to,
      subject,
      html,
      text,
      from_name,
      reply_to,
      campaign_id,
      contact_id,
      sending_domain_id, // Domain ID from campaign
      personalization = {}
    } = body;

    console.log(`📨 To: ${to}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`🎯 Campaign ID: ${campaign_id || 'N/A'}`);
    console.log(`👤 Contact ID: ${contact_id || 'N/A'}`);
    console.log(`🌐 Requested Domain ID: ${sending_domain_id || 'N/A (will use default)'}`);

    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    console.log(`👤 User ID: ${user.id}`);
    console.log(`📧 User Email: ${user.email}`);

    // Get user metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single();

    // Determine sender email and name based on domain configuration
    const senderInfo = await determineSenderEmail(
      user.id,
      user.email!,
      profile,
      from_name,
      sending_domain_id,
      supabase
    );

    console.log(`📤 Final Sender: ${senderInfo.name} <${senderInfo.email}>`);
    console.log(`📨 Reply-To: ${reply_to || user.email}`);

    // Personalize content if contact data provided
    let personalizedHtml = html;
    let personalizedSubject = subject;

    if (Object.keys(personalization).length > 0) {
      personalizedHtml = replacePersonalizationFields(html, personalization);
      personalizedSubject = replacePersonalizationFields(subject, personalization);
    }

    // Inject system links and variables (unsubscribe, view in browser, etc.)
    if (campaign_id && contact_id) {
      const companyName = profile?.full_name || from_name || 'Mail Wizard';
      personalizedHtml = injectSystemLinks(
        personalizedHtml,
        campaign_id,
        contact_id,
        to,
        senderInfo.email,
        personalizedSubject,
        companyName
      );
    }

    // Prepare SendGrid payload
    const sendGridPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: personalizedSubject
        }
      ],
      from: {
        email: senderInfo.email,
        name: senderInfo.name
      },
      reply_to: {
        email: reply_to || user.email!
      },
      content: [
        {
          type: 'text/html',
          value: personalizedHtml
        }
      ]
    };

    // Add plain text if provided
    if (text) {
      sendGridPayload.content.unshift({
        type: 'text/plain',
        value: replacePersonalizationFields(text, personalization)
      });
    }

    // Send via SendGrid
    console.log('🔮 Sending email via SendGrid...');
    
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridPayload)
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error('❌ SendGrid error:', errorText);
      throw new Error(`SendGrid error: ${errorText}`);
    }

    // Get message ID from response headers
    const messageId = sendGridResponse.headers.get('x-message-id');
    console.log(`✅ Email sent successfully! Message ID: ${messageId}`);

    // Log email activity (optional)
    if (campaign_id && contact_id) {
      try {
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id,
            contact_id,
            event_type: 'sent',
            sendgrid_message_id: messageId,
            created_at: new Date().toISOString()
          });
        console.log('📊 Activity logged');
      } catch (logError) {
        console.warn('⚠️  Failed to log activity:', logError);
        // Don't fail the request if logging fails
      }
    }

    console.log('='.repeat(80) + '\n');

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        sender: senderInfo
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});