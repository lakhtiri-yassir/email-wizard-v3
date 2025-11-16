import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <img
              src="/logo.jpg"
              alt="Email Wizard Logo"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden items-center gap-2">
              <div className="w-10 h-10 bg-purple rounded-full flex items-center justify-center border-2 border-black">
                <span className="text-white font-bold text-xl">EW</span>
              </div>
              <span className="font-serif text-2xl font-bold">Email Wizard</span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#solutions" className="text-sm font-medium hover:text-gold transition-colors">
              Solutions
            </a>
            <a href="#features" className="text-sm font-medium hover:text-gold transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-gold transition-colors">
              Pricing
            </a>
            <a href="#resources" className="text-sm font-medium hover:text-gold transition-colors">
              Resources
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="tertiary" size="sm" onClick={() => navigate('/login')}>
              Log In
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
              Sign Up
            </Button>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black bg-white animate-slide-down">
          <nav className="flex flex-col p-4 gap-4">
            <a href="#solutions" className="text-sm font-medium py-2 hover:text-gold transition-colors">
              Solutions
            </a>
            <a href="#features" className="text-sm font-medium py-2 hover:text-gold transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium py-2 hover:text-gold transition-colors">
              Pricing
            </a>
            <a href="#resources" className="text-sm font-medium py-2 hover:text-gold transition-colors">
              Resources
            </a>
            <div className="flex flex-col gap-2 mt-4">
              <Button variant="secondary" size="sm" fullWidth onClick={() => navigate('/login')}>
                Log In
              </Button>
              <Button variant="primary" size="sm" fullWidth onClick={() => navigate('/signup')}>
                Sign Up
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
