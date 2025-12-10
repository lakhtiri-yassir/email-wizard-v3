/**
 * ============================================================================
 * Templates Page
 * ============================================================================
 * 
 * Purpose: Browse, preview, edit, and manage email templates
 * 
 * Features:
 * - Visual template cards with thumbnails
 * - Preview templates in modal with TemplateViewer
 * - Create new templates from scratch
 * - Edit existing templates
 * - Use templates in campaigns
 * - Delete custom templates
 * - Filter by category
 * - Migrate old templates to section-based format
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Mail,
  Trash2,
  Loader2,
  Search,
  Filter,
  FileText,
  RefreshCw,
  X,
  Copy,
} from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import TemplateViewer from '../../components/templates/TemplateViewer';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';
import { migrateTemplatesToSections } from '../../utils/migrateTemplates';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface Template {
  id: string;
  name: string;
  category: string;
  description?: string;
  thumbnail?: string;
  is_locked: boolean;
  user_id?: string;
  created_at?: string;
  content: {
    sections: any[];
    settings: any;
    html?: string;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Templates() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ============================================================================
  // STATE
  // ============================================================================

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal states
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  
  // Migration state
  const [migrating, setMigrating] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  async function fetchTemplates() {
    try {
      setLoading(true);

      // Start with preset templates
      const allTemplates: Template[] = [...EMAIL_TEMPLATES];

      // Fetch custom user templates
      if (user) {
        const { data: customTemplates, error } = await supabase
          .from('templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (customTemplates) {
          // Add custom templates to the list
          allTemplates.push(...customTemplates);
        }
      }

      console.log('✅ Loaded templates:', allTemplates.length);
      setTemplates(allTemplates);
    } catch (error: any) {
      console.error('❌ Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredTemplates = templates.filter((template) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = template.name.toLowerCase().includes(query);
      const matchesDescription = template.description?.toLowerCase().includes(query);
      const matchesCategory = template.category.toLowerCase().includes(query);

      if (!matchesName && !matchesDescription && !matchesCategory) {
        return false;
      }
    }

    // Filter by category
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  // ============================================================================
  // HANDLERS
  // ============================================================================

  function handleCreateNew() {
    navigate('/app/templates/editor');
  }

  function handlePreviewTemplate(template: Template) {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  }

  function handleEditTemplate(template: Template) {
    if (template.is_locked) {
      // Can't edit locked templates, create a copy instead
      toast.error('System templates cannot be edited. Creating a copy...');
      handleDuplicateTemplate(template);
    } else {
      navigate(`/app/templates/edit/${template.id}`);
    }
  }

  function handleUseInCampaign(template: Template) {
    navigate('/app/campaigns/create', {
      state: { selectedTemplate: template },
    });
  }

  async function handleDuplicateTemplate(template: Template) {
    if (!user) {
      toast.error('You must be logged in to duplicate templates');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name: `${template.name} (Copy)`,
          category: template.category,
          description: template.description,
          content: template.content,
          is_locked: false,
          thumbnail: null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Template duplicated successfully!');
      fetchTemplates();

      // Navigate to edit the new template
      navigate(`/app/templates/edit/${data.id}`);
    } catch (error: any) {
      console.error('Failed to duplicate template:', error);
      toast.error('Failed to duplicate template');
    }
  }

  async function handleDeleteTemplate(template: Template) {
    if (template.is_locked) {
      toast.error('System templates cannot be deleted');
      return;
    }

    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingTemplate(template.id);

      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingTemplate(null);
    }
  }

  async function handleMigrateTemplates() {
    if (!confirm(
      'Migrate all templates to the new section-based format?\n\n' +
      'This will update templates to use the drag-and-drop editor. ' +
      'Original HTML will be preserved for backward compatibility.'
    )) {
      return;
    }

    try {
      setMigrating(true);
      toast.loading('Migrating templates...', { id: 'migration' });

      const result = await migrateTemplatesToSections();

      if (result.success) {
        toast.success(
          `✅ Migration complete! ${result.migratedCount} templates updated, ${result.skippedCount} already migrated.`,
          { id: 'migration', duration: 5000 }
        );
      } else {
        toast.error(
          `⚠️ Migration completed with errors. ${result.migratedCount} migrated, ${result.errors.length} failed.`,
          { id: 'migration', duration: 5000 }
        );
        console.error('Migration errors:', result.errors);
      }

      // Refresh templates
      await fetchTemplates();
    } catch (error: any) {
      console.error('Migration failed:', error);
      toast.error('Migration failed: ' + error.message, { id: 'migration' });
    } finally {
      setMigrating(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AppLayout currentPath="/app/templates">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-serif font-bold">Email Templates</h1>
              <p className="text-gray-600 mt-2">
                Browse pre-made templates or create your own custom designs
              </p>
            </div>

            <div className="flex gap-3">
              {/* Migration Button */}
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={handleMigrateTemplates}
                loading={migrating}
                disabled={migrating}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                {migrating ? 'Migrating...' : 'Migrate Templates'}
              </Button>

              {/* Create Template Button */}
              <Button
                variant="primary"
                icon={Plus}
                onClick={handleCreateNew}
                size="lg"
              >
                Create Template
              </Button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-12 pr-8 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple appearance-none bg-white min-w-[200px]"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all'
                      ? 'All Categories'
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredTemplates.length} of {templates.length} templates
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-purple" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTemplates.length === 0 && (
          <div className="text-center py-20">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first template'}
            </p>
            <Button variant="primary" icon={Plus} onClick={handleCreateNew}>
              Create Template
            </Button>
          </div>
        )}

        {/* Templates Grid */}
        {!loading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => handlePreviewTemplate(template)}
                onEdit={() => handleEditTemplate(template)}
                onUse={() => handleUseInCampaign(template)}
                onDelete={() => handleDeleteTemplate(template)}
                onDuplicate={() => handleDuplicateTemplate(template)}
                isDeleting={deletingTemplate === template.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border-2 border-black">
            {/* Modal Header */}
            <div className="border-b-2 border-black p-6 bg-gold flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Template Preview</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <TemplateViewer
                template={previewTemplate}
                onEdit={() => {
                  setShowPreviewModal(false);
                  handleEditTemplate(previewTemplate);
                }}
                onUseInCampaign={() => {
                  setShowPreviewModal(false);
                  handleUseInCampaign(previewTemplate);
                }}
                onDelete={
                  !previewTemplate.is_locked
                    ? () => {
                        setShowPreviewModal(false);
                        handleDeleteTemplate(previewTemplate);
                      }
                    : undefined
                }
                showActions={true}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: Template;
  onPreview: () => void;
  onEdit: () => void;
  onUse: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDeleting: boolean;
}

