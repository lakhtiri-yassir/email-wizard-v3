/**
 * ============================================================================
 * Google Domains DNS Configuration Guide
 * ============================================================================
 * 
 * Google Domains-specific instructions
 * 
 * Key Differences:
 * - Google Domains DNS management interface
 * - Field labels: "Type", "Host name", "Data", "TTL"
 * - Simple, clean interface
 * - Auto-complete suggestions
 * 
 * ============================================================================
 */

import { DNSInstructions } from '../../../lib/domainService';
import { ExternalLink } from 'lucide-react';
import DNSRecordRow from '../DNSRecordRow';

interface GoogleDomainsGuideProps {
  instructions: DNSInstructions;
}

export default function GoogleDomainsGuide({ instructions }: GoogleDomainsGuideProps) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Google Domains Configuration</h3>
        <p className="text-sm text-blue-700">
          Follow these steps to add DNS records in Google Domains.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Access DNS */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">Step 1: Access DNS Settings</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Log in to Google Domains at <strong>domains.google.com</strong></li>
            <li>Click on your domain</li>
            <li>Click <strong>DNS</strong> in the left sidebar</li>
            <li>Scroll to <strong>Custom resource records</strong></li>
          </ol>
        </div>

        {/* DNS Records */}
        {instructions.records.map((record, index) => (
          <div key={index} className="border-l-4 border-purple pl-4">
            <h4 className="font-semibold text-lg mb-3">
              Step {index + 2}: {record.title}
            </h4>
            <p className="text-sm text-gray-600 mb-3">{record.description}</p>
            <DNSRecordRow record={record.record} />
            
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">In Google Domains:</p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>
                  Set <strong>"Host name"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.host}</code>
                </li>
                <li>
                  Set <strong>"Type"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.type}</code>
                </li>
                <li>
                  Set <strong>"TTL"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">300</code>
                </li>
                <li>
                  Set <strong>"Data"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1 text-xs break-all">
                    {record.record.value}
                  </code>
                </li>
                <li>Click <strong>"Add"</strong></li>
              </ol>
            </div>
          </div>
        ))}

        {/* Verification */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">
            Step {instructions.records.length + 2}: Verify Configuration
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            After adding all records, wait <strong>5-30 minutes</strong> for DNS propagation, 
            then click <strong>"Verify Domain"</strong> in Mail Wizard.
          </p>
          <a
            href="https://support.google.com/domains/answer/3290350"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple hover:text-gold transition-colors"
          >
            <ExternalLink size={16} />
            View Google Domains Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
