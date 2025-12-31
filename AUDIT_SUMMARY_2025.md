# Technical Audit Summary - Tenant Buddy
**Date:** January 2025  
**Scope:** Full application audit and README accuracy verification

## 1. AUTHENTICATION & AUTHORIZATION

### ✅ Verified
- **Auth System:** Supabase Auth with email/password
- **Login Flow:** Standard email/password, PKCE flow for SSR
- **Session Management:** Cookie-based via `@supabase/ssr`
- **Password Reset:** Implemented with hash fragment token handling
- **Email Confirmation:** Configurable in Supabase (not enforced by default)

### ⚠️ Findings
- **Owner Account:** `APP_OWNER_EMAIL` is a **billing override only**, NOT an auth bypass
  - Owner still requires valid Supabase account
  - Owner still must authenticate normally
  - Owner gets Pro plan entitlements regardless of Stripe subscription
- **No Admin System:** No admin panel, no admin role, no user management
- **No 2FA:** Single-factor authentication only
- **Diagnostic Logging:** Debug logs present in `app/auth/login/page.tsx` (lines 56-77) - should be removed

### 🔴 Risks
- **Password Reset Redirect:** Supabase Site URL may be set to `localhost:3000` causing production redirect issues
- **No Session Timeout:** Sessions persist indefinitely until explicit logout

## 2. ENVIRONMENTS & DEPLOYMENT

### ✅ Verified
- **Environments:** Local development + Vercel production
- **Environment Variables:** Extensive list (15+ required vars)
- **Deployment:** Vercel with GitHub Actions CI/CD

### ⚠️ Findings
- **No Environment Separation:** No documented staging/preview environment strategy
- **Supabase Project Alignment:** Critical risk - production must use correct Supabase project
  - Current production: `begwrcefmrijlxpfvoer` (Tenant Rights Tracker)
  - Wrong project = users can't authenticate, data mismatch
- **Diagnostic Endpoint:** `/api/debug/supabase` exists and exposes configuration - should be removed or gated

### 🔴 Risks
- **Environment Drift:** Many env vars, easy to misconfigure
- **Multiple Vercel Projects:** Risk of deploying to wrong project with wrong Supabase config
- **Service Role Key Exposure:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - must never be exposed to client
- **Stripe Keys:** Test vs Live keys must match environment

## 3. DATA & SECURITY

### ✅ Verified
- **RLS Policies:** All tables have RLS enabled with proper `WITH CHECK` clauses
- **Evidence Integrity:** 
  - SHA-256 hashing on upload
  - Database triggers prevent modification of: `sha256`, `file_path`, `uploaded_at`, `occurred_at`, `user_id`, `property_id`, `issue_id`
  - Only `note`, `category`, `room`, `type` can be updated
- **Cross-Table Consistency:** Triggers enforce `evidence_items` and `comms_logs` match issue ownership
- **Severity Protection:** Severity can only escalate (Low → Medium → High → Urgent), never downgrade
- **File Validation:** Magic byte verification, MIME type checking, size limits
- **Storage Security:** Private buckets, RLS policies, signed URLs

### ⚠️ Findings
- **Storage Update Policy:** Migration `005_remove_update_policy_and_secure_buckets.sql` documents need to manually remove UPDATE policy on evidence bucket (not automated)
- **No Audit Logging:** No centralized audit trail of who accessed what
- **Rate Limiting:** Fails open if Upstash Redis unavailable (allows all requests)

### 🔴 Risks
- **Evidence Immutability:** If storage UPDATE policy not removed, files could be silently replaced
- **No Backup Strategy:** No documented backup/restore procedure
- **Service Role Key:** If exposed, bypasses all security

## 4. CORE PRODUCT FLOWS

### ✅ Verified
- **Issue Creation:** Implemented, links to properties
- **Evidence Upload:** Implemented with validation, SHA-256 hashing, file type checking
- **Communications Logging:** Implemented with direction tracking (inbound/outbound)
- **Evidence Pack Generation:** 
  - Two modes: Concise (5-page hard cap) and Detailed (unlimited)
  - PDFKit-based server-side generation
  - Includes logo, cover page, chronology, evidence index
  - State-specific tribunal names (reference only)
- **Pack Readiness Scoring:** Calculates score based on evidence coverage, communications, urgency

### ⚠️ Findings
- **Limit Enforcement Gaps:**
  - Evidence pack limits: ✅ Enforced (monthly count checked)
  - Properties limit: ❌ NOT enforced in API (only UI warning)
  - Issues limit: ❌ NOT enforced in API (only UI warning)
  - Evidence files limit: ❌ NOT enforced in API (only UI check endpoint exists)
- **Missing Communications Impact:** Pack readiness warns about missing comms but doesn't prevent pack generation
- **Case Health:** Calculated but not enforced - users can generate packs with weak cases

