/**
 * ============================================================================
 * Domain Card Component
 * ============================================================================
 * 
 * Purpose: Display individual domain with status, actions, and information
 * 
 * Features:
 * - Status badge with color coding
 * - Default domain indicator
 * - Verification status and timestamp
 * - Action buttons (verify, set default, delete, view DNS)
 * - Loading states for async actions
 * 
 * Props:
 * - domain: Domain object
 * - onVerify: Verification handler
 * - onSetDefault: Set default handler
 * - onDelete: Delete handler
 * - onViewDNS: View DNS instructions handler
 * 
 * Design System Compliance:
 * - Uses .card class for container
 * - Uses Button component with proper variants
 * - Uses design system colors (gold, purple, red, green)
 * - No custom CSS classes or inline styles
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Star, 
  Trash2, 
  Eye, 
  RefreshCw,
  Globe
} from 'lucide-react';
import { Domain } from '../../lib/domainService';
import { Button } from '../ui/Button';

interface DomainCardProps {
  domain: Domain;
  onVerify: (domainId: string) => Promise<any>;
  onSetDefault: (domainId: string) => Promise<any>;
  onDelete: (domainId: string) => Promise<any>;
  onViewDNS: (domainId: string) => void;
}

/**
 * Domain Card Component
 */
export default function DomainCard({
  domain,
  onVerify,
  onSetDefault,
  onDelete,
  onViewDNS
}: DomainCardProps) {
  // Loading states for async actions
  const [verifying, setVerifying] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /**
   * Handles domain verification
   */
  async function handleVerify() {
    setVerifying(true);
    const result = await onVerify(domain.id);
    setVerifying(false);
  }

  /**
   * Handles setting domain as default
   */
  async function handleSetDefault() {
    setSettingDefault(true);
    const result = await onSetDefault(domain.id);
    setSettingDefault(false);
  }

  /**
   * Handles domain deletion
   */
  async function handleDelete() {
    setDeleting(true);
    const result = await onDelete(domain.id);
    setDeleting(false);
  }

  // Status helpers
  const isVerified = domain.verification_status === 'verified';
  const isPending = domain.verification_status === 'pending';
  const isFailed = domain.verification_status === 'failed';

  /**
   * Renders status badge with appropriate styling
   */
  function renderStatusBadge() {
    if (isVerified) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gold text-black">
          <CheckCircle size={14} />
          Verified
        </span>
      );
    } else if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
          <Clock size={14} />
          Pending
        </span>
      );
    } else if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700">
          <XCircle size={14} />
          Failed
        </span>
      );
    }
    return null;
  }

  /**
   * Formats date for display
   */
  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Gets time since last action
   */
  function getTimeSince(dateString: string | null): string {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        {/* Domain Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Domain Icon */}
            <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-purple" />
            </div>
            
            {/* Domain Name & Badges */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-serif font-bold">{domain.domain}</h3>
                {renderStatusBadge()}
                {domain.is_default && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple/10 text-purple">
                    <Star size={14} />
                    Default
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-sm text-gray-600 space-y-1 ml-13">
            <div>
              <span className="font-medium">Created:</span> {formatDate(domain.created_at)}
            </div>
            {domain.verified_at && (
              <div>
                <span className="font-medium">Verified:</span> {formatDate(domain.verified_at)}
              </div>
            )}
            {domain.last_verified_at && (
              <div>
                <span className="font-medium">Last Check:</span> {getTimeSince(domain.last_verified_at)}
              </div>
            )}
          </div>

          {/* Status Message */}
          {isPending && (
            <p className="text-sm text-gray-600 mt-3">
              Waiting for DNS records to be verified. This usually takes 5-30 minutes after adding the records.
            </p>
          )}
          {isFailed && (
            <p className="text-sm text-red-600 mt-3">
              Verification failed. Please check your DNS records and try again.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* View DNS Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => onViewDNS(domain.id)}
          >
            View DNS
          </Button>

          {/* Verify Button (only for pending/failed) */}
          {!isVerified && (
            <Button
              variant={isPending ? "secondary" : "primary"}
              size="sm"
              icon={RefreshCw}
              onClick={handleVerify}
              loading={verifying}
            >
              {isPending ? 'Check Status' : 'Retry Verify'}
            </Button>
          )}

          {/* Set Default Button (only for verified, non-default domains) */}
          {isVerified && !domain.is_default && (
            <Button
              variant="secondary"
              size="sm"
              icon={Star}
              onClick={handleSetDefault}
              loading={settingDefault}
            >
              Set Default
            </Button>
          )}

          {/* Delete Button */}
          <Button
            variant="destructive"
            size="sm"
            icon={Trash2}
            onClick={handleDelete}
            loading={deleting}
            disabled={domain.is_default}
            title={domain.is_default ? 'Cannot delete default domain' : 'Delete domain'}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* DNS Records Summary (for non-verified domains) */}
      {!isVerified && domain.dns_records && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            DNS Records Status:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Mail CNAME */}
            {domain.dns_records.mail_cname && (
              <div className="flex items-center gap-2 text-sm">
                {domain.dns_records.mail_cname.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={domain.dns_records.mail_cname.valid ? 'text-green-700' : 'text-red-700'}>
                  Mail CNAME
                </span>
              </div>
            )}
            
            {/* DKIM 1 */}
            {domain.dns_records.dkim1 && (
              <div className="flex items-center gap-2 text-sm">
                {domain.dns_records.dkim1.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={domain.dns_records.dkim1.valid ? 'text-green-700' : 'text-red-700'}>
                  DKIM 1
                </span>
              </div>
            )}
            
            {/* DKIM 2 */}
            {domain.dns_records.dkim2 && (
              <div className="flex items-center gap-2 text-sm">
                {domain.dns_records.dkim2.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={domain.dns_records.dkim2.valid ? 'text-green-700' : 'text-red-700'}>
                  DKIM 2
                </span>
              </div>
            )}
            
            {/* SPF */}
            {domain.dns_records.spf && (
              <div className="flex items-center gap-2 text-sm">
                {domain.dns_records.spf.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={domain.dns_records.spf.valid ? 'text-green-700' : 'text-red-700'}>
                  SPF
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
