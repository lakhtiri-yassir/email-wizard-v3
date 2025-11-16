import { useState, useEffect } from 'react';
import { Mail, Plus, Send } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject?.toLowerCase().includes(searchQuery.toLowerCase())
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
                      <Button variant="primary" size="sm" icon={Send}>
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
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('campaigns').insert({
        user_id: user.id,
        name,
        subject,
        content: { html: htmlContent },
        status: 'draft',
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-black max-w-2xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-serif font-bold mb-4">Create Campaign</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-600 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            type="text"
            label="Campaign Name"
            placeholder="Summer Sale Newsletter"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="text"
            label="Subject Line"
            placeholder="50% Off Everything!"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2">Email Content (HTML)</label>
            <textarea
              className="input-base w-full h-48 font-mono text-sm"
              placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              required
            />
          </div>

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
              Create Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
