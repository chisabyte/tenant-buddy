# Tenant Buddy

An evidence organisation tool for Australian renters. Log tenancy issues, organise your evidence, and generate Evidence Packs for your records.

## Important Notice

**This application is an evidence organisation tool only.** It does not:
- Provide legal advice
- Assess your situation or rights
- Predict outcomes
- Replace professional legal advice

Always consult with a qualified legal professional or your local Tenants' Union for advice about your specific situation.

## Project Overview

### What This App Does

Tenant Buddy helps Australian renters maintain organised records of their tenancy. You can:
- Log maintenance requests and tenancy issues
- Upload and organise evidence (photos, documents, PDFs)
- Record communications with landlords/agents
- Generate PDF Evidence Packs with chronology and evidence index
- Track expenses with receipt uploads

### What This App Is NOT

- **Not a legal advisor:** Does not assess your rights or provide legal advice
- **Not a case predictor:** Does not predict tribunal outcomes
- **Not a replacement for professional help:** Always consult qualified legal professionals
- **Not a guarantee:** Evidence completeness does not guarantee legal merit

### Who It Is For

- Australian renters who want to maintain organised records
- Tenants dealing with maintenance issues or disputes
- Users who need to generate documentation for tribunal submissions

## Core Features

### ✅ Implemented Features

1. **Issue Tracking**
   - Create and manage tenancy issues
   - Link issues to properties
   - Status management (open, in_progress, resolved, closed)
   - Severity classification (Low, Medium, High, Urgent)
   - Severity can only escalate (never downgrade) for legal defensibility

2. **Evidence Vault**
   - Upload photos, PDFs, screenshots, documents
   - SHA-256 cryptographic hashing for integrity verification
   - File type validation (magic byte verification)
   - Immutable audit trail (upload timestamp, hash, file path cannot be modified after upload)
   - Metadata capture (category, room, notes, date occurred)

3. **Communications Log**
   - Manual entry of communications
   - Direction tracking (inbound/outbound)
   - Channel tracking (email, phone, SMS, in-person, letter, app, other)
   - Date/time stamping
   - Link to issues

4. **Evidence Pack Generator (PDF)**
   - Two modes: Concise (5-page hard cap) and Detailed (unlimited)
   - Server-side PDF generation using PDFKit
   - Includes: Cover page, evidence index, chronology table, case facts
   - State-specific tribunal names (reference information only)
   - Pack readiness scoring (evaluates evidence coverage, communications, urgency)
   - Case health calculation (assesses documentation completeness)

5. **Expense Tracking**
   - Document expenses with receipt uploads
   - Link to issues/properties
   - Reimbursement status tracking
   - Multiple expense categories

6. **Security & Privacy**
   - Row Level Security (RLS) - database-level user isolation
   - Encrypted file storage (Supabase Storage)
   - Cryptographic file integrity (SHA-256)
   - Rate limiting (Upstash Redis in production, in-memory fallback)

### ⚠️ Optional Features (Disabled by Default)

- **AI Communication Drafts:** Requires `ENABLE_AI_FEATURES=true` and `ANTHROPIC_API_KEY`
- **Evidence Completeness Check:** Checklist-style review (NOT legal assessment)

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router, TypeScript) |
| **Styling** | TailwindCSS + shadcn/ui components |
| **Database** | Supabase PostgreSQL with RLS |
| **Authentication** | Supabase Auth (email/password) |
| **Storage** | Supabase Storage (encrypted at rest) |
| **PDF Generation** | PDFKit (server-side) |
| **Validation** | Zod schemas |
| **Rate Limiting** | Upstash Redis (production) / In-memory (dev) |
| **Error Monitoring** | Sentry (optional) |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel |
| **Payments** | Stripe (subscriptions) |

## Authentication & Environments

### How Authentication Works

