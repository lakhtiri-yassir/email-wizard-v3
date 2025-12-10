/**
 * ============================================================================
 * Template Editor Component
 * ============================================================================
 * 
 * Purpose: Comprehensive email template editor with drag-and-drop sections
 * 
 * Features:
 * - Create new templates or edit existing ones
 * - Drag-and-drop section management
 * - Live preview with iframe
 * - Image upload integration
 * - Template settings customization
 * - Save as template or use in campaign
 * 
 * Modes:
 * - 'create': Create new template (default)
 * - 'edit': Edit existing template
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Eye,
  Plus,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import SectionEditor from './SectionEditor';
import type { Section } from './SectionEditor';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface TemplateEditorProps {
  mode?: 'create' | 'edit';
  existingTemplate?: any;
  templateId?: string;
  campaignName?: string;
  campaignSubject?: string;
  onSave?: (sections: Section[], settings: any, html: string) => void;
  onCancel?: () => void;
}

interface EmailSettings {
  companyName: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  fontFamily: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TemplateEditor({
  mode = 'create',
  existingTemplate,
  templateId,
  campaignName,
  campaignSubject,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // ============================================================================
  // STATE
  // ============================================================================

  // Sections
  const [sections, setSections] = useState<Section[]>([]);

  // Email Settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    companyName: 'Your Company',
    backgroundColor: '#F5F5F5',
    textColor: '#333333',
    linkColor: '#f3ba42',
    fontFamily: 'DM Sans, sans-serif',
  });

  // Template Metadata (for edit/save mode)
  const [templateName, setTemplateName] = useState(
    existingTemplate?.name || 'New Template'
  );
  const [templateCategory, setTemplateCategory] = useState(
    existingTemplate?.category || 'custom'
  );
  const [templateDescription, setTemplateDescription] = useState(
    existingTemplate?.description || ''
  );

  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingForCampaign, setSavingForCampaign] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load existing template for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingTemplate) {
      console.log('🔄 Loading template for editing:', existingTemplate.name);

      // Load existing sections
      if (existingTemplate.content?.sections) {
        console.log('📋 Loading sections:', existingTemplate.content.sections.length);
        setSections(existingTemplate.content.sections);
      }

      // Load existing settings
      if (existingTemplate.content?.settings) {
        console.log('⚙️ Loading settings:', existingTemplate.content.settings);
        setEmailSettings((prev) => ({
          ...prev,
          ...existingTemplate.content.settings,
        }));
      }

      // Set template metadata
      setTemplateName(existingTemplate.name);
      setTemplateCategory(existingTemplate.category || 'custom');
      setTemplateDescription(existingTemplate.description || '');

      console.log('✅ Template loaded for editing');
    }
  }, [mode, existingTemplate]);

  // Load selected template from URL state (for campaign creation)
  useEffect(() => {
    const state = location.state as any;
    const shouldLoadTemplate = state?.shouldLoadTemplate !== false;

    if (!shouldLoadTemplate) {
      console.log('🚫 Skipping template load (shouldLoadTemplate=false)');
      return;
    }

    // Check if returning from template selection
    const selectedTemplate = state?.selectedTemplate;

    if (selectedTemplate) {
      console.log('📥 Loading selected template:', selectedTemplate.name);
      loadTemplateData(selectedTemplate);
    } else if (templateId) {
      console.log('📥 Loading template by ID:', templateId);
      loadTemplateById(templateId);
    }
  }, [location.state, templateId]);

  // ============================================================================
  // TEMPLATE LOADING
  // ============================================================================

  function loadTemplateData(template: any) {
    console.log('🔄 Processing template data:', template.id);

    // Load sections
    if (template.content?.sections && Array.isArray(template.content.sections)) {
      console.log('📋 Loading sections:', template.content.sections.length);
      setSections(template.content.sections);
    } else {
      console.log('⚠️ No sections found in template, starting empty');
      setSections([]);
    }

    // Load settings
    if (template.content?.settings) {
      console.log('⚙️ Loading settings:', template.content.settings);
      setEmailSettings((prev) => ({
        ...prev,
        ...template.content.settings,
      }));
    }

    console.log('✅ Template data loaded successfully');
  }

  async function loadTemplateById(id: string) {
    try {
      // Check if it's a preset template
      const presetTemplate = EMAIL_TEMPLATES.find((t) => t.id === id);

      if (presetTemplate) {
        console.log('📦 Loading preset template:', presetTemplate.name);
        loadTemplateData(presetTemplate);
        return;
      }

      // Load from database
      console.log('🔍 Fetching template from database:', id);

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        console.log('✅ Template fetched from database:', data.name);
        loadTemplateData(data);
      } else {
        console.log('❌ Template not found');
        toast.error('Template not found');
      }
    } catch (error: any) {
      console.error('❌ Failed to load template:', error);
      toast.error('Failed to load template');
    }
  }

  // ============================================================================
  // HTML GENERATION
  // ============================================================================

  function generateEmailHTML(): string {
    let sectionsHTML = '';

    sections.forEach((section) => {
      switch (section.type) {
        case 'header':
          sectionsHTML += `
            <tr>
              <td style="padding: 40px 40px 20px 40px; text-align: center;">
                <h1 style="margin: 0 0 10px 0; color: ${emailSettings.textColor}; font-size: 32px; font-weight: bold; font-family: ${emailSettings.fontFamily};">
                  ${section.content.title || ''}
                </h1>
                ${
                  section.content.subtitle
                    ? `
                  <p style="margin: 0; color: #666666; font-size: 16px; font-family: ${emailSettings.fontFamily};">
                    ${section.content.subtitle}
                  </p>
                `
                    : ''
                }
              </td>
            </tr>
          `;
          break;

        case 'text':
          sectionsHTML += `
            <tr>
              <td style="padding: 20px 40px;">
                <div style="color: ${emailSettings.textColor}; font-size: 16px; line-height: 1.6; font-family: ${emailSettings.fontFamily}; white-space: pre-wrap;">
                  ${section.content.text || ''}
                </div>
              </td>
            </tr>
          `;
          break;

        case 'image':
          if (section.content.imageUrl) {
            sectionsHTML += `
              <tr>
                <td style="padding: 20px 40px;">
                  <img src="${section.content.imageUrl}" alt="${section.content.imageAlt || 'Image'}" style="max-width: 100%; height: auto; display: block; border-radius: 8px; margin: 0 auto;">
                  ${
                    section.content.caption
                      ? `
                    <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px; text-align: center; font-style: italic; font-family: ${emailSettings.fontFamily};">
                      ${section.content.caption}
                    </p>
                  `
                      : ''
                  }
                </td>
              </tr>
            `;
          }
          break;

        case 'button':
          sectionsHTML += `
            <tr>
              <td style="padding: 30px 40px; text-align: center;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="background-color: ${section.content.buttonColor || '#f3ba42'}; border: 2px solid #000000; border-radius: 50px; padding: 14px 32px;">
                      <a href="${section.content.buttonUrl || '#'}" style="display: inline-block; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px; font-family: ${emailSettings.fontFamily};">
                        ${section.content.buttonText || 'Click Here'}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
          break;

        case 'divider':
          sectionsHTML += `
            <tr>
              <td style="padding: 20px 40px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="border-top: 2px solid ${section.content.dividerColor || '#E5E7EB'}; font-size: 0; line-height: 0;">
                      &nbsp;
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
          break;
      }
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${emailSettings.fontFamily}; background-color: ${emailSettings.backgroundColor};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${emailSettings.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border: 2px solid #000000; border-radius: 8px;">
          <!-- Company Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid ${emailSettings.linkColor};">
              <h1 style="margin: 0; color: ${emailSettings.textColor}; font-size: 28px; font-weight: bold; font-family: 'DM Serif Display', Georgia, serif;">
                ${emailSettings.companyName}
              </h1>
            </td>
          </tr>
          
          <!-- Email Content Sections -->
          ${sectionsHTML}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 2px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #666666; font-family: ${emailSettings.fontFamily};">
                <a href="{{VIEW_IN_BROWSER_URL}}" style="color: ${emailSettings.linkColor}; text-decoration: underline;">View in browser</a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #666666; font-family: ${emailSettings.fontFamily};">
                <a href="{{UNSUBSCRIBE_URL}}" style="color: #666666; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  // ============================================================================
  // SAVE HANDLERS
  // ============================================================================

  // Save template to database (edit mode or "Save as Template")
  async function handleSaveTemplate() {
    if (!user) {
      toast.error('You must be logged in to save templates');
      return;
    }

    // Validate template name
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    // Validate sections
    if (sections.length === 0) {
      toast.error('Template must have at least one section');
      return;
    }

    try {
      setSavingTemplate(true);

      // Generate HTML from sections
      const htmlContent = generateEmailHTML();

      const templateData = {
        name: templateName.trim(),
        category: templateCategory,
        description: templateDescription.trim() || null,
        content: {
          html: htmlContent,
          sections: sections,
          settings: emailSettings,
        },
        updated_at: new Date().toISOString(),
      };

      if (mode === 'edit' && existingTemplate) {
        // UPDATE existing template
        console.log('💾 Updating template:', existingTemplate.id);

        const { error } = await supabase
          .from('templates')
          .update(templateData)
          .eq('id', existingTemplate.id);

        if (error) throw error;

        toast.success(`Template "${templateName}" updated successfully!`);

        // Call onSave callback if provided
        if (onSave) {
          onSave(sections, emailSettings, htmlContent);
        }
      } else {
        // INSERT new template
        console.log('💾 Creating new template');

        const { data, error } = await supabase
          .from('templates')
          .insert({
            ...templateData,
            user_id: user.id,
            is_locked: false,
            thumbnail: null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        toast.success(`Template "${templateName}" created successfully!`);

        // Call onSave callback if provided
        if (onSave) {
          onSave(sections, emailSettings, htmlContent);
        }
      }
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  }

  // Save for campaign (create mode only)
  async function handleSaveForCampaign() {
    if (!campaignName || !campaignSubject) {
      toast.error('Campaign name and subject are required');
      return;
    }

    if (sections.length === 0) {
      toast.error('Template must have at least one section');
      return;
    }

    try {
      setSavingForCampaign(true);

      // Generate HTML
      const htmlContent = generateEmailHTML();

      // Store in sessionStorage for campaign creation
      sessionStorage.setItem(
        'pendingCampaignTemplate',
        JSON.stringify({
          sections,
          settings: emailSettings,
          html: htmlContent,
        })
      );

      // Call onSave callback if provided
      if (onSave) {
        onSave(sections, emailSettings, htmlContent);
      } else {
        // Navigate back to campaign creation
        navigate('/app/campaigns/create', {
          state: {
            templateSaved: true,
            campaignName,
            campaignSubject,
          },
        });
      }

      toast.success('Template saved for campaign!');
    } catch (error: any) {
      console.error('Failed to save for campaign:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSavingForCampaign(false);
    }
  }

  // ============================================================================
  // UI HANDLERS
  // ============================================================================

  function handlePreview() {
    setShowPreview(true);
  }

  function handleClosePreview() {
    setShowPreview(false);
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-black px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">
              {mode === 'edit' ? 'Edit Template' : 'Template Editor'}
            </h1>
            <p className="text-gray-600 mt-1">
              {mode === 'edit'
                ? 'Update your email template with drag-and-drop sections'
                : 'Design your email template with drag-and-drop sections'}
            </p>
          </div>

          <div className="flex gap-3">
            {/* Cancel Button */}
            {onCancel && (
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={savingTemplate || savingForCampaign}
              >
                Cancel
              </Button>
            )}

            {/* Preview Button */}
            <Button variant="secondary" onClick={handlePreview}>
              <Eye size={18} />
              Preview
            </Button>

            {/* Save Button - Different text based on mode */}
            {mode === 'edit' ? (
              <Button
                variant="primary"
                onClick={handleSaveTemplate}
                loading={savingTemplate}
                disabled={savingTemplate}
              >
                {savingTemplate ? 'Updating...' : 'Update Template'}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSaveTemplate}
                  loading={savingTemplate}
                  disabled={savingTemplate || savingForCampaign}
                >
                  {savingTemplate ? 'Saving...' : 'Save as Template'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveForCampaign}
                  loading={savingForCampaign}
                  disabled={savingTemplate || savingForCampaign}
                >
                  {savingForCampaign ? 'Saving...' : 'Save for Campaign'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Settings */}
        <div className="w-80 bg-white border-r-2 border-black overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Template Metadata (edit mode only) */}
            {mode === 'edit' && (
              <div className="bg-purple/5 border-2 border-purple rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FileText size={20} />
                  Template Info
                </h3>

                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="My Email Template"
                  />
                </div>

                {/* Template Category */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
                  >
                    <option value="custom">Custom</option>
                    <option value="marketing">Marketing</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="transactional">Transactional</option>
                    <option value="events">Events</option>
                  </select>
                </div>

                {/* Template Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description{' '}
                    <span className="text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description of this template..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple resize-none"
                  />
                </div>
              </div>
            )}

            {/* Email Settings */}
            <div className="bg-gold/10 border-2 border-gold rounded-lg p-4 space-y-4">
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className="w-full flex items-center justify-between font-bold text-lg"
              >
                <span className="flex items-center gap-2">
                  <SettingsIcon size={20} />
                  Email Settings
                </span>
                {settingsExpanded ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {settingsExpanded && (
                <div className="space-y-4 pt-2">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company Name
                    </label>
                    <Input
                      type="text"
                      value={emailSettings.companyName}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      placeholder="Your Company"
                    />
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Background Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={emailSettings.backgroundColor}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            backgroundColor: e.target.value,
                          }))
                        }
                        className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={emailSettings.backgroundColor}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            backgroundColor: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={emailSettings.textColor}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            textColor: e.target.value,
                          }))
                        }
                        className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={emailSettings.textColor}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            textColor: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Link Color */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Link/Accent Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={emailSettings.linkColor}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            linkColor: e.target.value,
                          }))
                        }
                        className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={emailSettings.linkColor}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            linkColor: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Font Family
                    </label>
                    <select
                      value={emailSettings.fontFamily}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          fontFamily: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
                    >
                      <option value="DM Sans, sans-serif">DM Sans</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Helvetica, sans-serif">Helvetica</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="Times New Roman, serif">
                        Times New Roman
                      </option>
                      <option value="Courier New, monospace">
                        Courier New
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Drag sections to reorder them, click
                to edit content. Use merge fields like{' '}
                <code className="bg-blue-100 px-1 rounded">
                  {'{{MERGE:first_name}}'}
                </code>{' '}
                for personalization.
              </p>
            </div>
          </div>
        </div>

        {/* Center - Section Editor */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <SectionEditor sections={sections} onChange={setSections} />
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-black">
            {/* Modal Header */}
            <div className="border-b-2 border-black p-6 bg-gold">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold">Email Preview</h2>
                <button
                  onClick={handleClosePreview}
                  className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden p-6 bg-gray-100">
              <iframe
                srcDoc={generateEmailHTML()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                }}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-black p-6 bg-gray-50">
              <Button variant="secondary" onClick={handleClosePreview}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}