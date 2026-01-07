/**
 * ============================================================================
 * Section Editor Component
 * ============================================================================
 * 
 * Purpose: Drag-and-drop email section builder with inline editing
 * 
 * Features:
 * - Drag and drop to reorder sections
 * - Add new sections (header, text, image, button, divider)
 * - Edit section content inline
 * - Delete sections
 * - Duplicate sections
 * - Visual preview of each section type
 * 
 * Section Types:
 * - Header: Title and subtitle
 * - Text: Rich text content with merge fields
 * - Image: Upload image with alt text and caption
 * - Button: CTA button with URL and styling
 * - Divider: Horizontal line separator
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  Heading1,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ImageUpload from './ImageUpload';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Section {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider';
  content: Record<string, any>;
}

interface SectionEditorProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
}

// ============================================================================
// SECTION TYPE TEMPLATES
// ============================================================================

const SECTION_TEMPLATES: Record<string, Partial<Section>> = {
  header: {
    type: 'header',
    content: {
      title: 'Your Heading Here',
      subtitle: 'Optional subtitle text',
    },
  },
  text: {
    type: 'text',
    content: {
      text: 'Start writing your content here...\n\nYou can use merge fields like {{MERGE:first_name}} for personalization.',
    },
  },
  image: {
    type: 'image',
    content: {
      imageUrl: '',
      imageAlt: '',
      caption: '',
    },
  },
  button: {
    type: 'button',
    content: {
      buttonText: 'Click Here',
      buttonUrl: 'https://example.com',
      buttonColor: '#f3ba42',
    },
  },
  divider: {
    type: 'divider',
    content: {
      dividerColor: '#E5E7EB',
    },
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

  // Keep all sections expanded by default when sections change
  useEffect(() => {
    setExpandedSections(new Set(sections.map((s) => s.id)));
  }, [sections]);

  // ============================================================================
  // SECTION MANAGEMENT
  // ============================================================================

  function addSection(type: string) {
    const template = SECTION_TEMPLATES[type];
    if (!template) return;

    const newSection: Section = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: template.type as Section['type'],
      content: { ...template.content },
    };

    onChange([...sections, newSection]);

    // Auto-expand new section
    setExpandedSections((prev) => new Set([...prev, newSection.id]));
  }

  function deleteSection(id: string) {
    if (confirm('Delete this section?')) {
      onChange(sections.filter((s) => s.id !== id));
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function duplicateSection(section: Section) {
    const newSection: Section = {
      ...section,
      id: `${section.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const index = sections.findIndex((s) => s.id === section.id);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);

    onChange(newSections);

    // Auto-expand duplicated section
    setExpandedSections((prev) => new Set([...prev, newSection.id]));
  }

  function updateSectionContent(id: string, updates: Record<string, any>) {
    onChange(
      sections.map((section) =>
        section.id === id
          ? { ...section, content: { ...section.content, ...updates } }
          : section
      )
    );
  }

  function toggleSectionExpanded(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ============================================================================
  // DRAG AND DROP
  // ============================================================================

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedIndex];
    newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedSection);

    onChange(newSections);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  // ============================================================================
  // SECTION RENDERING
  // ============================================================================

  function getSectionIcon(type: Section['type']) {
    switch (type) {
      case 'header':
        return <Heading1 size={18} />;
      case 'text':
        return <Type size={18} />;
      case 'image':
        return <ImageIcon size={18} />;
      case 'button':
        return <LinkIcon size={18} />;
      case 'divider':
        return <Minus size={18} />;
    }
  }

  function getSectionLabel(type: Section['type']) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function renderSectionContent(section: Section) {
    const isExpanded = expandedSections.has(section.id);

    if (!isExpanded) {
      return (
        <div 
          className="p-4 text-sm text-gray-500 italic cursor-pointer hover:bg-gray-50 hover:text-gray-700 transition-colors rounded-lg"
          onClick={() => toggleSectionExpanded(section.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSectionExpanded(section.id);
            }
          }}
        >
          Click anywhere here to expand and edit this section...
        </div>
      );
    }


    switch (section.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                key={`title-${section.id}`}
                type="text"
                value={section.content.title || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { title: e.target.value })
                }
                placeholder="Your Heading Here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Subtitle <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                key={`subtitle-${section.id}`}
                type="text"
                value={section.content.subtitle || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { subtitle: e.target.value })
                }
                placeholder="Optional subtitle text"
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Text Content <span className="text-red-500">*</span>
              </label>
              <textarea
                key={`text-${section.id}`}
                value={section.content.text || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { text: e.target.value })
                }
                placeholder="Start writing your content here..."
                rows={8}
                className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Use merge fields for personalization:
                <br />
                <code className="bg-gray-100 px-1 rounded">
                  {'{{MERGE:first_name}}'}
                </code>
                ,{' '}
                <code className="bg-gray-100 px-1 rounded">
                  {'{{MERGE:last_name}}'}
                </code>
                ,{' '}
                <code className="bg-gray-100 px-1 rounded">
                  {'{{MERGE:email}}'}
                </code>
              </p>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Image <span className="text-red-500">*</span>
              </label>
              <ImageUpload
                onImageUploaded={(url) => {
                  updateSectionContent(section.id, { imageUrl: url });
                }}
                existingImageUrl={section.content.imageUrl}
                onRemove={() => {
                  updateSectionContent(section.id, { imageUrl: '' });
                }}
              />
            </div>

            {/* Image Alt Text */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Alt Text <span className="text-gray-400">(For accessibility)</span>
              </label>
              <Input
                type="text"
                value={section.content.imageAlt || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { imageAlt: e.target.value })
                }
                placeholder="Describe the image..."
              />
            </div>

            {/* Image Caption */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Caption <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                type="text"
                value={section.content.caption || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { caption: e.target.value })
                }
                placeholder="Image caption..."
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Button Text <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={section.content.buttonText || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { buttonText: e.target.value })
                }
                placeholder="Click Here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Button URL <span className="text-red-500">*</span>
              </label>
              <Input
                type="url"
                value={section.content.buttonUrl || ''}
                onChange={(e) =>
                  updateSectionContent(section.id, { buttonUrl: e.target.value })
                }
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Button Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={section.content.buttonColor || '#f3ba42'}
                  onChange={(e) =>
                    updateSectionContent(section.id, {
                      buttonColor: e.target.value,
                    })
                  }
                  className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={section.content.buttonColor || '#f3ba42'}
                  onChange={(e) =>
                    updateSectionContent(section.id, {
                      buttonColor: e.target.value,
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>
            {/* Button Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2 font-medium">Preview:</p>
              <div className="text-center">
                <div
                  className="inline-block px-6 py-3 rounded-full border-2 border-black font-bold cursor-default"
                  style={{
                    backgroundColor: section.content.buttonColor || '#f3ba42',
                    color: '#000000',
                  }}
                >
                  {section.content.buttonText || 'Click Here'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Divider Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={section.content.dividerColor || '#E5E7EB'}
                  onChange={(e) =>
                    updateSectionContent(section.id, {
                      dividerColor: e.target.value,
                    })
                  }
                  className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={section.content.dividerColor || '#E5E7EB'}
                  onChange={(e) =>
                    updateSectionContent(section.id, {
                      dividerColor: e.target.value,
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>
            {/* Divider Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2 font-medium">Preview:</p>
              <div
                className="h-0.5 w-full"
                style={{
                  backgroundColor: section.content.dividerColor || '#E5E7EB',
                }}
              />
            </div>
          </div>
        );

      default:
        return <div className="text-sm text-gray-500">Unknown section type</div>;
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Email Sections</h3>
        <span className="text-sm text-gray-500">
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
          <ImageIcon size={48} className="mx-auto text-blue-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">No sections yet</h3>
          <p className="text-gray-600 mb-6">
            Start building your email by adding sections below
          </p>
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(section.id);

          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                bg-white border-2 rounded-lg overflow-hidden transition-all
                ${
                  draggedIndex === index
                    ? 'border-purple shadow-lg opacity-50'
                    : 'border-black hover:shadow-md'
                }
              `}
            >
              {/* Section Header */}
              <div
                className="bg-gray-50 border-b-2 border-black p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => toggleSectionExpanded(section.id)}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                  <GripVertical size={20} />
                </div>

                {/* Section Icon and Label */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="p-2 bg-white border border-gray-300 rounded">
                    {getSectionIcon(section.type)}
                  </div>
                  <span className="font-bold">{getSectionLabel(section.type)}</span>
                  <span className="text-xs text-gray-500">
                    #{index + 1}
                  </span>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSectionExpanded(section.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSection(section);
                    }}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="Duplicate section"
                  >
                    <Copy size={18} className="text-blue-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(section.id);
                    }}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                    title="Delete section"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>

              {/* Section Content */}
              <div className="p-6">{renderSectionContent(section)}</div>
            </div>
          );
        })}
      </div>

      {/* Add Section Buttons */}
      <div className="bg-gold/10 border-2 border-gold rounded-lg p-6">
        <h4 className="font-bold mb-4 flex items-center gap-2">
          <Plus size={20} />
          Add Section
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Button
            variant="secondary"
            onClick={() => addSection('header')}
            icon={Heading1}
            className="justify-start"
          >
            Header
          </Button>
          <Button
            variant="secondary"
            onClick={() => addSection('text')}
            icon={Type}
            className="justify-start"
          >
            Text
          </Button>
          <Button
            variant="secondary"
            onClick={() => addSection('image')}
            icon={ImageIcon}
            className="justify-start"
          >
            Image
          </Button>
          <Button
            variant="secondary"
            onClick={() => addSection('button')}
            icon={LinkIcon}
            className="justify-start"
          >
            Button
          </Button>
          <Button
            variant="secondary"
            onClick={() => addSection('divider')}
            icon={Minus}
            className="justify-start"
          >
            Divider
          </Button>
        </div>
      </div>
    </div>
  );
}