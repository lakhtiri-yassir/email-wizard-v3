/**
 * ============================================================================
 * Domain Service
 * ============================================================================
 * 
 * Purpose: Frontend service layer for custom domain management
 * 
 * Functions:
 * - addDomain(): Add new custom domain
 * - verifyDomain(): Trigger domain verification
 * - listDomains(): Get all user domains
 * - deleteDomain(): Remove domain
 * - setDefaultDomain(): Set domain as default
 * - getDNSInstructions(): Get DNS configuration steps
 * - formatDNSRecords(): Format DNS records for display
 * - copyToClipboard(): Copy DNS record to clipboard
 * 
 * Dependencies:
 * - Supabase client for authentication
 * - Browser Clipboard API
 * 
 * ============================================================================
 */

import { supabase } from '../supabase';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

export interface Domain {
  id: string;
  user_id: string;
  domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  dns_records: DNSRecords;
  sendgrid_domain_id: string;
  created_at: string;
  verified_at: string | null;
  is_default: boolean;
  last_verified_at: string | null;
}

export interface DNSRecords {
  spf?: DNSRecord;
  dkim1: DNSRecord;
  dkim2: DNSRecord;
  mail_cname?: DNSRecord;
}

export interface DNSRecord {
  host: string;
  type: 'TXT' | 'CNAME';
  data: string;
  valid?: boolean;
}

export interface DNSInstruction {
  step: number;
  title: string;
  description: string;
  required: boolean;
  record: {
    type: string;
    host: string;
    value: string;
    ttl: number;
    valid?: boolean;
  };
}

export interface DNSInstructions {
  domain: string;
  status: string;
  records: DNSInstruction[];
  notes: string[];
}

export interface AddDomainResponse {
  success: boolean;
  domain?: Domain;
  error?: string;
}

export interface VerifyDomainResponse {
  success: boolean;
  domain?: Domain;
  validation_results?: any;
  error?: string;
}

/**
 * ============================================================================
 * API HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Gets the base URL for edge functions
 */
function getEdgeFunctionURL(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL environment variable is not set');
  }
  return `${supabaseUrl}/functions/v1`;
}

/**
 * Gets the current user's access token
 */
async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('User not authenticated');
  }
  
  return session.access_token;
}

/**
 * Makes an authenticated request to an edge function
 */
