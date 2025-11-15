# Email Wizard

A complete, production-grade SaaS email marketing platform inspired by Mailchimp's UI/UX, built with modern infrastructure and polished design.

## Features

### Marketing Landing Page
- Hero section with clear value proposition
- Feature grid showcasing platform capabilities
- Transparent pricing with 3 plans (Free, Pro, Pro Plus)
- Full footer with navigation links
- Responsive design with smooth animations

### User Application
- **Dashboard**: KPI cards, performance charts, quick actions
- **Audience Management**: Contact management, tags, segments, engagement scoring
- **Campaign Builder**: Create and manage email campaigns
- **Automations**: Visual journey builder (Pro Plus only)
- **Templates**: Email template library
- **Content Studio**: Media asset management
- **Landing Pages**: Custom landing page builder
- **Analytics**: Campaign performance tracking
- **Settings**: Profile, domains, billing, API keys, notifications

### Admin Dashboard
- User management and monitoring
- Platform metrics and health
- Revenue and subscription tracking
- System overview

### Infrastructure

#### Database (Supabase/PostgreSQL)
- Complete schema for users, campaigns, audiences, automations
- Row Level Security (RLS) enabled on all tables
- Automated triggers for timestamps
- Comprehensive indexes for performance

#### Email Delivery (SendGrid)
- Integrated email sending via Edge Functions
- Webhook handler for delivery events (opens, clicks, bounces)
- Shared domain for Free/Pro plans
- Custom domain support for Pro Plus

#### Billing (Stripe)
- Checkout session creation
- Subscription management
- Webhook handlers for payment events
- Invoice tracking

#### Authentication (Supabase Auth)
- Email/password authentication
- Secure session management
- Protected routes

## Design System

### Colors
- Gold (#f3ba42): Primary actions, highlights
- Purple (#57377d): Secondary accents, focus states
- Black (#000000): Text, borders, icons
- White (#FFFFFF): Base background

### Typography
- Headings: DM Serif Display (Mailchimp-style serif)
- Body: DM Sans (clean grotesk)

### Components
- Pill-shaped buttons with hover animations
- Clean cards with subtle shadows
- Consistent spacing (8px system)
- Smooth 200-300ms transitions

## Plan Features

### Free Plan
- 500 emails per month
- 500 contacts
- Basic templates
- Shared sending domain
- Basic analytics

### Pro Plan ($29/month)
- 25,000 emails per month
- 5,000 contacts
- All templates
- Custom or shared domain
- Advanced analytics
- A/B testing
- Campaign scheduling

### Pro Plus Plan ($99/month)
- Unlimited emails
- Unlimited contacts
- All features
- Custom domain required
- Marketing automations
- API access
- Merge tag personalization

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Database Migration

The database schema is automatically managed through Supabase. The migration file is located at:
```
supabase/migrations/20251115220808_initial_schema.sql
```

All tables include:
- Row Level Security (RLS) enabled
- Proper indexes for performance
- Automated timestamp triggers
- Secure access policies

### Netlify Deployment

The project is pre-configured for Netlify deployment:

1. **Connect Repository**: Link your GitHub/GitLab repository to Netlify

2. **Build Settings** (automatically configured via `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

3. **Environment Variables**: Add these in Netlify dashboard under Site Settings > Environment Variables:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy**: Push to your main branch or manually trigger a deploy

The `netlify.toml` and `public/_redirects` files handle SPA routing automatically.

### Supabase Edge Functions

The platform includes 4 Edge Functions that are already deployed:

1. **send-email**: Handles email sending via SendGrid
2. **sendgrid-webhook**: Processes SendGrid delivery events
3. **stripe-checkout**: Creates Stripe checkout sessions
4. **stripe-webhook**: Handles Stripe subscription webhooks

Environment variables for Edge Functions are automatically configured in Supabase.

## Edge Functions

The platform includes several Supabase Edge Functions:

- **send-email**: Sends emails via SendGrid API
- **sendgrid-webhook**: Processes SendGrid delivery events
- **stripe-checkout**: Creates Stripe checkout sessions
- **stripe-webhook**: Handles Stripe subscription events

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: SendGrid
- **Payments**: Stripe
- **Hosting**: Optimized for deployment on modern platforms

## Security

- Row Level Security (RLS) on all database tables
- Secure authentication with JWT tokens
- API keys stored as hashed values
- Plan-based feature gating
- Admin-only dashboard access

## Production Ready

This is a fully functional, production-grade platform with:
- Complete database schema with migrations
- Full authentication system
- Real-time subscription management
- Email delivery infrastructure
- Payment processing
- Responsive design
- Accessibility features
- Performance optimizations
