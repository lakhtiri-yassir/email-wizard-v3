import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { AlertCircle } from 'lucide-react';

interface ContactGroup {
  id: string;
  name: string;
  description: string;
  contact_count: number;
}

interface RecipientSelectorProps {
  onSelect: (groupId: string) => void;
  selectedGroupId: string | null;
  templateHasPersonalization: boolean;
}

export const RecipientSelector = ({
  onSelect,
  selectedGroupId,
  templateHasPersonalization
}: RecipientSelectorProps) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    onSelect(groupId);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading contact groups...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You don't have any contact groups yet.</p>
        <Button onClick={() => window.location.href = '/app/contacts'}>
          Create Your First Group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-serif font-bold">Select Recipients</h2>
      
      {templateHasPersonalization && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">
              This template uses personalization
            </p>
            <p className="text-sm text-blue-800">
              Make sure your contacts have data for: first name, company, role, industry
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {groups.map(group => (
          <div
            key={group.id}
            onClick={() => handleSelectGroup(group.id)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedGroupId === group.id
                ? 'border-[#f3ba42] bg-[#f3ba42]/10'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {group.contact_count} contacts
                </p>
              </div>
              {selectedGroupId === group.id && (
                <div className="w-6 h-6 bg-[#f3ba42] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};