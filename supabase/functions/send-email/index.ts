/**
 * ============================================================================
 * FIXED: Edge Function - Send Email
 * ============================================================================
 * 
 * CRITICAL FIX: Added customArgs to SendGrid payload to enable webhook tracking
 * 
 * Changes Made:
 * 1. Added customArgs with campaign_id, contact_id, user_id to SendGrid payload
 * 2. Added detailed logging of customArgs before sending
 * 3. Ensured campaign_id and contact_id are properly passed through
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SHARED_SENDING_DOMAIN = 'mail.mailwizard.io';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * Helper: Replace personalization fields in text
 */
function replacePersonalizationFields(text: string, fields: Record<string, any>): string {
  let result = text;
  for (const [key, value] of Object.entries(fields)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

/**
 * Helper: Generate username from email
 */
function generateUsername(userEmail: string, userMetadata: any): string {
  if (userMetadata?.username) {
    return userMetadata.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const emailUsername = userEmail.split('@')[0];
  return emailUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('='.repeat(80));
    console.log('📧 EMAIL SEND REQUEST');
    console.log('='.repeat(80) + '\n');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Parse request body
    const {
      to,
      subject,
      html,
      text,
      reply_to,
      campaign_id,      // ← CRITICAL: Must be present
      contact_id,       // ← CRITICAL: Must be present
      sending_domain_id,
      personalization = {}
    } = await req.json();

    // Log request data
    console.log(`📨 To: ${to}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`🎯 Campaign ID: ${campaign_id || 'N/A'}`);
    console.log(`👤 Contact ID: ${contact_id || 'N/A'}`);
    console.log(`🌐 Requested Domain ID: ${sending_domain_id || 'N/A (will use default)'}`);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log(`👤 User ID: ${user.id}`);
    console.log(`📧 User Email: ${user.email}`);

    // Determine sender email
    let fromEmail = '';
    let fromName = personalization.sender_name || 'Email Wizard';

    // Try to get custom domain if specified
    if (sending_domain_id) {
      const { data: customDomain } = await supabase
        .from('sending_domains')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', sending_domain_id)
        .eq('verification_status', 'verified')
        .single();

      if (customDomain) {
        const username = generateUsername(user.email!, user.user_metadata);
        fromEmail = `${username}@${customDomain.domain}`;
        console.log(`✅ Using specified custom domain: ${customDomain.domain}`);
      }
    }

    // If no custom domain, try default
    if (!fromEmail) {
      console.log('🔍 Looking for user default domain...');
      const { data: defaultDomain } = await supabase
        .from('sending_domains')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .eq('verification_status', 'verified')
        .single();

      if (defaultDomain) {
        const username = generateUsername(user.email!, user.user_metadata);
        fromEmail = `${username}@${defaultDomain.domain}`;
        console.log(`✅ Found default verified custom domain: ${defaultDomain.domain}`);
      }
    }

    // Fallback to shared domain
    if (!fromEmail) {
      const username = generateUsername(user.email!, user.user_metadata);
      fromEmail = `${username}@${SHARED_SENDING_DOMAIN}`;
      console.log(`📧 Using shared domain sender: ${fromEmail}`);
    }

    console.log(`📤 Final Sender: ${fromName} <${fromEmail}>`);
    console.log(`📨 Reply-To: ${reply_to || user.email}`);

    // Apply personalization
    const personalizedHtml = replacePersonalizationFields(html, personalization);
    const personalizedText = text ? replacePersonalizationFields(text, personalization) : '';
    const personalizedSubject = replacePersonalizationFields(subject, personalization);

    // ========================================================================
    // 🔥 CRITICAL FIX: BUILD SENDGRID PAYLOAD WITH customArgs
    // ========================================================================
    const sendGridPayload: any = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: personalizedSubject
        }
      ],
      from: {
        email: fromEmail,
        name: fromName
      },
      reply_to: {
        email: reply_to || user.email!
      },
      // 🔥 FIX: Add customArgs for webhook tracking
      custom_args: {
        campaign_id: campaign_id || '',
        contact_id: contact_id || '',
        user_id: user.id
      },
      tracking_settings: {
        click_tracking: { enable: true, enable_text: false },
        open_tracking: { enable: true },
        subscription_tracking: { enable: false }
      },
      content: [
        {
          type: 'text/html',
          value: personalizedHtml
        }
      ]
    };

    // Add plain text if provided
    if (personalizedText) {
      sendGridPayload.content.unshift({
        type: 'text/plain',
        value: personalizedText
      });
    }

    // 🔥 CRITICAL LOGGING: Show what we're sending to SendGrid
    console.log('\n📦 SendGrid Payload Details:');
    console.log(`   To: ${to}`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   Subject: ${personalizedSubject}`);
    console.log(`   Custom Args:`, JSON.stringify(sendGridPayload.custom_args, null, 2));
    console.log(`   Tracking Enabled: Opens=${sendGridPayload.tracking_settings.open_tracking.enable}, Clicks=${sendGridPayload.tracking_settings.click_tracking.enable}`);

    // Send via SendGrid
    console.log('\n🔮 Sending email via SendGrid...');
    
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

    // Log campaign activity if IDs provided
    if (campaign_id && contact_id) {
      try {
        await supabase
          .from('email_events')
          .insert({
            campaign_id,
            contact_id,
            email: to,
            event_type: 'processed',
            timestamp: new Date().toISOString(),
            metadata: {
              sendgrid_message_id: messageId,
              from_email: fromEmail
            }
          });
        console.log('📊 Activity logged to email_events');
      } catch (logError) {
        console.warn('⚠️  Failed to log activity:', logError);
        // Don't fail the request if logging fails
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        sender: { email: fromEmail, name: fromName }
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