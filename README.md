# Tenant Buddy

An evidence organisation tool for Australian renters. Log tenancy issues, organise your evidence, and generate Evidence Packs for your records.

## Important Notice

**This application is an evidence organisation tool only.** It does not:
- Provide legal advice
- Assess your situation or rights
- Predict outcomes
- Replace professional legal advice

Always consult with a qualified legal professional or your local Tenants' Union for advice about your specific situation.

## Overview

Tenant Buddy helps you keep organised records of your tenancy. Whether you're dealing with maintenance issues or want to maintain good documentation, this app provides tools to organise your evidence and communications.

## Features

### Core Features

- **Issue Tracking**: Log and track maintenance requests and tenancy issues with status management
- **Evidence Vault**: Upload photos, PDFs, screenshots, and documents with integrity verification (SHA-256 hashing)
- **Communications Log**: Record interactions with landlords, agents, and property managers
- **Evidence Pack Generator**: Create PDF bundles with chronology and evidence index
- **State-Based Labels**: Headings and labels adapt to your state/territory (for reference only)
- **Expense Tracking**: Document expenses with receipt uploads

### Optional Features (Advanced)

These features are OFF by default and must be explicitly enabled:

- **Evidence Completeness Check**: Checklist-style review of what information has been entered (does NOT provide legal assessment)
- **Communication Draft Helper**: Plain-language message drafts (NOT legal documents)

### Security Features

