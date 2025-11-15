# Email Wizard - Quick Start Guide

## Deploy to Netlify in 5 Minutes

### Step 1: Get Supabase Credentials (2 minutes)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Open your project (database is already set up)
3. Go to **Settings > API**
4. Copy these two values:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJxxx...`

### Step 2: Deploy to Netlify (3 minutes)

**Option 1: Git Deploy (Best for continuous deployment)**

1. Push code to GitHub/GitLab:
   ```bash
   git init
   git add .
   git commit -m "Deploy Email Wizard"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" > "Import an existing project"
4. Select your repository
5. Netlify auto-detects settings from `netlify.toml`
6. Add environment variables:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
7. Click "Deploy"

**Option 2: Manual Deploy (Fastest for testing)**

1. Build locally:
   ```bash
   npm install
   npm run build
   ```

2. Go to [Netlify Drop](https://app.netlify.com/drop)
3. Drag the `dist` folder
4. After deploy, add environment variables in Site Settings

**Option 3: CLI Deploy**

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=dist
```

### Step 3: Create Your Admin Account

1. Visit your deployed site
2. Click "Sign Up"
3. Create your account
4. Go to Supabase Dashboard > Table Editor > profiles
5. Find your record and set `is_admin = true`

### Step 4: You're Live!

Your Email Wizard is now running at your Netlify URL.

## What Works Out of the Box

✅ Marketing landing page
✅ User authentication and signup
✅ Dashboard with analytics
✅ Contact management
✅ Campaign creation
✅ Settings and profile management
✅ Admin dashboard
✅ Plan-based feature gating

## What Needs Configuration (Optional)

For production email sending and payments:

**SendGrid (for sending emails)**
- Add `SENDGRID_API_KEY` to Supabase Edge Functions secrets
- Configure webhook: `YOUR_SUPABASE_URL/functions/v1/sendgrid-webhook`

**Stripe (for billing)**
- Add `STRIPE_SECRET_KEY` to Supabase Edge Functions secrets
- Add `STRIPE_WEBHOOK_SECRET` to Supabase Edge Functions secrets
- Configure webhook: `YOUR_SUPABASE_URL/functions/v1/stripe-webhook`

## Files Configured for Netlify

- ✅ `netlify.toml` - Build and redirect configuration
- ✅ `public/_redirects` - SPA routing
- ✅ `.env.example` - Environment variable template
- ✅ Database migration applied to Supabase
- ✅ 4 Edge Functions deployed to Supabase

## Need Help?

See `DEPLOYMENT.md` for detailed instructions and troubleshooting.

## Update Your Deployment

After pushing changes to your repository, Netlify automatically rebuilds and deploys.

Manual update:
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

**That's it! You now have a production-ready email marketing SaaS platform.**
