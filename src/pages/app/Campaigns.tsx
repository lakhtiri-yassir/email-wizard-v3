/**
 * Campaigns Page
 *
 * Campaign management with advanced recipient selection and status tracking.
 *
 * FEATURES:
 * - Display campaign status (Draft, Scheduled, Sent)
 * - Show email metrics (opens, clicks, bounces)
 * - Advanced recipient selection (groups + contacts)
 * - Real-time recipient count preview
 */

import { useState, useEffect } from "react";
import {
  Plus,
  Mail,
  Send,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Play,
} from "lucide-react";
import { AppLayout } from "../../components/app/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { useLocation } from 'react-router-dom';
import CreateCampaignModal from "../../components/campaigns/CreateCampaignModal";
import { EditCampaignModal } from '../../components/campaigns/EditCampaignModal';
import { DeleteConfirmModal } from '../../components/campaigns/DeleteConfirmModal';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: { html: string };
  custom_html: { html: string };
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

interface Group {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
}

type SendMode = "all" | "groups" | "contacts" | "mixed";

export function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [sending, setSending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingNow, setSendingNow] = useState<string | null>(null);

  // Send modal state
  const [sendMode, setSendMode] = useState<SendMode>("all");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [recipientCount, setRecipientCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [isReturningFromTemplate, setIsReturningFromTemplate] = useState(false);


  // View details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);
  const location = useLocation();


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

 useEffect(() => {
  if (location.state?.completedTemplate) {
    console.log('📧 Detected completed template, auto-opening modal');
    setIsReturningFromTemplate(true);  // ← ADD: Set flag before opening
    setShowCreateModal(true);
  }
}, [location.state]);


  const fetchCampaigns = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  /**
 * Handle edit campaign
 */
const handleEdit = (campaign: Campaign) => {
  setEditingCampaign(campaign);
};

/**
 * Handle delete campaign
 */
const handleDelete = async () => {
  if (!deletingCampaign) return;
  
  setIsDeleting(true);
  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', deletingCampaign.id);

    if (error) throw error;

    toast.success('Campaign deleted successfully');
    setDeletingCampaign(null);
    fetchCampaigns();
  } catch (error: any) {
    console.error('Failed to delete campaign:', error);
    toast.error(error.message || 'Failed to delete campaign');
  } finally {
    setIsDeleting(false);
  }
};

/**
 * Handle send now
 */
