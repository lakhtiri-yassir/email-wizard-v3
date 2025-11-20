import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmailTemplate, getTemplateById, extractMergeFields } from '../../data/emailTemplates';
import { TemplatePreview } from './TemplatePreview';
import { Button } from '../ui/Button';
import { Lock, Crown, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const TemplateEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  
  const isPlusUser = profile?.plan_type === 'pro_plus';

  useEffect(() => {
    if (templateId) {
      const foundTemplate = getTemplateById(templateId);
      if (foundTemplate) {
        setTemplate(foundTemplate);
        
        // Initialize with default content
        const defaults: Record<string, string> = {};
        foundTemplate.editableSections.forEach(section => {
          defaults[section.id] = section.defaultContent;
        });
        setEditedContent(defaults);
      }
    }
  }, [templateId]);

  const handleContentChange = (sectionId: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [sectionId]: value
    }));
  };

  const handleSaveAndContinue = () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    // Save to localStorage for now (you'll replace this with Supabase)
    const campaignData = {
      name: campaignName,
      subject,
      templateId: template?.id,
      content: editedContent,
      htmlContent: generateFinalHtml()
    };
    
    localStorage.setItem('draft_campaign', JSON.stringify(campaignData));
    
    // Navigate to recipient selection
    navigate('/app/campaigns/create?step=recipients');
  };

  const generateFinalHtml = (): string => {
    if (!template) return '';
    
    let finalHtml = template.htmlContent;
    
    template.editableSections.forEach(section => {
      const content = editedContent[section.id] || section.defaultContent;
      const regex = new RegExp(`\\{\\{${section.id}\\}\\}`, 'g');
      finalHtml = finalHtml.replace(regex, content);
    });
    
    return finalHtml;
  };

  const mergeFields = template ? extractMergeFields(template.htmlContent) : [];
  const hasPersonalization = mergeFields.length > 0;

  if (!template) {
    return (
      <div className="p-8">
        <p>Template not found</p>
        <Button onClick={() => navigate('/app/templates')}>
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-black px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/app/templates')}
            >
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-serif font-bold">{template.name}</h1>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleSaveAndContinue}
          >
            Continue to Recipients
          </Button>
        </div>
      </div>

      {/* Pro Plus Warning */}
      {hasPersonalization && !isPlusUser && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-amber-600" />
            <p className="text-sm text-amber-800">
              This template includes personalization fields ({{firstname}}, {{company}}). 
              <span className="font-semibold"> Upgrade to Pro Plus</span> to use these features.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/settings?tab=billing')}
            >
              Upgrade
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor Form */}
        <div className="w-1/2 border-r border-gray-300 overflow-auto p-6">
          <div className="space-y-6">
            {/* Campaign Details */}
            <div>
              <h2 className="text-lg font-serif font-bold mb-4">Campaign Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="input-base w-full"
                    placeholder="e.g., November Newsletter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-base w-full"
                    placeholder="e.g., You won't believe what happened..."
                  />
                </div>
              </div>
            </div>

            {/* Editable Content */}
            <div>
              <h2 className="text-lg font-serif font-bold mb-4">Edit Content</h2>
              <div className="space-y-4">
                {template.editableSections.map((section) => (
                  <div key={section.id}>
                    <label className="block text-sm font-medium mb-1">
                      {section.label}
                    </label>
                    {section.type === 'text' ? (
                      <textarea
                        value={editedContent[section.id] || ''}
                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                        className="input-base w-full"
                        rows={3}
                        placeholder={section.placeholder}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedContent[section.id] || ''}
                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                        className="input-base w-full"
                        placeholder={section.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Merge Fields (Pro Plus Only) */}
            {hasPersonalization && (
              <div>
                <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
                  Personalization Fields
                  {!isPlusUser && <Lock size={16} className="text-amber-600" />}
                </h2>
                
                {isPlusUser ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      This template uses the following merge fields:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {mergeFields.map(field => (
                        <span 
                          key={field}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-mono"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      These will be automatically replaced with contact data when sending.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Crown className="text-amber-500 mt-1" size={20} />
                      <div>
                        <p className="font-medium text-gray-900 mb-1">
                          Pro Plus Feature
                        </p>
                        <p className="text-sm text-gray-600 mb-3">
                          Personalize emails with contact data like names, companies, and roles.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/app/settings?tab=billing')}
                        >
                          Upgrade to Pro Plus
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-1/2 bg-gray-50 overflow-auto p-6">
          <TemplatePreview 
            template={template} 
            editedContent={editedContent}
          />
        </div>
      </div>
    </div>
  );
};