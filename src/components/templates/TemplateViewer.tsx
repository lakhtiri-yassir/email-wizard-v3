/**
 * ============================================================================
 * Template Viewer Component
 * ============================================================================
 * 
 * Purpose: Display template with inline editing capabilities
 * 
 * Features:
 * - Visual section preview (no HTML code)
 * - Switch between preview and edit modes
 * - Inline drag-and-drop editing
 * - Direct navigation to full editor
 * - Section count and category display
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Edit2, Eye, Mail, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import SectionEditor from './SectionEditor';
import type { Section } from './SectionEditor';

interface TemplateViewerProps {
  template: {
    id: string;
    name: string;
    category: string;
    description?: string;
    is_locked: boolean;
    content: {
      sections: Section[];
      settings: {
        companyName: string;
        backgroundColor: string;
        textColor: string;
        linkColor: string;
        fontFamily: string;
      };
      html?: string;
    };
  };
  onEdit?: () => void;
  onUseInCampaign?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export default function TemplateViewer({
  template,
  onEdit,
  onUseInCampaign,
  onDelete,
  showActions = true
}: TemplateViewerProps) {
  // Initialize navigation hooks
  const navigate = useNavigate();
  const location = useLocation();

  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [sections, setSections] = useState<Section[]>(template.content.sections || []);

  // Generate HTML for preview
  const generatePreviewHTML = () => {
    const settings = template.content.settings;
    
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
                  <p style="margin: 0; color: #666666; font-size: 16px; font-family: ${settings.fontFamily};">
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
                <div style="color: ${settings.textColor}; font-size: 16px; line-height: 1.6; font-family: ${settings.fontFamily}; white-space: pre-wrap;">
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
                    <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px; text-align: center; font-style: italic; font-family: ${settings.fontFamily};">
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
                      <a href="${section.content.buttonUrl || '#'}" style="display: inline-block; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px; font-family: ${settings.fontFamily};">
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
  <title>${template.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${settings.fontFamily}; background-color: ${settings.backgroundColor};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${settings.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border: 2px solid #000000; border-radius: 8px;">
          <tr>
            <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid ${settings.linkColor};">
              <h1 style="margin: 0; color: ${settings.textColor}; font-size: 28px; font-weight: bold; font-family: 'DM Serif Display', Georgia, serif;">
                ${settings.companyName}
              </h1>
            </td>
          </tr>
          ${sectionsHTML}
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 2px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #666666; font-family: ${settings.fontFamily};">
                <a href="{{VIEW_IN_BROWSER_URL}}" style="color: ${settings.linkColor}; text-decoration: underline;">View in browser</a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #666666; font-family: ${settings.fontFamily};">
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
  };

  return (
    <div className="bg-white rounded-lg border-2 border-black shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gold px-6 py-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-serif font-bold text-black">{template.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs bg-white px-2 py-1 rounded-full border border-black font-medium">
                {template.category}
              </span>
              <span className="text-xs text-black/70">
                {sections.length} section{sections.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'preview' ? 'primary' : 'secondary'}
              size="sm"
              icon={Eye}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </Button>
            <Button
              variant={viewMode === 'edit' ? 'primary' : 'secondary'}
              size="sm"
              icon={Edit2}
              onClick={() => setViewMode('edit')}
            >
              Quick Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {viewMode === 'preview' ? (
          /* Preview Mode - Show rendered HTML */
          <div className="bg-gray-100 rounded-lg p-4">
            <iframe
              srcDoc={generatePreviewHTML()}
              style={{
                width: '100%',
                height: '600px',
                border: '2px solid #000000',
                borderRadius: '8px',
                backgroundColor: '#ffffff'
              }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          /* Edit Mode - Show drag-and-drop section editor */
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GripVertical size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Quick Edit Mode</p>
                  <p className="text-blue-700">
                    Drag sections to reorder, click to edit inline. For advanced editing, use the "Full Editor" button below.
                  </p>
                </div>
              </div>
            </div>

            <SectionEditor
              sections={sections}
              onChange={setSections}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="border-t-2 border-black bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {onUseInCampaign && (
                <Button
                  variant="primary"
                  onClick={onUseInCampaign}
                  icon={Mail}
                >
                  Use in Campaign
                </Button>
              )}
              {onEdit && (
  <Button
    variant="secondary"
    onClick={() => {
      console.log('📝 Opening Full Editor for template:', template.id);
      
      // ✅ FIX: Proper navigation with state
      navigate(`/app/template/editor`, {
        state: {
          mode: 'edit',
          template: template,
          returnUrl: location.pathname // Allow return to current page
        }
      });
    }}
    icon={Edit2}
  >
    Full Editor
  </Button>
)}
            </div>

            {!template.is_locked && onDelete && (
              <Button
                variant="secondary"
                onClick={onDelete}
                icon={Trash2}
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}