const handleSendNow = async (campaign: Campaign) => {
  // Confirm send now
  if (!confirm(
    `Send "${campaign.name}" immediately to ${campaign.recipients_count} recipients?\n\n` +
    `This was originally scheduled for later. This action cannot be undone.`
  )) {
    return;
  }

  setSendingNow(campaign.id);
  try {
    // Update status to sending and set scheduled_at to now
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'sending',
        scheduled_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    if (updateError) throw updateError;

    toast.success('Campaign is being sent now!');
    fetchCampaigns();
  } catch (error: any) {
    console.error('Failed to send campaign:', error);
    toast.error(error.message || 'Failed to send campaign');
  } finally {
    setSendingNow(null);
  }
};

  const fetchContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("email");

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("contact_groups")
        .select("id, name, description, contact_count")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
    }
  };

  const handleOpenSendModal = (campaign: Campaign) => {
  setSelectedCampaign(campaign);

  // ✅ FIX #2: Load saved recipients from campaign.content
  const storedRecipients = (campaign as any).content?.recipients;
  
  if (storedRecipients) {
    // Pre-populate the saved recipient selection
    setSendMode(storedRecipients.sendToMode || "all");
    setSelectedGroups(new Set(storedRecipients.selectedGroups || []));
    setSelectedContacts(new Set(storedRecipients.selectedContacts || []));
    
    // Calculate and show recipient count
    let count = 0;
    if (storedRecipients.sendToMode === 'all') {
      count = contacts.filter(c => c.status === 'active').length;
    } else if (storedRecipients.sendToMode === 'contacts') {
      count = storedRecipients.selectedContacts?.length || 0;
    } else if (storedRecipients.sendToMode === 'groups') {
      const groupIds = storedRecipients.selectedGroups || [];
      count = groups
        .filter(g => groupIds.includes(g.id))
        .reduce((sum, g) => sum + g.contact_count, 0);
    }
    
    toast.success(`Recipients loaded: ${count} contacts (${storedRecipients.sendToMode} mode)`);
  } else {
    // Fallback to default (all contacts)
    setSendMode("all");
    setSelectedGroups(new Set());
    setSelectedContacts(new Set());
    toast.info('No saved recipients found. Please select recipients.');
  }

  setShowSendModal(true);
};

  const handleQuickSend = async (campaign: Campaign) => {
  const storedRecipients = (campaign as any).content?.recipients;
  if (!storedRecipients) {
    handleOpenSendModal(campaign);
    return;
  }

  setSelectedCampaign(campaign);

  let recipientList: Contact[] = [];

  if (storedRecipients.sendToMode === 'all') {
    recipientList = contacts.filter((c) => c.status === "active");
  } else if (storedRecipients.sendToMode === 'contacts') {
    recipientList = contacts.filter(
      (c) => storedRecipients.selectedContacts.includes(c.id) && c.status === "active"
    );
  } else if (storedRecipients.sendToMode === 'groups') {
    const { data: groupMembers } = await supabase
      .from("contact_group_members")
      .select("contact_id")
      .in("group_id", storedRecipients.selectedGroups);

    if (groupMembers) {
      const contactIds = groupMembers.map((gm) => gm.contact_id);
      recipientList = contacts.filter(
        (c) => contactIds.includes(c.id) && c.status === "active"
      );
    }
  }

  if (recipientList.length === 0) {
    toast.error("No active recipients found for this campaign");
    return;
  }

  // ✅ ENHANCED: Better confirmation message
  const confirmMessage = 
    `📧 Send Campaign Confirmation\n\n` +
    `Campaign: "${campaign.name}"\n` +
    `Subject: "${campaign.subject}"\n` +
    `Recipients: ${recipientList.length} contact${recipientList.length !== 1 ? 's' : ''}\n` +
    `Mode: ${storedRecipients.sendToMode}\n\n` +
    `This will send emails immediately. This action cannot be undone.\n\nContinue?`;
  
  if (!confirm(confirmMessage)) return;


    const campaignHtml = (campaign as any).custom_html || (campaign as any).content?.html;

    if (!campaign.subject?.trim()) {
      toast.error("Campaign subject is missing");
      return;
    }

    if (!campaignHtml?.trim()) {
      toast.error("Campaign content is missing");
      return;
    }

    setSending(campaign.id);
    const toastId = toast.loading(`Sending to ${recipientList.length} recipient(s)...`);

    try {
      let successCount = 0;
      let failedCount = 0;

      for (const recipient of recipientList) {
        if (!recipient.email?.trim()) {
          failedCount++;
          continue;
        }

        try {
          const payload = {
            to: recipient.email.trim(),
            subject: campaign.subject.trim(),
            html: campaignHtml.trim(),
            from_email: (campaign as any).from_email || user?.email || "noreply@mailwizard.com",
            from_name: (campaign as any).from_name || user?.user_metadata?.full_name || "Mail Wizard",
            reply_to: (campaign as any).reply_to || user?.email,
            campaign_id: campaign.id,
            contact_id: recipient.id,
            personalization: {
              first_name: recipient.first_name || "",
              last_name: recipient.last_name || "",
            },
          };

          const { error } = await supabase.functions.invoke("send-email", {
            body: payload
          });

          if (error) {
            failedCount++;
          } else {
            successCount++;
          }
        } catch {
          failedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await supabase
        .from('campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', campaign.id);

      if (successCount > 0) {
        if (failedCount === 0) {
          toast.success(`Campaign sent to ${successCount} recipient(s)!`, { id: toastId });
        } else {
          toast.success(`Sent to ${successCount}. ${failedCount} failed.`, { id: toastId });
        }
      } else {
        toast.error(`Failed to send campaign.`, { id: toastId });
      }

      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Failed to send campaign", { id: toastId });
    } finally {
      setSending(null);
    }
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => {
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
    setSelectedContacts((prev) => {
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
      setSelectedContacts(new Set(contacts.map((c) => c.id)));
    }
  };

  const getRecipientList = async (): Promise<Contact[]> => {
    if (!user) return [];

    // BUG FIX #3: If campaign has stored recipients, use those
    if (selectedCampaign?.content?.recipients) {
      const recipientData = selectedCampaign.content.recipients;

      if (recipientData.sendToMode === 'all') {
        return contacts.filter((c) => c.status === "active");
      }

      if (recipientData.sendToMode === 'contacts') {
        return contacts.filter(
          (c) => recipientData.selectedContacts.includes(c.id) && c.status === "active"
        );
      }

      if (recipientData.sendToMode === 'groups') {
        const { data: groupMembers, error } = await supabase
          .from("contact_group_members")
          .select("contact_id")
          .in("group_id", recipientData.selectedGroups);

        if (error) {
          console.error("Error fetching group members:", error);
          return [];
        }

        const contactIds = groupMembers.map((gm) => gm.contact_id);
        return contacts.filter(
          (c) => contactIds.includes(c.id) && c.status === "active"
        );
      }
    }

    // Existing logic below for when recipients selected in modal
    if (sendMode === "all") {
      return contacts.filter((c) => c.status === "active");
    }

    if (sendMode === "contacts") {
      return contacts.filter(
        (c) => selectedContacts.has(c.id) && c.status === "active"
      );
    }

    if (sendMode === "groups") {
      const groupIds = Array.from(selectedGroups);
      if (groupIds.length === 0) {
        return [];
      }

      const { data: groupMembers, error } = await supabase
        .from("contact_group_members")
        .select("contact_id")
        .in("group_id", groupIds);

      if (error) {
        console.error("Error fetching group members:", error);
        toast.error("Failed to load group members");
        return [];
      }

      const contactIds = groupMembers.map((gm) => gm.contact_id);
      return contacts.filter(
        (c) => contactIds.includes(c.id) && c.status === "active"
      );
    }

    if (sendMode === "mixed") {
      let recipientSet = new Set<string>();

      if (selectedGroups.size > 0) {
        const groupIds = Array.from(selectedGroups);
        const { data: groupMembers } = await supabase
          .from("contact_group_members")
          .select("contact_id")
          .in("group_id", groupIds);

        groupMembers?.forEach((gm) => recipientSet.add(gm.contact_id));
      }

      selectedContacts.forEach((id) => recipientSet.add(id));

      const recipientIds = Array.from(recipientSet);
      return contacts.filter(
        (c) => recipientIds.includes(c.id) && c.status === "active"
      );
    }

    return [];
  };

  const updateRecipientCount = async () => {
    const recipients = await getRecipientList();
    setRecipientCount(recipients.length);
  };

  const handleSendCampaign = async () => {
  if (!selectedCampaign) return;

  const recipients = await getRecipientList();

  if (recipients.length === 0) {
    toast.error("No recipients selected");
    return;
  }

  // CRITICAL FIX: Check for HTML in both possible locations
  const campaignHtml = selectedCampaign.custom_html || selectedCampaign.content?.html;

  // Validate campaign data
  if (!selectedCampaign.subject || !selectedCampaign.subject.trim()) {
    toast.error("Campaign subject is missing");
    return;
  }

  if (!campaignHtml || !campaignHtml.trim()) {
    toast.error("Campaign content is missing. Please edit the campaign and add HTML content.");
    return;
  }

  const confirmMessage = `Send "${selectedCampaign.name}" to ${recipients.length} recipient(s)?`;
  if (!confirm(confirmMessage)) return;

  setSending(selectedCampaign.id);
  setShowSendModal(false);
  const toastId = toast.loading(
    `Sending to ${recipients.length} recipient(s)...`
  );

  try {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails individually to each recipient
    for (const recipient of recipients) {
      // Skip recipients without valid email
      if (!recipient.email || !recipient.email.trim()) {
        failedCount++;
        errors.push(`Contact ${recipient.id}: Missing email address`);
        continue;
      }

      try {
        const payload = {
          to: recipient.email.trim(),
          subject: selectedCampaign.subject.trim(),
          html: campaignHtml.trim(),
          from_email: (selectedCampaign as any).from_email || user?.email || "noreply@mailwizard.com",
          from_name: (selectedCampaign as any).from_name || user?.user_metadata?.full_name || "Mail Wizard",
          reply_to: (selectedCampaign as any).reply_to || user?.email,
          campaign_id: selectedCampaign.id,
          contact_id: recipient.id,
          personalization: {
            first_name: recipient.first_name || "",
            last_name: recipient.last_name || "",
          },
        };

        console.log(`Sending to ${recipient.email}...`);

        const { data, error } = await supabase.functions.invoke("send-email", {
          body: payload
        });

        if (error) {
          failedCount++;
          errors.push(`${recipient.email}: ${error.message}`);
          console.error(`Failed to send to ${recipient.email}:`, error);
        } else {
          successCount++;
          console.log(`Sent to ${recipient.email}`);
        }
      } catch (error: any) {
        failedCount++;
        errors.push(`${recipient.email}: ${error.message || 'Unknown error'}`);
        console.error(`Error sending to ${recipient.email}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await supabase
      .from('campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', selectedCampaign.id);

    if (successCount > 0) {
      if (failedCount === 0) {
        toast.success(`Campaign sent to ${successCount} recipient(s)!`, {
          id: toastId,
        });
      } else {
        toast.success(
          `Sent to ${successCount} recipient(s). ${failedCount} failed.`,
          { id: toastId }
        );
        console.error("Failed sends:", errors);
      }
    } else {
      toast.error(`Failed to send campaign. ${failedCount} errors.`, {
        id: toastId,
      });
      console.error("All sends failed:", errors);
    }

    fetchCampaigns();
  } catch (error: any) {
    console.error("Error sending campaign:", error);
    toast.error(error.message || "Failed to send campaign", { id: toastId });
  } finally {
    setSending(null);
  }
};

  /**
   * Get status badge styling and icon
   */
  const getStatusBadge = (campaign: Campaign) => {
    if (campaign.status === "sent") {
      return {
        icon: <CheckCircle size={14} />,
        text: "Sent",
        className: "bg-green-100 text-green-800 border-green-200",
      };
    }

    if (campaign.status === "scheduled") {
      return {
        icon: <Clock size={14} />,
        text: "Scheduled",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      };
    }

    if (campaign.status === "sending") {
      return {
        icon: <Play size={14} />,
        text: "Sending",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    }

    return {
      icon: <AlertCircle size={14} />,
      text: "Draft",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    };
  };

  /**
   * Calculate open rate percentage
   */
  const getOpenRate = (campaign: Campaign) => {
    if (!campaign.recipients_count || campaign.recipients_count === 0) return 0;
    return Math.round((campaign.opens / campaign.recipients_count) * 100);
  };

  /**
   * Calculate click rate percentage
   */
  const getClickRate = (campaign: Campaign) => {
    if (!campaign.recipients_count || campaign.recipients_count === 0) return 0;
    return Math.round((campaign.clicks / campaign.recipients_count) * 100);
  };

  /**
   * Filter campaigns by search and status
   */
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || campaign.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout currentPath="/app/campaigns">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Campaigns</h1>
            <p className="text-gray-600">
              Create and manage your email campaigns.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setIsReturningFromTemplate(false);
              setModalKey(prev => prev + 1); 
              setShowCreateModal(true);
            }}
          >
            Create Campaign
          </Button>
        </div>

        {/* Search and Filter Bar */}
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
            <select
              className="input-base w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </select>
          </div>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
            <p className="text-gray-600 mt-4">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="card text-center py-12">
            <Mail size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No campaigns found</p>
            <p className="text-sm text-gray-500">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Create your first campaign to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => {
              const statusBadge = getStatusBadge(campaign);
              const openRate = getOpenRate(campaign);
              const clickRate = getClickRate(campaign);

              return (
                <div
                  key={campaign.id}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    {/* Campaign Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-serif font-bold">
                          {campaign.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.text}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4">{campaign.subject}</p>

                      {/* Metrics Row */}
                      <div className="flex gap-6 text-sm">
                        {campaign.status === "sent" ? (
                          <>
                            <div>
                              <span className="text-gray-600">Sent to: </span>
                              <span className="font-semibold">
                                {campaign.recipients_count || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Opens: </span>
                              <span className="font-semibold">
                                {campaign.opens || 0}
                              </span>
                              <span className="text-gray-500 ml-1">
                                ({openRate}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Clicks: </span>
                              <span className="font-semibold">
                                {campaign.clicks || 0}
                              </span>
                              <span className="text-gray-500 ml-1">
                                ({clickRate}%)
                              </span>
                            </div>
                            {campaign.bounces > 0 && (
                              <div>
                                <span className="text-gray-600">Bounces: </span>
                                <span className="font-semibold text-red-600">
                                  {campaign.bounces}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-500 italic">
                            Not yet sent
                          </div>
                        )}
                      </div>

                      {/* Sent Date */}
                      {campaign.sent_at && (
                        <div className="mt-3 text-xs text-gray-500">
                          Sent on {new Date(campaign.sent_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-600 mb-3">
                        Created{" "}
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </div>

                      {/* DRAFT STATUS - Edit, Delete, Send Buttons */}
                      {campaign.status === "draft" && (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm text-gray-500 mb-1">
                            {(campaign as any).content?.recipients
                              ? `Recipients: ${campaign.recipients_count || 0}`
                              : 'No recipients selected'}
                          </div>
                          <div className="text-sm mb-2">
      {(campaign as any).content?.recipients ? (
        <div className="flex items-center gap-1 text-gray-600">
          <Users size={14} className="text-purple" />
          <span className="font-medium">
            {campaign.recipients_count} recipient{campaign.recipients_count !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-500">
            ({(campaign as any).content.recipients.sendToMode})
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-yellow-600">
          <AlertCircle size={14} />
          <span className="text-xs">Recipients not configured</span>
        </div>
      )}
    </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleEdit(campaign)}
                              className="flex-1"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Trash2}
                              onClick={() => setDeletingCampaign(campaign)}
                              className="border-red-500 text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Send}
                            onClick={() => handleQuickSend(campaign)}
                            loading={sending === campaign.id}
                            disabled={sending !== null}
                            className="w-full"
                          >
                            Send Campaign
                          </Button>
                        </div>
                      )}

                      {/* SCHEDULED STATUS - Edit, Delete, Send Now Buttons */}
                      {campaign.status === "scheduled" && (
                        <div className="flex flex-col gap-2">
                          {/* Scheduled Time Display */}
                          <div className="text-sm text-purple font-medium mb-1">
                            {campaign.scheduled_at && (
                              <>📅 {new Date(campaign.scheduled_at).toLocaleString()}</>
                            )}
                          </div>
                          <div className="text-sm mb-2">
      <div className="flex items-center gap-1 text-purple font-medium mb-1">
        <Clock size={14} />
        <span>Scheduled for:</span>
      </div>
      {campaign.scheduled_at && (
        <div className="text-sm text-gray-700 ml-5">
          <div className="font-semibold">
            {new Date(campaign.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="text-purple font-medium">
            {new Date(campaign.scheduled_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      )}
    </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {/* Edit Button */}
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleEdit(campaign)}
                              className="flex-1 border-purple text-purple hover:bg-purple/10"
                            >
                              Edit
                            </Button>

                            {/* Delete Button */}
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Trash2}
                              onClick={() => setDeletingCampaign(campaign)}
                              className="border-red-500 text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>

                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => handleSendNow(campaign)}
                              loading={sendingNow === campaign.id}
                              disabled={sendingNow === campaign.id}
                              className="flex-[1.5]"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Send size={18} />
                                <span className="whitespace-nowrap">Send Now</span>
                              </div>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* SENDING STATUS - In Progress */}
                      {campaign.status === "sending" && (
                        <div className="flex flex-col gap-2 items-end">
                          <div className="text-sm text-yellow-600 font-medium flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                            Sending in progress...
                          </div>
                          <div className="text-xs text-gray-500">
                            Please wait while emails are being sent
                          </div>
                        </div>
                      )}

                      {/* SENT STATUS - View Details */}
                      {campaign.status === "sent" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => {
                            setDetailsCampaign(campaign);
                            setShowDetailsModal(true);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {showCreateModal && (
          <CreateCampaignModal
            key={modalKey}
            shouldLoadTemplate={isReturningFromTemplate}  
            onClose={() => {
              setIsReturningFromTemplate(false);  
              setModalKey(prev => prev + 1);
              setShowCreateModal(false);
            }}
            onSuccess={(campaign) => {
              window.history.replaceState({}, document.title);
              setIsReturningFromTemplate(false);  
              setModalKey(prev => prev + 1);
              setShowCreateModal(false);
              fetchCampaigns();
              toast.success("Campaign created successfully!");
            }}
          />
        )}

        {/* Send Campaign Modal */}
        {showSendModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="border-b border-black p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold">
                    Send Campaign: {selectedCampaign.name}
                  </h2>
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
                  <label className="block text-sm font-medium mb-3">
                    Send To:
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSendMode("all")}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === "all"
                          ? "bg-gold text-black"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      All Contacts ({contacts.length})
                    </button>
                    <button
                      onClick={() => setSendMode("groups")}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === "groups"
                          ? "bg-gold text-black"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      Select Groups
                    </button>
                    <button
                      onClick={() => setSendMode("contacts")}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === "contacts"
                          ? "bg-gold text-black"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      Select Contacts
                    </button>
                    <button
                      onClick={() => setSendMode("mixed")}
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        sendMode === "mixed"
                          ? "bg-gold text-black"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      Mixed Selection
                    </button>
                  </div>
                </div>

                {/* Groups Selection */}
                {(sendMode === "groups" || sendMode === "mixed") && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">
                      Select Groups ({selectedGroups.size} selected)
                    </h3>
                    <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                      {groups.length === 0 ? (
                        <p className="text-gray-500 p-4 text-center text-sm">
                          No groups available. Create groups in the Contacts
                          page.
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
                              <p className="font-medium text-sm">
                                {group.name}
                              </p>
                              {group.description && (
                                <p className="text-xs text-gray-600">
                                  {group.description}
                                </p>
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
                {(sendMode === "contacts" || sendMode === "mixed") && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">
                        Select Contacts ({selectedContacts.size} selected)
                      </h3>
                      <button
                        onClick={handleSelectAllContacts}
                        className="text-sm text-gold hover:text-yellow-600 font-medium"
                      >
                        {selectedContacts.size === contacts.length
                          ? "Deselect All"
                          : "Select All"}
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
                                <p className="text-xs text-gray-600">
                                  {contact.email}
                                </p>
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
                    <span className="text-gold font-bold text-lg">
                      {recipientCount}
                    </span>{" "}
                    recipient{recipientCount !== 1 ? "s" : ""} will receive this
                    campaign
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

        {/* View Campaign Details Modal */}
        {showDetailsModal && detailsCampaign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="border-b-2 border-black p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold">Campaign Details</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Campaign Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Campaign Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <p className="text-gray-900">{detailsCampaign.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <p className="text-gray-900">{detailsCampaign.subject}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        detailsCampaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                        detailsCampaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {detailsCampaign.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                      <p className="text-gray-900">{detailsCampaign.recipients_count || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Email Metrics */}
                {detailsCampaign.status === 'sent' && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-900">{detailsCampaign.opens || 0}</div>
                        <div className="text-sm text-blue-700">Opens</div>
                      </div>
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-900">{detailsCampaign.clicks || 0}</div>
                        <div className="text-sm text-green-700">Clicks</div>
                      </div>
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-900">{detailsCampaign.bounces || 0}</div>
                        <div className="text-sm text-red-700">Bounces</div>
                      </div>
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-900">
                          {detailsCampaign.opens && detailsCampaign.recipients_count
                            ? Math.round((detailsCampaign.opens / detailsCampaign.recipients_count) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm text-purple-700">Open Rate</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Preview */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Email Preview</h3>
                  <div className="border-2 border-black rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                    {detailsCampaign.content?.html ? (
                      <iframe
                        srcDoc={detailsCampaign.content.html}
                        className="w-full h-full min-h-[400px] border-0"
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">No email content available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t-2 border-black p-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Edit Campaign Modal */}
        {editingCampaign && (
          <EditCampaignModal
            campaign={editingCampaign}
            onClose={() => setEditingCampaign(null)}
            onSuccess={() => {
              setEditingCampaign(null);
              fetchCampaigns();
            }}
          />
        )}

        {/* Delete Confirm Modal */}
        {deletingCampaign && (
          <DeleteConfirmModal
            campaign={deletingCampaign}
            onClose={() => setDeletingCampaign(null)}
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
        )}
    </AppLayout>
  );
}
