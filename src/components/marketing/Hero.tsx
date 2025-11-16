import { ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight mb-6 animate-fade-in">
            Turn emails into revenue
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto animate-slide-up">
            Marketing and automations platform designed to grow your business. Send better email campaigns, build customer relationships, and sell more stuff.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up">
            <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="end" onClick={() => navigate('/signup')}>
              Start Free Trial
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/signup')}>
              Watch Demo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
          <div className="border border-black rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="bg-gradient-to-br from-purple/10 to-gold/10 p-12 sm:p-20 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block p-6 bg-white border border-black rounded-2xl shadow-lg">
                  <div className="w-16 h-16 bg-gold rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle size={32} className="text-black" />
                  </div>
                  <p className="text-lg font-semibold">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
