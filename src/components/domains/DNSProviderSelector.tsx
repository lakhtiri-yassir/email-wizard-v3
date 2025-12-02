/**
 * ============================================================================
 * DNS Provider Selector Component
 * ============================================================================
 * 
 * Purpose: Allow users to select their DNS provider for tailored instructions
 * 
 * Providers supported:
 * - Cloudflare
 * - GoDaddy
 * - Namecheap
 * - Google Domains
 * - AWS Route 53
 * - Generic (other providers)
 * 
 * Props:
 * - selectedProvider: Currently selected provider
 * - onProviderChange: Callback when selection changes
 * 
 * Design System Compliance:
 * - Uses .input-base class for select element
 * - Uses design system colors and spacing
 * - No custom CSS classes
 * 
 * ============================================================================
 */

import { ChevronDown } from 'lucide-react';

export type DNSProvider = 
  | 'cloudflare'
  | 'godaddy'
  | 'namecheap'
  | 'google'
  | 'route53'
  | 'generic';

interface DNSProviderSelectorProps {
  selectedProvider: DNSProvider;
  onProviderChange: (provider: DNSProvider) => void;
}

export default function DNSProviderSelector({
  selectedProvider,
  onProviderChange
}: DNSProviderSelectorProps) {
  const providers: Array<{ value: DNSProvider; label: string; icon: string }> = [
    { value: 'cloudflare', label: 'Cloudflare', icon: '☁️' },
    { value: 'godaddy', label: 'GoDaddy', icon: '🌐' },
    { value: 'namecheap', label: 'Namecheap', icon: '💰' },
    { value: 'google', label: 'Google Domains', icon: '🔍' },
    { value: 'route53', label: 'AWS Route 53', icon: '☁️' },
    { value: 'generic', label: 'Other Provider', icon: '⚙️' }
  ];

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Your DNS Provider
      </label>
      <div className="relative">
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as DNSProvider)}
          className="w-full input-base appearance-none pr-10 cursor-pointer"
        >
          {providers.map(provider => (
            <option key={provider.value} value={provider.value}>
              {provider.icon} {provider.label}
            </option>
          ))}
        </select>
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
          size={20} 
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Choose your provider for customized setup instructions
      </p>
    </div>
  );
}
