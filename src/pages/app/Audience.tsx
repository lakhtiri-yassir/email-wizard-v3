import { useState, useEffect } from 'react';
import { UserPlus, Search, Filter, Tag, Download } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  engagement_score: number;
  status: string;
  created_at: string;
}

export const Audience = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Total Contacts', value: contacts.length.toLocaleString() },
    {
      label: 'Active',
      value: contacts.filter((c) => c.status === 'active').length.toLocaleString(),
    },
    {
      label: 'Avg. Engagement',
      value: Math.round(
        contacts.reduce((sum, c) => sum + c.engagement_score, 0) / (contacts.length || 1)
      ),
    },
  ];

  const handleExportCSV = () => {
    const csv = [
      ['Email', 'First Name', 'Last Name', 'Engagement Score', 'Status', 'Created'],
      ...filteredContacts.map(c => [
        c.email,
        c.first_name || '',
        c.last_name || '',
        c.engagement_score,
        c.status,
        new Date(c.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      const emailIndex = headers.findIndex(h => h.includes('email'));
      const firstNameIndex = headers.findIndex(h => h.includes('first') && h.includes('name'));
      const lastNameIndex = headers.findIndex(h => h.includes('last') && h.includes('name'));

      if (emailIndex === -1) {
        alert('CSV must contain an email column');
        return;
      }

      const newContacts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          user_id: user.id,
          email: values[emailIndex],
          first_name: firstNameIndex !== -1 ? values[firstNameIndex] : null,
          last_name: lastNameIndex !== -1 ? values[lastNameIndex] : null,
          status: 'active',
          engagement_score: 0
        };
      }).filter(c => c.email);

      const { error } = await supabase.from('contacts').insert(newContacts);

      if (error) throw error;

      await fetchContacts();
      alert(`Successfully imported ${newContacts.length} contacts!`);
      e.target.value = '';
    } catch (error: any) {
      console.error('Import error:', error);
      alert(error.message || 'Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout currentPath="/app/audience">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Audience</h1>
            <p className="text-gray-600">Manage your contacts, tags, and segments.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              id="csv-upload"
              disabled={importing}
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Download}
              onClick={handleExportCSV}
              disabled={contacts.length === 0}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={UserPlus}
              onClick={() => setShowAddModal(true)}
            >
              Add Contact
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-serif font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="secondary" size="md" icon={Filter}>
              Filters
            </Button>
            <Button variant="secondary" size="md" icon={Tag}>
              Tags
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No contacts found</p>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by adding your first contact'}
              </p>
              {!searchQuery && (
                <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
                  Add Your First Contact
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold">Engagement</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          {contact.first_name || contact.last_name
                            ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                            : 'No name'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{contact.email}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 font-semibold text-gold">
                          {contact.engagement_score}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            contact.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-gray-600">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddContactModal onClose={() => setShowAddModal(false)} onSuccess={fetchContacts} />
        )}
      </div>
    </AppLayout>
  );
};

interface AddContactModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddContactModal = ({ onClose, onSuccess }: AddContactModalProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('contacts').insert({
        user_id: user.id,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-black max-w-md w-full p-6 animate-slide-up">
        <h2 className="text-2xl font-serif font-bold mb-4">Add Contact</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-600 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            type="email"
            label="Email"
            placeholder="contact@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="text"
            label="First Name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <Input
            type="text"
            label="Last Name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
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
            <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
              Add Contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