function TemplateCard({
  template,
  onPreview,
  onEdit,
  onUse,
  onDelete,
  onDuplicate,
  isDeleting,
}: TemplateCardProps) {
  // Generate HTML for thumbnail preview
  const generateThumbnailHTML = () => {
    // Use existing HTML if available
    if (template.content?.html) {
      return template.content.html;
    }

    // Generate simple preview from sections
    const settings = template.content?.settings || {
      companyName: 'Your Company',
      backgroundColor: '#F5F5F5',
      textColor: '#333333',
      linkColor: '#f3ba42',
      fontFamily: 'DM Sans, sans-serif',
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: ${settings.fontFamily}; 
              background-color: ${settings.backgroundColor};
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border: 2px solid #000;
              border-radius: 8px;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: ${settings.textColor}; margin: 0 0 10px 0;">
              ${settings.companyName}
            </h1>
            <p style="color: ${settings.textColor}; margin: 0;">
              ${template.name}
            </p>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="group bg-white rounded-lg border-2 border-black shadow-lg hover:shadow-2xl transition-all overflow-hidden">
      {/* Thumbnail Preview */}
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <iframe
            srcDoc={generateThumbnailHTML()}
            className="w-full h-full pointer-events-none"
            style={{
              transform: 'scale(0.4)',
              transformOrigin: 'top left',
              width: '250%',
              height: '250%',
            }}
            title={`Preview of ${template.name}`}
            sandbox="allow-same-origin"
          />
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onPreview}
            icon={Eye}
            className="bg-white"
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={template.is_locked ? onDuplicate : onEdit}
            icon={template.is_locked ? Copy : Edit2}
            className="bg-white"
          >
            {template.is_locked ? 'Duplicate' : 'Edit'}
          </Button>
        </div>

        {/* Lock Badge */}
        {template.is_locked && (
          <div className="absolute top-3 right-3 bg-purple text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-white">
            System Template
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg line-clamp-1">{template.name}</h3>
          <span className="ml-2 flex-shrink-0 px-2 py-1 bg-gold/20 text-gold border border-gold rounded-full text-xs font-medium">
            {template.content?.sections?.length || 0} sections
          </span>
        </div>

        {template.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-purple/10 text-purple rounded-full text-xs font-medium">
            {template.category}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={onUse}
            icon={Mail}
            size="sm"
          >
            Use Template
          </Button>

          {!template.is_locked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDelete}
              icon={Trash2}
              className="border-red-500 text-red-600 hover:bg-red-50"
              loading={isDeleting}
              disabled={isDeleting}
            >
              {isDeleting ? '' : <Trash2 size={16} />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}