/**
 * ============================================================================
 * Cloudflare DNS Configuration Guide
 * ============================================================================
 * 
 * Purpose: Step-by-step instructions for adding DNS records in Cloudflare
 * 
 * Key Features:
 * - Provider-specific navigation steps
 * - DNS record display for each record
 * - Cloudflare-specific field mapping
 * - Important warnings (proxy status)
 * - Link to official Cloudflare documentation
 * 
 * Props:
 * - instructions: DNSInstructions object with records to configure
 * 
 * Design System Compliance:
 * - Uses .card class and design system colors
 * - Border accents use gold/purple
 * - All info boxes use bg-blue-50, bg-yellow-50
 * - No custom CSS classes
 * 
 * ============================================================================
 */

import { DNSInstructions } from '../../../lib/domainService';
import { ExternalLink } from 'lucide-react';
import DNSRecordRow from '../DNSRecordRow';

interface CloudflareGuideProps {
  instructions: DNSInstructions;
}

export default function CloudflareGuide({ instructions }: CloudflareGuideProps) {
  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Cloudflare Configuration</h3>
        <p className="text-sm text-blue-700">
          Follow these steps to configure DNS records in your Cloudflare dashboard.
        </p>
      </div>

      {/* Step-by-step instructions */}
      <div className="space-y-6">
        {/* Step 1: Access DNS Settings */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">Step 1: Access DNS Settings</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Log in to your Cloudflare dashboard at <strong>dash.cloudflare.com</strong></li>
            <li>Select your domain from the list</li>
            <li>Click on the <strong>"DNS"</strong> tab in the top navigation</li>
            <li>Click the <strong>"Add record"</strong> button (blue button on the right)</li>
          </ol>
        </div>

        {/* Dynamic steps for each DNS record */}
        {instructions.records.map((record, index) => (
          <div key={index} className="border-l-4 border-purple pl-4">
            <h4 className="font-semibold text-lg mb-3">
              Step {index + 2}: {record.title}
            </h4>
            
            <p className="text-sm text-gray-600 mb-3">{record.description}</p>
            
            {/* DNS Record Display Component */}
            <DNSRecordRow record={record.record} />
            
            {/* Cloudflare-specific field mapping */}
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">In Cloudflare:</p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>
                  Set <strong>"Type"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.type}</code>
                </li>
                <li>
                  Set <strong>"Name"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.host}</code>
                </li>
                <li>
                  Set <strong>"Content"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1 text-xs break-all">
                    {record.record.value}
                  </code>
                </li>
                <li>
                  Set <strong>"TTL"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">Auto or 300 seconds</code>
                </li>
                <li>
                  Set <strong>"Proxy status"</strong> to: 
                  <strong className="text-gray-900 ml-1">DNS only (grey cloud)</strong>
                </li>
                <li>Click <strong>"Save"</strong></li>
              </ol>
            </div>

            {/* Critical warning for CNAME records */}
            {record.record.type === 'CNAME' && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Critical:</strong> Make sure the proxy (orange cloud) is turned <strong>OFF</strong> for this record. 
                  Email DNS records must not be proxied through Cloudflare or they will not work.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Final verification step */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">
            Step {instructions.records.length + 2}: Verify Configuration
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            After adding all DNS records, wait <strong>5-30 minutes</strong> for propagation, 
            then click the <strong>"Verify Domain"</strong> button in Mail Wizard to confirm your configuration.
          </p>
          
          {/* Official documentation link */}
          <a
            href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple hover:text-gold transition-colors"
          >
            <ExternalLink size={16} />
            View Cloudflare DNS Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
