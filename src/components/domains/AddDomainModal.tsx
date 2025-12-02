/**
 * ============================================================================
 * Add Domain Modal Component
 * ============================================================================
 * 
 * Purpose: Modal dialog for adding new custom domains
 * 
 * Features:
 * - Domain input with real-time validation
 * - Error display with helpful messages
 * - Loading state during submission
 * - Success callback
 * - Keyboard support (Enter to submit, Esc to close)
 * 
 * Props:
 * - isOpen: Modal visibility state
 * - onClose: Close handler
 * - onDomainAdded: Success callback with domain data
 * 
 * Design System Compliance:
 * - Uses Button component with proper variants
 * - Uses Input component for form fields
 * - Uses .card class for modal container
 * - Uses design system colors
 * - No custom CSS classes or inline styles
 * 
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { X, Globe, AlertCircle } from 'lucide-react';
import domainService, { Domain } from '../../lib/domainService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDomainAdded: (domain: Domain) => void;
}

/**
 * Add Domain Modal Component
 */
export default function AddDomainModal({
  isOpen,
  onClose,
  onDomainAdded
}: AddDomainModalProps) {
  // State
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Focus input when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      // Reset state when modal opens
      setDomain('');
      setError(null);
      setValidationError(null);
    }
  }, [isOpen]);

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !loading && !validationError && domain.trim()) {
        handleSubmit();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, domain, validationError]);

  /**
   * Validates domain as user types
   */
  function handleDomainChange(value: string) {
    setDomain(value);
    setError(null);

    // Real-time validation (only if user has typed something)
    if (value.trim()) {
      const validation = domainService.validateDomainFormat(value);
      setValidationError(validation.valid ? null : validation.error || null);
    } else {
      setValidationError(null);
    }
  }

  /**
   * Handles form submission
   */
  async function handleSubmit() {
    // Validate before submission
    const validation = domainService.validateDomainFormat(domain);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid domain format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await domainService.addDomain(domain);
      
      if (result.success && result.domain) {
        onDomainAdded(result.domain);
        // Reset form
        setDomain('');
        setValidationError(null);
      } else {
        setError(result.error || 'Failed to add domain. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to add domain:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
          className="card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold">Add Custom Domain</h2>
                <p className="text-sm text-gray-600">
                  Enter your domain to start the verification process
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Domain Input */}
            <div>
              <Input
                ref={inputRef}
                type="text"
                label="Domain Name"
                placeholder="example.com"
                value={domain}
                onChange={(e) => handleDomainChange(e.target.value)}
                disabled={loading}
                icon={Globe}
              />
              
              {/* Validation Error (real-time) */}
              {validationError && !error && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {validationError}
                </p>
              )}

              {/* Helper Text */}
              {!validationError && !error && (
                <p className="text-sm text-gray-500 mt-2">
                  Enter just the domain name (e.g., "example.com" or "mail.example.com")
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Error Adding Domain</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>We'll generate DNS records for your domain</li>
                <li>You'll add these records to your DNS provider</li>
                <li>We'll verify the records (usually takes 5-30 minutes)</li>
                <li>Once verified, you can start sending emails from your domain</li>
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={loading}
              disabled={loading || !!validationError || !domain.trim()}
            >
              Add Domain
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
