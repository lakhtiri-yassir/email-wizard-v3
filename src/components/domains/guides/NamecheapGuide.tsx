/**
 * ============================================================================
 * Namecheap DNS Configuration Guide
 * ============================================================================
 * 
 * Namecheap-specific instructions (Advanced DNS interface)
 * 
 * Key Differences:
 * - Namecheap Advanced DNS navigation
 * - Field labels: "Type", "Host", "Value", "TTL"
 * - Automatic "@" replacement for root domain
 * - Different add record button location
 * 
 * ============================================================================
 */

import { DNSInstructions } from '../../../lib/domainService';
import { ExternalLink } from 'lucide-react';
import DNSRecordRow from '../DNSRecordRow';

interface NamecheapGuideProps {
  instructions: DNSInstructions;
}

export default function NamecheapGuide({ instructions }: NamecheapGuideProps) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Namecheap Configuration</h3>
        <p className="text-sm text-blue-700">
          Follow these steps to configure DNS records in Namecheap Advanced DNS.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Access Advanced DNS */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">Step 1: Access Advanced DNS</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Log in to Namecheap at <strong>namecheap.com</strong></li>
            <li>Go to <strong>Domain List</strong></li>
            <li>Click <strong>Manage</strong> next to your domain</li>
            <li>Click the <strong>Advanced DNS</strong> tab</li>
            <li>Scroll to <strong>Host Records</strong> section</li>
            <li>Click <strong>Add New Record</strong></li>
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
              <p className="text-sm font-medium text-gray-900 mb-2">In Namecheap:</p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>
                  Set <strong>"Type"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">
                    {record.record.type === 'CNAME' ? 'CNAME Record' : 'TXT Record'}
                  </code>
                </li>
                <li>
                  Set <strong>"Host"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.host}</code>
                  {record.record.host === '@' && <span className="ml-2">(use @ for root domain)</span>}
                </li>
                <li>
                  Set <strong>"Value"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1 text-xs break-all">
                    {record.record.value}
                  </code>
                </li>
                <li>
                  Set <strong>"TTL"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">Automatic (or 300)</code>
                </li>
                <li>Click the green <strong>checkmark</strong> to save</li>
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
            href="https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple hover:text-gold transition-colors"
          >
            <ExternalLink size={16} />
            View Namecheap DNS Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
