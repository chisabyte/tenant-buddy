# Stripe Subscription Implementation Guide

This document provides a comprehensive overview of the Stripe subscription implementation with owner override functionality.

## Files Created or Modified

### New Files Created
1. `app/api/evidence/upload-check/route.ts` - API route to check evidence upload limits
2. `app/api/evidence/file-size-limit/route.ts` - API route to get plan-based file size limits

### Modified Files
1. `app/pricing/page.tsx` - Wired up checkout buttons to call `/api/stripe/checkout`
2. `app/(app)/settings/page.tsx` - Added "Manage Subscription" button
3. `app/(app)/dashboard/page.tsx` - Added plan badge display with owner indicator
4. `app/(app)/evidence/upload/page.tsx` - Added plan limit checks before upload
5. `app/api/evidence-packs/generate/route.ts` - Added monthly pack generation limit checks

### Existing Files (Already Implemented)
- `lib/billing/get-plan.ts` - Plan resolution with owner override
- `lib/billing/plans.ts` - Plan definitions and entitlements
- `lib/stripe/config.ts` - Stripe configuration
- `app/api/stripe/checkout/route.ts` - Stripe Checkout session creation
- `app/api/stripe/portal/route.ts` - Stripe Customer Portal
- `app/api/stripe/webhook/route.ts` - Stripe webhook handler
- `supabase/migrations/004_subscriptions.sql` - Database schema for subscriptions

## Database Migration

The subscription table is already created via migration `004_subscriptions.sql`. The SQL includes:

```sql
-- Subscriptions table with user_id, stripe_customer_id, stripe_subscription_id, price_id, status, etc.
-- RLS policies allowing users to SELECT their own subscription
-- Service role can INSERT/UPDATE/DELETE (for webhooks)
```

**To apply the migration:**
```bash
# Using Supabase CLI
supabase migration up

# Or apply directly in Supabase SQL Editor
# Copy contents of supabase/migrations/004_subscriptions.sql
```

## Environment Variables Checklist

### Required for Vercel Deployment

#### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard → Webhooks)
```

#### Stripe Price IDs (AUD)
Create these in Stripe Dashboard → Products:
```
STRIPE_PRICE_PLUS_MONTHLY=price_... (Plus plan, monthly, AUD)
STRIPE_PRICE_PLUS_YEARLY=price_... (Plus plan, yearly, AUD)
STRIPE_PRICE_PRO_MONTHLY=price_... (Pro plan, monthly, AUD)
STRIPE_PRICE_PRO_YEARLY=price_... (Pro plan, yearly, AUD)
```

#### Owner Override
```
APP_OWNER_EMAIL=roscoechisas@gmail.com
```

#### Supabase (Already Configured)
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (for webhooks only)
```

#### App URL (for redirects)
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
# Or Vercel auto-provides VERCEL_URL
```

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable for:
   - **Production** environment
   - **Preview** environment (optional, use test keys)
   - **Development** environment (optional)

## Stripe Test-Mode Setup Steps

### 1. Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Create products:

**Plus Plan (Monthly)**
- Name: "Plus (Monthly)"
- Pricing: Recurring, $15 AUD/month
- Copy the Price ID (starts with `price_...`)

**Plus Plan (Yearly)**
- Name: "Plus (Yearly)"
- Pricing: Recurring, $144 AUD/year (or $12/month billed yearly)
- Copy the Price ID

**Pro Plan (Monthly)**
- Name: "Pro (Monthly)"
- Pricing: Recurring, $29 AUD/month
- Copy the Price ID

**Pro Plan (Yearly)**
- Name: "Pro (Yearly)"
- Pricing: Recurring, $276 AUD/year (or $23/month billed yearly)
- Copy the Price ID

### 2. Set Up Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded` (optional)
   - `invoice.payment_failed` (optional)
5. Copy the **Signing secret** (starts with `whsec_...`)

### 3. Configure Customer Portal (Optional but Recommended)

