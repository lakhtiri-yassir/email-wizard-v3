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
 * - 3 schedule options: Send Now, Schedule Later, Keep as Draft
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
 * 4. Schedule - Send now, schedule later, or keep as draft
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Mail, Users, Calendar, FileText, Loader2, Code, AlertCircle, CheckCircle, Clock, Lock } from 'lucide-react';
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
  scheduleMode: 'now' | 'later' | 'draft';  // ✅ UPDATED: Added 'draft'
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

interface VerifiedDomain {
  id: string;
  domain: string;
  verified: boolean;
}

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: (campaign: Campaign) => void;
  shouldLoadTemplate?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateCampaignModal({ 
  onClose, 
  onSuccess, 
  shouldLoadTemplate = false 
}: CreateCampaignModalProps) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [verifiedDomains, setVerifiedDomains] = useState<VerifiedDomain[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const username = user?.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const defaultDomain = 'mail.mailwizard.io';

  // Form data state
  const [formData, setFormData] = useState<CampaignFormData>({
    // Step 1
    name: '',
    description: '',
    subject: '',
    previewText: '',
    fromName: profile?.full_name || '',
    fromEmail: `${username}@mail.mailwizard.io`,  // ✅ FIX #1: Default sending domain
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
    scheduleMode: 'draft',  // ✅ UPDATED: Default to draft
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Template fetching state
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadContactsAndGroups();
  }, []);
  // Add this near the top of the CreateCampaignModal function
// In CreateCampaignModal.tsx - Replace the entire restoration useEffect

useEffect(() => {
  if (shouldLoadTemplate) {
    console.log('🔄 shouldLoadTemplate flag detected');
    
    const campaignDraft = sessionStorage.getItem('campaignDraft');
    const editedTemplate = sessionStorage.getItem('editedTemplate');

    console.log('📦 campaignDraft:', campaignDraft ? 'Found' : 'Not found');
    console.log('📦 editedTemplate:', editedTemplate ? 'Found' : 'Not found');

    if (campaignDraft && editedTemplate) {
      try {
        const draft = JSON.parse(campaignDraft);
        const template = JSON.parse(editedTemplate);

        console.log('✅ Parsed draft:', draft);
        console.log('✅ Parsed template:', template);

        // Restore ALL form data with edited template
        const restoredFormData = {
          ...draft.formData,
          customHtml: template.html || template.content?.html || '',
          templateId: template.templateId || draft.formData.templateId,
          inputMode: 'custom' as const // ✅ Important: Set to custom since we now have HTML
        };

        console.log('🔄 Restoring form data:', restoredFormData);
        
        setFormData(restoredFormData);

        // Move to step 3 (Recipients) after a small delay
        setTimeout(() => {
          console.log('➡️ Advancing to Step 3');
          setCurrentStep(3);
          toast.success('✅ Template loaded! Now select recipients.');
        }, 100);

        // Clean up sessionStorage
        sessionStorage.removeItem('campaignDraft');
        sessionStorage.removeItem('editedTemplate');
        
        console.log('🧹 SessionStorage cleaned up');

      } catch (error) {
        console.error('❌ Error restoring campaign draft:', error);
        toast.error('Failed to restore campaign. Please start over.');
      }
    } else {
      console.warn('⚠️ Missing data in sessionStorage');
      if (!campaignDraft) console.warn('  - campaignDraft is missing');
      if (!editedTemplate) console.warn('  - editedTemplate is missing');
    }
  }
}, [shouldLoadTemplate]);
  // Handle return from template editor
  useEffect(() => {
    if (shouldLoadTemplate && location.state?.completedTemplate) {
      const { html, campaignName, campaignSubject } = location.state.completedTemplate;

      console.log('✅ Loading template data - shouldLoadTemplate=true');

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
    } else {
      // Ensure we start at step 1 when not loading template
      console.log('🆕 Starting fresh at Step 1 - shouldLoadTemplate=false');
      setCurrentStep(1);
    }
  }, [shouldLoadTemplate, location.state]);
  
  // Fetch all templates (system + user custom)
  useEffect(() => {
    async function fetchAllTemplates() {
      try {
        setLoadingTemplates(true);
        const templates = [...EMAIL_TEMPLATES];
        
        if (user) {
          const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          if (data) templates.push(...data);
        }
        
        console.log('✅ Loaded templates for campaign:', templates.length);
        setAllTemplates(templates);
      } catch (error: any) {
        console.error('❌ Failed to fetch templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    }
    
    fetchAllTemplates();
  }, [user]);

  async function loadContactsAndGroups() {
    try {
      setLoadingData(true);

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['active']);

      if (contactsError) throw contactsError;

      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (groupsError) throw groupsError;

      const { data: domainsData } = await supabase
        .from('sending_domains')
        .select('id, domain, verified')
        .eq('user_id', user?.id)
        .eq('verification_status', true);

      setContacts(contactsData || []);
      setGroups(groupsData || []);
      setVerifiedDomains(domainsData || []);
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
        navigate(`/app/template/editor?templateId=${formData.templateId}&returnToCampaign=true`);
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

        // ✅ FIX #2: Save HTML content to custom_html column
        custom_html: formData.customHtml?.trim() || null,

        content: {
          templateId: formData.templateId,
          description: formData.description.trim(),
          // ✅ FIX #2: Also save to content.html for backward compatibility
          html: formData.customHtml?.trim() || null,
        },

        // ✅ FIX #3: Set correct initial status based on schedule mode
        status: formData.scheduleMode === 'now' ? 'sending' 
              : formData.scheduleMode === 'later' ? 'scheduled' 
              : 'draft',
        
        recipients_count: calculateRecipientCount(),
      };

      // Add scheduling if selected
      if (formData.scheduleMode === 'later') {
        campaignData.scheduled_at = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // ✅ FIX #3: Store recipient selection in campaign content
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

      // ✅ FIX: Actually send emails when "Send Now" is selected
if (formData.scheduleMode === 'now') {
  console.log('📧 Send Now selected - starting email sending...');
  
  // Show loading toast
  const sendToastId = toast.loading('Campaign created! Sending emails...');
  
  try {
    // Build recipient list
    let recipientList: Contact[] = [];
    
    if (formData.sendToMode === 'all') {
      recipientList = contacts.filter((c) => c.status === "active");
    } else if (formData.sendToMode === 'contacts') {
      const selectedIds = Array.from(formData.selectedContacts);
      recipientList = contacts.filter(
        (c) => selectedIds.includes(c.id) && c.status === "active"
      );
    } else if (formData.sendToMode === 'groups') {
      const groupIds = Array.from(formData.selectedGroups);
      const { data: groupMembers } = await supabase
        .from("contact_group_members")
        .select("contact_id")
        .in("group_id", groupIds);

      if (groupMembers) {
        const contactIds = groupMembers.map((gm) => gm.contact_id);
        recipientList = contacts.filter(
          (c) => contactIds.includes(c.id) && c.status === "active"
        );
      }
    }

    console.log(`📊 Sending to ${recipientList.length} recipients`);

    let successCount = 0;
    let failCount = 0;

    // Extract sending domain ID
    const sendingDomainId = campaignData.content?.sending_domain_id || null;

    // Send to each recipient
    for (let i = 0; i < recipientList.length; i++) {
      const recipient = recipientList[i];
      
      try {
        // Personalize HTML
        const campaignHtml = formData.customHtml || '';
        let personalizedHtml = campaignHtml
          .replace(/\{\{MERGE:first_name\}\}/g, recipient.first_name || '')
          .replace(/\{\{MERGE:last_name\}\}/g, recipient.last_name || '')
          .replace(/\{\{MERGE:email\}\}/g, recipient.email || '')
          .replace(/\{\{firstname\}\}/gi, recipient.first_name || '')
          .replace(/\{\{lastname\}\}/gi, recipient.last_name || '')
          .replace(/\{\{email\}\}/gi, recipient.email || '');

        // Send email via edge function
        const { error: sendError } = await supabase.functions.invoke(
          "send-email",
          {
            body: {
              to: recipient.email.trim(),
              subject: formData.subject.trim(),
              html: personalizedHtml.trim(),
              from_name: formData.fromName.trim(),
              reply_to: formData.replyTo.trim(),
              sending_domain_id: sendingDomainId,
              campaign_id: campaign.id,
              contact_id: recipient.id,
              personalization: {
                first_name: recipient.first_name || "",
                last_name: recipient.last_name || "",
                email: recipient.email || "",
              },
            },
          }
        );

        if (sendError) {
          console.error(`❌ Failed to send to ${recipient.email}:`, sendError);
          failCount++;
        } else {
          console.log(`✅ Sent to ${recipient.email}`);
          successCount++;
        }

        // Update progress every 5 emails
        if ((i + 1) % 5 === 0 || i === recipientList.length - 1) {
          toast.loading(
            `Sending... ${successCount + failCount}/${recipientList.length}`,
            { id: sendToastId }
          );
        }

      } catch (error) {
        console.error(`❌ Error sending to ${recipient.email}:`, error);
        failCount++;
      }
    }

    // Update campaign to "sent" status
    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    // Show final result
    if (failCount === 0) {
      toast.success(
        `✅ Campaign sent to all ${successCount} recipients!`,
        { id: sendToastId, duration: 5000 }
      );
    } else {
      toast.success(
        `⚠️ Sent to ${successCount} recipients, ${failCount} failed`,
        { id: sendToastId, duration: 5000 }
      );
    }

  } catch (error: any) {
    console.error('❌ Error sending campaign:', error);
    toast.error('Campaign created but failed to send: ' + error.message, { id: sendToastId });
  }
} else {
  // For scheduled or draft campaigns, just show success message
  toast.success(
    formData.scheduleMode === 'later'
      ? 'Campaign scheduled successfully!'
      : 'Campaign saved as draft!'
  );
}

onSuccess(campaign);
onClose();
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-black p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-serif font-bold">Create Campaign</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : step === currentStep
                      ? 'bg-purple border-purple text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step < currentStep ? (
                    <Check size={16} />
                  ) : (
                    <span className="text-sm font-semibold">{step}</span>
                  )}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 text-xs font-medium text-center">Details</div>
            <div className="flex-1 text-xs font-medium text-center">Template</div>
            <div className="flex-1 text-xs font-medium text-center">Recipients</div>
            <div className="flex-1 text-xs font-medium text-center">Schedule</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <Step1CampaignDetails
              formData={formData}
              errors={errors}
              updateField={updateField}
              verifiedDomains={verifiedDomains}
              defaultDomain={defaultDomain}
              username={username}
            />
          )}

          {currentStep === 2 && (
            <Step2TemplateSelection
              formData={formData}
              errors={errors}
              updateField={updateField}
              userPlan={profile?.plan_type || 'free'}
              allTemplates={allTemplates}
              loadingTemplates={loadingTemplates}
            />
          )}

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

          {currentStep === 4 && (
            <Step4Schedule
              formData={formData}
              errors={errors}
              updateField={updateField}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-6">
          <div className="flex justify-between">
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
                  {/* ✅ UPDATED: Button text based on schedule mode */}
                  {formData.scheduleMode === 'now' ? 'Create & Prepare to Send' 
                    : formData.scheduleMode === 'later' ? 'Schedule Campaign'
                    : 'Save as Draft'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function Step1CampaignDetails({
  formData,
  errors,
  updateField,
  verifiedDomains,
  defaultDomain,
  username,
}: {
  formData: CampaignFormData;
  errors: Record<string, string>;
  updateField: (field: keyof CampaignFormData, value: any) => void;
  verifiedDomains: VerifiedDomain[];
  defaultDomain: string;
  username: string;
}) {
  const [selectedDomain, setSelectedDomain] = useState(defaultDomain);
  const [localPart, setLocalPart] = useState(username);

  const handleDomainChange = (domain: string) => {
    setSelectedDomain(domain);
    updateField('fromEmail', `${localPart}@${domain}`);
  };

  const handleLocalPartChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    setLocalPart(sanitized);
    updateField('fromEmail', `${sanitized}@${selectedDomain}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign Information</h3>
        <p className="text-gray-600 text-sm mb-6">
          Provide basic information about your email campaign.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Campaign Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g., Summer Newsletter 2024"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.name.length}/100 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Description <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          placeholder="Brief description of this campaign..."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple resize-none"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.description.length}/500 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Subject Line <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g., Check out our summer deals!"
          value={formData.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          error={errors.subject}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.subject.length}/200 characters
        </p>
      </div>

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

      <div>
        <label className="block text-sm font-medium mb-2">
          From Email <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="username"
              value={localPart}
              onChange={(e) => handleLocalPartChange(e.target.value)}
              error={errors.fromEmail}
            />
          </div>
          <span className="flex items-center text-gray-500 font-medium">@</span>
          <div className="flex-1">
            <select
              value={selectedDomain}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple bg-white"
            >
              <option value={defaultDomain}>{defaultDomain} (Shared)</option>
              {verifiedDomains.map((domain) => (
                <option key={domain.id} value={domain.domain}>
                  {domain.domain} (Verified)
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {verifiedDomains.length > 0
            ? 'Select your verified domain or use the shared Mail Wizard domain'
            : 'Using shared Mail Wizard domain. Add a custom domain in Settings for better deliverability.'}
        </p>
      </div>

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
          Where replies will be sent (defaults to your account email)
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
  allTemplates,
  loadingTemplates,
}: {
  formData: CampaignFormData;
  errors: Record<string, string>;
  allTemplates: any[];
  loadingTemplates: boolean;
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
    ? allTemplates
    : allTemplates.filter(t => t.category === selectedCategory);

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
        </div>
      )}

      {/* Template Selection */}
      {formData.inputMode === 'template' && (
        <>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full border transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-gold text-black border-black font-semibold'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-purple" />
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {filteredTemplates.map((template) => {
              const hasPersonalization = template.supportsPersonalization;
              const isLocked = hasPersonalization && !isPlusUser;

              return (
                <div
                  key={template.id}
                  onClick={() => !isLocked && updateField('templateId', template.id)}
                  className={`border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                    formData.templateId === template.id
                      ? 'border-purple shadow-lg'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {/* Template Preview */}
                  <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <FileText size={40} className="text-gray-400" />
                    {isLocked && (
                      <div className="absolute top-2 right-2 bg-black text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Lock size={12} />
                        Pro Plus
                      </div>
                    )}
                    {formData.templateId === template.id && (
                      <div className="absolute top-2 left-2 bg-purple text-white p-1 rounded-full">
                        <Check size={16} />
                      </div>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="p-3">
                    <div className="font-semibold text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-gray-600">{template.category}</div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {errors.templateId && (
            <p className="text-sm text-red-600">{errors.templateId}</p>
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
                    ? 'bg-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Contacts ({contacts.length})
              </button>
              <button
                onClick={() => updateField('sendToMode', 'groups')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  formData.sendToMode === 'groups'
                    ? 'bg-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Select Groups
              </button>
              <button
                onClick={() => updateField('sendToMode', 'contacts')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  formData.sendToMode === 'contacts'
                    ? 'bg-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Select Contacts
              </button>
            </div>
          </div>

          {/* Group Selection */}
          {formData.sendToMode === 'groups' && (
            <div className="border-2 border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="text-sm font-medium mb-3">Select Groups:</div>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500">No groups available</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedGroups.has(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{group.name}</div>
                        {group.description && (
                          <div className="text-xs text-gray-500">{group.description}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {group.contact_count} contacts
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Selection */}
          {formData.sendToMode === 'contacts' && (
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Select Contacts:</div>
                <button
                  onClick={toggleAllContacts}
                  className="text-xs text-purple hover:underline"
                >
                  {formData.selectedContacts.size === contacts.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedContacts.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{contact.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Recipient Count Display */}
          <div className="bg-purple/5 border border-purple/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-purple" />
              <div>
                <div className="font-semibold">
                  {recipientCount} {recipientCount === 1 ? 'Recipient' : 'Recipients'}
                </div>
                <div className="text-sm text-gray-600">
                  This campaign will be sent to {recipientCount} contact{recipientCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
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
}: {
  formData: CampaignFormData;
  errors: Record<string, string>;
  updateField: (field: keyof CampaignFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header with visual indicator */}
      <div>
        <h3 className="text-lg font-semibold mb-2">When would you like to send?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Choose when this campaign should be sent.
        </p>
        
        {/* ✅ NEW: Info banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Campaign Delivery Options</p>
              <p className="text-blue-700">
                Send immediately, schedule for a specific time, or save as draft to send later.
                Your recipient selection will be saved in all cases.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Options with enhanced styling */}
      <div className="space-y-4">
        {/* Send Now - Enhanced with icon and better description */}
        <label className={`cursor-pointer block ${
          formData.scheduleMode === 'now'
            ? 'bg-purple/10 border-purple ring-2 ring-purple/20'
            : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
        } border-2 rounded-lg p-5 transition-all duration-200`}>
          <div className="flex items-start gap-4">
            <input
              type="radio"
              name="scheduleMode"
              value="now"
              checked={formData.scheduleMode === 'now'}
              onChange={(e) => updateField('scheduleMode', e.target.value as 'now' | 'later' | 'draft')}
              className="mt-1.5 w-4 h-4 text-purple focus:ring-purple"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  formData.scheduleMode === 'now' ? 'bg-purple text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Mail size={20} />
                </div>
                <span className="font-semibold text-lg">Send Now</span>
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  Immediate
                </span>
              </div>
              <p className="text-sm text-gray-600 ml-12">
                Campaign will be queued for immediate delivery after creation. 
                Sending typically begins within seconds.
              </p>
            </div>
          </div>
        </label>

        {/* Schedule for Later - Enhanced */}
        <label className={`cursor-pointer block ${
          formData.scheduleMode === 'later'
            ? 'bg-purple/10 border-purple ring-2 ring-purple/20'
            : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
        } border-2 rounded-lg p-5 transition-all duration-200`}>
          <div className="flex items-start gap-4">
            <input
              type="radio"
              name="scheduleMode"
              value="later"
              checked={formData.scheduleMode === 'later'}
              onChange={(e) => updateField('scheduleMode', e.target.value as 'now' | 'later' | 'draft')}
              className="mt-1.5 w-4 h-4 text-purple focus:ring-purple"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  formData.scheduleMode === 'later' ? 'bg-purple text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Clock size={20} />
                </div>
                <span className="font-semibold text-lg">Schedule for Later</span>
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  Scheduled
                </span>
              </div>
              <p className="text-sm text-gray-600 ml-12 mb-4">
                Choose a specific date and time to automatically send this campaign.
                Perfect for time-sensitive announcements.
              </p>

              {formData.scheduleMode === 'later' && (
                <div className="ml-12 grid grid-cols-2 gap-4 p-4 bg-purple/5 border border-purple/20 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-700">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => updateField('scheduledDate', e.target.value)}
                      error={errors.scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-700">
                      Time
                    </label>
                    <Input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => updateField('scheduledTime', e.target.value)}
                      error={errors.scheduledTime}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </label>

        {/* Keep as Draft - Enhanced */}
        <label className={`cursor-pointer block ${
          formData.scheduleMode === 'draft'
            ? 'bg-purple/10 border-purple ring-2 ring-purple/20'
            : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
        } border-2 rounded-lg p-5 transition-all duration-200`}>
          <div className="flex items-start gap-4">
            <input
              type="radio"
              name="scheduleMode"
              value="draft"
              checked={formData.scheduleMode === 'draft'}
              onChange={(e) => updateField('scheduleMode', e.target.value as 'now' | 'later' | 'draft')}
              className="mt-1.5 w-4 h-4 text-purple focus:ring-purple"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  formData.scheduleMode === 'draft' ? 'bg-purple text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FileText size={20} />
                </div>
                <span className="font-semibold text-lg">Keep as Draft</span>
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  Not Sent
                </span>
              </div>
              <p className="text-sm text-gray-600 ml-12">
                Save campaign for later review. You can edit, schedule, or send 
                it anytime from the campaigns page. Recipients will be saved.
              </p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}