/**
 * ============================================================================
 * Edge Function: Domain Management - FIXED ROUTING
 * ============================================================================
 * 
 * Purpose: Handle all custom domain operations including add, verify, list,
 *          delete, and set default domain functionality
 * 
 * Endpoints:
 * - POST /manage-domain/add - Add new domain
 * - POST /manage-domain/verify/{domainId} - Trigger domain verification
 * - GET /manage-domain/list - List user's domains
 * - DELETE /manage-domain/{domainId} - Remove domain
 * - PATCH /manage-domain/{domainId}/set-default - Set as default domain
 * - GET /manage-domain/{domainId}/dns - Get DNS configuration instructions
 * 
 * Dependencies:
 * - Supabase client for database operations
 * - SendGrid API for domain authentication
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TESTING_MODE = Deno.env.get('DOMAIN_TESTING_MODE') === 'true';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * ============================================================================
 * VALIDATION FUNCTIONS
 * ============================================================================
 */

/**
 * Validates domain format
 */
function validateDomain(domain: string): { valid: boolean; error?: string } {
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Check length
  if (domain.length > 253) {
    return { valid: false, error: 'Domain name too long (max 253 characters)' };
  }

  if (domain.length < 3) {
    return { valid: false, error: 'Domain name too short (min 3 characters)' };
  }

  // Check format: alphanumeric, hyphens, dots
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return { valid: false, error: 'Invalid domain format. Use format: example.com' };
  }

  // Check for invalid patterns
  if (domain.includes('..') || domain.startsWith('-') || domain.endsWith('-')) {
    return { valid: false, error: 'Domain contains invalid characters or patterns' };
  }

  return { valid: true };
}

/**
 * Checks if user's plan supports custom domains
 */
function checkDomainFeatureAccess(planType: string): boolean {
  const allowedPlans = ['pro', 'pro_plus'];
  return allowedPlans.includes(planType.toLowerCase());
}

/**
 * ============================================================================
 * SENDGRID API FUNCTIONS
 * ============================================================================
 */

/**
 * Creates a new domain in SendGrid
 */
async function createSendGridDomain(domain: string) {
  console.log(`🌐 Creating domain in SendGrid: ${domain}`);

  const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      domain: domain,
      subdomain: 'mail',
      automatic_security: false,
      default: false,
      custom_spf: false
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ SendGrid API error:', errorData);
    
    // If 409, domain already exists - fetch it instead
    if (response.status === 409) {
      console.log('⚠️  Domain exists, fetching existing domain data...');
      return await fetchExistingSendGridDomain(domain);
    }
    
    throw new Error(`SendGrid API error: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log('✅ Domain created, ID:', data.id);

  // Fetch the domain again to get complete DNS records
  console.log('🔄 Fetching complete domain details...');
  
  const detailsResponse = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${data.id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!detailsResponse.ok) {
    console.error('❌ Failed to fetch domain details');
    throw new Error('Failed to fetch complete domain configuration');
  }

  const fullData = await detailsResponse.json();
  console.log('📦 Complete domain data:', JSON.stringify(fullData, null, 2));

  return extractDNSRecords(fullData);
}

/**
 * Validates domain in SendGrid
 */
async function validateSendGridDomain(sendgridDomainId: string) {
  if (TESTING_MODE) {
    console.log('⚠️  TESTING MODE: Simulating SendGrid validation');
    return {
      valid: true,
      validation_results: {
        dkim1: { valid: true },
        dkim2: { valid: true },
        mail_cname: { valid: true }
      }
    };
  }

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
    throw new Error('Failed to validate domain with SendGrid');
  }

  const data = await response.json();
  return data;
}

/**
 * Deletes domain from SendGrid
 */
async function deleteSendGridDomain(sendgridDomainId: string) {
  if (TESTING_MODE) {
    console.log('⚠️  TESTING MODE: Skipping SendGrid deletion');
    return;
  }

  await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${sendgridDomainId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`
    }
  });
}

/**
 * ============================================================================
 * DOMAIN OPERATION HANDLERS
 * ============================================================================
 */

/**
 * Adds a new domain for the user
 */
