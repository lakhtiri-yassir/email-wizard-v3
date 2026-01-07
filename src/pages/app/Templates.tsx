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
  X,
  Copy,
} from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import TemplateViewer from '../../components/templates/TemplateViewer';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';
import toast from 'react-hot-toast';

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

export default function Templates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  async function fetchTemplates() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allTemplates = [
        ...EMAIL_TEMPLATES.map((t) => ({
          ...t,
          is_locked: true,
          user_id: null,
        })),
        ...(data || []),
      ];

      setTemplates(allTemplates);
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = template.name.toLowerCase().includes(query);
      const matchesDescription = template.description?.toLowerCase().includes(query);
      const matchesCategory = template.category.toLowerCase().includes(query);

      if (!matchesName && !matchesDescription && !matchesCategory) {
        return false;
      }
    }

    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  function handleCreateNew() {
    navigate('/app/template/editor');
  }

  function handlePreviewTemplate(template: Template) {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  }

  function handleEditTemplate(template: Template) {
  if (template.is_locked) {
    // ✅ FIX: System templates should be duplicated, not edited
    toast.info('Creating a copy of system template...');
    handleDuplicateTemplate(template);
    return;
  }

  // ✅ FIX 5: Navigate to editor with proper state
  navigate('/app/template/editor', {
    state: {
      mode: 'edit',
      template: template,
      returnUrl: window.location.pathname
    }
  });
}

  function handleUseTemplate(template: Template) {
    // ✅ FIX 5: Navigate to editor with proper state
    navigate('/app/template/editor', {
      state: {
        mode: 'edit',
        template: template,
        returnUrl: window.location.pathname
      }
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

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">Email Templates</h1>
            <p className="text-gray-600 mt-1">
              Create and manage your email templates
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
            />
          </div>

          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-purple" />
          </div>
        )}

        {!loading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => handlePreviewTemplate(template)}
                onEdit={() => handleEditTemplate(template)}
                onUse={() => handleUseTemplate(template)}
                onDelete={() => handleDeleteTemplate(template)}
                onDuplicate={() => handleDuplicateTemplate(template)}
                isDeleting={deletingTemplate === template.id}
              />
            ))}
          </div>
        )}
      </div>

      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border-2 border-black">
            <div className="border-b-2 border-black p-6 bg-gold flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Template Preview</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <TemplateViewer
                template={previewTemplate}
                onEdit={() => {
                  setShowPreviewModal(false);
                  handleEditTemplate(previewTemplate);
                }}
                onUseInCampaign={() => {
                  setShowPreviewModal(false);
                  handleUseTemplate(previewTemplate);
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
  const generateThumbnailHTML = () => {
    if (template.content?.html) {
      return template.content.html;
    }

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

        {template.is_locked && (
          <div className="absolute top-3 right-3 bg-purple text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-white">
            System Template
          </div>
        )}
      </div>

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