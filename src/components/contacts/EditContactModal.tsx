import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: string | null;
  industry: string | null;
  status: string;
}

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactId: string | null;
  groups?: Array<{ id: string; name: string }>;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Marketing',
  'Consulting',
  'Other'
];

export const EditContactModal = ({ isOpen, onClose, onSuccess, contactId, groups = [] }: EditContactModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingContact, setLoadingContact] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    role: '',
    industry: '',
    status: 'active',
    selectedGroups: [] as string[]
  });

  // Load contact data when modal opens
  useEffect(() => {
    if (isOpen && contactId) {
      loadContact();
      loadContactGroups();
    }
  }, [isOpen, contactId]);

  const loadContact = async () => {
    if (!contactId) return;
    
    setLoadingContact(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          company: data.company || '',
          role: data.role || '',
          industry: data.industry || '',
          status: data.status || 'active',
          selectedGroups: []
        });
      }
    } catch (error) {
      console.error('Error loading contact:', error);
      toast.error('Failed to load contact');
    } finally {
      setLoadingContact(false);
    }
  };

  const loadContactGroups = async () => {
    if (!contactId) return;

    try {
      const { data, error } = await supabase
        .from('contact_group_members')
        .select('group_id')
        .eq('contact_id', contactId);

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        selectedGroups: data?.map(g => g.group_id) || []
      }));
    } catch (error) {
      console.error('Error loading contact groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contactId || !formData.email) return;

    setLoading(true);
    try {
      // Update contact
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          email: formData.email,
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          company: formData.company || null,
          role: formData.role || null,
          industry: formData.industry || null,
          status: formData.status
        })
        .eq('id', contactId);

      if (updateError) throw updateError;

      // Update group memberships
      // First, remove all existing group memberships
      await supabase
        .from('contact_group_members')
        .delete()
        .eq('contact_id', contactId);

      // Then add new group memberships
      if (formData.selectedGroups.length > 0) {
        const groupMembers = formData.selectedGroups.map(groupId => ({
          contact_id: contactId,
          group_id: groupId
        }));

        const { error: groupError } = await supabase
          .from('contact_group_members')
          .insert(groupMembers);

        if (groupError) throw groupError;
      }

      toast.success('Contact updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating contact:', error);
      if (error.code === '23505') {
        toast.error('A contact with this email already exists');
      } else {
        toast.error('Failed to update contact');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(id => id !== groupId)
        : [...prev.selectedGroups, groupId]
    }));
  };

  if (loadingContact) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Contact" maxWidth="lg">
        <div className="p-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading contact...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Contact" maxWidth="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email *</label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Industry</label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="input-base"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">First Name</label>
            <Input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Last Name</label>
            <Input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Company</label>
            <Input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Role</label>
            <Input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Marketing Manager"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="input-base"
          >
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
            <option value="complained">Complained</option>
          </select>
        </div>

        {/* Only show groups section if groups array has items */}
        {groups && groups.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2">Groups (Optional)</label>
            <div className="border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
              {groups.map(group => (
                <label key={group.id} className="flex items-center gap-2 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selectedGroups.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                    className="w-4 h-4 rounded border-black"
                  />
                  <span>{group.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Update Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
};