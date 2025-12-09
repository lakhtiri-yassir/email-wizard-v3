/**
 * ============================================================================
 * Template Editor - Complete Section-Based Email Builder
 * ============================================================================
 * FIXED VERSION - Resolves React Error #130
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import SectionEditor from './SectionEditor';
import type { Section } from './SectionEditor';
import ColorPicker from './ColorPicker';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Save, X, Info } from 'lucide-react';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';

interface EmailSettings {
  companyName: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  fontFamily: string;
}

function TemplateEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Template data - FIXED: Proper searchParams access
  const templateId = searchParams.get('template') || '';
  const isCreationMode = searchParams.get('createMode') === 'true';
  const campaignName = searchParams.get('name') || '';
  const campaignSubject = searchParams.get('subject') || '';

  // Debug logging
  console.log('🔍 Template editor mode:', {
    isCreationMode,
    campaignName,
    campaignSubject,
    templateId,
    searchParams: Object.fromEntries(searchParams.entries())
  });

  // State
  const [sections, setSections] = useState<Section[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    companyName: 'Mail Wizard',
    backgroundColor: '#F5F5F5',
    textColor: '#333333',
    linkColor: '#f3ba42',
    fontFamily: 'Arial, Helvetica, sans-serif'
  });
  const [loading, setLoading] = useState(false);

  // Save template modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // BUG FIX #4: Initialize with selected template or default sections
  useEffect(() => {
    if (templateId) {
      // Load the selected template
      const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === templateId);

      if (selectedTemplate?.htmlContent) {
        console.log(`Loading template: ${selectedTemplate.name}`);

        // Parse the template HTML into sections
        // For now, create a single text section with the template HTML
        const templateSections: Section[] = [
          {
            id: 'template-content',
            type: 'text',
            content: {
              text: selectedTemplate.htmlContent
            }
          }
        ];

        setSections(templateSections);
        return;
      }
    }

    // Only use default sections if no templateId provided
    const defaultSections: Section[] = [
      {
        id: 'header-1',
        type: 'header',
        content: {
          title: 'Welcome to Our Newsletter',
          subtitle: 'Stay updated with our latest news'
        }
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          text: 'Dear Valued Customer,\n\nWe\'re excited to share our latest updates with you. This email contains important information about our products and services.'
        }
      },
      {
        id: 'button-1',
        type: 'button',
        content: {
          buttonText: 'Learn More',
          buttonUrl: 'https://example.com',
          buttonColor: '#f3ba42'
        }
      },
      {
        id: 'divider-1',
        type: 'divider',
        content: {
          dividerColor: '#E5E7EB'
        }
      }
    ];

    setSections(defaultSections);
  }, [templateId]);

  // Update preview when sections or settings change
  useEffect(() => {
    updatePreview();
  }, [sections, emailSettings]);

  /**
   * Generates complete HTML email from sections
   */
  function generateEmailHTML(): string {
    let sectionsHTML = '';

    sections.forEach(section => {
      switch (section.type) {
        case 'header':
          sectionsHTML += `
            <tr>
              <td style="padding: 40px 40px 20px 40px;">
                <h1 style="margin: 0 0 10px 0; color: ${emailSettings.textColor}; font-size: 32px; font-weight: bold; font-family: ${emailSettings.fontFamily};">
                  ${section.content.title || ''}
                </h1>
                ${section.content.subtitle ? `
                  <p style="margin: 0; color: #666666; font-size: 16px; font-family: ${emailSettings.fontFamily};">
                    ${section.content.subtitle}
                  </p>
                ` : ''}
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
                  ${section.content.caption ? `
                    <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px; text-align: center; font-style: italic; font-family: ${emailSettings.fontFamily};">
                      ${section.content.caption}
                    </p>
                  ` : ''}
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

    // Complete HTML email structure
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${campaignSubject || 'Email Template'}</title>
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: ${emailSettings.fontFamily}; background-color: ${emailSettings.backgroundColor};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${emailSettings.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border: 2px solid #000000; border-radius: 8px;">

          <!-- Company Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #f3ba42;">
              <h1 style="margin: 0; color: ${emailSettings.textColor}; font-size: 28px; font-weight: bold; font-family: 'DM Serif Display', Georgia, serif;">
                ${emailSettings.companyName}
              </h1>
            </td>
          </tr>

          <!-- Dynamic Sections -->
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

  /**
   * Updates iframe preview
   */
  function updatePreview() {
    if (!iframeRef.current) return;

    const html = generateEmailHTML();
    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;

    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
    }
  }

  /**
   * Saves template and continues to campaign creation
   */
  async function handleSave() {
    if (sections.length === 0) {
      toast.error('Please add at least one section to your email');
      return;
    }

    setLoading(true);

    try {
      const htmlContent = generateEmailHTML();

      if (isCreationMode) {
        console.log('📧 Template editor in creation mode - returning to campaign');
        console.log('🔍 Campaign context:', { campaignName, campaignSubject });

        // Campaign creation mode - navigate back with data
        navigate('/app/campaigns', {
          state: {
            completedTemplate: {
              html: htmlContent,
              sections: sections,
              settings: emailSettings,
              campaignName: campaignName,
              campaignSubject: campaignSubject
            }
          },
          replace: true
        });

        toast.success('Template customized! Now select recipients.');
        return;
      } else {
        // Normal template editing mode - just close
        toast.success('Template updated');
        navigate('/app/templates');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Save template to library
   */
  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      setSaveError('Template name is required');
      return;
    }

    if (templateName.length > 255) {
      setSaveError('Template name must be 255 characters or less');
      return;
    }

    if (sections.length === 0) {
      toast.error('Please add at least one section to your template');
      return;
    }

    setSavingTemplate(true);
    setSaveError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const htmlContent = generateEmailHTML();

      const { error } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name: templateName.trim(),
          category: 'custom',
          content: {
            html: htmlContent,
            sections: sections,
            settings: emailSettings
          },
          is_locked: false,
          thumbnail: null,
        });

      if (error) throw error;

      toast.success(`Template "${templateName}" saved successfully!`);
      setShowSaveModal(false);
      setTemplateName('');
      navigate('/app/templates');

    } catch (err: any) {
      console.error('Failed to save template:', err);
      setSaveError(err.message || 'Failed to save template');
      toast.error('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <AppLayout currentPath="/app/templates">
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b-2 border-black p-6 flex-shrink-0">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <div>
              <h1 className="text-2xl font-serif font-bold">
                {isCreationMode ? `Create Campaign: ${campaignName}` : 'Template Editor'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isCreationMode ? campaignSubject : 'Build your email template with drag-and-drop sections'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="tertiary"
                onClick={() => navigate(isCreationMode ? '/app/campaigns' : '/app/templates')}
              >
                Cancel
              </Button>

              {!isCreationMode && (
                <Button
                  variant="secondary"
                  onClick={() => setShowSaveModal(true)}
                >
                  <Save size={18} className="mr-2" />
                  Save Template
                </Button>
              )}

              <Button
                variant="primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : (isCreationMode ? 'Continue to Recipients' : 'Save & Close')}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content: Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Section Editor */}
          <div className="w-1/2 border-r-2 border-black overflow-y-auto bg-white p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Email Settings */}
              <div className="bg-white border-2 border-black rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-serif font-bold mb-4">Email Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      value={emailSettings.companyName}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ColorPicker
                      color={emailSettings.backgroundColor}
                      onChange={(color) => setEmailSettings(prev => ({ ...prev, backgroundColor: color }))}
                      label="Background Color"
                    />
                    <ColorPicker
                      color={emailSettings.textColor}
                      onChange={(color) => setEmailSettings(prev => ({ ...prev, textColor: color }))}
                      label="Text Color"
                    />
                  </div>

                  <ColorPicker
                    color={emailSettings.linkColor}
                    onChange={(color) => setEmailSettings(prev => ({ ...prev, linkColor: color }))}
                    label="Link Color"
                  />

                  <div>
                    <label className="block text-sm font-medium mb-2">Font Family</label>
                    <select
                      value={emailSettings.fontFamily}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
                    >
                      <option value="Arial, Helvetica, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', Times, serif">Times New Roman</option>
                      <option value="'Courier New', Courier, monospace">Courier New</option>
                      <option value="Verdana, Geneva, sans-serif">Verdana</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section Editor */}
              <div className="bg-white border-2 border-black rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-serif font-bold mb-4">Email Content</h2>
                <SectionEditor
                  sections={sections}
                  onChange={setSections}
                />
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="w-1/2 bg-gray-100 p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-lg sticky top-0">
                <div className="bg-gold px-4 py-3 border-b-2 border-black">
                  <h3 className="font-bold text-black">Live Preview</h3>
                  <p className="text-xs text-black/70 mt-1">Updates in real-time as you edit</p>
                </div>
                <div className="bg-gray-100 p-2">
                  <iframe
                    ref={iframeRef}
                    className="w-full bg-white border-2 border-gray-300 rounded"
                    style={{
                      height: 'calc(100vh - 180px)',
                      minHeight: '600px'
                    }}
                    title="Email Preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-lg max-w-md w-full shadow-2xl border-2 border-black">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-serif font-bold">Save Template</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Template Name <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    value={templateName}
                    onChange={(e) => {
                      setTemplateName(e.target.value);
                      setSaveError(null);
                    }}
                    placeholder="My Awesome Email Template"
                    error={saveError || undefined}
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    {templateName.length}/255 characters
                  </p>
                </div>

                <div className="bg-purple/5 border border-purple/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info size={18} className="text-purple flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      This template will be saved to "My Templates" and can be reused for future campaigns.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setShowSaveModal(false)}
                disabled={savingTemplate}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default TemplateEditor;