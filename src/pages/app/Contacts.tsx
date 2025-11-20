import { useState, useEffect } from 'react';
import { Search, Plus, Upload, Trash2, UserPlus } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AddContactModal } from '../../components/contacts/AddContactModal';
import { AddGroupModal } from '../../components/contacts/AddGroupModal';
import { ImportCSVModal } from '../../components/contacts/ImportCSVModal';
import { EditContactModal } from '../../components/contacts/EditContactModal';
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
  created_at: string;
}

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
  created_at: string;
}

export const Contacts = () => {
  const { user } = useAuth();
  
  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchContactsInGroup(selectedGroupId);
    } else {
      fetchContacts();
    }
  }, [selectedGroupId]);

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
      toast.error('Failed to load contact groups');
    }
  };

  const fetchContacts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsInGroup = async (groupId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_group_members!inner(group_id)
        `)
        .eq('user_id', user.id)
        .eq('contact_group_members.group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts in group:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
      
      toast.success('Contact deleted successfully');
      
      // Refresh data
      if (selectedGroupId) {
        fetchContactsInGroup(selectedGroupId);
      } else {
        fetchContacts();
      }
      fetchGroups(); // Update group counts
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast.error(error.message || 'Failed to delete contact');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedContacts.size} contact(s)?`)) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContacts));
      
      if (error) throw error;
      
      toast.success(`${selectedContacts.size} contact(s) deleted successfully`);
      setSelectedContacts(new Set());
      
      // Refresh data
      if (selectedGroupId) {
        fetchContactsInGroup(selectedGroupId);
      } else {
        fetchContacts();
      }
      fetchGroups(); // Update group counts
    } catch (error: any) {
      console.error('Error deleting contacts:', error);
      toast.error(error.message || 'Failed to delete contacts');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleGroupSelect = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setSelectedContacts(new Set());
    setSearchQuery('');
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      contact.email?.toLowerCase().includes(query) ||
      contact.first_name?.toLowerCase().includes(query) ||
      contact.last_name?.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query) ||
      contact.role?.toLowerCase().includes(query) ||
      contact.industry?.toLowerCase().includes(query)
    );
  });

  const totalContacts = contacts.length;
  const allSelected = selectedContacts.size > 0 && selectedContacts.size === filteredContacts.length;
  const someSelected = selectedContacts.size > 0 && selectedContacts.size < filteredContacts.length;

  return (
    <AppLayout currentPath="/app/contacts">
      <div className="flex h-screen">
        {/* Left Sidebar - Groups */}
        <div className="w-1/4 border-r border-black bg-white overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-serif font-bold mb-4">Contact Groups</h2>
            
            {/* All Contacts */}
            <div
              onClick={() => handleGroupSelect(null)}
              className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                selectedGroupId === null
                  ? 'bg-[#f3ba42] border-2 border-black font-semibold'
                  : 'bg-white border border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  📁 All Contacts
                </span>
                <span className="text-sm px-2 py-1 bg-white bg-opacity-50 rounded-full">
                  {totalContacts}
                </span>
              </div>
            </div>

            {/* Groups List */}
            <div className="space-y-2 mb-4">
              {groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => handleGroupSelect(group.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedGroupId === group.id
                      ? 'bg-[#f3ba42] border-2 border-black font-semibold'
                      : 'bg-white border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-gray-600 truncate">{group.description}</div>
                      )}
                    </div>
                    <span className="ml-2 text-sm px-2 py-1 bg-white bg-opacity-50 rounded-full flex-shrink-0">
                      {group.contact_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* New Group Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddGroupModal(true)}
              className="w-full"
            >
              New Group
            </Button>
          </div>
        </div>

        {/* Main Content - Contacts List */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-serif font-bold mb-2">
                  {selectedGroupId 
                    ? groups.find(g => g.id === selectedGroupId)?.name 
                    : 'All Contacts'
                  }
                </h1>
                <p className="text-gray-600">
                  {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  icon={Upload}
                  onClick={() => setShowImportModal(true)}
                >
                  Import CSV
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={Plus}
                  onClick={() => setShowAddContactModal(true)}
                >
                  Add Contact
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white border border-black rounded-lg p-4 mb-6">
              <Input
                icon={Search}
                type="text"
                placeholder="Search contacts by name, email, company, role, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Bulk Actions */}
            {selectedContacts.size > 0 && (
              <div className="bg-[#57377d] text-white rounded-lg p-4 mb-6 flex items-center justify-between">
                <span className="font-semibold">
                  {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedContacts(new Set())}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    icon={Trash2}
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            {/* Contacts Table */}
            {loading ? (
              <div className="bg-white border border-black rounded-lg p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#f3ba42] mb-4"></div>
                <p className="text-gray-600">Loading contacts...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="bg-white border border-black rounded-lg p-12 text-center">
                {searchQuery ? (
                  <>
                    <Search size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-serif font-bold mb-2">No contacts found</h3>
                    <p className="text-gray-600 mb-6">
                      No contacts match your search "{searchQuery}"
                    </p>
                    <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
                  </>
                ) : selectedGroupId ? (
                  <>
                    <UserPlus size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-serif font-bold mb-2">No contacts in this group</h3>
                    <p className="text-gray-600 mb-6">
                      Start by adding contacts to this group
                    </p>
                    <Button onClick={() => setShowAddContactModal(true)}>
                      Add Contact
                    </Button>
                  </>
                ) : (
                  <>
                    <UserPlus size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-serif font-bold mb-2">No contacts yet</h3>
                    <p className="text-gray-600 mb-6">
                      Get started by adding your first contact or importing from CSV
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setShowAddContactModal(true)}>
                        Add Contact
                      </Button>
                      <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                        Import CSV
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white border border-black rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-black">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={input => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-[#f3ba42] focus:ring-[#57377d]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Company</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Industry</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredContacts.map(contact => (
                      <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(contact.id)}
                            onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                            className="rounded border-gray-300 text-[#f3ba42] focus:ring-[#57377d]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {contact.first_name || contact.last_name 
                              ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{contact.email}</td>
                        <td className="px-4 py-3 text-gray-700">{contact.company || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{contact.role || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{contact.industry || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            contact.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : contact.status === 'bounced'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingContactId(contact.id)}
                              className="text-[#57377d] hover:text-[#f3ba42] font-medium text-sm transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddContactModal && (
        <AddContactModal
          onClose={() => setShowAddContactModal(false)}
          onSuccess={() => {
            fetchContacts();
            fetchGroups();
            setShowAddContactModal(false);
          }}
        />
      )}

      {showAddGroupModal && (
        <AddGroupModal
          onClose={() => setShowAddGroupModal(false)}
          onSuccess={() => {
            fetchGroups();
            setShowAddGroupModal(false);
          }}
        />
      )}

      {showImportModal && (
        <ImportCSVModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchContacts();
            fetchGroups();
            setShowImportModal(false);
          }}
        />
      )}

      {editingContactId && (
        <EditContactModal
          contactId={editingContactId}
          onClose={() => setEditingContactId(null)}
          onSuccess={() => {
            if (selectedGroupId) {
              fetchContactsInGroup(selectedGroupId);
            } else {
              fetchContacts();
            }
            fetchGroups();
            setEditingContactId(null);
          }}
        />
      )}
    </AppLayout>
  );
};