async function addDomain(supabase: any, userId: string, domain: string, planType: string) {
  console.log(`📧 Adding domain: ${domain}`);

  // Validate domain format
  const validation = validateDomain(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check plan access
  if (!checkDomainFeatureAccess(planType)) {
    throw new Error('Custom domains require Pro or Pro Plus plan');
  }

  // Check if domain already exists in database
  const { data: existing } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('domain', domain)
    .eq('user_id', userId)
    .single();

  if (existing) {
    throw new Error('Domain already exists for this user');
  }

  let sendgridDomainData;
  
  try {
    // Try to create domain in SendGrid
    sendgridDomainData = await createSendGridDomain(domain);
  } catch (error: any) {
    // If domain already exists in SendGrid (409 error), try to fetch it
    if (error.message.includes('409') || error.message.includes('already exists')) {
      console.log('⚠️ Domain already exists in SendGrid, attempting to fetch existing domain data...');
      
      try {
        // Fetch existing SendGrid domain
        sendgridDomainData = await fetchExistingSendGridDomain(domain);
      } catch (fetchError: any) {
        console.error('❌ Failed to fetch existing SendGrid domain:', fetchError);
        throw new Error('Domain already exists in SendGrid but could not be retrieved. Please contact support.');
      }
    } else {
      throw error;
    }
  }

  // Insert domain into database
  const { data: newDomain, error: insertError } = await supabase
    .from('sending_domains')
    .insert({
      user_id: userId,
      domain: domain,
      sendgrid_domain_id: sendgridDomainData.id.toString(),
      dns_records: sendgridDomainData.dns_records,
      verification_status: 'pending',
      is_default: false
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to insert domain:', insertError);
    throw new Error('Failed to save domain to database');
  }

  console.log('✅ Domain added successfully');
  return newDomain;
}

/**
 * Fetches existing domain from SendGrid by searching for it
 */
async function fetchExistingSendGridDomain(domain: string) {
  console.log(`🔍 Fetching existing domain: ${domain}`);

  const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch domains from SendGrid');
  }

  const allDomains = await response.json();
  
  // Find matching domain
  const matchingDomain = allDomains.find((d: any) => 
    d.domain === domain
  );

  if (!matchingDomain) {
    throw new Error(`Domain ${domain} not found in SendGrid`);
  }

  console.log('✅ Found existing domain, ID:', matchingDomain.id);
  console.log('📦 Full domain data:', JSON.stringify(matchingDomain, null, 2));

  return extractDNSRecords(matchingDomain);
}

/**
 * Extracts ALL DNS records from SendGrid domain object
 */
function extractDNSRecords(sendgridDomain: any) {
  const dns_records: any = {};

  console.log('📋 Extracting DNS records from SendGrid response...');

  // Mail Server (MX)
  if (sendgridDomain.dns?.mail_server) {
    dns_records.mail_server = {
      host: sendgridDomain.dns.mail_server.host,
      type: sendgridDomain.dns.mail_server.type,
      data: sendgridDomain.dns.mail_server.data,
      valid: sendgridDomain.dns.mail_server.valid || false
    };
    console.log('✅ mail_server:', dns_records.mail_server.data);
  }

  // Subdomain SPF (TXT)
  if (sendgridDomain.dns?.subdomain_spf) {
    dns_records.subdomain_spf = {
      host: sendgridDomain.dns.subdomain_spf.host,
      type: sendgridDomain.dns.subdomain_spf.type,
      data: sendgridDomain.dns.subdomain_spf.data,
      valid: sendgridDomain.dns.subdomain_spf.valid || false
    };
    console.log('✅ subdomain_spf:', dns_records.subdomain_spf.data);
  }

  // DKIM (TXT) - single record
  if (sendgridDomain.dns?.dkim) {
    dns_records.dkim = {
      host: sendgridDomain.dns.dkim.host,
      type: sendgridDomain.dns.dkim.type,
      data: sendgridDomain.dns.dkim.data,
      valid: sendgridDomain.dns.dkim.valid || false
    };
    console.log('✅ dkim:', dns_records.dkim.host);
  }

  // DKIM1 (CNAME format - alternative)
  if (sendgridDomain.dns?.dkim1) {
    dns_records.dkim1 = {
      host: sendgridDomain.dns.dkim1.host,
      type: sendgridDomain.dns.dkim1.type,
      data: sendgridDomain.dns.dkim1.data,
      valid: sendgridDomain.dns.dkim1.valid || false
    };
    console.log('✅ dkim1:', dns_records.dkim1.data);
  }

  // DKIM2 (CNAME format - alternative)
  if (sendgridDomain.dns?.dkim2) {
    dns_records.dkim2 = {
      host: sendgridDomain.dns.dkim2.host,
      type: sendgridDomain.dns.dkim2.type,
      data: sendgridDomain.dns.dkim2.data,
      valid: sendgridDomain.dns.dkim2.valid || false
    };
    console.log('✅ dkim2:', dns_records.dkim2.data);
  }

  // Mail CNAME
  if (sendgridDomain.dns?.mail_cname) {
    dns_records.mail_cname = {
      host: sendgridDomain.dns.mail_cname.host,
      type: sendgridDomain.dns.mail_cname.type,
      data: sendgridDomain.dns.mail_cname.data,
      valid: sendgridDomain.dns.mail_cname.valid || false
    };
    console.log('✅ mail_cname:', dns_records.mail_cname.data);
  }

  console.log(`📊 Total DNS records extracted: ${Object.keys(dns_records).length}`);

  if (Object.keys(dns_records).length === 0) {
    console.error('❌ No DNS records found in SendGrid response!');
    throw new Error('SendGrid did not return any DNS records');
  }

  return {
    id: sendgridDomain.id,
    dns_records: dns_records
  };
}


/**
 * Verifies a domain by checking DNS records
 */
async function verifyDomain(supabase: any, userId: string, domainId: string) {
  console.log(`🔍 Verifying domain: ${domainId}`);

  // Get domain from database
  const { data: domain, error: fetchError } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !domain) {
    throw new Error('Domain not found');
  }

  if (!domain.sendgrid_domain_id) {
    throw new Error('Domain missing SendGrid configuration');
  }

  // Validate in SendGrid
  const validationResult = await validateSendGridDomain(domain.sendgrid_domain_id);

  // Update domain status
  const newStatus = validationResult.valid ? 'verified' : 'failed';
  const updateData: any = {
    verification_status: newStatus,
    last_verified_at: new Date().toISOString()
  };

  if (validationResult.valid) {
    updateData.verified_at = new Date().toISOString();
  }

  // Update DNS records with validation results
  if (validationResult.validation_results) {
    const updatedDnsRecords = { ...domain.dns_records };
    const results = validationResult.validation_results;

    if (results.spf) updatedDnsRecords.spf.valid = results.spf.valid;
    if (results.dkim1) updatedDnsRecords.dkim1.valid = results.dkim1.valid;
    if (results.dkim2) updatedDnsRecords.dkim2.valid = results.dkim2.valid;
    if (results.mail_cname && updatedDnsRecords.mail_cname) {
      updatedDnsRecords.mail_cname.valid = results.mail_cname.valid;
    }

    updateData.dns_records = updatedDnsRecords;
  }

  const { data: updatedDomain, error: updateError } = await supabase
    .from('sending_domains')
    .update(updateData)
    .eq('id', domainId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to update domain:', updateError);
    throw new Error('Failed to update domain status');
  }

  console.log(`✅ Domain verification complete: ${newStatus}`);
  return {
    ...updatedDomain,
    validation_results: validationResult.validation_results
  };
}