- **System:** Supabase Auth with email/password
- **Flow:** PKCE flow for server-side rendering
- **Session Management:** Cookie-based via `@supabase/ssr`
- **Password Requirements:** Minimum 8 characters (enforced by Zod)
- **Email Confirmation:** Configurable in Supabase dashboard (not enforced by default)
- **Password Reset:** Email-based with hash fragment token handling

### ⚠️ Critical: Owner Account

The `APP_OWNER_EMAIL` environment variable is a **billing override only**, NOT an authentication bypass:
- Owner must still create a valid Supabase account
- Owner must authenticate normally (email/password)
- Owner receives Pro plan entitlements regardless of Stripe subscription
- Owner does NOT bypass any security or authentication checks

### Environment Separation

**Current Setup:**
- **Local Development:** Uses `.env.local` file
- **Production:** Vercel environment variables

**⚠️ Critical Risks:**

1. **Supabase Project Alignment**
   - Production MUST use the correct Supabase project
   - Wrong project = users cannot authenticate, data mismatch
   - Current production project: `begwrcefmrijlxpfvoer` (Tenant Rights Tracker)
   - Verify `NEXT_PUBLIC_SUPABASE_URL` matches intended project

2. **Environment Variable Drift**
   - 15+ required environment variables
   - Easy to misconfigure between environments
   - Stripe keys must match environment (test vs live)
   - Service role key must NEVER be exposed to client

3. **Multiple Vercel Projects**
   - Risk of deploying to wrong project with wrong Supabase config
   - Always verify environment variables after deployment

### Common Pitfalls

- **Password Reset Redirects to Localhost:** Supabase Site URL must be set to production URL in Supabase Dashboard
- **Wrong Supabase Project:** Verify `NEXT_PUBLIC_SUPABASE_URL` in production matches intended project
- **Service Role Key Exposure:** If exposed, bypasses all RLS - rotate immediately
- **Stripe Test vs Live Keys:** Must match environment (test keys in production = payments fail)

## Evidence Integrity & Limitations

### What IS Enforced

✅ **Evidence Immutability:**
- SHA-256 hash calculated on upload
- Database triggers prevent modification of: `sha256`, `file_path`, `uploaded_at`, `occurred_at`, `user_id`, `property_id`, `issue_id`
- Only `note`, `category`, `room`, `type` can be updated after upload

✅ **Cross-Table Consistency:**
- Evidence items must reference issues owned by same user
- Communications must reference issues owned by same user
- Enforced via database triggers

✅ **Severity Protection:**
- Severity can only escalate (Low → Medium → High → Urgent)
- Never downgrade (ensures legal defensibility)

✅ **File Validation:**
- Magic byte verification (prevents MIME type spoofing)
- File size limits (plan-based: Free 10MB, Plus 25MB, Pro 50MB, Owner 100MB)
- File type checking
- Safe filename generation

### What Is NOT Enforced

❌ **Plan Limits (Partial Enforcement):**
- ✅ Evidence packs per month: Enforced
- ❌ Properties limit: NOT enforced in API (UI warning only)
- ❌ Issues limit: NOT enforced in API (UI warning only)
- ❌ Evidence files limit: Check endpoint exists but NOT enforced on upload

❌ **Evidence Completeness:**
- No requirement that evidence exists before pack generation
- Users can generate packs with no evidence, no communications
- Pack readiness scoring is advisory only (does not block generation)

❌ **Storage Limits:**
- Defined in plans but not enforced (no cleanup, no blocking)
- Could lead to unbounded storage costs

### Explicit Disclaimers

**Evidence Integrity:**
- SHA-256 hashing provides file integrity verification
- Immutability triggers prevent tampering with critical fields
- However, this does NOT guarantee legal admissibility or merit

**Legal Advice:**
- This tool does NOT provide legal advice
- Evidence completeness does NOT guarantee favorable outcomes
- Always consult qualified legal professionals

**Tribunal Readiness:**
- Pack readiness scoring is advisory only
- Case health calculation does not predict outcomes
- State-specific tribunal names are reference information only

## Deployment & Setup

### Required Environment Variables