1. Go to [Stripe Dashboard → Settings → Billing → Customer portal](https://dashboard.stripe.com/test/settings/billing/portal)
2. Enable Customer Portal
3. Configure allowed features:
   - ✅ Update payment method
   - ✅ Cancel subscription
   - ✅ Switch plans (optional)
   - ✅ View billing history

### 4. Get Test API Keys

1. Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
2. Copy **Publishable key** (starts with `pk_test_...`) - not needed for this implementation
3. Copy **Secret key** (starts with `sk_test_...`) - this is `STRIPE_SECRET_KEY`

## Manual Test Plan

### Test 1: Owner Override Verification

**Prerequisites:**
- User account with email: `roscoechisas@gmail.com`
- `APP_OWNER_EMAIL=roscoechisas@gmail.com` set in environment

**Steps:**
1. Sign in with owner email
2. Navigate to `/dashboard`
3. **Expected:** Plan badge shows "Pro (Owner)" with crown icon
4. Navigate to `/settings`
5. **Expected:** "Manage Subscription" button shows error (owner doesn't need subscription)
6. Upload evidence files (should be unlimited)
7. Generate evidence packs (should be unlimited)
8. **Expected:** All limits bypassed, owner has full access

### Test 2: Free Plan Limits

**Prerequisites:**
- User account with non-owner email
- No active subscription

**Steps:**
1. Sign in with free account
2. Navigate to `/dashboard`
3. **Expected:** Plan badge shows "Free"
4. Try to upload 11th evidence file
5. **Expected:** Error message about reaching limit of 10 files
6. Generate 2nd evidence pack in same month
7. **Expected:** Error message about reaching monthly limit of 1 pack
8. Try to upload file larger than 10MB
9. **Expected:** Error message about file size limit

### Test 3: Stripe Checkout Flow (Test Mode)

**Prerequisites:**
- Test Stripe account configured
- Price IDs set in environment variables
- Webhook endpoint configured

**Steps:**
1. Sign in with test account
2. Navigate to `/pricing`
3. Click "Upgrade to Plus" (Monthly)
4. **Expected:** Redirected to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Complete checkout
7. **Expected:** Redirected to `/dashboard?billing=success`
8. Check dashboard - plan badge should show "Plus"
9. Upload files - should allow up to 200 evidence files
10. Check Supabase `subscriptions` table - should have active record

### Test 4: Webhook Processing

**Steps:**
1. Complete a checkout (from Test 3)
2. Check Vercel logs or Stripe Dashboard → Events
3. **Expected:** Webhook received and processed successfully
4. Check Supabase `subscriptions` table
5. **Expected:** Record updated with:
   - `status = 'active'`
   - `stripe_customer_id` populated
   - `stripe_subscription_id` populated
   - `price_id` matches selected plan
   - `current_period_end` set to future date

### Test 5: Subscription Management Portal

**Prerequisites:**
- Active subscription from Test 3

**Steps:**
1. Navigate to `/settings`
2. Click "Manage Subscription"
3. **Expected:** Redirected to Stripe Customer Portal
4. In portal, cancel subscription
5. **Expected:** Subscription marked to cancel at period end
6. Check Supabase `subscriptions` table
7. **Expected:** `cancel_at_period_end = true`
8. Generate webhook event: `customer.subscription.deleted`
9. **Expected:** Status updated to `canceled`

### Test 6: Plan Limit Enforcement

**Prerequisites:**
- Plus plan subscription active

**Steps:**
1. Upload 200 evidence files (should succeed)
2. Try to upload 201st file
3. **Expected:** Error: "You have reached your plan limit of 200 evidence files"
4. Generate 10 evidence packs in same month (should succeed)
5. Try to generate 11th pack
6. **Expected:** Error: "You have reached your monthly limit of 10 evidence packs"
7. Try to upload file larger than 25MB (Plus plan limit)
8. **Expected:** Error about file size limit

### Test 7: Owner Override Persistence

**Steps:**
1. Sign in as owner (`roscoechisas@gmail.com`)
2. Verify Pro access
3. Delete Stripe webhook secret from environment (simulate broken Stripe)
4. Restart app (or redeploy)
5. Sign in again as owner
6. **Expected:** Still has Pro access (owner override works independently)

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct and publicly accessible
2. Verify webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
3. Check Vercel function logs for errors
4. Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Owner Override Not Working

1. Verify `APP_OWNER_EMAIL` is set correctly (case-insensitive, trimmed)
2. Check email matches exactly (after trimming and lowercasing)
3. Verify `getPlan()` function is being called (check logs)

### Checkout Session Creation Fails

1. Verify `STRIPE_SECRET_KEY` is set
2. Verify price IDs are correct (must match Stripe Dashboard)
3. Check that price IDs are for AUD currency
4. Verify `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` is set for redirects

### Subscription Not Showing in Database

1. Check webhook is receiving events (Stripe Dashboard → Events)
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set (needed for webhook to write)
3. Check RLS policies allow service role to INSERT/UPDATE
4. Check webhook logs for errors

## Security Notes

1. **Owner Override:** Server-side only, cannot be bypassed by client
2. **RLS Policies:** Users can only SELECT their own subscription
3. **Webhook Signature:** All webhooks verified using `STRIPE_WEBHOOK_SECRET`
4. **Service Role Key:** Only used in webhook handler, never exposed to client
5. **Plan Limits:** Enforced server-side in all API routes

## Production Checklist

Before going live:

- [ ] Switch to Stripe live mode
- [ ] Update all price IDs to live mode IDs
- [ ] Update `STRIPE_SECRET_KEY` to live key
- [ ] Update webhook endpoint URL to production domain
- [ ] Update `STRIPE_WEBHOOK_SECRET` to live webhook secret
- [ ] Test full flow in live mode with real card (immediately refund)
- [ ] Verify owner override still works
- [ ] Monitor webhook delivery in Stripe Dashboard
- [ ] Set up error alerts for failed webhooks

## Support

For issues or questions:
- Check Stripe Dashboard → Logs for API errors
- Check Vercel Function Logs for runtime errors
- Verify all environment variables are set correctly
- Test webhook delivery using Stripe Dashboard → Events