async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  const baseURL = getEdgeFunctionURL();
  
  const response = await fetch(`${baseURL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response;
}

/**
 * ============================================================================
 * DOMAIN CRUD OPERATIONS
 * ============================================================================
 */

/**
 * Adds a new custom domain for the user
 */
export async function addDomain(domain: string): Promise<AddDomainResponse> {
  try {
    console.log(`📧 Adding domain: ${domain}`);
    
    // Validate domain format on client side
    const validation = validateDomainFormat(domain);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    const response = await makeAuthenticatedRequest('/manage-domain/add', {
      method: 'POST',
      body: JSON.stringify({ domain })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to add domain:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to add domain'
      };
    }
    
    console.log('✅ Domain added successfully:', data.id);
    return {
      success: true,
      domain: data
    };
    
  } catch (error: any) {
    console.error('❌ Exception adding domain:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Triggers domain verification by checking DNS records
 */
export async function verifyDomain(domainId: string): Promise<VerifyDomainResponse> {
  try {
    console.log(`🔍 Verifying domain: ${domainId}`);

    const response = await makeAuthenticatedRequest(`/manage-domain/${domainId}/verify`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to verify domain:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to verify domain'
      };
    }

    const isVerified = data.verification_status === 'verified';
    console.log(isVerified ? '✅ Domain verified!' : '⚠️ Domain not verified yet');

    return {
      success: true,
      domain: data,
      validation_results: data.validation_results
    };

  } catch (error: any) {
    console.error('❌ Exception verifying domain:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Checks domain status by triggering SendGrid DNS validation
 * This calls the dedicated check-domain-status edge function
 */
export async function checkDomainStatus(domainId: string): Promise<VerifyDomainResponse> {
  try {
    console.log(`🔍 Checking domain status: ${domainId}`);

    const response = await makeAuthenticatedRequest('/check-domain-status', {
      method: 'POST',
      body: JSON.stringify({ domainId })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('❌ Failed to check domain status:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to check domain status'
      };
    }

    const isVerified = data.domain.verification_status === 'verified';
    console.log(isVerified ? '✅ Domain verified!' : '⚠️ Domain not verified yet');

    return {
      success: true,
      domain: data.domain,
      validation_results: data.validation_results
    };

  } catch (error: any) {
    console.error('❌ Exception checking domain status:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Retrieves all domains for the current user
 */
export async function listDomains(): Promise<Domain[]> {
  try {
    console.log('📋 Fetching domain list...');
    
    const response = await makeAuthenticatedRequest('/manage-domain/list', {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to fetch domains:', data.error);
      throw new Error(data.error || 'Failed to fetch domains');
    }
    
    console.log(`✅ Retrieved ${data.length} domains`);
    return data;
    
  } catch (error: any) {
    console.error('❌ Exception fetching domains:', error);
    throw error;
  }
}

/**
 * Deletes a domain
 */
export async function deleteDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🗑️ Deleting domain: ${domainId}`);
    
    const response = await makeAuthenticatedRequest(`/manage-domain/${domainId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to delete domain:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to delete domain'
      };
    }
    
    console.log('✅ Domain deleted successfully');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Exception deleting domain:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Sets a domain as the default sending domain
 */
export async function setDefaultDomain(domainId: string): Promise<{ success: boolean; domain?: Domain; error?: string }> {
  try {
    console.log(`⭐ Setting default domain: ${domainId}`);
    
    const response = await makeAuthenticatedRequest(`/manage-domain/${domainId}/set-default`, {
      method: 'PATCH'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to set default domain:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to set default domain'
      };
    }
    
    console.log('✅ Default domain updated');
    return {
      success: true,
      domain: data
    };
    
  } catch (error: any) {
    console.error('❌ Exception setting default domain:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Gets DNS configuration instructions for a domain
 */
export async function getDNSInstructions(domainId: string): Promise<DNSInstructions | null> {
  try {
    console.log(`📖 Fetching DNS instructions for: ${domainId}`);
    
    const response = await makeAuthenticatedRequest(`/manage-domain/${domainId}/dns`, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to fetch DNS instructions:', data.error);
      throw new Error(data.error || 'Failed to fetch DNS instructions');
    }
    
    console.log('✅ DNS instructions retrieved');
    return data;
    
  } catch (error: any) {
    console.error('❌ Exception fetching DNS instructions:', error);
    return null;
  }
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Validates domain format on client side
 */
export function validateDomainFormat(domain: string): { valid: boolean; error?: string } {
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Check length
  if (domain.length > 253) {
    return { valid: false, error: 'Domain name too long (max 253 characters)' };
  }
  
  if (domain.length < 3) {
    return { valid: false, error: 'Domain name too short (min 3 characters)' };
  }
  
  // Check format
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
 * Formats DNS records for display
 */
export function formatDNSRecords(records: DNSRecords): Array<{
  name: string;
  type: string;
  host: string;
  value: string;
  ttl: number;
  valid?: boolean;
}> {
  const formatted: any[] = [];
  
  // Mail CNAME
  if (records.mail_cname) {
    formatted.push({
      name: 'Mail CNAME',
      type: records.mail_cname.type,
      host: records.mail_cname.host,
      value: records.mail_cname.data,
      ttl: 300,
      valid: records.mail_cname.valid
    });
  }
  
  // DKIM1
  formatted.push({
    name: 'DKIM Record 1',
    type: records.dkim1.type,
    host: records.dkim1.host,
    value: records.dkim1.data,
    ttl: 300,
    valid: records.dkim1.valid
  });
  
  // DKIM2
  formatted.push({
    name: 'DKIM Record 2',
    type: records.dkim2.type,
    host: records.dkim2.host,
    value: records.dkim2.data,
    ttl: 300,
    valid: records.dkim2.valid
  });
  
  // SPF (optional but recommended)
  if (records.spf) {
    formatted.push({
      name: 'SPF Record (Optional)',
      type: records.spf.type,
      host: records.spf.host,
      value: records.spf.data,
      ttl: 300,
      valid: records.spf.valid
    });
  }
  
  return formatted;
}

/**
 * Copies text to clipboard with user feedback
 */
export async function copyToClipboard(text: string, label: string = 'Text'): Promise<boolean> {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      console.log(`✅ ${label} copied to clipboard`);
      return true;
    } 
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      console.log(`✅ ${label} copied to clipboard (fallback)`);
      return true;
    }
    
    throw new Error('Copy command failed');
    
  } catch (error) {
    console.error(`❌ Failed to copy ${label}:`, error);
    return false;
  }
}

/**
 * Gets a user-friendly status message for domain verification
 */
export function getStatusMessage(
  status: 'pending' | 'verified' | 'failed',
  lastVerified: string | null
): string {
  switch (status) {
    case 'verified':
      return 'Domain verified and ready to use';
    
    case 'pending':
      if (!lastVerified) {
        return 'Waiting for DNS configuration';
      }
      return 'DNS records not detected yet. Please allow up to 30 minutes for propagation.';
    
    case 'failed':
      return 'Verification failed. Please check your DNS configuration.';
    
    default:
      return 'Unknown status';
  }
}

/**
 * Calculates time since last verification
 */
export function getTimeSince(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Checks if domain verification should be retried
 */
export function canRetryVerification(
  status: 'pending' | 'verified' | 'failed',
  createdAt: string
): boolean {
  if (status === 'verified') return false;
  
  const created = new Date(createdAt);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - created.getTime()) / 3600000;
  
  // Allow retry for 72 hours
  return hoursSinceCreation < 72;
}

/**
 * Gets verification status color for UI
 */
export function getStatusColor(status: 'pending' | 'verified' | 'failed'): string {
  switch (status) {
    case 'verified':
      return 'green';
    case 'pending':
      return 'yellow';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * ============================================================================
 * EXPORT DEFAULT SERVICE OBJECT
 * ============================================================================
 */

export const domainService = {
  // CRUD operations
  addDomain,
  verifyDomain,
  checkDomainStatus,
  listDomains,
  deleteDomain,
  setDefaultDomain,
  getDNSInstructions,

  // Helper functions
  validateDomainFormat,
  formatDNSRecords,
  copyToClipboard,
  getStatusMessage,
  getTimeSince,
  canRetryVerification,
  getStatusColor
};

export default domainService;
