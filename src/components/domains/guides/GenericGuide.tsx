/**
 * ============================================================================
 * Generic DNS Configuration Guide
 * ============================================================================
 * 
 * Universal instructions for any DNS provider
 * 
 * Purpose:
 * - Fallback for providers not specifically supported
 * - General DNS concepts and terminology
 * - What to look for in any DNS management interface
 * 
 * ============================================================================
 */

import { DNSInstructions } from '../../../lib/domainService';
import { Info } from 'lucide-react';
import DNSRecordRow from '../DNSRecordRow';

interface GenericGuideProps {
  instructions: DNSInstructions;
}

export default function GenericGuide({ instructions }: GenericGuideProps) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Universal DNS Configuration</h3>
            <p className="text-sm text-blue-700">
              These instructions work for most DNS providers. Look for similar field names 
              in your provider's DNS management interface.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1: General navigation */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">Step 1: Access DNS Settings</h4>
          <p className="text-sm text-gray-700 mb-2">
            In your DNS provider's control panel, look for:
          </p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li><strong>"DNS Management"</strong></li>
            <li><strong>"DNS Records"</strong></li>
            <li><strong>"Advanced DNS"</strong></li>
            <li><strong>"Manage DNS"</strong></li>
            <li><strong>"Zone File"</strong></li>
            <li><strong>"Name Server Records"</strong></li>
          </ul>
        </div>

        {/* Step 2: Field variations */}
        <div className="border-l-4 border-purple pl-4">
          <h4 className="font-semibold text-lg mb-3">Step 2: Add DNS Records</h4>
          <p className="text-sm text-gray-700 mb-4">
            Add each of the following DNS records. Common field names include:
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Field Name Variations:</p>
            <ul className="text-xs text-gray-700 space-y-1">
              <li><strong>Type:</strong> Record Type, DNS Type, Type of Record</li>
              <li><strong>Host/Name:</strong> Host, Name, Subdomain, Record Name, Domain, Hostname</li>
              <li><strong>Value/Data:</strong> Content, Points To, Target, Destination, Answer, Value, Data</li>
              <li><strong>TTL:</strong> Time To Live (use 300 or 600 seconds if asked)</li>
            </ul>
          </div>

          {/* Display each DNS record */}
          <div className="space-y-4">
            {instructions.records.map((record, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">
                  Record {index + 1}: {record.title}
                </h5>
                <p className="text-sm text-gray-600 mb-3">{record.description}</p>
                <DNSRecordRow record={record.record} />
                
                {/* Generic instructions */}
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-700">
                    <strong>Add this record with:</strong> Type = {record.record.type}, 
                    Host = {record.record.host}, Value = {record.record.value}, TTL = 300-600 seconds
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Verification */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">Step 3: Verify Configuration</h4>
          <p className="text-sm text-gray-700">
            After adding all DNS records, wait <strong>5-30 minutes</strong> for DNS propagation. 
            Then click the <strong>"Verify Domain"</strong> button in Mail Wizard to confirm your setup.
          </p>
        </div>

        {/* Help section */}
        <div className="card bg-yellow-50 border-yellow-200">
          <h4 className="font-medium text-yellow-900 mb-2">Need Help?</h4>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>
              If you're having trouble finding where to add DNS records, contact your DNS provider's 
              support team and ask them how to add <strong>CNAME</strong> and <strong>TXT</strong> records 
              to your domain.
            </p>
            <p>
              <strong>Common DNS providers:</strong> Cloudflare, GoDaddy, Namecheap, Google Domains, 
              AWS Route 53, DigitalOcean, Hover, Network Solutions, Register.com, and many others.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
