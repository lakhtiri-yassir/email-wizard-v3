/**
 * ============================================================================
 * AWS Route 53 DNS Configuration Guide
 * ============================================================================
 * 
 * AWS Route 53-specific instructions (technical users)
 * 
 * Key Differences:
 * - AWS Console navigation
 * - Hosted zone management
 * - Technical terminology (record sets)
 * - JSON view option
 * 
 * ============================================================================
 */

import { DNSInstructions } from '../../../lib/domainService';
import { ExternalLink } from 'lucide-react';
import DNSRecordRow from '../DNSRecordRow';

interface Route53GuideProps {
  instructions: DNSInstructions;
}

export default function Route53Guide({ instructions }: Route53GuideProps) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">AWS Route 53 Configuration</h3>
        <p className="text-sm text-blue-700">
          Follow these steps to add DNS records in your Route 53 hosted zone.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Access Route 53 */}
        <div className="border-l-4 border-gold pl-4">
          <h4 className="font-semibold text-lg mb-2">Step 1: Access Hosted Zone</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Log in to AWS Console at <strong>console.aws.amazon.com</strong></li>
            <li>Navigate to <strong>Services</strong> → <strong>Route 53</strong></li>
            <li>Click <strong>Hosted zones</strong> in the left sidebar</li>
            <li>Click on your domain's hosted zone</li>
            <li>Click <strong>Create record</strong></li>
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
              <p className="text-sm font-medium text-gray-900 mb-2">In Route 53:</p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>
                  Set <strong>"Record name"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.host}</code>
                </li>
                <li>
                  Set <strong>"Record type"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">{record.record.type}</code>
                </li>
                <li>
                  Set <strong>"Value"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1 text-xs break-all">
                    {record.record.value}
                  </code>
                </li>
                <li>
                  Set <strong>"TTL"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">300 seconds</code>
                </li>
                <li>
                  Set <strong>"Routing policy"</strong> to: 
                  <code className="bg-gray-200 px-2 py-0.5 rounded ml-1">Simple routing</code>
                </li>
                <li>Click <strong>"Create records"</strong></li>
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
            href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple hover:text-gold transition-colors"
          >
            <ExternalLink size={16} />
            View AWS Route 53 Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