/**
 * Lists all domains for a user
 */
async function listDomains(supabase: any, userId: string) {
  console.log(`📋 Listing domains for user: ${userId}`);

  const { data: domains, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to list domains:', error);
    throw new Error('Failed to retrieve domains');
  }

  console.log(`✅ Found ${domains?.length || 0} domains`);
  return domains || [];
}

/**
 * Deletes a domain
 */
async function deleteDomain(supabase: any, userId: string, domainId: string) {
  console.log(`🗑️  Deleting domain: ${domainId}`);

  // Get domain
  const { data: domain, error: fetchError } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !domain) {
    throw new Error('Domain not found');
  }

  // Delete from SendGrid
  if (domain.sendgrid_domain_id) {
    try {
      await deleteSendGridDomain(domain.sendgrid_domain_id);
    } catch (error) {
      console.warn('⚠️  Failed to delete from SendGrid (may already be deleted):', error);
    }
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('sending_domains')
    .delete()
    .eq('id', domainId);

  if (deleteError) {
    console.error('❌ Failed to delete domain:', deleteError);
    throw new Error('Failed to delete domain');
  }

  // If this was the default domain, set another as default
  if (domain.is_default) {
    const { data: otherDomains } = await supabase
      .from('sending_domains')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (otherDomains && otherDomains.length > 0) {
      await supabase
        .from('sending_domains')
        .update({ is_default: true })
        .eq('id', otherDomains[0].id);
    }
  }

  console.log('✅ Domain deleted successfully');
  return { success: true };
}

