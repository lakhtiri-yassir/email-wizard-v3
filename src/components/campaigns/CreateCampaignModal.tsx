/**
 * ============================================================================
 * CREATE CAMPAIGN MODAL - Multi-Step Campaign Creation Wizard
 * ============================================================================
 * 
 * PURPOSE:
 * Professional multi-step modal for creating email campaigns with complete
 * campaign configuration including details, template selection, recipients,
 * and scheduling.
 * 
 * FEATURES:
 * - 4-step wizard: Details → Template → Recipients → Schedule
 * - Progress indicator with step validation
 * - Real-time form validation
 * - Recipient count preview
 * - Template preview and selection
 * - Schedule now or later options
 * - Smart defaults from user profile
 * 
 * PROPS:
 * - onClose: () => void - Callback when modal is closed
 * - onSuccess: (campaign: Campaign) => void - Callback when campaign is created
 * 
 * STEPS:
 * 1. Campaign Details - Name, subject, description, from/reply-to
 * 2. Template Selection - Choose from available email templates
 * 3. Recipients - Select who receives the campaign
 * 4. Schedule - Send now or schedule for later
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Mail, Users, Calendar, FileText, Loader2, Code, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';

// ============================================================================
// INTERFACES
// ============================================================================

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  created_at: string;
}

interface CampaignFormData {
  // Step 1: Campaign Details
  name: string;
  description: string;
  subject: string;
  previewText: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;

  // Step 2: Template
  templateId: string;
  customHtml: string | null;
  inputMode: 'custom' | 'template';

  // Step 3: Recipients
  sendToMode: 'all' | 'groups' | 'contacts';
  selectedGroups: Set<string>;
  selectedContacts: Set<string>;

  // Step 4: Schedule
  scheduleMode: 'now' | 'later';
  scheduledDate: string;
  scheduledTime: string;
}

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
}

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: (campaign: Campaign) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Form data state
  const [formData, setFormData] = useState<CampaignFormData>({
    // Step 1
    name: '',
    description: '',
    subject: '',
    previewText: '',
    fromName: profile?.full_name || '',
    fromEmail: user?.email || '',
    replyTo: user?.email || '',

    // Step 2
    templateId: '',
    customHtml: null,
    inputMode: 'template',

    // Step 3
    sendToMode: 'all',
    selectedGroups: new Set<string>(),
    selectedContacts: new Set<string>(),

    // Step 4
    scheduleMode: 'now',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadContactsAndGroups();
  }, []);

  // Handle return from template editor
  useEffect(() => {
    if (location.state?.completedTemplate) {
      const { html, campaignName, campaignSubject } = location.state.completedTemplate;

      // Update form data with template HTML
      setFormData(prev => ({
        ...prev,
        customHtml: html,
        name: campaignName,
        subject: campaignSubject
      }));

      // Set to step 3 (recipients)
      setCurrentStep(3);

      // Clear navigation state
      window.history.replaceState({}, document.title);

      toast.success('Template customization complete! Now select your recipients.');
    }
  }, [location.state]);

  /**
   * Load contacts and groups from database
   */
  async function loadContactsAndGroups() {
    try {
      setLoadingData(true);

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['active']);

      if (contactsError) throw contactsError;

      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (groupsError) throw groupsError;

      setContacts(contactsData || []);
      setGroups(groupsData || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load contacts and groups');
    } finally {
      setLoadingData(false);
    }
  }

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  /**
   * Update form field value
   */
  function updateField(field: keyof CampaignFormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

  /**
   * Toggle group selection
   */
  function toggleGroup(groupId: string) {
    setFormData(prev => {
      const newGroups = new Set(prev.selectedGroups);
      if (newGroups.has(groupId)) {
        newGroups.delete(groupId);
      } else {
        newGroups.add(groupId);
      }
      return { ...prev, selectedGroups: newGroups };
    });
  }

  /**
   * Toggle contact selection
   */
  function toggleContact(contactId: string) {
    setFormData(prev => {
      const newContacts = new Set(prev.selectedContacts);
      if (newContacts.has(contactId)) {
        newContacts.delete(contactId);
      } else {
        newContacts.add(contactId);
      }
      return { ...prev, selectedContacts: newContacts };
    });
  }

  /**
   * Select/deselect all contacts
   */
  function toggleAllContacts() {
    if (formData.selectedContacts.size === contacts.length) {
      setFormData(prev => ({ ...prev, selectedContacts: new Set() }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedContacts: new Set(contacts.map(c => c.id))
      }));
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate current step
   */
  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Campaign Details
      if (!formData.name.trim()) {
        newErrors.name = 'Campaign name is required';
      } else if (formData.name.length < 3) {
        newErrors.name = 'Campaign name must be at least 3 characters';
      } else if (formData.name.length > 100) {
        newErrors.name = 'Campaign name must be less than 100 characters';
      }

      if (!formData.subject.trim()) {
        newErrors.subject = 'Subject line is required';
      } else if (formData.subject.length < 3) {
        newErrors.subject = 'Subject line must be at least 3 characters';
      } else if (formData.subject.length > 200) {
        newErrors.subject = 'Subject line must be less than 200 characters';
      }

      if (!formData.fromEmail.trim()) {
        newErrors.fromEmail = 'From email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.fromEmail)) {
        newErrors.fromEmail = 'Invalid email format';
      }

      if (!formData.fromName.trim()) {
        newErrors.fromName = 'From name is required';
      }

      if (formData.description && formData.description.length > 500) {
        newErrors.description = 'Description must be less than 500 characters';
      }
    }

    if (step === 2) {
      // Template Selection or Custom HTML
      // Note: Validation handled in handleNext for step 2 due to dual-path logic
    }

    if (step === 3) {
      // Recipients
      const recipientCount = calculateRecipientCount();
      if (recipientCount === 0) {
        newErrors.recipients = 'Please select at least one recipient';
      }
    }

    if (step === 4) {
      // Schedule
      if (formData.scheduleMode === 'later') {
        if (!formData.scheduledDate) {
          newErrors.scheduledDate = 'Please select a date';
        } else {
          const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
          if (scheduledDateTime <= new Date()) {
            newErrors.scheduledDate = 'Scheduled time must be in the future';
          }
        }

        if (!formData.scheduledTime) {
          newErrors.scheduledTime = 'Please select a time';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Go to next step
   */
  function handleNext() {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      // Step 1 validation
      if (!validateStep(1)) {
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Step 2 validation - handle dual paths
      if (formData.inputMode === 'custom') {
        if (!formData.customHtml || formData.customHtml.trim().length === 0) {
          setErrors({ customHtml: 'HTML code is required' });
          return;
        }
        updateField('templateId', '');
        setCurrentStep(3);
      } else if (formData.inputMode === 'template') {
        if (!formData.templateId) {
          setErrors({ templateId: 'Please select a template' });
          return;
        }
        // Navigate to template editor with campaign context
        const params = new URLSearchParams({
          template: formData.templateId,
          createMode: 'true',
          name: formData.name,
          subject: formData.subject
        });
        navigate(`/app/template-editor?${params.toString()}`);
        return;
      }
    } else if (currentStep === 3) {
      // Step 3 validation
      if (!validateStep(3)) {
        return;
      }
      setCurrentStep(4);
    }

    setErrors({});
  }

  /**
   * Go to previous step
   */
  function handleBack() {
    setCurrentStep(prev => prev - 1);
    setErrors({});
  }

  // ============================================================================
  // RECIPIENT CALCULATION
  // ============================================================================

  /**
   * Calculate total recipient count
   */
  function calculateRecipientCount(): number {
    if (formData.sendToMode === 'all') {
      return contacts.length;
    }

    if (formData.sendToMode === 'groups') {
      // Get unique contacts from selected groups
      const groupIds = Array.from(formData.selectedGroups);
      const totalCount = groups
        .filter(g => groupIds.includes(g.id))
        .reduce((sum, g) => sum + g.contact_count, 0);
      return totalCount;
    }

    if (formData.sendToMode === 'contacts') {
      return formData.selectedContacts.size;
    }

    return 0;
  }

  // ============================================================================
  // CAMPAIGN CREATION
  // ============================================================================

  /**
   * Create campaign in database
   */
  async function handleCreateCampaign() {
    if (!validateStep(4)) return;

    try {
      setIsSubmitting(true);

      // Prepare campaign data
      const campaignData: any = {
        user_id: user?.id,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        preview_text: formData.previewText.trim() || null,
        from_name: formData.fromName.trim(),
        from_email: formData.fromEmail.trim(),
        reply_to: formData.replyTo.trim(),
        content: {
          templateId: formData.templateId,
          description: formData.description.trim(),
        },
        status: 'draft',
        recipients_count: calculateRecipientCount(),
      };

      // Add scheduling if selected
      if (formData.scheduleMode === 'later') {
        campaignData.scheduled_at = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
        campaignData.status = 'scheduled';
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Store recipient selection in campaign content
      const recipientData = {
        sendToMode: formData.sendToMode,
        selectedGroups: Array.from(formData.selectedGroups),
        selectedContacts: Array.from(formData.selectedContacts),
      };

      // Update campaign with recipient info
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          content: {
            ...campaignData.content,
            recipients: recipientData,
          }
        })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      toast.success(
        formData.scheduleMode === 'now' 
          ? 'Campaign created successfully!' 
          : 'Campaign scheduled successfully!'
      );

      onSuccess(campaign);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Get step icon
   */
  function getStepIcon(step: number) {
    switch (step) {
      case 1: return FileText;
      case 2: return Mail;
      case 3: return Users;
      case 4: return Calendar;
      default: return FileText;
    }
  }

  /**
   * Get step title
   */
  function getStepTitle(step: number) {
    switch (step) {
      case 1: return 'Campaign Details';
      case 2: return 'Choose Template';
      case 3: return 'Select Recipients';
      case 4: return 'Schedule';
      default: return '';
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-serif font-bold">Create Campaign</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => {
              const Icon = getStepIcon(step);
              const isCompleted = step < currentStep;
              const isCurrent = step === currentStep;
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-gold text-black'
                          : isCurrent
                          ? 'bg-purple text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        isCurrent ? 'text-purple' : 'text-gray-500'
                      }`}
                    >
                      {getStepTitle(step)}
                    </span>
                  </div>
                  {step < 4 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-gold' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingData ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-purple" size={32} />
            </div>
          ) : (
            <>
              {/* Step 1: Campaign Details */}
              {currentStep === 1 && (
                <Step1CampaignDetails
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                />
              )}

              {/* Step 2: Template Selection */}
              {currentStep === 2 && (
                <Step2TemplateSelection
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                  userPlan={profile?.plan_type || 'free'}
                />
              )}

              {/* Step 3: Recipients */}
              {currentStep === 3 && (
                <Step3RecipientSelection
                  formData={formData}
                  contacts={contacts}
                  groups={groups}
                  errors={errors}
                  updateField={updateField}
                  toggleGroup={toggleGroup}
                  toggleContact={toggleContact}
                  toggleAllContacts={toggleAllContacts}
                  recipientCount={calculateRecipientCount()}
                />
              )}

              {/* Step 4: Schedule */}
              {currentStep === 4 && (
                <Step4Schedule
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                  recipientCount={calculateRecipientCount()}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isSubmitting}
            icon={currentStep === 1 ? X : ChevronLeft}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex gap-3">
            {currentStep < 4 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                icon={ChevronRight}
                iconPosition="right"
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleCreateCampaign}
                loading={isSubmitting}
                disabled={isSubmitting}
                icon={Mail}
              >
                {formData.scheduleMode === 'now' ? 'Create Campaign' : 'Schedule Campaign'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

/**
 * Step 1: Campaign Details
 */
function Step1CampaignDetails({
  formData,
  errors,
  updateField,
}: {
  formData: CampaignFormData;
  errors: Record<string, string>;
  updateField: (field: keyof CampaignFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign Information</h3>
        <p className="text-gray-600 text-sm mb-6">
          Provide basic information about your email campaign.
        </p>
      </div>

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Campaign Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g., Summer Sale 2025"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.name.length}/100 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Description <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          className="input-base w-full min-h-[80px] resize-y"
          placeholder="Internal notes about this campaign..."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.description.length}/500 characters
        </p>
      </div>

      {/* Subject Line */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Subject Line <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g., Save 30% on Summer Essentials!"
          value={formData.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          error={errors.subject}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.subject.length}/200 characters
        </p>
      </div>

      {/* Preview Text */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Preview Text <span className="text-gray-400">(Optional)</span>
        </label>
        <Input
          type="text"
          placeholder="Text shown in email preview..."
          value={formData.previewText}
          onChange={(e) => updateField('previewText', e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          This appears next to the subject line in email clients
        </p>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Sender Information</h3>
      </div>

      {/* From Name */}
      <div>
        <label className="block text-sm font-medium mb-2">
          From Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="Your Company Name"
          value={formData.fromName}
          onChange={(e) => updateField('fromName', e.target.value)}
          error={errors.fromName}
        />
      </div>

      {/* From Email */}
      <div>
        <label className="block text-sm font-medium mb-2">
          From Email <span className="text-red-500">*</span>
        </label>
        <Input
          type="email"
          placeholder="hello@yourcompany.com"
          value={formData.fromEmail}
          onChange={(e) => updateField('fromEmail', e.target.value)}
          error={errors.fromEmail}
        />
      </div>

      {/* Reply To */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Reply-To Email <span className="text-gray-400">(Optional)</span>
        </label>
        <Input
          type="email"
          placeholder="support@yourcompany.com"
          value={formData.replyTo}
          onChange={(e) => updateField('replyTo', e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Where replies will be sent (defaults to From Email)
        </p>
      </div>
    </div>
  );
}

/**
 * Step 2: Template Selection
 */
function Step2TemplateSelection({
  formData,
  errors,
  updateField,
  userPlan,
}: {
  formData: CampaignFormData;
  errors: Record<string, string>;
  updateField: (field: keyof CampaignFormData, value: any) => void;
  userPlan: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'sales', name: 'Sales' },
    { id: 'newsletter', name: 'Newsletter' },
    { id: 'announcement', name: 'Announcement' },
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? EMAIL_TEMPLATES
    : EMAIL_TEMPLATES.filter(t => t.category === selectedCategory);

  const isPlusUser = userPlan === 'pro_plus';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose How to Create Your Email</h3>
        <p className="text-gray-600 text-sm mb-6">
          Select a template to customize or paste your own HTML code.
        </p>
      </div>

      {/* Input Mode Toggle */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => updateField('inputMode', 'custom')}
          className={`p-6 border-2 rounded-lg transition-all ${
            formData.inputMode === 'custom'
              ? 'border-purple bg-purple/5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <Code size={32} className={formData.inputMode === 'custom' ? 'text-purple' : 'text-gray-400'} />
            <div className="text-center">
              <div className="font-semibold">Custom HTML Code</div>
              <div className="text-sm text-gray-600 mt-1">
                Paste your own HTML email code
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => updateField('inputMode', 'template')}
          className={`p-6 border-2 rounded-lg transition-all ${
            formData.inputMode === 'template'
              ? 'border-purple bg-purple/5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <FileText size={32} className={formData.inputMode === 'template' ? 'text-purple' : 'text-gray-400'} />
            <div className="text-center">
              <div className="font-semibold">Select Template</div>
              <div className="text-sm text-gray-600 mt-1">
                Choose from our professional templates
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Custom HTML Input */}
      {formData.inputMode === 'custom' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              HTML Email Code <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.customHtml || ''}
              onChange={(e) => {
                updateField('customHtml', e.target.value);
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.customHtml;
                  return newErrors;
                });
              }}
              className="w-full h-96 px-4 py-3 border-2 border-black rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple resize-y"
              placeholder="<!DOCTYPE html>
<html>
<head>
  <style>
    /* Your email styles */
  </style>
</head>
<body>
  <!-- Your email content -->
</body>
</html>"
            />
            {errors.customHtml && (
              <p className="mt-2 text-sm text-red-600">{errors.customHtml}</p>
            )}
            <p className="mt-2 text-xs text-gray-600">
              Paste your complete HTML email code. Make sure to include inline CSS styles for best email client compatibility.
            </p>
          </div>

          <div className="bg-gold/10 border-2 border-gold/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-gold flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold mb-1">HTML Email Best Practices:</div>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Use inline CSS styles instead of &lt;style&gt; tags</li>
                  <li>Use tables for layout (email clients have limited CSS support)</li>
                  <li>Test in multiple email clients before sending</li>
                  <li>Include alt text for images</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection */}
      {formData.inputMode === 'template' && (
        <>
          {errors.templateId && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.templateId}
            </div>
          )}

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap border-b pb-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {filteredTemplates.map((template) => {
              const isLocked = template.isPlusOnly && !isPlusUser;
              const isSelected = formData.templateId === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => {
                    if (!isLocked) {
                      updateField('templateId', template.id);
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.templateId;
                        return newErrors;
                      });
                    }
                  }}
                  disabled={isLocked}
                  className={`relative border-2 rounded-lg p-4 text-left transition-all ${
                    isSelected
                      ? 'border-purple bg-purple/5'
                      : isLocked
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 hover:border-purple/50'
                  }`}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-purple rounded-full flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}

                  {/* Plus Badge */}
                  {template.isPlusOnly && (
                    <div className="absolute top-2 left-2 bg-gold text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <Mail size={12} />
                      PRO+
                    </div>
                  )}

                  {/* Template Info */}
                  <div className="mt-8">
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {template.category}
                      </span>
                      {isLocked && (
                        <span className="text-xs text-gray-500">Upgrade to unlock</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No templates found in this category.
            </div>
          )}

          {/* Template Selected Confirmation */}
          {formData.templateId && (
            <div className="mt-6 bg-purple/5 border-2 border-purple rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-purple" />
                  <div>
                    <div className="font-semibold">Template Selected</div>
                    <div className="text-sm text-gray-600">
                      You'll customize this template in the next step
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="s"
                  onClick={() => updateField('templateId', '')}
                >
                  Change
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Step 3: Recipient Selection
 */
function Step3RecipientSelection({
  formData,
  contacts,
  groups,
  errors,
  updateField,
  toggleGroup,
  toggleContact,
  toggleAllContacts,
  recipientCount,
}: {
  formData: CampaignFormData;
  contacts: Contact[];
  groups: ContactGroup[];
  errors: Record<string, string>;
  updateField: (field: keyof CampaignFormData, value: any) => void;
  toggleGroup: (groupId: string) => void;
  toggleContact: (contactId: string) => void;
  toggleAllContacts: () => void;
  recipientCount: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Recipients</h3>
        <p className="text-gray-600 text-sm mb-6">
          Choose who will receive this campaign.
        </p>
      </div>

      {errors.recipients && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errors.recipients}
        </div>
      )}

      {/* No Contacts Warning */}
      {contacts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          You don't have any contacts yet. Please add contacts before creating a campaign.
        </div>
      )}

      {/* Send Mode Selection */}
      {contacts.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium mb-3">Send To:</label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateField('sendToMode', 'all')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  formData.sendToMode === 'all'
                    ? 'bg-gold text-black'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All Contacts ({contacts.length})
              </button>
              {groups.length > 0 && (
                <button
                  onClick={() => updateField('sendToMode', 'groups')}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    formData.sendToMode === 'groups'
                      ? 'bg-gold text-black'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Select Groups
                </button>
              )}
              <button
                onClick={() => updateField('sendToMode', 'contacts')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  formData.sendToMode === 'contacts'
                    ? 'bg-gold text-black'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Select Contacts
              </button>
            </div>
          </div>

          {/* Group Selection */}
          {formData.sendToMode === 'groups' && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Choose Groups:
              </label>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No groups available. Create groups in the Contacts page.
                </p>
              ) : (
                <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedGroups.has(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="mr-3 w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-gray-600">{group.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {group.contact_count} contacts
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Selection */}
          {formData.sendToMode === 'contacts' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">
                  Choose Contacts:
                </label>
                <button
                  onClick={toggleAllContacts}
                  className="text-sm text-purple hover:text-purple/80 font-medium"
                >
                  {formData.selectedContacts.size === contacts.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedContacts.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="mr-3 w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {contact.first_name && contact.last_name
                          ? `${contact.first_name} ${contact.last_name}`
                          : contact.email}
                      </p>
                      {contact.first_name && contact.last_name && (
                        <p className="text-xs text-gray-600">{contact.email}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Recipient Count */}
          <div className="bg-purple/10 border border-purple rounded-lg p-4">
            <p className="text-sm font-medium">
              <span className="text-purple font-bold text-lg">{recipientCount}</span>{' '}
              recipient{recipientCount !== 1 ? 's' : ''} will receive this campaign
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Step 4: Schedule
 */
function Step4Schedule({
  formData,
  errors,
  updateField,
  recipientCount,
}: {
  formData: CampaignFormData;
  errors: Record<string, string>;
  updateField: (field: keyof CampaignFormData, value: any) => void;
  recipientCount: number;
}) {
  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Schedule Your Campaign</h3>
        <p className="text-gray-600 text-sm mb-6">
          Choose when to send your campaign.
        </p>
      </div>

      {/* Schedule Mode */}
      <div>
        <label className="block text-sm font-medium mb-3">When to Send:</label>
        <div className="flex gap-3">
          <button
            onClick={() => updateField('scheduleMode', 'now')}
            className={`flex-1 border-2 rounded-lg p-4 text-left transition-all ${
              formData.scheduleMode === 'now'
                ? 'border-purple bg-purple/5'
                : 'border-gray-200 hover:border-purple/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.scheduleMode === 'now'
                    ? 'border-purple'
                    : 'border-gray-300'
                }`}
              >
                {formData.scheduleMode === 'now' && (
                  <div className="w-3 h-3 bg-purple rounded-full" />
                )}
              </div>
              <h4 className="font-semibold">Send Now</h4>
            </div>
            <p className="text-sm text-gray-600 ml-8">
              Campaign will be sent immediately after creation
            </p>
          </button>

          <button
            onClick={() => updateField('scheduleMode', 'later')}
            className={`flex-1 border-2 rounded-lg p-4 text-left transition-all ${
              formData.scheduleMode === 'later'
                ? 'border-purple bg-purple/5'
                : 'border-gray-200 hover:border-purple/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.scheduleMode === 'later'
                    ? 'border-purple'
                    : 'border-gray-300'
                }`}
              >
                {formData.scheduleMode === 'later' && (
                  <div className="w-3 h-3 bg-purple rounded-full" />
                )}
              </div>
              <h4 className="font-semibold">Schedule for Later</h4>
            </div>
            <p className="text-sm text-gray-600 ml-8">
              Choose a specific date and time to send
            </p>
          </button>
        </div>
      </div>

      {/* Schedule Date/Time */}
      {formData.scheduleMode === 'later' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <Input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => updateField('scheduledDate', e.target.value)}
              min={minDate}
              error={errors.scheduledDate}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <Input
              type="time"
              value={formData.scheduledTime}
              onChange={(e) => updateField('scheduledTime', e.target.value)}
              error={errors.scheduledTime}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3">
        <h4 className="font-semibold mb-3">Campaign Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Campaign Name:</p>
            <p className="font-medium">{formData.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Subject Line:</p>
            <p className="font-medium">{formData.subject}</p>
          </div>
          <div>
            <p className="text-gray-600">Recipients:</p>
            <p className="font-medium">{recipientCount} contacts</p>
          </div>
          <div>
            <p className="text-gray-600">Send Time:</p>
            <p className="font-medium">
              {formData.scheduleMode === 'now'
                ? 'Immediately'
                : `${formData.scheduledDate} at ${formData.scheduledTime}`}
            </p>
          </div>
        </div>
      </div>

      {formData.scheduleMode === 'later' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium mb-1">📅 Scheduled Campaign</p>
          <p>
            Your campaign will be automatically sent at the scheduled time. You can modify or
            cancel it before then from the Campaigns page.
          </p>
        </div>
      )}
    </div>
  );
}