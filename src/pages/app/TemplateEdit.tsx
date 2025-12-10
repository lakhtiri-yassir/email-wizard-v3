/**
 * ============================================================================
 * Template Edit Page
 * ============================================================================
 * 
 * Purpose: Full-page template editor for existing templates
 * 
 * Features:
 * - Load existing template for editing
 * - Full drag-and-drop editor interface
 * - Save updates back to database
 * - Navigate back to templates list
 * 
 * ============================================================================
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import TemplateEditor from '../../components/templates/TemplateEditor';
import { Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TemplateEdit() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadTemplate() {
    try {
      setLoading(true);
      setError(null);

      console.log('📥 Loading template:', templateId);

      const { data, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        throw new Error('Template not found');
      }

      // Verify ownership (unless it's a system template)
      if (!data.is_locked && data.user_id !== user?.id) {
        throw new Error('You do not have permission to edit this template');
      }

      // Don't allow editing locked templates
      if (data.is_locked) {
        throw new Error('System templates cannot be edited. Please create a copy instead.');
      }

      console.log('✅ Template loaded:', data.name);
      setTemplate(data);

    } catch (error: any) {
      console.error('❌ Failed to load template:', error);
      setError(error.message || 'Failed to load template');
      toast.error(error.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    toast.success('Template updated successfully');
    navigate('/app/templates');
  }

  function handleCancel() {
    if (confirm('Discard unsaved changes?')) {
      navigate('/app/templates');
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-purple mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading template...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-red-500 rounded-lg p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to Load Template</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/app/templates')}
            className="px-6 py-3 bg-purple text-white rounded-lg font-medium hover:bg-purple/90 transition-colors"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  // Main editor
  return (
    <TemplateEditor
      mode="edit"
      existingTemplate={template}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}