### 🔴 Risks
- **Plan Limits Not Enforced:** Free users can exceed limits via direct API calls
- **Evidence Completeness:** No requirement that evidence exists before pack generation
- **No Validation:** Users can generate packs with no evidence, no communications

## 5. PDF / EVIDENCE PACK

### ✅ Verified
- **PDF Generation:** PDFKit server-side
- **Logo:** Included (160px width, mono-dark version)
- **Modes:** Concise (5 pages max) and Detailed (unlimited)
- **Content:** Cover page, index, chronology table, evidence details, case facts
- **Disclaimers:** Present in PDF (state-specific reference disclaimers)

### ⚠️ Findings
- **Logo Path:** Hardcoded to `public/Branding/logo-mono-dark.png` (case-sensitive, must exist)
- **Page Limits:** Concise mode enforces 5-page limit, truncates issues if needed
- **Image Embedding:** Images are embedded in PDF (increases file size)
- **No Watermarking:** No tamper-evident features beyond SHA-256

### 🔴 Risks
- **Logo Missing:** If logo file missing, PDF still generates but without branding
- **Large PDFs:** Detailed mode with many images can create very large files
- **No PDF Signing:** PDFs are not cryptographically signed

## 6. LIMITS, PLANS, & ACCESS

### ✅ Verified
- **Plan System:** Free, Plus, Pro with defined limits
- **Owner Override:** `APP_OWNER_EMAIL` gets Pro access regardless of Stripe
- **Stripe Integration:** Webhook-based subscription management
- **Plan Resolution:** Single source of truth in `lib/billing/get-plan.ts`

### ⚠️ Findings
- **Limit Enforcement Incomplete:**
  - ✅ Evidence packs per month: Enforced
  - ❌ Properties limit: Not enforced (UI only)
  - ❌ Issues limit: Not enforced (UI only)
  - ❌ Evidence files limit: Check endpoint exists but not enforced on upload
- **File Size Limits:** Plan-based (Free: 10MB, Plus: 25MB, Pro: 50MB, Owner: 100MB) - enforced in validation
- **Storage Limits:** Defined but not enforced (no cleanup, no blocking)

### 🔴 Risks
- **Free Tier Abuse:** Users can exceed limits via API
- **Storage Costs:** No enforcement of storage limits could lead to unbounded costs
- **Stripe Webhook Failures:** If webhook fails, subscription state may drift

## 7. UX & RELIABILITY

### ✅ Verified
- **Error Handling:** Centralized, no stack traces exposed
- **Rate Limiting:** Implemented with proper headers
- **Mobile Responsive:** Tailwind-based responsive design

### ⚠️ Findings
- **Silent Failures:** Rate limiting fails open (allows requests if Redis down)
- **Misleading Messages:** "Invalid email or password" doesn't distinguish between wrong password vs unconfirmed email
- **Password Reset:** Redirect URL may point to localhost in production
- **Diagnostic Code:** Debug logging and endpoints present in production code

### 🔴 Risks
- **User Confusion:** Generic error messages hide real issues
- **Debug Exposure:** Diagnostic endpoint exposes internal configuration
- **Rate Limit Bypass:** If Redis unavailable, no rate limiting occurs

## 8. TECHNICAL DEBT

### High Priority
1. **Remove Diagnostic Code:**
   - `app/auth/login/page.tsx` lines 56-77 (debug logging)
   - `lib/supabase/server.ts` lines 8-10 (debug logging)
   - `app/api/debug/supabase/route.ts` (entire file)

2. **Enforce Plan Limits:**
   - Add API enforcement for properties limit
   - Add API enforcement for issues limit
   - Add API enforcement for evidence files limit

3. **Fix Password Reset:**
   - Update Supabase Site URL to production URL
   - Verify redirect URLs configured

### Medium Priority
4. **Storage Policy:** Manually verify UPDATE policy removed from evidence bucket
5. **Error Messages:** Improve specificity (wrong password vs unconfirmed email)
6. **Rate Limiting:** Add fallback rate limiting when Redis unavailable

### Low Priority
7. **Audit Logging:** Add centralized audit trail
8. **Session Timeout:** Implement session expiration
9. **Backup Strategy:** Document backup/restore procedures

## SUMMARY

**Strengths:**
- Strong evidence integrity (SHA-256, immutability triggers)
- Comprehensive RLS policies
- Good file validation
- Solid PDF generation

**Weaknesses:**
- Plan limits not fully enforced
- Diagnostic code in production
- Environment configuration risks
- No audit logging

**Critical Actions:**
1. Remove diagnostic code
2. Enforce plan limits in API
3. Verify Supabase Site URL configuration
4. Document environment separation strategy