/**
 * Sets a domain as default
 */
async function setDefaultDomain(supabase: any, userId: string, domainId: string) {
  console.log(`⭐ Setting default domain: ${domainId}`);

  // Verify domain exists and belongs to user
  const { data: domain, error: fetchError } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !domain) {
    throw new Error('Domain not found');
  }

  // Unset current default
  await supabase
    .from('sending_domains')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);

  // Set new default
  const { data: updatedDomain, error: updateError } = await supabase
    .from('sending_domains')
    .update({ is_default: true })
    .eq('id', domainId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to set default domain:', updateError);
    throw new Error('Failed to set default domain');
  }

  console.log('✅ Default domain updated');
  return updatedDomain;
}

/**
 * Gets DNS configuration instructions for a domain
 */
async function getDNSInstructions(supabase: any, userId: string, domainId: string) {
  console.log(`📖 Getting DNS instructions for domain: ${domainId}`);

  const { data: domain, error } = await supabase
    .from('sending_domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', userId)
    .single();

  if (error || !domain) {
    throw new Error('Domain not found');
  }

  const dnsRecords = domain.dns_records || {};
  console.log('📋 DNS Records:', JSON.stringify(dnsRecords, null, 2));

  const instructionsArray = [];

  // 1. MX Record (mail_server)
  if (dnsRecords.mail_server?.data) {
    instructionsArray.push({
      step: instructionsArray.length + 1,
      title: 'Add MX Record',
      description: 'Mail exchange record for receiving emails',
      required: true,
      record: {
        type: (dnsRecords.mail_server.type || 'MX').toUpperCase(), // Convert to uppercase
        host: dnsRecords.mail_server.host,
        value: dnsRecords.mail_server.data,
        ttl: 300,
        valid: dnsRecords.mail_server.valid || false
      }
    });
  }

  // 2. SPF Record (subdomain_spf)
  if (dnsRecords.subdomain_spf?.data) {
    instructionsArray.push({
      step: instructionsArray.length + 1,
      title: 'Add TXT Record (SPF)',
      description: 'Authorizes SendGrid to send emails on your behalf',
      required: true,
      record: {
        type: (dnsRecords.subdomain_spf.type || 'TXT').toUpperCase(), // Convert to uppercase
        host: dnsRecords.subdomain_spf.host,
        value: dnsRecords.subdomain_spf.data,
        ttl: 300,
        valid: dnsRecords.subdomain_spf.valid || false
      }
    });
  }

  // 3. DKIM Record (single TXT record)
  if (dnsRecords.dkim?.data) {
    instructionsArray.push({
      step: instructionsArray.length + 1,
      title: 'Add TXT Record (DKIM)',
      description: 'DKIM signature for email authentication',
      required: true,
      record: {
        type: (dnsRecords.dkim.type || 'TXT').toUpperCase(), // Convert to uppercase
        host: dnsRecords.dkim.host,
        value: dnsRecords.dkim.data,
        ttl: 300,
        valid: dnsRecords.dkim.valid || false
      }
    });
  }

  // Alternative: DKIM1 (CNAME format)
  if (dnsRecords.dkim1?.data && !dnsRecords.dkim?.data) {
    instructionsArray.push({
      step: instructionsArray.length + 1,
      title: 'Add CNAME Record (DKIM 1)',
      description: 'First DKIM signature',
      required: true,
      record: {
        type: (dnsRecords.dkim1.type || 'CNAME').toUpperCase(),
        host: dnsRecords.dkim1.host,
        value: dnsRecords.dkim1.data,
        ttl: 300,
        valid: dnsRecords.dkim1.valid || false
      }
    });
  }

  // Alternative: DKIM2 (CNAME format)
  if (dnsRecords.dkim2?.data && !dnsRecords.dkim?.data) {
    instructionsArray.push({
      step: instructionsArray.length + 1,
      title: 'Add CNAME Record (DKIM 2)',
      description: 'Second DKIM signature',
      required: true,
      record: {
        type: (dnsRecords.dkim2.type || 'CNAME').toUpperCase(),
        host: dnsRecords.dkim2.host,
        value: dnsRecords.dkim2.data,
        ttl: 300,
        valid: dnsRecords.dkim2.valid || false
      }
    });
  }

  // 4. DMARC Record (optional)
  if (dnsRecords.dmarc?.data) {
    instructionsArray.push({
      step: instructionsArray.length + 1,
      title: 'Add TXT Record (DMARC)',
      description: 'Policy for handling authentication failures (optional)',
      required: false,
      record: {
        type: 'TXT',
        host: dnsRecords.dmarc.host,
        value: dnsRecords.dmarc.data,
        ttl: 300,
        valid: dnsRecords.dmarc.valid || false
      }
    });
  }

  if (instructionsArray.length === 0) {
    return {
      domain: domain.domain,
      status: 'failed',
      records: [],
      notes: [
        '⚠️ No DNS records available.',
        'Please delete and re-add the domain.'
      ]
    };
  }

  console.log(`✅ Generated ${instructionsArray.length} DNS records`);

  return {
    domain: domain.domain,
    status: domain.verification_status,
    records: instructionsArray,
    notes: [
      'Add all DNS records to your domain registrar',
      'DNS propagation takes 5 minutes to 48 hours',
      'Click "Verify Domain" after adding all records'
    ]
  };
}


