import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: { html: string };
  status: string;
  recipients_count: number;
  opens: number;
  clicks: number;
  bounces: number;
  sent_at: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  contact_count?: number;
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sendMode, setSendMode] = useState<'all' | 'groups' | 'contacts'>('all');

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    html_body: '<p>Hello {{firstname}}!</p><p>This is a test email.</p>',
    from_name: '',
    from_email: ''
  });

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchContacts();
      fetchSegments();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } else {
      setCampaigns(data || []);
    }
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .order('email');

    if (error) {
      console.error('Error fetching contacts:', error);
    } else {
      setContacts(data || []);
    }
  };

  const fetchSegments = async () => {
    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');

    if (error) {
      console.error('Error fetching segments:', error);
    } else {
      setSegments(data || []);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject) {
      toast.error('Campaign name and subject are required');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user?.id,
        name: newCampaign.name,
        subject: newCampaign.subject,
        from_name: newCampaign.from_name || user?.user_metadata?.full_name || 'Mail Wizard',
        from_email: newCampaign.from_email || user?.email,
        content: { html: newCampaign.html_body },
        status: 'draft'
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } else {
      toast.success('Campaign created successfully!');
      setShowCreateModal(false);
      setNewCampaign({
        name: '',
        subject: '',
        html_body: '<p>Hello {{firstname}}!</p><p>This is a test email.</p>',
        from_name: '',
        from_email: ''
      });
      fetchCampaigns();
    }
  };

  const handleOpenSendModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedContacts(new Set());
    setSelectedSegments(new Set());
    setSendMode('all');
    setShowSendModal(true);
  };

  const handleToggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleToggleSegment = (segmentId: string) => {
    const newSelected = new Set(selectedSegments);
    if (newSelected.has(segmentId)) {
      newSelected.delete(segmentId);
    } else {
      newSelected.add(segmentId);
    }
    setSelectedSegments(newSelected);
  };

  const handleSelectAllContacts = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const getRecipientList = async (): Promise<Contact[]> => {
    if (sendMode === 'all') {
      return contacts;
    }

    if (sendMode === 'contacts') {
      return contacts.filter(c => selectedContacts.has(c.id));
    }

    if (sendMode === 'groups') {
      // Fetch contacts from selected segments
      const segmentIds = Array.from(selectedSegments);
      if (segmentIds.length === 0) {
        return [];
      }

      // Get segment members
      const { data, error } = await supabase
        .from('segment_contacts')
        .select('contact_id')
        .in('segment_id', segmentIds);

      if (error) {
        console.error('Error fetching segment contacts:', error);
        return [];
      }

      const contactIds = data.map(sc => sc.contact_id);
      return contacts.filter(c => contactIds.includes(c.id));
    }

    return [];
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) return;

    const recipients = await getRecipientList();

    if (recipients.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    const confirmMessage = `Send "${selectedCampaign.name}" to ${recipients.length} recipient(s)?`;
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    toast.loading(`Sending to ${recipients.length} recipient(s)...`, { id: 'sending' });

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          campaign_id: selectedCampaign.id,
          from_email: selectedCampaign.content.from_email || user?.email,
          from_name: selectedCampaign.content.from_name || user?.user_metadata?.full_name,
          subject: selectedCampaign.subject,
          html_body: selectedCampaign.content.html,
          recipients: recipients.map(contact => ({
            email: contact.email,
            contact_id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name
          }))
        }
      });

      if (error) throw error;

      toast.success(`Campaign sent to ${data.sent} recipient(s)!`, { id: 'sending' });
      setShowSendModal(false);
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Failed to send campaign', { id: 'sending' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500"
        >
          + Create Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="border rounded-lg p-6 bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{campaign.name}</h3>
                <p className="text-gray-600">{campaign.subject}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${
                  campaign.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {campaign.status}
                </span>
              </div>
              {campaign.status === 'draft' && (
                <button
                  onClick={() => handleOpenSendModal(campaign)}
                  className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500"
                >
                  Send Campaign
                </button>
              )}
            </div>

            {campaign.status === 'sent' && (
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-2xl font-bold">{campaign.recipients_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Opens</p>
                  <p className="text-2xl font-bold">{campaign.opens || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Clicks</p>
                  <p className="text-2xl font-bold">{campaign.clicks || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold">
                    {campaign.recipients_count > 0 
                      ? Math.round((campaign.opens / campaign.recipients_count) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="My Campaign"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject Line</label>
                <input
                  type="text"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Hello {{firstname}}!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Body (HTML)</label>
                <textarea
                  value={newCampaign.html_body}
                  onChange={(e) => setNewCampaign({...newCampaign, html_body: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={10}
                  placeholder="<p>Your email content here</p>"
                />
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border rounded-full hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={loading}
                  className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Campaign Modal with Group/Contact Selection */}
      {showSendModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Send Campaign: {selectedCampaign.name}</h2>
            
            {/* Send Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Send To:</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSendMode('all')}
                  className={`px-4 py-2 rounded-full font-medium ${
                    sendMode === 'all' 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  All Contacts ({contacts.length})
                </button>
                <button
                  onClick={() => setSendMode('groups')}
                  className={`px-4 py-2 rounded-full font-medium ${
                    sendMode === 'groups' 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Select Groups
                </button>
                <button
                  onClick={() => setSendMode('contacts')}
                  className={`px-4 py-2 rounded-full font-medium ${
                    sendMode === 'contacts' 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Select Contacts
                </button>
              </div>
            </div>

            {/* Group Selection */}
            {sendMode === 'groups' && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Select Groups ({selectedSegments.size} selected)</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {segments.length === 0 ? (
                    <p className="text-gray-500 p-4 text-center">No groups available</p>
                  ) : (
                    segments.map((segment) => (
                      <label key={segment.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedSegments.has(segment.id)}
                          onChange={() => handleToggleSegment(segment.id)}
                          className="mr-3"
                        />
                        <div>
                          <p className="font-medium">{segment.name}</p>
                          {segment.description && (
                            <p className="text-sm text-gray-600">{segment.description}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Contact Selection */}
            {sendMode === 'contacts' && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Select Contacts ({selectedContacts.size} selected)</h3>
                  <button
                    onClick={handleSelectAllContacts}
                    className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    {selectedContacts.size === contacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {contacts.map((contact) => (
                    <label key={contact.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => handleToggleContact(contact.id)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-end pt-4 border-t">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-6 py-2 border rounded-full hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCampaign}
                disabled={loading}
                className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}