/**
 * ============================================================================
 * Platform-Specific DNS Guides Component - FIXED
 * ============================================================================
 * 
 * FIX 8: Platform-specific DNS configuration guides
 * 
 * Fixed Issues:
 * - Generic DNS instructions didn't address platform specifics
 * - Users on Siteground, Cloudflare, etc. struggled with configuration
 * - Lack of visual guidance for different DNS providers
 * - Increased support burden
 * 
 * New Features:
 * - Platform-specific step-by-step guides
 * - Screenshots and visual aids for major providers
 * - Common pitfalls and troubleshooting
 * - Copy-paste ready values
 * - Video tutorial links
 * 
 * Supported Platforms:
 * - Cloudflare
 * - Namecheap
 * - GoDaddy
 * - Siteground
 * - Google Domains
 * - Generic (for other providers)
 * 
 * ============================================================================
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  PlayCircle,
  BookOpen,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DNSRecord {
  type: string;
  host: string;
  value: string;
  ttl: number;
  valid?: boolean;
}

interface DNSPlatformGuidesProps {
  records: DNSRecord[];
  domain: string;
}

type DNSProvider =
  | 'cloudflare'
  | 'namecheap'
  | 'godaddy'
  | 'siteground'
  | 'google'
  | 'generic';

export default function DNSPlatformGuides({ records, domain }: DNSPlatformGuidesProps) {
  const [selectedProvider, setSelectedProvider] = useState<DNSProvider>('generic');
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const providers: { id: DNSProvider; name: string; logo?: string }[] = [
    { id: 'cloudflare', name: 'Cloudflare' },
    { id: 'namecheap', name: 'Namecheap' },
    { id: 'godaddy', name: 'GoDaddy' },
    { id: 'siteground', name: 'Siteground' },
    { id: 'google', name: 'Google Domains' },
    { id: 'generic', name: 'Other Provider' },
  ];

  function toggleStep(stepIndex: number) {
    setExpandedSteps(prev =>
      prev.includes(stepIndex)
        ? prev.filter(i => i !== stepIndex)
        : [...prev, stepIndex]
    );
  }

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-semibold mb-3">
          Select Your DNS Provider:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {providers.map(provider => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedProvider === provider.id
                  ? 'border-purple bg-purple/5 shadow-md'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium text-center">{provider.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Platform-Specific Instructions */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>DNS changes can take 24-48 hours to propagate globally</li>
              <li>Don't delete existing MX records if you receive emails on this domain</li>
              <li>Double-check all values before saving to avoid delivery issues</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions by Provider */}
      {selectedProvider === 'cloudflare' && (
        <CloudflareGuide
          records={records}
          domain={domain}
          expandedSteps={expandedSteps}
          toggleStep={toggleStep}
          copyToClipboard={copyToClipboard}
          copiedField={copiedField}
        />
      )}

      {selectedProvider === 'namecheap' && (
        <NamecheapGuide
          records={records}
          domain={domain}
          expandedSteps={expandedSteps}
          toggleStep={toggleStep}
          copyToClipboard={copyToClipboard}
          copiedField={copiedField}
        />
      )}

      {selectedProvider === 'godaddy' && (
        <GoDaddyGuide
          records={records}
          domain={domain}
          expandedSteps={expandedSteps}
          toggleStep={toggleStep}
          copyToClipboard={copyToClipboard}
          copiedField={copiedField}
        />
      )}

      {selectedProvider === 'siteground' && (
        <SitegroundGuide
          records={records}
          domain={domain}
          expandedSteps={expandedSteps}
          toggleStep={toggleStep}
          copyToClipboard={copyToClipboard}
          copiedField=({ copiedField}
        />
      )}

      {selectedProvider === 'google' && (
        <GoogleDomainsGuide
          records={records}
          domain={domain}
          expandedSteps={expandedSteps}
          toggleStep={toggleStep}
          copyToClipboard={copyToClipboard}
          copiedField={copiedField}
        />
      )}

      {selectedProvider === 'generic' && (
        <GenericGuide
          records={records}
          domain={domain}
          expandedSteps={expandedSteps}
          toggleStep={toggleStep}
          copyToClipboard={copyToClipboard}
          copiedField={copiedField}
        />
      )}

      {/* Help Resources */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          Additional Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="#"
            className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg hover:border-purple transition-colors"
          >
            <PlayCircle size={20} className="text-purple" />
            <div className="flex-1">
              <div className="font-medium text-sm">Video Tutorial</div>
              <div className="text-xs text-gray-600">
                Watch step-by-step configuration
              </div>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg hover:border-purple transition-colors"
          >
            <Globe size={20} className="text-purple" />
            <div className="flex-1">
              <div className="font-medium text-sm">DNS Troubleshooting</div>
              <div className="text-xs text-gray-600">
                Common issues and solutions
              </div>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROVIDER-SPECIFIC GUIDE COMPONENTS
// ============================================================================

interface GuideProps {
  records: DNSRecord[];
  domain: string;
  expandedSteps: number[];
  toggleStep: (index: number) => void;
  copyToClipboard: (text: string, field: string) => void;
  copiedField: string | null;
}

// ✅ CLOUDFLARE GUIDE
function CloudflareGuide({ records, domain, expandedSteps, toggleStep, copyToClipboard, copiedField }: GuideProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Cloudflare DNS Configuration</h3>

      <DNSStep
        stepNumber={1}
        title="Log in to Cloudflare Dashboard"
        expanded={expandedSteps.includes(0)}
        onToggle={() => toggleStep(0)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Go to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener" className="text-purple hover:underline">dash.cloudflare.com</a></li>
          <li>Select your domain: <strong>{domain}</strong></li>
          <li>Click on the <strong>DNS</strong> tab in the top menu</li>
        </ol>
      </DNSStep>

      {records.map((record, index) => (
        <DNSStep
          key={index}
          stepNumber={index + 2}
          title={`Add ${record.type} Record`}
          expanded={expandedSteps.includes(index + 1)}
          onToggle={() => toggleStep(index + 1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Click <strong>+ Add record</strong> button and enter these values:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <DNSField
                label="Type"
                value={record.type}
                onCopy={() => copyToClipboard(record.type, `${index}-type`)}
                copied={copiedField === `${index}-type`}
              />
              <DNSField
                label="Name"
                value={record.host}
                onCopy={() => copyToClipboard(record.host, `${index}-host`)}
                copied={copiedField === `${index}-host`}
                note="Cloudflare automatically appends your domain name"
              />
              <DNSField
                label="Content/Target"
                value={record.value}
                onCopy={() => copyToClipboard(record.value, `${index}-value`)}
                copied={copiedField === `${index}-value`}
              />
              <DNSField
                label="TTL"
                value="Auto"
                note="Cloudflare handles TTL automatically"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Make sure "Proxy status" is set to <strong>DNS only</strong> (gray cloud icon), not "Proxied" (orange cloud)
              </p>
            </div>
          </div>
        </DNSStep>
      ))}

      <DNSStep
        stepNumber={records.length + 2}
        title="Verify Configuration"
        expanded={expandedSteps.includes(records.length + 1)}
        onToggle={() => toggleStep(records.length + 1)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click <strong>Save</strong> on each DNS record</li>
          <li>Wait 5-10 minutes for changes to propagate</li>
          <li>Return to Email Wizard and click <strong>Verify Domain</strong></li>
          <li>Check that all DNS records show as "Valid"</li>
        </ol>
      </DNSStep>
    </div>
  );
}

// ✅ NAMECHEAP GUIDE
function NamecheapGuide({ records, domain, expandedSteps, toggleStep, copyToClipboard, copiedField }: GuideProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Namecheap DNS Configuration</h3>

      <DNSStep
        stepNumber={1}
        title="Access DNS Settings"
        expanded={expandedSteps.includes(0)}
        onToggle={() => toggleStep(0)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Log in to your Namecheap account</li>
          <li>Go to <strong>Domain List</strong></li>
          <li>Click <strong>Manage</strong> next to {domain}</li>
          <li>Click on the <strong>Advanced DNS</strong> tab</li>
        </ol>
      </DNSStep>

      {records.map((record, index) => (
        <DNSStep
          key={index}
          stepNumber={index + 2}
          title={`Add ${record.type} Record`}
          expanded={expandedSteps.includes(index + 1)}
          onToggle={() => toggleStep(index + 1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Click <strong>Add New Record</strong> and enter:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <DNSField
                label="Type"
                value={record.type}
                onCopy={() => copyToClipboard(record.type, `${index}-type`)}
                copied={copiedField === `${index}-type`}
              />
              <DNSField
                label="Host"
                value={record.host.replace(`.${domain}`, '')}
                onCopy={() => copyToClipboard(record.host.replace(`.${domain}`, ''), `${index}-host`)}
                copied={copiedField === `${index}-host`}
                note="Enter subdomain only (without your domain name)"
              />
              <DNSField
                label="Value"
                value={record.value}
                onCopy={() => copyToClipboard(record.value, `${index}-value`)}
                copied={copiedField === `${index}-value`}
              />
              <DNSField
                label="TTL"
                value="Automatic"
                note="Use Namecheap's automatic TTL setting"
              />
            </div>
          </div>
        </DNSStep>
      ))}

      <DNSStep
        stepNumber={records.length + 2}
        title="Save and Verify"
        expanded={expandedSteps.includes(records.length + 1)}
        onToggle={() => toggleStep(records.length + 1)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click the green checkmark (✓) to save each record</li>
          <li>Wait 30 minutes for DNS propagation</li>
          <li>Return to Email Wizard and verify your domain</li>
        </ol>
      </DNSStep>
    </div>
  );
}

// ✅ GODADDY GUIDE
function GoDaddyGuide({ records, domain, expandedSteps, toggleStep, copyToClipboard, copiedField }: GuideProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">GoDaddy DNS Configuration</h3>

      <DNSStep
        stepNumber={1}
        title="Navigate to DNS Management"
        expanded={expandedSteps.includes(0)}
        onToggle={() => toggleStep(0)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Log in to your GoDaddy account</li>
          <li>Click on your profile icon and select <strong>My Products</strong></li>
          <li>Find {domain} and click <strong>DNS</strong></li>
          <li>Scroll down to the <strong>Records</strong> section</li>
        </ol>
      </DNSStep>

      {records.map((record, index) => (
        <DNSStep
          key={index}
          stepNumber={index + 2}
          title={`Add ${record.type} Record`}
          expanded={expandedSteps.includes(index + 1)}
          onToggle={() => toggleStep(index + 1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Click <strong>Add</strong> and select <strong>{record.type}</strong>:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <DNSField
                label="Type"
                value={record.type}
                onCopy={() => copyToClipboard(record.type, `${index}-type`)}
                copied={copiedField === `${index}-type`}
              />
              <DNSField
                label="Host/Name"
                value={record.host.replace(`.${domain}`, '')}
                onCopy={() => copyToClipboard(record.host.replace(`.${domain}`, ''), `${index}-host`)}
                copied={copiedField === `${index}-host`}
                note="Use @ for root domain, or enter subdomain"
              />
              <DNSField
                label="Points to"
                value={record.value}
                onCopy={() => copyToClipboard(record.value, `${index}-value`)}
                copied={copiedField === `${index}-value`}
              />
              <DNSField
                label="TTL"
                value="1 Hour"
                note="Default TTL is fine"
              />
            </div>
          </div>
        </DNSStep>
      ))}

      <DNSStep
        stepNumber={records.length + 2}
        title="Complete Setup"
        expanded={expandedSteps.includes(records.length + 1)}
        onToggle={() => toggleStep(records.length + 1)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click <strong>Save</strong> for each record</li>
          <li>Wait up to 48 hours for full DNS propagation (often faster)</li>
          <li>Return to Email Wizard to verify your domain</li>
        </ol>
      </DNSStep>
    </div>
  );
}

// ✅ SITEGROUND GUIDE
function SitegroundGuide({ records, domain, expandedSteps, toggleStep, copyToClipboard, copiedField }: GuideProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Siteground DNS Configuration</h3>

      <DNSStep
        stepNumber={1}
        title="Access Site Tools"
        expanded={expandedSteps.includes(0)}
        onToggle={() => toggleStep(0)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Log in to your Siteground account</li>
          <li>Go to <strong>Websites</strong> and select your site</li>
          <li>Click on <strong>Site Tools</strong></li>
          <li>Navigate to <strong>Domain → DNS Zone Editor</strong></li>
        </ol>
      </DNSStep>

      {records.map((record, index) => (
        <DNSStep
          key={index}
          stepNumber={index + 2}
          title={`Add ${record.type} Record`}
          expanded={expandedSteps.includes(index + 1)}
          onToggle={() => toggleStep(index + 1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Click <strong>Add New Record</strong> and fill in:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <DNSField
                label="Record Type"
                value={record.type}
                onCopy={() => copyToClipboard(record.type, `${index}-type`)}
                copied={copiedField === `${index}-type`}
              />
              <DNSField
                label="Host"
                value={record.host}
                onCopy={() => copyToClipboard(record.host, `${index}-host`)}
                copied={copiedField === `${index}-host`}
                note="Use the full host name including your domain"
              />
              <DNSField
                label="Points To"
                value={record.value}
                onCopy={() => copyToClipboard(record.value, `${index}-value`)}
                copied={copiedField === `${index}-value`}
              />
              <DNSField
                label="TTL"
                value="3600"
                note="Default value (1 hour)"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>📝 Siteground Note:</strong> Make sure not to modify existing MX records if you receive emails on this domain
              </p>
            </div>
          </div>
        </DNSStep>
      ))}

      <DNSStep
        stepNumber={records.length + 2}
        title="Finalize Configuration"
        expanded={expandedSteps.includes(records.length + 1)}
        onToggle={() => toggleStep(records.length + 1)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click <strong>Create</strong> to save each DNS record</li>
          <li>DNS changes on Siteground typically propagate within 15-30 minutes</li>
          <li>Return to Email Wizard and click <strong>Verify Domain</strong></li>
        </ol>
      </DNSStep>
    </div>
  );
}

// ✅ GOOGLE DOMAINS GUIDE
function GoogleDomainsGuide({ records, domain, expandedSteps, toggleStep, copyToClipboard, copiedField }: GuideProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Google Domains DNS Configuration</h3>

      <DNSStep
        stepNumber={1}
        title="Open DNS Settings"
        expanded={expandedSteps.includes(0)}
        onToggle={() => toggleStep(0)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Go to <a href="https://domains.google.com" target="_blank" rel="noopener" className="text-purple hover:underline">domains.google.com</a></li>
          <li>Click on your domain: <strong>{domain}</strong></li>
          <li>Click <strong>DNS</strong> in the left sidebar</li>
          <li>Scroll down to <strong>Custom records</strong></li>
        </ol>
      </DNSStep>

      {records.map((record, index) => (
        <DNSStep
          key={index}
          stepNumber={index + 2}
          title={`Add ${record.type} Record`}
          expanded={expandedSteps.includes(index + 1)}
          onToggle={() => toggleStep(index + 1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Click <strong>Create new record</strong>:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <DNSField
                label="Host name"
                value={record.host.replace(`.${domain}`, '')}
                onCopy={() => copyToClipboard(record.host.replace(`.${domain}`, ''), `${index}-host`)}
                copied={copiedField === `${index}-host`}
                note="Leave blank for root domain (@), or enter subdomain"
              />
              <DNSField
                label="Type"
                value={record.type}
                onCopy={() => copyToClipboard(record.type, `${index}-type`)}
                copied={copiedField === `${index}-type`}
              />
              <DNSField
                label="TTL"
                value="3600"
                note="Default (1 hour)"
              />
              <DNSField
                label="Data"
                value={record.value}
                onCopy={() => copyToClipboard(record.value, `${index}-value`)}
                copied={copiedField === `${index}-value`}
              />
            </div>
          </div>
        </DNSStep>
      ))}

      <DNSStep
        stepNumber={records.length + 2}
        title="Save and Verify"
        expanded={expandedSteps.includes(records.length + 1)}
        onToggle={() => toggleStep(records.length + 1)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click <strong>Add</strong> to save each record</li>
          <li>Google Domains typically updates within minutes</li>
          <li>Full propagation may take up to 48 hours</li>
          <li>Return to Email Wizard to verify your domain</li>
        </ol>
      </DNSStep>
    </div>
  );
}

// ✅ GENERIC GUIDE
function GenericGuide({ records, domain, expandedSteps, toggleStep, copyToClipboard, copiedField }: GuideProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Generic DNS Configuration Guide</h3>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          These are general instructions. The exact steps and interface will vary by DNS provider.
          Consult your provider's documentation if needed.
        </p>
      </div>

      <DNSStep
        stepNumber={1}
        title="Access Your DNS Management Panel"
        expanded={expandedSteps.includes(0)}
        onToggle={() => toggleStep(0)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Log in to your domain registrar or DNS hosting provider</li>
          <li>Find the DNS management section (often called "DNS Settings", "DNS Zone", "Name Server Management")</li>
          <li>Locate the area for adding new DNS records</li>
        </ol>
      </DNSStep>

      {records.map((record, index) => (
        <DNSStep
          key={index}
          stepNumber={index + 2}
          title={`Add ${record.type} Record #${index + 1}`}
          expanded={expandedSteps.includes(index + 1)}
          onToggle={() => toggleStep(index + 1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Add a new DNS record with these exact values:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <DNSField
                label="Record Type"
                value={record.type}
                onCopy={() => copyToClipboard(record.type, `${index}-type`)}
                copied={copiedField === `${index}-type`}
              />
              <DNSField
                label="Host/Name"
                value={record.host}
                onCopy={() => copyToClipboard(record.host, `${index}-host`)}
                copied={copiedField === `${index}-host`}
                note="Some providers require you to omit your domain name"
              />
              <DNSField
                label="Value/Points To"
                value={record.value}
                onCopy={() => copyToClipboard(record.value, `${index}-value`)}
                copied={copiedField === `${index}-value`}
              />
              <DNSField
                label="TTL (Time To Live)"
                value={record.ttl.toString()}
                note="Use default if your provider doesn't allow custom TTL"
              />
            </div>
          </div>
        </DNSStep>
      ))}

      <DNSStep
        stepNumber={records.length + 2}
        title="Save Changes and Wait for Propagation"
        expanded={expandedSteps.includes(records.length + 1)}
        onToggle={() => toggleStep(records.length + 1)}
      >
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Save all DNS records in your provider's interface</li>
          <li>DNS propagation can take anywhere from 15 minutes to 48 hours</li>
          <li>Return to Email Wizard after 30 minutes and try verifying your domain</li>
          <li>If verification fails, wait longer and try again</li>
        </ol>
      </DNSStep>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Need provider-specific help?</strong> Contact your DNS provider's support team
          or search their knowledge base for "adding DNS records" or "custom DNS configuration".
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface DNSStepProps {
  stepNumber: number;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function DNSStep({ stepNumber, title, expanded, onToggle, children }: DNSStepProps) {
  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple text-white rounded-full flex items-center justify-center font-bold text-sm">
            {stepNumber}
          </div>
          <span className="font-semibold text-left">{title}</span>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div className="px-6 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

interface DNSFieldProps {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  note?: string;
}

function DNSField({ label, value, onCopy, copied, note }: DNSFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono break-all">
          {value}
        </code>
        {onCopy && (
          <button
            onClick={onCopy}
            className="flex-shrink-0 p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={16} className="text-green-600" />
            ) : (
              <Copy size={16} className="text-gray-600" />
            )}
          </button>
        )}
      </div>
      {note && (
        <p className="text-xs text-gray-500 mt-1">ℹ️ {note}</p>
      )}
    </div>
  );
}