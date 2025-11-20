// ============================================================================
// ENHANCED TemplateEditor with Live Preview
// File: src/components/templates/TemplateEditor.tsx
// ============================================================================
// This replaces the current TemplateEditor.tsx to add a live preview panel

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AppLayout } from '../app/AppLayout';
import { getTemplateById, extractMergeFields } from '../../data/emailTemplates';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

// Helper function to extract editable sections from HTML comments
function extractEditableSections(html: string): Array<{ id: string; label: string; type: 'text' | 'textarea'; defaultContent: string }> {
  const sections: Array<{ id: string; label: string; type: 'text' | 'textarea'; defaultContent: string }> = [];
  
  const regex = /\{\{EDITABLE:(\w+)\}\}/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    const label = id.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const isLongContent = id.includes('content') || id.includes('description') || id.includes('message') || id.includes('intro');
    
    sections.push({
      id,
      label,
      type: isLongContent ? 'textarea' : 'text',
      defaultContent: ''
    });
  }
  
  return sections;
}

export const TemplateEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  
  const isCreationMode = searchParams.get('createMode') === 'true';
  const prefilledName = searchParams.get('name') || '';
  const prefilledSubject = searchParams.get('subject') || '';
  
  const [template, setTemplate] = useState<any>(null);
  const [editableSections, setEditableSections] = useState<Array<{ id: string; label: string; type: 'text' | 'textarea'; defaultContent: string }>>([]);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [campaignName, setCampaignName] = useState(prefilledName);
  const [subject, setSubject] = useState(prefilledSubject);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // New state for preview toggle
  
  const isPlusUser = profile?.plan_type === 'pro_plus';

  useEffect(() => {
    if (templateId) {
      const fetchedTemplate = getTemplateById(templateId);
      if (fetchedTemplate) {
        setTemplate(fetchedTemplate);
        const sections = extractEditableSections(fetchedTemplate.htmlContent);
        setEditableSections(sections);
        
        const initialContent: Record<string, string> = {};
        sections.forEach(section => {
          initialContent[section.id] = section.defaultContent;
        });
        setEditedContent(initialContent);
      }
    }
  }, [templateId]);

  const handleContentChange = (sectionId: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [sectionId]: value
    }));
  };

  // Generate preview HTML with edited content
  const getPreviewHtml = () => {
    if (!template) return '';
    
    let previewHtml = template.htmlContent;
    
    // Replace all {{EDITABLE:section_id}} with actual content
    editableSections.forEach(section => {
      const content = editedContent[section.id] || section.defaultContent || `[Enter ${section.label}]`;
      const regex = new RegExp(`\\{\\{EDITABLE:${section.id}\\}\\}`, 'g');
      previewHtml = previewHtml.replace(regex, content);
    });
    
    // Also replace subject in preview if it's in the template
    previewHtml = previewHtml.replace(/\{\{SUBJECT\}\}/g, subject || '[Enter subject]');
    
    return DOMPurify.sanitize(previewHtml);
  };

  const handleSaveAndContinue = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject line');
      return;
    }

    setLoading(true);

    try {
      let finalHtmlContent = template.htmlContent;
      
      editableSections.forEach(section => {
        const content = editedContent[section.id] || section.defaultContent;
        const regex = new RegExp(`\\{\\{EDITABLE:${section.id}\\}\\}`, 'g');
        finalHtmlContent = finalHtmlContent.replace(regex, content);
      });

      const { error: insertError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user?.id,
          name: campaignName,
          subject: subject,
          content: {
            html: finalHtmlContent,
            template_id: template.id
          },
          status: 'draft',
          from_email: user?.email,
          from_name: 'Email Wizard'
        });

      if (insertError) throw insertError;

      toast.success('Campaign draft created successfully!');
      navigate('/app/campaigns');
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const mergeFields = template ? extractMergeFields(template.htmlContent) : [];

  if (!template) {
    return (
      <AppLayout currentPath="/app/templates">
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading template...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout currentPath="/app/templates">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        {isCreationMode && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="hover:text-black cursor-pointer" onClick={() => navigate('/app/campaigns')}>
              Campaigns
            </span>
            {' > '}
            <span className="hover:text-black cursor-pointer" onClick={() => navigate(-1)}>
              Select Template
            </span>
            {' > '}
            <span className="text-black font-semibold">Edit Template</span>
          </div>
        )}

        {/* Header with Preview Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">
              {isCreationMode ? 'Customize Template' : 'Edit Template'}
            </h1>
            <p className="text-gray-600">
              {isCreationMode 
                ? 'Fill in the content for your campaign email.' 
                : 'Customize this template and save it for your campaign.'}
            </p>
          </div>
          <Button
            variant="tertiary"
            icon={showPreview ? EyeOff : Eye}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </div>

        {/* Split View: Editor + Preview */}
        <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {/* Left Side: Editor */}
          <div className="space-y-6">
            {/* Template Info Card */}
            <div className="bg-gray-50 border-2 border-black rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText size={24} />
                <div>
                  <h3 className="font-bold">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-white border-2 border-black rounded-lg p-6">
              <h2 className="text-xl font-serif font-bold mb-4">Campaign Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    disabled={isCreationMode}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57377d] focus:border-transparent ${
                      isCreationMode ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="e.g., Summer Newsletter 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject Line <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isCreationMode}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57377d] focus:border-transparent ${
                      isCreationMode ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Enter email subject line"
                  />
                </div>
              </div>
            </div>

            {/* Editable Sections */}
            <div className="bg-white border-2 border-black rounded-lg p-6">
              <h2 className="text-xl font-serif font-bold mb-4">Email Content</h2>
              
              <div className="space-y-4">
                {editableSections.map((section) => (
                  <div key={section.id}>
                    <label className="block text-sm font-medium mb-2 capitalize">
                      {section.label}
                    </label>
                    {section.type === 'textarea' ? (
                      <textarea
                        value={editedContent[section.id] || ''}
                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57377d] focus:border-transparent"
                        rows={5}
                        placeholder={`Enter ${section.label.replace(/_/g, ' ')}`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedContent[section.id] || ''}
                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57377d] focus:border-transparent"
                        placeholder={`Enter ${section.label.replace(/_/g, ' ')}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {template.supportsPersonalization && !isPlusUser && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> This template supports personalization, but it requires a Pro Plus plan.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="tertiary"
                onClick={() => navigate(isCreationMode ? -1 : '/app/campaigns')}
              >
                {isCreationMode ? '← Back to Templates' : 'Cancel'}
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSaveAndContinue}
                loading={loading}
                disabled={loading}
              >
                {isCreationMode ? 'Create Campaign Draft' : 'Save and Continue'}
              </Button>
            </div>
          </div>

          {/* Right Side: Live Preview */}
          {showPreview && (
            <div className="sticky top-8 self-start">
              <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
                <div className="bg-[#57377d] text-white px-4 py-3 border-b-2 border-black">
                  <div className="flex items-center gap-2">
                    <Eye size={18} />
                    <h3 className="font-bold">Live Preview</h3>
                  </div>
                  <p className="text-xs text-white/80 mt-1">Updates as you type</p>
                </div>
                <div 
                  className="p-4 overflow-auto bg-gray-50"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                  <div 
                    className="bg-white"
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};