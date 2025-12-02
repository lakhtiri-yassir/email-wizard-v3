/**
 * ============================================================================
 * Domains Management Page
 * ============================================================================
 * 
 * Purpose: Main page for managing custom sending domains
 * 
 * Features:
 * - List all user domains with status
 * - Add new domain
 * - Verify domains
 * - View DNS instructions
 * - Delete domains
 * - Set default domain
 * 
 * Dependencies:
 * - domainService for API calls
 * - DomainCard for individual domain display
 * - AddDomainModal for adding new domains
 * - DNSInstructionsModal for DNS setup guide
 * 
 * Design System Compliance:
 * - Uses Button component with proper variants
 * - Uses .card class for containers
 * - Uses design system colors (gold, purple, black, white)
 * - No custom CSS classes or inline styles
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Globe, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import domainService, { Domain } from '../../../lib/domainService';
import AppLayout from '../../../components/app/AppLayout';
import { Button } from '../../../components/ui/Button';
import DomainCard from '../../../components/domains/DomainCard';
import AddDomainModal from '../../../components/domains/AddDomainModal';
import DNSInstructionsModal from '../../../components/domains/DNSInstructionsModal';

/**
 * Main Domains Management Page Component
 */
export default function Domains() {
  // State management
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  /**
   * Load domains on component mount
   */
  useEffect(() => {
    loadDomains();
  }, []);

  /**
   * Loads all domains for the current user
   */
  async function loadDomains() {
    try {
      setError(null);
      const data = await domainService.listDomains();
      setDomains(data);
    } catch (err: any) {
      console.error('Failed to load domains:', err);
      setError(err.message || 'Failed to load domains. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Refreshes the domain list
   */
  async function handleRefresh() {
    setRefreshing(true);
    await loadDomains();
    setRefreshing(false);
  }

  /**
   * Handles successful domain addition
   */
  function handleDomainAdded(domain: Domain) {
    setDomains(prev => [domain, ...prev]);
    setShowAddModal(false);
    
    // Automatically show DNS instructions for new domain
    setSelectedDomainId(domain.id);
    setShowDNSModal(true);
  }

  /**
   * Handles domain verification
   */
  async function handleVerify(domainId: string) {
    try {
      const result = await domainService.verifyDomain(domainId);
      
      if (result.success && result.domain) {
        // Update domain in state
        setDomains(prev => prev.map(d => 
          d.id === domainId ? result.domain! : d
        ));
      }
      
      return result;
    } catch (err: any) {
      console.error('Verification failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Handles setting a domain as default
   */
  async function handleSetDefault(domainId: string) {
    try {
      const result = await domainService.setDefaultDomain(domainId);
      
      if (result.success) {
        // Update all domains in state
        setDomains(prev => prev.map(d => ({
          ...d,
          is_default: d.id === domainId
        })));
      }
      
      return result;
    } catch (err: any) {
      console.error('Failed to set default:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Handles domain deletion
   */
  async function handleDelete(domainId: string) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
      return { success: false };
    }

    try {
      const result = await domainService.deleteDomain(domainId);
      
      if (result.success) {
        // Remove domain from state
        setDomains(prev => prev.filter(d => d.id !== domainId));
      }
      
      return result;
    } catch (err: any) {
      console.error('Failed to delete domain:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Opens DNS instructions modal for a domain
   */
  function handleViewDNS(domainId: string) {
    setSelectedDomainId(domainId);
    setShowDNSModal(true);
  }

  /**
   * Closes DNS instructions modal
   */
  function handleCloseDNSModal() {
    setShowDNSModal(false);
    setSelectedDomainId(null);
  }

  return (
    <AppLayout currentPath="/app/settings/domains">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold">Custom Domains</h1>
                <p className="text-gray-600">
                  Add and verify custom domains for sending emails
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="tertiary"
                size="md"
                icon={RefreshCw}
                onClick={handleRefresh}
                loading={refreshing}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => setShowAddModal(true)}
              >
                Add Domain
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple animate-spin" />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="card bg-red-50 border-red-200 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Domains</h3>
                <p className="text-sm text-red-700">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadDomains}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && domains.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">No Custom Domains Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Add a custom domain to send emails from your own domain name and improve deliverability.
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Domain
            </Button>
          </div>
        )}

        {/* Domain List */}
        {!loading && !error && domains.length > 0 && (
          <div className="space-y-4">
            {domains.map(domain => (
              <DomainCard
                key={domain.id}
                domain={domain}
                onVerify={handleVerify}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
                onViewDNS={handleViewDNS}
              />
            ))}
          </div>
        )}

        {/* Help Section */}
        {!loading && domains.length > 0 && (
          <div className="card bg-blue-50 border-blue-200 p-6 mt-8">
            <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• DNS changes typically take 5-30 minutes to propagate</li>
              <li>• Verified domains will be automatically used for your campaigns</li>
              <li>• The default domain is used when no specific domain is selected</li>
              <li>• Contact support if you're having trouble verifying your domain</li>
            </ul>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddDomainModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onDomainAdded={handleDomainAdded}
      />

      <DNSInstructionsModal
        isOpen={showDNSModal}
        onClose={handleCloseDNSModal}
        domainId={selectedDomainId}
        onVerify={handleVerify}
      />
    </AppLayout>
  );
}
