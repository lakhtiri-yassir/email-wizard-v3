/**
 * ============================================================================
 * Section Preview Component
 * ============================================================================
 * 
 * Purpose: Display individual sections in a visual card format
 * 
 * Features:
 * - Visual representation of each section type
 * - Icon badges for section types
 * - Content preview (truncated if long)
 * - Read-only display mode
 * 
 * ============================================================================
 */

import { 
  Type, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Minus, 
  Heading1 
} from 'lucide-react';
import type { Section } from './SectionEditor';

interface SectionPreviewProps {
  section: Section;
  readOnly?: boolean;
}

export default function SectionPreview({ section, readOnly = false }: SectionPreviewProps) {
  // Get icon for section type
  const getSectionIcon = () => {
    switch (section.type) {
      case 'header':
        return <Heading1 size={16} />;
      case 'text':
        return <Type size={16} />;
      case 'image':
        return <ImageIcon size={16} />;
      case 'button':
        return <LinkIcon size={16} />;
      case 'divider':
        return <Minus size={16} />;
      default:
        return <Type size={16} />;
    }
  };

  // Get section type label
  const getSectionLabel = () => {
    return section.type.charAt(0).toUpperCase() + section.type.slice(1);
  };

  // Get section content preview
  const getContentPreview = () => {
    switch (section.type) {
      case 'header':
        return (
          <div>
            <div className="font-bold text-lg">{section.content.title || 'Untitled'}</div>
            {section.content.subtitle && (
              <div className="text-sm text-gray-600 mt-1">{section.content.subtitle}</div>
            )}
          </div>
        );

      case 'text':
        const text = section.content.text || '';
        const preview = text.length > 150 ? text.substring(0, 150) + '...' : text;
        return (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {preview || 'Empty text section'}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {section.content.imageUrl ? (
              <img
                src={section.content.imageUrl}
                alt={section.content.imageAlt || 'Image'}
                className="w-full h-32 object-cover rounded border"
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                <ImageIcon size={32} />
              </div>
            )}
            {section.content.caption && (
              <div className="text-xs text-gray-600 italic">{section.content.caption}</div>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="inline-flex items-center">
            <div
              className="px-6 py-3 rounded-full border-2 border-black font-bold text-sm"
              style={{
                backgroundColor: section.content.buttonColor || '#f3ba42',
                color: '#000000'
              }}
            >
              {section.content.buttonText || 'Button Text'}
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="py-2">
            <div
              className="h-0.5 w-full"
              style={{
                backgroundColor: section.content.dividerColor || '#E5E7EB'
              }}
            />
          </div>
        );

      default:
        return <div className="text-sm text-gray-500">Unknown section type</div>;
    }
  };

  return (
    <div className={`
      bg-white rounded-lg border-2 border-gray-200 p-4 
      ${!readOnly ? 'hover:border-purple hover:shadow-md transition-all' : ''}
    `}>
      {/* Section Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
          {getSectionIcon()}
          <span>{getSectionLabel()}</span>
        </div>
      </div>

      {/* Section Content Preview */}
      <div className="section-preview-content">
        {getContentPreview()}
      </div>
    </div>
  );
}