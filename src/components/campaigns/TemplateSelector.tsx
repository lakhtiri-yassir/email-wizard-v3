import { useState } from 'react';
import { FileText, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EMAIL_TEMPLATES, extractMergeFields } from '../../data/emailTemplates';
import { Button } from '../ui/Button';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  selectedTemplateId: string | null;
}

export const TemplateSelector = ({ onSelect, selectedTemplateId }: TemplateSelectorProps) => {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const isPlusUser = profile?.plan_type === 'pro_plus';
  
  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'sales', name: 'Sales' },
    { id: 'newsletter', name: 'Newsletter' },
    { id: 'announcement', name: 'Announcement' }
  ];
  
  const filteredTemplates = selectedCategory === 'all'
    ? EMAIL_TEMPLATES
    : EMAIL_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-bold mb-2">Choose a Template</h2>
        <p className="text-gray-600">Select a professional email template to customize</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full border transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-[#f3ba42] text-black border-black font-semibold'
                : 'bg-white text-gray-700 border-gray-300 hover:border-black'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const hasPersonalization = template.supportsPersonalization;
          const isLocked = hasPersonalization && !isPlusUser;
          
          return (
            <div
              key={template.id}
              onClick={() => !isLocked && onSelect(template.id)}
              className={`border-2 rounded-lg overflow-hidden transition-all ${
                selectedTemplateId === template.id
                  ? 'border-[#f3ba42] shadow-lg'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Template Preview */}
              <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <FileText size={48} className="text-gray-400" />
                {hasPersonalization && (
                  <div className="absolute top-3 right-3">
                    {isPlusUser ? (
                      <div className="flex items-center gap-1 px-3 py-1 bg-[#57377d] text-white rounded-full text-xs font-bold">
                        <Sparkles size={12} />
                        Personalized
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded-full text-xs font-bold">
                        <Lock size={12} />
                        Pro Plus
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif font-bold">{template.name}</h3>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
                
                {isLocked && (
                  <div className="mt-3 text-xs text-amber-700 font-medium">
                    🔒 Upgrade to Pro Plus to use this template
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};