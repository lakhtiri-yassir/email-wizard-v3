/**
 * ============================================================================
 * DNS Instructions Modal Component
 * ============================================================================
 * 
 * Purpose: Show step-by-step DNS configuration instructions
 * 
 * Features:
 * - Fetch DNS instructions for domain
 * - Display records in easy-to-copy format
 * - Copy to clipboard functionality
 * - Verification trigger
 * - Provider-specific help (STEP 11: Will add provider integration)
 * 
 * Props:
 * - isOpen: Modal visibility
 * - onClose: Close handler
 * - domainId: Domain ID to show instructions for
 * - onVerify: Verification handler
 * 
 * Design System Compliance:
 * - Uses Button component with proper variants
 * - Uses .card class for modal container
 * - Uses design system colors
 * - No custom CSS classes or inline styles
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import domainService, { DNSInstructions } from '../../lib/domainService';
import { Button } from '../ui/Button';
import DNSProviderSelector, { DNSProvider } from './DNSProviderSelector';
import CloudflareGuide from './guides/CloudflareGuide';
import GoDaddyGuide from './guides/GoDaddyGuide';
import NamecheapGuide from './guides/NamecheapGuide';
import GoogleDomainsGuide from './guides/GoogleDomainsGuide';
import Route53Guide from './guides/Route53Guide';
import GenericGuide from './guides/GenericGuide';

interface DNSInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId: string | null;
  onVerify: (domainId: string) => Promise<any>;
}

/**
 * DNS Instructions Modal Component
 */
export default function DNSInstructionsModal({
  isOpen,
  onClose,
  domainId,
  onVerify
}: DNSInstructionsModalProps) {
  // State
  const [instructions, setInstructions] = useState<DNSInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<DNSProvider>('generic');

  /**
   * Load DNS instructions when modal opens or domainId changes
   */
  useEffect(() => {
    if (isOpen && domainId) {
      loadInstructions();
    }
  }, [isOpen, domainId]);

  /**
   * Loads DNS instructions for the domain
   */
  async function loadInstructions() {
    if (!domainId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await domainService.getDNSInstructions(domainId);
      if (data) {
        setInstructions(data);
      } else {
        setError('Failed to load DNS instructions');
      }
    } catch (err: any) {
      console.error('Failed to load DNS instructions:', err);
      setError(err.message || 'Failed to load DNS instructions');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles domain verification
   */
  async function handleVerify() {
    if (!domainId) return;

    setVerifying(true);
    const result = await onVerify(domainId);
    setVerifying(false);

    // Reload instructions to show updated validation status
    if (result.success) {
      await loadInstructions();
    }
  }

  /**
   * Renders the appropriate provider guide based on selection
   */
  function renderProviderGuide() {
    if (!instructions) return null;
    
    switch (selectedProvider) {
      case 'cloudflare':
        return <CloudflareGuide instructions={instructions} />;
      case 'godaddy':
        return <GoDaddyGuide instructions={instructions} />;
      case 'namecheap':
        return <NamecheapGuide instructions={instructions} />;
      case 'google':
        return <GoogleDomainsGuide instructions={instructions} />;
      case 'route53':
        return <Route53Guide instructions={instructions} />;
      case 'generic':
      default:
        return <GenericGuide instructions={instructions} />;
    }
  }

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="card max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-serif font-bold mb-1">DNS Configuration</h2>
              {instructions && (
                <p className="text-sm text-gray-600">
                  Domain: <strong>{instructions.domain}</strong>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-purple animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Error Loading Instructions</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Content */}
          {!loading && !error && instructions && (
            <>
              {/* Provider Selector */}
              <DNSProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
              />
              
              {/* Dynamic Provider Guide */}
              {renderProviderGuide()}
            </>
          )}

          {/* Footer Actions */}
          {!loading && !error && instructions && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleVerify}
                loading={verifying}
                icon={CheckCircle}
              >
                Verify Domain
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