- **Row Level Security (RLS)**: All data is isolated per user at the database level
- **Cryptographic Verification**: SHA-256 hashes ensure file integrity
- **File Validation**: Magic byte verification prevents malicious file uploads
- **Rate Limiting**: Protection against abuse with Redis-backed rate limiting
- **Secure Authentication**: Email/password auth with strong password requirements
- **Password Reset Flow**: Secure password recovery via email

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router, TypeScript) |
| **Styling** | TailwindCSS + shadcn/ui components |
| **Database** | Supabase PostgreSQL with RLS |
| **Authentication** | Supabase Auth |
| **Storage** | Supabase Storage (encrypted at rest) |
| **PDF Generation** | PDFKit (server-side) |
| **Validation** | Zod schemas |
| **Rate Limiting** | Upstash Redis (production) / In-memory (dev) |
| **Error Monitoring** | Sentry (optional) |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm, npm, or yarn
- Supabase account ([supabase.com](https://supabase.com))
- Vercel account for deployment ([vercel.com](https://vercel.com))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd tenant-buddy

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
```

### Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values. Required variables:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required - Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_test_... (test mode) or sk_live_... (production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
STRIPE_PRICE_PLUS_MONTHLY=price_... (create in Stripe Dashboard)
STRIPE_PRICE_PLUS_YEARLY=price_... (create in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_... (create in Stripe Dashboard)
STRIPE_PRICE_PRO_YEARLY=price_... (create in Stripe Dashboard)

# Required - Owner Override
APP_OWNER_EMAIL=roscoechisas@gmail.com

# Recommended - Rate Limiting (Production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional - Error Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Optional - AI Features (OFF by default)
ENABLE_AI_FEATURES=false
ANTHROPIC_API_KEY=your_anthropic_api_key

```

See `.env.example` for all available variables with descriptions.

### Database Setup

1. Create a new Supabase project
2. Run the migrations in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually run in SQL Editor:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_expenses_and_deadlines.sql
# 3. supabase/migrations/003_storage_rls.sql
```

3. Create storage buckets:
   - `evidence` - For evidence files
   - `receipts` - For expense receipts

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
tenant-buddy/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── evidence-packs/       # PDF generation endpoint
│   │   └── health/               # Health check endpoint
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main dashboard
│   ├── issues/                   # Issue management
│   ├── evidence/                 # Evidence vault
│   ├── comms/                    # Communications log
│   ├── evidence-packs/           # Evidence pack management
│   ├── onboarding/               # New user onboarding
│   └── settings/                 # User settings
├── components/                   # React components
│   └── ui/                       # shadcn/ui components
├── lib/                          # Utilities and helpers
│   ├── supabase/                 # Supabase client configuration
│   ├── database.types.ts         # TypeScript database types
│   ├── validations.ts            # Zod validation schemas
│   ├── state-rules.ts            # State-based labels (reference only)
│   ├── pdf-generator.ts          # Evidence pack PDF generation
│   ├── file-validation.ts        # File upload security
│   ├── rate-limit.ts             # Rate limiting implementation
│   ├── api-error-handler.ts      # Centralised error handling
│   ├── error-reporting.ts        # Error monitoring integration
│   ├── ai-letter-generator.ts    # Communication draft helper
│   └── case-strength-analyzer.ts # Evidence completeness check
├── supabase/
│   └── migrations/               # Database migrations
├── __tests__/                    # Jest unit tests
├── e2e/                          # Playwright E2E tests
└── .github/
    └── workflows/
        └── ci.yml                # CI/CD pipeline
```

## API Reference

### Health Check

```
GET /api/health
```

Returns application health status including database and storage connectivity.

### Evidence Pack Generation

```
POST /api/evidence-packs/generate
```

Generates a PDF evidence pack for a specific issue.

**Rate Limit:** 3 requests per minute

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with state preference |
| `properties` | Rental properties |
| `issues` | Tenancy issues |
| `evidence_items` | Uploaded evidence files |
| `comms_logs` | Communication records |
| `expense_items` | Expense tracking |
| `deadlines` | Important dates |
| `evidence_pack_runs` | Generated evidence pack history |
| `generated_letters` | Communication drafts |
| `case_analyses` | Evidence completeness checks |

All tables have Row Level Security (RLS) enabled.

## Testing

```bash
# Run all unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type checking
npx tsc --noEmit

# Linting
pnpm lint
```

## Deployment

### Automated (Recommended)

The included GitHub Actions workflow automatically:
1. Runs linting and type checks
2. Runs unit tests
3. Builds the application
4. Deploys to Vercel on push to `main`

Configure these secrets in GitHub:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Post-Deployment Checklist

- [ ] Verify Supabase migrations are applied
- [ ] Create storage buckets (`evidence`, `receipts`)
- [ ] Apply storage RLS policies
- [ ] Configure Upstash Redis for rate limiting
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Test PDF generation

## Security

### Data Protection

- **Row Level Security**: Database-level isolation per user
- **Encrypted Storage**: Files encrypted at rest in Supabase Storage
- **SHA-256 Hashing**: File integrity verification
- **Signed URLs**: Temporary, authenticated file access

### Authentication

- Strong password requirements
- Secure password reset flow
- Session management via Supabase Auth
- Open redirect protection

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Default | 60/minute |
| Authentication | 5/minute |
| Evidence Packs | 3/minute |
| File Uploads | 10/minute |
| AI Features | 5/minute |

## Configuration

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_AI_FEATURES` | `false` | Enable AI-powered features (communication drafts) |

AI features are OFF by default and must be explicitly enabled in environment variables.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `UPSTASH_REDIS_REST_URL` | Recommended | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash Redis token |
| `SENTRY_DSN` | Optional | Sentry error tracking DSN |
| `ENABLE_AI_FEATURES` | Optional | Enable AI features (default: false) |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for AI features |

### File Upload Limits

| Type | Max Size | Formats |
|------|----------|---------|
| Photo | 10MB | JPEG, PNG, WebP, HEIC |
| PDF | 25MB | PDF |
| Screenshot | 10MB | JPEG, PNG, WebP |
| Document | 25MB | PDF, DOC, DOCX, TXT |

## State/Territory Reference

The app includes reference information for Australian states and territories. This information is for labels and headings only.

| State | Tribunal (Reference) |
|-------|---------------------|
| VIC | VCAT |
| NSW | NCAT |
| QLD | QCAT |
| WA | SAT |
| SA | SACAT |
| TAS | RTT |
| ACT | ACAT |
| NT | NTCAT |

**Important:** This information is general and may not apply to your specific situation. Always verify with official sources.

## Disclaimer

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - All rights reserved

---

Built for Australian renters. An independent record-keeping tool.
