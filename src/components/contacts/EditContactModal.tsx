import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface EditContactModalProps {
  contactId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditContactModal = ({ contactId, onClose, onSuccess }: EditContactModalProps) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      
      setEmail(data.email || '');
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setCompany(data.company || '');
      setRole(data.role || '');
      setIndustry(data.industry || '');
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast.error('Failed to load contact');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          email: email.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          industry: industry || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);
      
      if (error) throw error;
      
      toast.success('Contact updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast.error(error.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal onClose={onClose} title="Edit Contact">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading contact...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Edit Contact">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            label="Last Name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        
        <Input
          label="Company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        
        <Input
          label="Role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        
        <div>
          <label className="block text-sm font-medium mb-2">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="input-base w-full"
          >
            <option value="">Select industry</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="Education">Education</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Retail">Retail</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Marketing">Marketing</option>
            <option value="Consulting">Consulting</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};