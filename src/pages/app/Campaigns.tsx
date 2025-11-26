/**
 * Campaigns Page
 * 
 * Campaign management with advanced recipient selection.
 * 
 * FIXES APPLIED:
 * - Load groups from contact_groups table instead of segments
 * - Allow selection of multiple groups
 * - Allow selection of individual contacts
 * - Support mixed selection (groups + individual contacts)
 * - Show recipient count preview
 */

import { useState, useEffect } from 'react';
import { Plus, Mail, Send } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
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

interface Group {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
}

type SendMode = 'all' | 'groups' | 'contacts' | 'mixed';

export function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Send modal state
  const [sendMode, setSendMode] = useState<SendMode>('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchContacts();
      fetchGroups();
    }
  }, [user]);

  // Update recipient count when selections change
  useEffect(() => {
    if (showSendModal) {
      updateRecipientCount();
    }
  }, [sendMode, selectedGroups, selectedContacts, showSendModal]);

  const fetchCampaigns = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('email');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
    }
  };

  /**
   * Fetch groups from contact_groups table
   * FIXED: Was previously fetching from 'segments' table
   */
  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('id, name, description, contact_count')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    }
  };

  const handleOpenSendModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowSendModal(true);
    setSendMode('all');
    setSelectedContacts(new Set());
    setSelectedGroups(new Set());
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleSelectAllContacts = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  /**
   * Build recipient list based on selection mode
   * FIXED: Queries contact_group_members instead of segment_contacts
   */
  const getRecipientList = async (): Promise<Contact[]> => {
    if (!user) return [];

    if (sendMode === 'all') {
      return contacts.filter(c => c.status === 'active');
    }

    if (sendMode === 'contacts') {
      return contacts.filter(c => 
        selectedContacts.has(c.id) && c.status === 'active'
      );
    }

    if (sendMode === 'groups') {
      const groupIds = Array.from(selectedGroups);
      if (groupIds.length === 0) {
        return [];
      }

      // Query contact_group_members table
      const { data: groupMembers, error } = await supabase
        .from('contact_group_members')
        .select('contact_id')
        .in('group_id', groupIds);

      if (error) {
        console.error('Error fetching group members:', error);
        toast.error('Failed to load group members');
        return [];
      }

      const contactIds = groupMembers.map(gm => gm.contact_id);
      return contacts.filter(c => 
        contactIds.includes(c.id) && c.status === 'active'
      );
    }

    if (sendMode === 'mixed') {
      // Combine groups and individual contacts
      let recipientSet = new Set<string>();

      // Add contacts from selected groups
      if (selectedGroups.size > 0) {
        const groupIds = Array.from(selectedGroups);
        const { data: groupMembers } = await supabase
          .from('contact_group_members')
          .select('contact_id')
          .in('group_id', groupIds);

        groupMembers?.forEach(gm => recipientSet.add(gm.contact_id));
      }

      // Add individually selected contacts
      selectedContacts.forEach(id => recipientSet.add(id));

      // Convert to contact objects
      const recipientIds = Array.from(recipientSet);
      return contacts.filter(c => 
        recipientIds.includes(c.id) && c.status === 'active'
      );
    }

    return [];
  };

  /**
   * Update recipient count for preview
   */
  const updateRecipientCount = async () => {
    const recipients = await getRecipientList();
    setRecipientCount(recipients.length);
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

    setSending(selectedCampaign.id);
    setShowSendModal(false);
    const toastId = toast.loading(`Sending to ${recipients.length} recipient(s)...`);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          campaign_id: selectedCampaign.id,
          from_email: user?.email,
          from_name: user?.user_metadata?.full_name || 'Email Wizard',
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

      toast.success(`Campaign sent to ${data.sent} recipient(s)!`, { id: toastId });
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Failed to send campaign', { id: toastId });
    } finally {
      setSending(null);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            onClick={() => {/* Create campaign modal */}}
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
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' : 'Create your first campaign to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-serif font-bold mb-1">{campaign.name}</h3>
                    <p className="text-gray-600 mb-3">{campaign.subject}</p>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Recipients: </span>
                        <span className="font-semibold">{campaign.recipients_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Opens: </span>
                        <span className="font-semibold">{campaign.opens || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Clicks: </span>
                        <span className="font-semibold">{campaign.clicks || 0}</span>
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
                        onClick={() => handleOpenSendModal(campaign)}
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

        {/* Send Campaign Modal */}
        {showSendModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="border-b border-black p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold">Send Campaign: {selectedCampaign.name}</h2>
                  <button 
                    onClick={() => setShowSendModal(false)} 
                    className="text-gray-500 hover:text-black text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* Send Mode Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3">Send To:</label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSendMode('all')}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === 'all' 
                          ? 'bg-gold text-black' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      All Contacts ({contacts.length})
                    </button>
                    <button
                      onClick={() => setSendMode('groups')}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === 'groups' 
                          ? 'bg-gold text-black' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Select Groups
                    </button>
                    <button
                      onClick={() => setSendMode('contacts')}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === 'contacts' 
                          ? 'bg-gold text-black' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Select Contacts
                    </button>
                    <button
                      onClick={() => setSendMode('mixed')}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === 'mixed' 
                          ? 'bg-gold text-black' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Mixed Selection
                    </button>
                  </div>
                </div>

                {/* Groups Selection */}
                {(sendMode === 'groups' || sendMode === 'mixed') && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">
                      Select Groups ({selectedGroups.size} selected)
                    </h3>
                    <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                      {groups.length === 0 ? (
                        <p className="text-gray-500 p-4 text-center text-sm">
                          No groups available. Create groups in the Contacts page.
                        </p>
                      ) : (
                        groups.map((group) => (
                          <label 
                            key={group.id} 
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGroups.has(group.id)}
                              onChange={() => handleToggleGroup(group.id)}
                              className="mr-3 w-4 h-4"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{group.name}</p>
                              {group.description && (
                                <p className="text-xs text-gray-600">{group.description}</p>
                              )}
                              <p className="text-xs text-purple-600 mt-1">
                                {group.contact_count} contacts
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Individual Contacts Selection */}
                {(sendMode === 'contacts' || sendMode === 'mixed') && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">
                        Select Contacts ({selectedContacts.size} selected)
                      </h3>
                      <button
                        onClick={handleSelectAllContacts}
                        className="text-sm text-gold hover:text-yellow-600 font-medium"
                      >
                        {selectedContacts.size === contacts.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                      {contacts.length === 0 ? (
                        <p className="text-gray-500 p-4 text-center text-sm">
                          No contacts available
                        </p>
                      ) : (
                        contacts.map((contact) => (
                          <label 
                            key={contact.id} 
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedContacts.has(contact.id)}
                              onChange={() => handleToggleContact(contact.id)}
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
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Recipient Count Preview */}
                <div className="bg-gold/10 border border-gold rounded-lg p-4">
                  <p className="text-sm font-medium">
                    <span className="text-gold font-bold text-lg">{recipientCount}</span>{' '}
                    recipient{recipientCount !== 1 ? 's' : ''} will receive this campaign
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSendCampaign}
                  disabled={recipientCount === 0}
                  icon={Send}
                >
                  Send Campaign
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}