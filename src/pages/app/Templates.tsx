import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Crown, Lock } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { EMAIL_TEMPLATES, extractMergeFields } from '../../data/emailTemplates';

const CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'sales', name: 'Sales' },
  { id: 'newsletter', name: 'Newsletter' },
  { id: 'announcement', name: 'Announcement' }
];

export const Templates = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const isPlusUser = profile?.plan_type === 'pro_plus';

  const filteredTemplates = selectedCategory === 'all'
    ? EMAIL_TEMPLATES
    : EMAIL_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleUseTemplate = (templateId: string) => {
    navigate(`/app/template-editor?template=${templateId}`);
  };

  return (
    <AppLayout currentPath="/app/templates">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Email Templates</h1>
          <p className="text-gray-600">
            Choose from our professionally designed templates to create stunning emails.
          </p>
        </div>

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full border transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-[#f3ba42] text-black border-black font-semibold'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const hasPersonalization = template.supportsPersonalization;
            const isLocked = hasPersonalization && !isPlusUser;
            const mergeFields = hasPersonalization ? extractMergeFields(template.htmlContent) : [];

            return (
              <div
                key={template.id}
                className="bg-white border border-black rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <FileText size={64} className="text-gray-400" />
                  {hasPersonalization && (
                    <div className="absolute top-3 right-3">
                      {isPlusUser ? (
                        <div className="bg-[#57377d] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Crown size={14} />
                          Pro Plus
                        </div>
                      ) : (
                        <div className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Lock size={14} />
                          Pro Plus
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-serif font-bold text-lg mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                  {hasPersonalization && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Merge Fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {mergeFields.map((field) => (
                          <span
                            key={field}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleUseTemplate(template.id)}
                      disabled={isLocked}
                    >
                      {isLocked ? 'Upgrade to Use' : 'Use Template'}
                    </Button>
                  </div>

                  {isLocked && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      This template requires Pro Plus for personalization features
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No templates found in this category.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};