/**
 * ============================================================================
 * MAIN HANDLER
 * ============================================================================
 */

serve(async (req: Request) => {
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
      },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get user's plan type
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    const planType = profile?.plan_type || 'free';

    // Parse URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts[0] = 'manage-domain' (base path)
    // pathParts[1] = action OR domainId
    // pathParts[2] = additional path segment (e.g., 'dns', 'set-default')

    console.log(`🎯 Path parts: ${JSON.stringify(pathParts)}, User: ${user.id}`);

    let result;

    // Route to appropriate handler - FIXED ROUTING LOGIC
    switch (req.method) {
      case 'POST':
        if (pathParts[1] === 'add') {
          // POST /manage-domain/add
          const { domain } = await req.json();
          result = await addDomain(supabase, user.id, domain, planType);
        } else if (pathParts[1] === 'verify' && pathParts[2]) {
          // POST /manage-domain/verify/{domainId}
          const domainId = pathParts[2];
          result = await verifyDomain(supabase, user.id, domainId);
        } else {
          throw new Error('Invalid POST action');
        }
        break;

      case 'GET':
        if (pathParts[1] === 'list') {
          // GET /manage-domain/list
          result = await listDomains(supabase, user.id);
        } else if (pathParts[1] && pathParts[2] === 'dns') {
          // GET /manage-domain/{domainId}/dns
          const domainId = pathParts[1];
          result = await getDNSInstructions(supabase, user.id, domainId);
        } else {
          throw new Error('Invalid GET action');
        }
        break;

      case 'DELETE':
        if (pathParts[1]) {
          // DELETE /manage-domain/{domainId}
          const domainId = pathParts[1];
          result = await deleteDomain(supabase, user.id, domainId);
        } else {
          throw new Error('Domain ID required for DELETE');
        }
        break;

      case 'PATCH':
        if (pathParts[1] && pathParts[2] === 'set-default') {
          // PATCH /manage-domain/{domainId}/set-default
          const domainId = pathParts[1];
          result = await setDefaultDomain(supabase, user.id, domainId);
        } else {
          throw new Error('Invalid PATCH action');
        }
        break;

      default:
        throw new Error('Method not allowed');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});