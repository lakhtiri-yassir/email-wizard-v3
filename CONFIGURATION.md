# Mail Wizard - Configuration Guide

## 🔧 Required Configuration

### 1. Supabase Edge Functions Environment Variables

Go to: Supabase Dashboard > Edge Functions > Manage Secrets

Add these secrets:

```bash
SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key
```

Optional (for Stripe):
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

### 2. SendGrid Webhook Configuration

**Webhook URL:**
```
https://epixqnnaksxmjarwnhbx.supabase.co/functions/v1/sendgrid-webhook
```

**Events to Enable:**
- ✅ Delivered
- ✅ Opened
- ✅ Clicked
- ✅ Bounced
- ✅ Dropped
- ✅ Spam Report
- ✅ Unsubscribe

**Configuration Steps:**
1. Go to SendGrid Dashboard: https://app.sendgrid.com
2. Navigate to: Settings > Mail Settings > Event Webhook
3. Toggle webhook ON
4. Paste webhook URL
5. Select all events listed above
6. Enable "Signature Verification" (recommended for security)
7. Copy the verification key
8. Add to Supabase secrets as `SENDGRID_WEBHOOK_VERIFICATION_KEY`
9. Click Save

---

### 3. SendGrid API Key Setup

**Create API Key:**
1. Go to: Settings > API Keys
2. Click "Create API Key"
3. Name: "Mail Wizard Production"
4. Permissions: **Full Access**
5. Click "Create & View"
6. Copy the key (you can't view it again!)
7. Add to Supabase secrets

**Verify API Key:**
```bash
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header 'Authorization: Bearer YOUR_SENDGRID_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "sender@yourdomain.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

---

### 4. Stripe Configuration (Optional)

**Create Products:**
1. Go to Stripe Dashboard > Products
2. Create "Pro Plan" - $29/month
3. Create "Pro Plus Plan" - $99/month
4. Copy price IDs

**Update Price IDs:**
Edit: `supabase/functions/stripe-checkout/index.ts`
```typescript
const priceIds = {
  pro: 'price_YOUR_ACTUAL_PRO_PRICE_ID',
  pro_plus: 'price_YOUR_ACTUAL_PRO_PLUS_PRICE_ID',
};
```

**Configure Webhook:**
1. Go to: Developers > Webhooks
2. Add endpoint: `https://epixqnnaksxmjarwnhbx.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy webhook signing secret
5. Add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

## 🔑 Environment Variables Reference

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://epixqnnaksxmjarwnhbx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (Supabase Edge Functions)
```bash
# Required for email sending
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Required for webhook signature verification (get from SendGrid webhook settings)
SENDGRID_WEBHOOK_VERIFICATION_KEY=your_verification_key_here

# Auto-configured by Supabase
SUPABASE_URL=https://epixqnnaksxmjarwnhbx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://...

# Optional for Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 📋 Pre-Launch Checklist

### Database
- [x] All tables created (done via migration)
- [x] RLS policies enabled
- [x] Database functions created
- [x] Indexes created for performance

### Backend
- [x] send-email Edge Function deployed
- [x] sendgrid-webhook Edge Function deployed (with signature verification)
- [x] stripe-checkout Edge Function deployed
- [x] stripe-webhook Edge Function deployed
- [ ] SENDGRID_API_KEY configured
- [ ] SENDGRID_WEBHOOK_VERIFICATION_KEY configured
- [ ] SendGrid webhook URL configured

### Frontend
- [x] Build successful (378KB bundle)
- [x] All pages functional
- [x] Navigation working
- [x] Forms validated
- [x] Error handling implemented

### Testing
- [ ] Send test email to yourself
- [ ] Verify email delivery
- [ ] Test open tracking
- [ ] Test click tracking
- [ ] Verify dashboard updates
- [ ] Test CSV import
- [ ] Test CSV export

---

## 🚀 Quick Start Commands

### Build and Deploy
```bash
# Build frontend
npm run build

# Deploy to Netlify
git push origin main
```

### Test Edge Functions Locally
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Test send-email function
supabase functions serve send-email --env-file .env.local

# Test in another terminal
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id": "test", ...}'
```

---

## 📊 Monitoring

### Check Edge Function Logs
1. Go to Supabase Dashboard
2. Click Edge Functions
3. Select function (send-email or sendgrid-webhook)
4. Click "Logs" tab
5. Watch for errors in real-time

### Check SendGrid Activity
1. Go to SendGrid Dashboard
2. Click "Activity"
3. Search by recipient email
4. View delivery status, opens, clicks

### Check Database
1. Go to Supabase Dashboard
2. Click Table Editor
3. View these tables:
   - `campaigns` - Campaign details
   - `email_events` - All tracked events
   - `campaign_recipients` - Individual sends
   - `usage_metrics` - Monthly quotas
   - `contacts` - Contact engagement

---

## 🔒 Security Notes

### API Keys
- **Never commit API keys to Git**
- Store in Supabase Edge Functions secrets
- Rotate keys every 90 days
- Use different keys for test/production

### Database
- RLS policies are enabled on all tables
- Users can only access their own data
- Service role key only used in Edge Functions
- Never expose service role key to frontend

### Webhooks
- SendGrid webhook signature verification enabled
- Protects against unauthorized webhook requests
- Uses HMAC-SHA256 for signature validation
- Verification key stored securely in environment variables

### Email
- Validate all email addresses before sending
- Implement rate limiting (done via quotas)
- Monitor bounce rates
- Handle unsubscribes immediately

---

## 📞 Support Resources

### SendGrid
- Dashboard: https://app.sendgrid.com
- Docs: https://docs.sendgrid.com
- Status: https://status.sendgrid.com

### Supabase
- Dashboard: https://app.supabase.com
- Docs: https://supabase.com/docs
- Status: https://status.supabase.com

### Stripe
- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs
- Status: https://status.stripe.com

---

## ✅ Configuration Complete!

Once you've completed all steps above, your Mail Wizard platform is fully configured and ready to send emails!

Next step: Follow TESTING_GUIDE.md to verify everything works.
