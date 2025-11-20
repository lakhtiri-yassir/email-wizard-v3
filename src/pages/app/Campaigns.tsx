import { useState, useEffect } from 'react';
import { Mail, Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TemplateSelector } from '../components/campaigns/TemplateSelector';
import { RecipientSelector } from '../components/campaigns/RecipientSelector';
import { EMAIL_TEMPLATES, extractEditableSections, extractMergeFields } from '../data/emailTemplates';
import { replaceEditableSections } from '../utils/mergeFieldReplacer';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: any;
  status: string;
  recipients_count: number;
  opens: number;
  clicks: number;
  created_at: string;
}

export const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState<'template' | 'editor' | 'recipients' | 'review'>('template');

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast.error(error.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to send this campaign to all contacts?')) return;

    setSending(campaignId);
    const toastId = toast.loading('Preparing to send campaign...');

    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      toast.loading('Fetching contacts...', { id: toastId });
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name')
        .eq('status', 'active');

      if (contactsError) throw contactsError;

      if (!contacts || contacts.length === 0) {
        toast.error('No active contacts found', { id: toastId });
        return;
      }

      toast.loading(`Sending to ${contacts.length} recipients...`, { id: toastId });
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          from_email: user?.email || 'hello@mailwizard.com',
          from_name: user?.user_metadata?.full_name || 'Mail Wizard',
          subject: campaign.subject,
          html_body: campaign.content?.html || '',
          recipients: contacts.map(c => ({
            email: c.email,
            contact_id: c.id,
            first_name: c.first_name || '',
            last_name: c.last_name || ''
          })),
          track_opens: true,
          track_clicks: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        }
        throw new Error(error.message || error.error || 'Failed to send campaign');
      }

      const data = await response.json();
      await fetchCampaigns();

      toast.success(`Campaign sent to ${data.sent} recipients!`, { id: toastId });
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Failed to send campaign', { id: toastId });
    } finally {
      setSending(null);
    }
  };

  return (
    <AppLayout currentPath="/app/campaigns">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Campaigns</h1>
            <p className="text-gray-600">Create and manage your email campaigns.</p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            Create Campaign
          </Button>
        </div>

        <div className="card mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="input-base w-auto">
              <option>All Status</option>
              <option>Draft</option>
              <option>Scheduled</option>
              <option>Sent</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="card text-center py-12">
            <Mail size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No campaigns found</p>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Get started by creating your first campaign'}
            </p>
            {!searchQuery && (
              <Button variant="primary" size="md" onClick={() => setShowCreateModal(true)}>
                Create Your First Campaign
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="card hover:-translate-y-1 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Mail className="text-gold" size={20} />
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          campaign.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-gold/20 text-black'
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{campaign.subject}</p>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Sent: </span>
                        <span className="font-semibold">{campaign.recipients_count.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Opens: </span>
                        <span className="font-semibold text-purple">{campaign.opens.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Clicks: </span>
                        <span className="font-semibold text-gold">{campaign.clicks.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-2">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </div>
                    {campaign.status === 'draft' && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Send}
                        onClick={() => handleSendCampaign(campaign.id)}
                        loading={sending === campaign.id}
                        disabled={sending !== null}
                      >
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <CreateCampaignModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchCampaigns}
          />
        )}
      </div>
    </AppLayout>
  );
};

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCampaignModal = ({ onClose, onSuccess }: CreateCampaignModalProps) => {
  const { user } = useAuth();
  
  // Multi-step state
  const [step, setStep] = useState<'template' | 'edit' | 'recipients' | 'review'>('template');
  
  // Campaign data
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get selected template
  const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId);
  const editableSections = selectedTemplate ? extractEditableSections(selectedTemplate.htmlContent) : [];
  const hasPersonalization = selectedTemplate ? selectedTemplate.supportsPersonalization : false;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setCampaignName(template.name);
      setSubject(''); // User will fill this
    }
  };

  const handleNextFromTemplate = () => {
    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }
    setStep('edit');
  };

  const handleNextFromEdit = () => {
    if (!campaignName.trim()) {
      setError('Please enter a campaign name');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject line');
      return;
    }
    setStep('recipients');
  };

  const handleNextFromRecipients = () => {
    if (!selectedGroupId) {
      setError('Please select a recipient group');
      return;
    }
    setStep('review');
  };

  const handleCreateAndSend = async () => {
    if (!user || !selectedTemplate || !selectedGroupId) return;

    setLoading(true);
    setError('');

    try {
      // Replace editable sections with user content
      const finalHtml = replaceEditableSections(selectedTemplate.htmlContent, editedContent);
      
      // Fetch contacts from selected group
      const { data: groupMembers, error: groupError } = await supabase
        .from('contact_group_members')
        .select('contact_id')
        .eq('group_id', selectedGroupId);
      
      if (groupError) throw groupError;
      
      const contactIds = groupMembers.map(m => m.contact_id);
      
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', contactIds)
        .eq('status', 'active');
      
      if (contactsError) throw contactsError;

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: campaignName,
          subject: subject,
          content: { html: finalHtml },
          status: 'draft',
          recipients_count: contacts?.length || 0
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Send campaign
      const { data, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          campaign_id: campaign.id,
          from_email: user.email,
          subject: subject,
          html_body: finalHtml,
          recipients: contacts?.map(c => ({
            email: c.email,
            contact_id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            company: c.company,
            role: c.role,
            industry: c.industry
          })) || []
        }
      });

      if (sendError) throw sendError;

      toast.success(`Campaign sent to ${contacts?.length || 0} recipients!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Campaign error:', error);
      setError(error.message || 'Failed to create campaign');
      toast.error('Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold">Create Campaign</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${step === 'template' ? 'text-[#f3ba42] font-semibold' : 'text-gray-400'}`}>
                  1. Template
                </span>
                <span className="text-gray-300">→</span>
                <span className={`text-sm ${step === 'edit' ? 'text-[#f3ba42] font-semibold' : 'text-gray-400'}`}>
                  2. Edit
                </span>
                <span className="text-gray-300">→</span>
                <span className={`text-sm ${step === 'recipients' ? 'text-[#f3ba42] font-semibold' : 'text-gray-400'}`}>
                  3. Recipients
                </span>
                <span className="text-gray-300">→</span>
                <span className={`text-sm ${step === 'review' ? 'text-[#f3ba42] font-semibold' : 'text-gray-400'}`}>
                  4. Review
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-black">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Template Selection */}
          {step === 'template' && (
            <TemplateSelector
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedTemplateId}
            />
          )}

          {/* Step 2: Edit Content */}
          {step === 'edit' && selectedTemplate && (
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold">Edit Campaign Content</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="input-base w-full"
                  placeholder="e.g., Summer Newsletter 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject Line *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-base w-full"
                  placeholder="Enter email subject line"
                />
                {hasPersonalization && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 You can use merge fields: {'{'}{'{'}}firstname{'}'}{'}'}, {'{'}{'{'}}company{'}'}{'}'}, {'{'}{'{'}}role{'}'}{'}'}, etc.
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold mb-3">Editable Sections</h3>
                {editableSections.map((section) => (
                  <div key={section.id} className="mb-4">
                    <label className="block text-sm font-medium mb-2 capitalize">
                      {section.id.replace(/_/g, ' ')}
                    </label>
                    {section.id.includes('content') || section.id.includes('description') || section.id.includes('message') ? (
                      <textarea
                        value={editedContent[section.id] || ''}
                        onChange={(e) => setEditedContent({ ...editedContent, [section.id]: e.target.value })}
                        className="input-base w-full"
                        rows={3}
                        placeholder={`Enter ${section.id.replace(/_/g, ' ')}`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedContent[section.id] || ''}
                        onChange={(e) => setEditedContent({ ...editedContent, [section.id]: e.target.value })}
                        className="input-base w-full"
                        placeholder={`Enter ${section.id.replace(/_/g, ' ')}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Recipients */}
          {step === 'recipients' && (
            <RecipientSelector
              onSelect={setSelectedGroupId}
              selectedGroupId={selectedGroupId}
              templateHasPersonalization={hasPersonalization}
            />
          )}

          {/* Step 4: Review & Send */}
          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold">Review & Send</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Campaign Name:</span>
                  <p className="font-semibold">{campaignName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Subject Line:</span>
                  <p className="font-semibold">{subject}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Template:</span>
                  <p className="font-semibold">{selectedTemplate?.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Recipients:</span>
                  <p className="font-semibold">Selected contact group</p>
                </div>
              </div>

              {hasPersonalization && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-medium">
                    📧 This campaign uses personalization
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Each recipient will receive a personalized email with their name, company, and other details.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-black p-6 flex items-center justify-between">
          <div>
            {step !== 'template' && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (step === 'edit') setStep('template');
                  if (step === 'recipients') setStep('edit');
                  if (step === 'review') setStep('recipients');
                }}
              >
                ← Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="tertiary" onClick={onClose}>
              Cancel
            </Button>
            {step === 'template' && (
              <Button variant="primary" onClick={handleNextFromTemplate}>
                Next: Edit Content →
              </Button>
            )}
            {step === 'edit' && (
              <Button variant="primary" onClick={handleNextFromEdit}>
                Next: Select Recipients →
              </Button>
            )}
            {step === 'recipients' && (
              <Button variant="primary" onClick={handleNextFromRecipients}>
                Next: Review →
              </Button>
            )}
            {step === 'review' && (
              <Button
                variant="primary"
                onClick={handleCreateAndSend}
                loading={loading}
                disabled={loading}
              >
                Send Campaign 🚀
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};