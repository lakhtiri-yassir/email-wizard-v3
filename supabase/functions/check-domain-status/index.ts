/**
 * ============================================================================
 * Edge Function: Check Domain Status
 * ============================================================================
 *
 * Purpose: Trigger DNS validation for a custom domain by calling SendGrid's
 *          validation API and updating the database with results
 *
 * This function:
 * 1. Receives domain ID from frontend
 * 2. Fetches domain record from database
 * 3. Calls SendGrid API to validate DNS records
 * 4. Updates database with validation results
 * 5. Returns updated domain object
 *
 * This replicates what SendGrid's "Verify" button does in their dashboard
 *
 * ============================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

/**
 * Validates domain with SendGrid API
 */
async function validateSendGridDomain(sendgridDomainId: string) {
  console.log(`🔍 Validating domain in SendGrid: ${sendgridDomainId}`);

  const response = await fetch(
    `https://api.sendgrid.com/v3/whitelabel/domains/${sendgridDomainId}/validate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ SendGrid validation error:', errorData);
    throw new Error(`SendGrid validation failed: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log('✅ SendGrid validation response:', JSON.stringify(data, null, 2));

  return data;
}

/**
 * Main handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse request body
    const { domainId } = await req.json();

    if (!domainId) {
      throw new Error('Domain ID is required');
    }

    console.log(`🎯 Checking domain status: ${domainId} for user: ${user.id}`);

    // Step 1: Fetch domain from database
    const { data: domain, error: fetchError } = await supabase
      .from('sending_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !domain) {
      console.error('❌ Domain not found:', fetchError);
      throw new Error('Domain not found or access denied');
    }

    if (!domain.sendgrid_domain_id) {
      throw new Error('Domain missing SendGrid configuration');
    }

    console.log(`📧 Found domain: ${domain.domain} (SendGrid ID: ${domain.sendgrid_domain_id})`);

    // Step 2: Call SendGrid validation API
    const validationResult = await validateSendGridDomain(domain.sendgrid_domain_id);

    // Step 3: Parse validation results
    const isValid = validationResult.valid === true;
    const newStatus = isValid ? 'verified' : 'failed';

    console.log(`📊 Validation result: ${newStatus}`);

    // Step 4: Prepare update data
    const updateData: any = {
      verification_status: newStatus,
      last_verified_at: new Date().toISOString()
    };

    // If verified, set verified_at timestamp
    if (isValid && !domain.verified_at) {
      updateData.verified_at = new Date().toISOString();
    }

    // Update DNS records with validation results
    if (validationResult.validation_results) {
      const updatedDnsRecords = { ...domain.dns_records };
      const results = validationResult.validation_results;

      // Update validation status for each DNS record
      if (results.mail_cname && updatedDnsRecords.mail_cname) {
        updatedDnsRecords.mail_cname.valid = results.mail_cname.valid;
        console.log(`  mail_cname: ${results.mail_cname.valid ? '✅' : '❌'}`);
      }

      if (results.dkim1 && updatedDnsRecords.dkim1) {
        updatedDnsRecords.dkim1.valid = results.dkim1.valid;
        console.log(`  dkim1: ${results.dkim1.valid ? '✅' : '❌'}`);
      }

      if (results.dkim2 && updatedDnsRecords.dkim2) {
        updatedDnsRecords.dkim2.valid = results.dkim2.valid;
        console.log(`  dkim2: ${results.dkim2.valid ? '✅' : '❌'}`);
      }

      if (results.spf && updatedDnsRecords.spf) {
        updatedDnsRecords.spf.valid = results.spf.valid;
        console.log(`  spf: ${results.spf.valid ? '✅' : '❌'}`);
      }

      if (results.subdomain_spf && updatedDnsRecords.subdomain_spf) {
        updatedDnsRecords.subdomain_spf.valid = results.subdomain_spf.valid;
        console.log(`  subdomain_spf: ${results.subdomain_spf.valid ? '✅' : '❌'}`);
      }

      updateData.dns_records = updatedDnsRecords;
    }

    // Step 5: Update database
    const { data: updatedDomain, error: updateError } = await supabase
      .from('sending_domains')
      .update(updateData)
      .eq('id', domainId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update domain:', updateError);
      throw new Error('Failed to update domain status in database');
    }

    console.log('✅ Domain status updated successfully');

    // Step 6: Return updated domain with validation results
    return new Response(
      JSON.stringify({
        success: true,
        domain: updatedDomain,
        validation_results: validationResult.validation_results,
        message: isValid
          ? 'Domain verified successfully! All DNS records are correctly configured.'
          : 'Domain verification failed. Please check your DNS records and try again.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Error:', error.message);
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