**Supabase (Required):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Stripe (Required for subscriptions):**
```env
STRIPE_SECRET_KEY=sk_test_... (test) or sk_live_... (production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
STRIPE_PRICE_PLUS_MONTHLY=price_... (create in Stripe Dashboard)
STRIPE_PRICE_PLUS_YEARLY=price_... (create in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_... (create in Stripe Dashboard)
STRIPE_PRICE_PRO_YEARLY=price_... (create in Stripe Dashboard)
```

**Owner Override (Required):**
```env
APP_OWNER_EMAIL=your-email@example.com
```

**Rate Limiting (Recommended for production):**
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Optional:**
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
ENABLE_AI_FEATURES=false
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### How to Deploy Safely

1. **Verify Supabase Project:**
   - Confirm `NEXT_PUBLIC_SUPABASE_URL` points to correct project
   - Verify migrations are applied
   - Check storage buckets exist (`evidence`, `receipts`)

2. **Configure Supabase:**
   - Set Site URL to production URL (prevents localhost redirects)
   - Add production URL to Redirect URLs
   - Verify email templates are configured

3. **Set Environment Variables in Vercel:**
   - Never commit `.env.local` to git
   - Use Vercel environment variables for production
   - Verify all required variables are set

4. **Verify Storage Policies:**
   - Evidence bucket: SELECT, INSERT, DELETE (NO UPDATE policy)
   - Receipts bucket: SELECT, INSERT, UPDATE, DELETE
   - Both buckets must be private (not public)

5. **Test Critical Flows:**
   - Authentication (signup, login, password reset)
   - File uploads
   - PDF generation
   - Plan limit enforcement (evidence packs)

### How to Avoid Auth/Environment Drift

- **Document Supabase Project:** Keep track of which project is production
- **Verify After Deployment:** Check `/api/debug/supabase` (then remove this endpoint)
- **Use Environment-Specific Keys:** Never mix test/live Stripe keys
- **Rotate Keys Regularly:** Especially if `.env.local` was ever committed to git

## Known Limitations / Risks

### Technical Debt

1. **Diagnostic Code in Production:**
   - Debug logging in `app/auth/login/page.tsx` (should be removed)
   - Debug endpoint `/api/debug/supabase` (should be removed or gated)

2. **Incomplete Limit Enforcement:**
   - Properties, issues, and evidence files limits not enforced in API
   - Free tier users can exceed limits via direct API calls

3. **Rate Limiting Fails Open:**
   - If Upstash Redis unavailable, rate limiting is bypassed
   - Falls back to allowing all requests

### Product Limitations

1. **Missing Communications Impact:**
   - Pack readiness warns about missing communications
   - Does not prevent pack generation
   - Users can generate packs with no communications logged

2. **Evidence Completeness vs Legal Merit:**
   - Pack readiness scoring is advisory only
   - High readiness score does not guarantee legal merit
   - No validation that evidence is relevant or admissible

3. **No Validation Requirements:**
   - Users can generate packs with no evidence
   - Users can generate packs with no communications
   - No requirement that issues have sufficient documentation

### Security Considerations

1. **No Audit Logging:**
   - No centralized audit trail of data access
   - Cannot track who accessed what data

2. **No Session Timeout:**
   - Sessions persist indefinitely until explicit logout
   - No automatic expiration

3. **Service Role Key Risk:**
   - If exposed, bypasses all RLS policies
   - Must never be exposed to client
   - Rotate immediately if exposed

## License / Disclaimer

**This application is an evidence organisation tool only.**

It helps you:
- Keep records of tenancy issues
- Organise evidence and documents
- Generate PDF bundles of your documentation

It does NOT:
- Provide legal advice
- Assess your legal rights or entitlements
- Predict outcomes
- Replace professional advice

**Always consult with:**
- A qualified legal professional
- Your local Tenants' Union
- Your state's Consumer Affairs office

For specific advice regarding your tenancy situation.

**Proprietary - All rights reserved**

---

Built for Australian renters. An independent record-keeping tool.
