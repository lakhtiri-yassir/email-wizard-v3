import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups?: Array<{ id: string; name: string }>; // Made optional with default
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

export const AddContactModal = ({ isOpen, onClose, onSuccess, groups = [] }: AddContactModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    role: '',
    industry: '',
    selectedGroups: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.email) return;

    setLoading(true);
    try {
      // Insert contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          email: formData.email,
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          company: formData.company || null,
          role: formData.role || null,
          industry: formData.industry || null,
          status: 'active'
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Add to selected groups
      if (formData.selectedGroups.length > 0 && contact) {
        const groupMembers = formData.selectedGroups.map(groupId => ({
          contact_id: contact.id,
          group_id: groupId
        }));

        const { error: groupError } = await supabase
          .from('contact_group_members')
          .insert(groupMembers);

        if (groupError) throw groupError;
      }

      toast.success('Contact added successfully!');
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        company: '',
        role: '',
        industry: '',
        selectedGroups: []
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding contact:', error);
      if (error.code === '23505') {
        toast.error('A contact with this email already exists');
      } else {
        toast.error('Failed to add contact');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Contact" maxWidth="lg">
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

        {/* Only show groups section if groups array has items */}
        {groups && groups.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2">Add to Groups (Optional)</label>
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
            Add Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
};