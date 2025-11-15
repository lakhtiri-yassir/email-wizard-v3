# Email Wizard Deployment Guide

## Overview

Email Wizard is configured for seamless deployment on Netlify with Supabase as the backend. Follow this guide to deploy your own instance.

## Prerequisites

- Supabase account and project
- Netlify account
- GitHub/GitLab repository (optional but recommended)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Wait for the database to be provisioned

### 1.2 Apply Database Migration

The database schema is already created in your Supabase project. The migration includes:

- **20+ tables**: profiles, contacts, campaigns, automations, etc.
- **Row Level Security**: Enabled on all tables
- **Indexes**: Optimized for query performance
- **Triggers**: Automatic timestamp updates

You can verify tables in Supabase Dashboard > Table Editor.

### 1.3 Get Supabase Credentials

From your Supabase project settings:

1. Go to Settings > API
2. Copy your **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy your **anon/public key**

### 1.4 Edge Functions (Already Deployed)

The following Edge Functions are already deployed in your Supabase project:

- `send-email` - Sends emails via SendGrid
- `sendgrid-webhook` - Processes SendGrid events
- `stripe-checkout` - Creates Stripe checkout sessions
- `stripe-webhook` - Handles Stripe webhooks

### 1.5 Optional: Configure SendGrid & Stripe

For production use, configure these secrets in Supabase Dashboard > Edge Functions > Secrets:

- `SENDGRID_API_KEY` - Your SendGrid API key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

## Step 2: Netlify Deployment

### Option A: Deploy via Git (Recommended)

1. **Push to Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Log in to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**

   Netlify will automatically detect settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

4. **Add Environment Variables**

   In Netlify Dashboard > Site settings > Environment variables, add:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete (usually 1-3 minutes)
   - Your site will be live at `https://random-name.netlify.app`

### Option B: Manual Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Configure Environment Variables**

   Create `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Build**
   ```bash
   npm run build
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Option C: Drag and Drop Deploy

1. **Build Locally**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [Netlify Drop](https://app.netlify.com/drop)
   - Drag and drop the `dist` folder
   - Your site will be live instantly

   **Note**: With this method, you'll need to manually add environment variables in Netlify dashboard.

## Step 3: Custom Domain (Optional)

1. In Netlify Dashboard > Domain settings
2. Click "Add custom domain"
3. Follow DNS configuration instructions
4. Enable HTTPS (automatic via Let's Encrypt)

## Step 4: Post-Deployment Configuration

### 4.1 Create Admin User

After deployment, create your first user:

1. Sign up via the application
2. In Supabase Dashboard > Table Editor > profiles
3. Find your user record
4. Set `is_admin` to `true`

### 4.2 Configure Webhooks

If using SendGrid and Stripe:

**SendGrid Webhook URL:**
```
https://your-supabase-project.supabase.co/functions/v1/sendgrid-webhook
```

Configure in SendGrid Dashboard > Settings > Mail Settings > Event Webhook

**Stripe Webhook URL:**
```
https://your-supabase-project.supabase.co/functions/v1/stripe-webhook
```

Configure in Stripe Dashboard > Developers > Webhooks

## Troubleshooting

### Build Fails on Netlify

- Check Node version is 18 or higher
- Verify environment variables are set correctly
- Check build logs for specific errors

### Database Connection Issues

- Verify Supabase URL and anon key are correct
- Check that tables exist in Supabase Dashboard
- Ensure RLS policies are enabled

### Authentication Not Working

- Confirm Supabase URL and anon key match your project
- Check that auth is enabled in Supabase Dashboard
- Verify email confirmation is disabled (default for this project)

## Project Structure

```
email-wizard/
├── dist/                    # Build output
├── public/                  # Static assets
│   └── _redirects          # Netlify SPA routing
├── src/                     # Source code
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database schema
├── .env.example            # Environment template
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies
└── vite.config.ts          # Vite configuration
```

## Monitoring & Maintenance

### Netlify

- Build logs: Deploys tab
- Analytics: Analytics tab (may require upgrade)
- Functions logs: Functions tab

### Supabase

- Database metrics: Dashboard > Database
- API usage: Dashboard > Settings > Usage
- Edge Function logs: Dashboard > Edge Functions

## Scaling Considerations

### Database

- Supabase free tier: Up to 500MB database
- Upgrade to Pro for more resources
- Add database indexes as data grows

### Hosting

- Netlify free tier: 100GB bandwidth/month
- Upgrade to Pro for more bandwidth
- Consider CDN for static assets

### Email Sending

- SendGrid free tier: 100 emails/day
- Upgrade for higher volume
- Monitor bounce rates and reputation

## Support

For issues related to:

- **Platform code**: Check repository issues
- **Supabase**: [Supabase Support](https://supabase.com/support)
- **Netlify**: [Netlify Support](https://www.netlify.com/support/)

## Next Steps

After deployment:

1. Test all features thoroughly
2. Configure SendGrid for email sending
3. Set up Stripe for payments
4. Create initial content (templates, etc.)
5. Monitor error logs and performance
6. Set up backup strategies for database

Your Email Wizard instance is now live and ready for users!
