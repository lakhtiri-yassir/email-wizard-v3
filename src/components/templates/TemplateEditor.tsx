/**
 * ============================================================================
 * TEMPLATE EDITOR - Email Template Builder
 * ============================================================================
 * 
 * FIXED: Added campaign creation return flow support
 * - Detects when opened from campaign creation
 * - Stores edited template in sessionStorage
 * - Returns user to campaign creation after save
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  X, 
  Eye, 
  Settings as SettingsIcon, 
  ChevronDown, 
  ChevronUp,
  Save,
  Sparkles,
  Palette,
  Type,
  Layout,
  ArrowLeft,
  Check
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import SectionEditor from './SectionEditor';
import type { Section } from './SectionEditor';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TemplateEditorProps {
  mode?: 'create' | 'edit';
  existingTemplate?: any;
  onSave?: (sections: Section[], settings: any, html: string) => void;
  onCancel?: () => void;
}

interface TemplateSettings {
  companyName: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  fontFamily: string;
}

const DEFAULT_SETTINGS: TemplateSettings = {
  companyName: 'Your Company',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  linkColor: '#f3ba42',
  fontFamily: "'DM Sans', sans-serif"
};

export default function TemplateEditor({
  mode = 'create',
  existingTemplate,
  onSave,
  onCancel
}: TemplateEditorProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // ✅ FIX: Detect campaign creation context
  const returnToCampaign = searchParams.get('returnToCampaign') === 'true';
  const templateId = searchParams.get('templateId');

  const [templateName, setTemplateName] = useState(existingTemplate?.name || 'Untitled Template');
  const [templateCategory, setTemplateCategory] = useState(existingTemplate?.category || 'marketing');
  const [sections, setSections] = useState<Section[]>(existingTemplate?.content?.sections || []);
  const [settings, setSettings] = useState<TemplateSettings>(
    existingTemplate?.content?.settings || DEFAULT_SETTINGS
  );
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Load template if templateId provided
  useEffect(() => {
    if (templateId && !existingTemplate) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  async function loadTemplate(id: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setTemplateName(data.name);
      setTemplateCategory(data.category || 'marketing');
      setSections(data.content?.sections || []);
      setSettings(data.content?.settings || DEFAULT_SETTINGS);
    } catch (error: any) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  }

  // Generate HTML from sections
  function generateHTML(): string {
    let sectionsHTML = '';

    sections.forEach(section => {
      switch (section.type) {
        case 'header':
          sectionsHTML += `
            <tr>
              <td style="padding: 40px 40px 20px 40px; text-align: center;">
                <h1 style="margin: 0 0 10px 0; color: ${settings.textColor}; font-size: 32px; font-weight: bold; font-family: ${settings.fontFamily};">
                  ${section.content.title || ''}
                </h1>
                ${section.content.subtitle ? `
                  <p style="margin: 0; color: #666666; font-size: 18px; font-family: ${settings.fontFamily};">
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
                <div style="color: ${settings.textColor}; font-size: 16px; line-height: 1.6; font-family: ${settings.fontFamily};">
                  ${section.content.text || ''}
                </div>
              </td>
            </tr>
          `;
          break;

        case 'image':
          sectionsHTML += `
            <tr>
              <td style="padding: 20px 40px; text-align: center;">
                ${section.content.imageUrl ? `
                  <img src="${section.content.imageUrl}" alt="${section.content.imageAlt || ''}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
                  ${section.content.caption ? `
                    <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px; font-family: ${settings.fontFamily};">
                      ${section.content.caption}
                    </p>
                  ` : ''}
                ` : ''}
              </td>
            </tr>
          `;
          break;

        case 'button':
          sectionsHTML += `
            <tr>
              <td style="padding: 20px 40px; text-align: center;">
                <a href="${section.content.buttonUrl || '#'}" style="display: inline-block; padding: 14px 32px; background-color: ${section.content.buttonColor || settings.linkColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: ${settings.fontFamily};">
                  ${section.content.buttonText || 'Click Here'}
                </a>
              </td>
            </tr>
          `;
          break;

        case 'divider':
          sectionsHTML += `
            <tr>
              <td style="padding: 20px 40px;">
                <hr style="border: none; border-top: 2px solid ${section.content.dividerColor || '#E5E7EB'}; margin: 0;">
              </td>
            </tr>
          `;
          break;

        case 'footer':
          sectionsHTML += `
            <tr>
              <td style="padding: 40px 40px 40px 40px; text-align: center; background-color: #f9fafb;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-family: ${settings.fontFamily};">
                  ${section.content.companyName || settings.companyName}
                </p>
                ${section.content.address ? `
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; font-family: ${settings.fontFamily};">
                    ${section.content.address}
                  </p>
                ` : ''}
                <p style="margin: 0; color: #999999; font-size: 11px; font-family: ${settings.fontFamily};">
                  <a href="{{unsubscribe_url}}" style="color: #999999; text-decoration: underline;">Unsubscribe</a>
                </p>
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
<body style="margin: 0; padding: 0; background-color: ${settings.backgroundColor}; font-family: ${settings.fontFamily};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${sectionsHTML}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  // ✅ FIX: Handle save with campaign return flow
  async function handleSave() {
    if (returnToCampaign) {
      // Save to sessionStorage for campaign creation
      const html = generateHTML();
      const templateData = {
        html: html,
        content: {
          sections: sections,
          settings: settings,
          html: html
        },
        templateId: templateId || existingTemplate?.id,
        name: templateName
      };

      sessionStorage.setItem('editedTemplate', JSON.stringify(templateData));
      console.log('✅ Template saved to sessionStorage, returning to campaign creation...');

      // Navigate back to campaigns with resume flag
      navigate('/app/campaigns?resumeCampaign=true');
      return;
    }

    // Normal save flow (save to database)
    if (!user) {
      toast.error('You must be logged in to save templates');
      return;
    }

    try {
      setSaving(true);
      const html = generateHTML();
      const templateData = {
        user_id: user.id,
        name: templateName,
        category: templateCategory,
        content: {
          sections: sections,
          settings: settings,
          html: html
        }
      };

      if (mode === 'edit' && existingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update(templateData)
          .eq('id', existingTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully!');
      } else {
        const { error } = await supabase
          .from('templates')
          .insert([templateData]);

        if (error) throw error;
        toast.success('Template created successfully!');
      }

      if (onSave) {
        onSave(sections, settings, html);
      } else {
        navigate('/app/templates');
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (returnToCampaign) {
      // Return to campaigns without saving
      navigate('/app/campaigns');
      return;
    }

    if (onCancel) {
      onCancel();
    } else {
      navigate('/app/templates');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-black sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowLeft}
                onClick={handleCancel}
              >
                {returnToCampaign ? 'Back to Campaign' : 'Back'}
              </Button>
              <div>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-xl font-semibold border-0 p-0 focus:ring-0"
                  placeholder="Template Name"
                />
                {returnToCampaign && (
                  <p className="text-sm text-gray-500 mt-1">
                    Editing template for campaign creation
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={viewMode === 'edit' ? Eye : Layout}
                onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
              >
                {viewMode === 'edit' ? 'Preview' : 'Edit'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={SettingsIcon}
                onClick={() => setShowSettings(!showSettings)}
              >
                Settings
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={returnToCampaign ? Check : Save}
                onClick={handleSave}
                loading={saving}
                disabled={saving}
              >
                {returnToCampaign ? 'Use This Template' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Palette size={20} />
              Template Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Company Name</label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  placeholder="Your Company"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="w-12 h-10 border-2 border-black rounded cursor-pointer"
                  />
                  <Input
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    className="w-12 h-10 border-2 border-black rounded cursor-pointer"
                  />
                  <Input
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Link Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.linkColor}
                    onChange={(e) => setSettings({ ...settings, linkColor: e.target.value })}
                    className="w-12 h-10 border-2 border-black rounded cursor-pointer"
                  />
                  <Input
                    value={settings.linkColor}
                    onChange={(e) => setSettings({ ...settings, linkColor: e.target.value })}
                    placeholder="#f3ba42"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Font Family</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-black rounded-lg"
                >
                  <option value="'DM Sans', sans-serif">DM Sans</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {viewMode === 'edit' ? (
          <div className="bg-white border-2 border-black rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Edit Template Sections</h3>
              <p className="text-gray-600 text-sm">
                Add, edit, and reorder sections to build your email template
              </p>
            </div>

            <SectionEditor sections={sections} onChange={setSections} />
          </div>
        ) : (
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
            <div className="border-b-2 border-black p-4 bg-gray-50">
              <h3 className="font-semibold">Preview</h3>
            </div>
            <div className="p-6">
              <iframe
                srcDoc={generateHTML()}
                className="w-full border-2 border-gray-300 rounded-lg"
                style={{ minHeight: '600px' }}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}