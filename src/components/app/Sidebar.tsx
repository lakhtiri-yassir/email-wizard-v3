import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  BarChart3,
  Settings,
  Crown,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../ui/Logo';
import { useNavigate } from 'react-router-dom';


const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/app' },
  { name: 'Contacts', icon: Users, href: '/app/contacts' },
  { name: 'Campaigns', icon: Mail, href: '/app/campaigns' },
  { name: 'Templates', icon: FileText, href: '/app/templates' },
  { name: 'Analytics', icon: BarChart3, href: '/app/analytics' },
  { name: 'Settings', icon: Settings, href: '/app/settings' },
];

interface SidebarProps {
  currentPath: string;
}

export const Sidebar = ({ currentPath }: SidebarProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-gold text-black';
      case 'pro_plus':
        return 'bg-purple text-white';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  return (
    <div className="w-64 bg-white border-r border-black h-screen flex flex-col">
      {/* 🔥 UPDATED: Logo Section */}
      <div className="p-6 border-b border-black">
        {/* Logo - Clickable, navigates to dashboard */}
        <div className="mb-4">
          <Logo 
            variant="full" 
            size="lg"
            onClick={() => navigate('/app')}
          />
        </div>

        {/* User Profile Info */}
        {profile && (
          <div className="space-y-2">
            <p className="text-sm font-semibold truncate">{profile.full_name || profile.email}</p>
            <div
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getPlanColor(
                profile.plan_type
              )}`}
            >
              {profile.plan_type === 'pro_plus' && <Crown size={12} />}
              {profile.plan_type.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            const isLocked = item.badge && profile?.plan_type !== 'pro_plus';

            return (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-250 ${
                    isActive
                      ? 'bg-gold text-black font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${isLocked ? 'opacity-60' : ''}`}
                >
                  <Icon size={20} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="text-xs px-2 py-0.5 bg-purple text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Admin & Sign Out */}
      <div className="p-4 border-t border-black">
        {profile?.is_admin && (
          <a
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple font-semibold hover:bg-purple/10 transition-all duration-250 mb-2"
          >
            <Crown size={20} />
            <span>Admin Panel</span>
          </a>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all duration-250"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};