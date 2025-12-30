# Deployment Guide

This guide walks you through deploying Tenant Rights Tracker to production.

## Prerequisites

- Supabase account and project
- Vercel account (or alternative hosting)
- GitHub repository (for Vercel integration)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and API keys (you'll need these later)

### 1.2 Run Database Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Option B: Manual SQL Execution**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Execute the SQL

### 1.3 Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Click "New bucket"
3. Name: `evidence`
4. Set to **Private**
5. Click "Create bucket"

### 1.4 Set Up Storage Policies

Run this SQL in the Supabase SQL Editor:

```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload own evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view own evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 2: Vercel Deployment

### 2.1 Prepare Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/your-username/tenant-rights-tracker.git
git push -u origin main
```

### 2.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `pnpm build` (or `npm run build`)
   - **Output Directory**: `.next` (default)

### 2.3 Add Environment Variables

In Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: 
- Never commit these keys to your repository
- Use Vercel's environment variable interface
- Set different values for Production, Preview, and Development environments if needed

### 2.4 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 3: Post-Deployment Verification

### 3.1 Test Authentication

1. Visit your deployed app
2. Try signing up with a test email
3. Verify email confirmation works (if enabled)
4. Test login flow

### 3.2 Test Core Features

- [ ] Create a property (onboarding)
- [ ] Create an issue
- [ ] Upload evidence file
- [ ] Log a communication
- [ ] Generate evidence pack PDF

### 3.3 Verify Security

- [ ] Test that users can't access other users' data
- [ ] Verify file uploads are private
- [ ] Check that RLS policies are working

### 3.4 Performance Check

- [ ] Run Lighthouse audit
- [ ] Test on mobile device
- [ ] Check page load times

## Step 4: Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

## Step 5: Monitoring & Maintenance

### 5.1 Set Up Error Tracking (Optional)

1. Create Sentry account
2. Add `SENTRY_DSN` to environment variables
3. Configure Sentry in your app

### 5.2 Set Up Analytics (Optional)

- Add Google Analytics or similar
- Track user behavior and errors

### 5.3 Regular Maintenance

- Monitor Supabase usage and costs
- Review error logs
- Update dependencies regularly
- Backup database periodically

## Troubleshooting

### Build Fails

- Check build logs in Vercel
- Verify all environment variables are set
- Ensure dependencies are installed correctly

### Database Connection Issues

- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Verify RLS policies are set up correctly

### File Upload Fails

- Verify storage bucket exists
- Check storage policies are correct
- Verify file size limits (Supabase default: 50MB)

### Authentication Issues

- Check Supabase Auth settings
- Verify email templates are configured
- Check redirect URLs in Supabase dashboard

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Storage bucket created with policies
- [ ] RLS policies verified
- [ ] Authentication tested
- [ ] File uploads working
- [ ] PDF generation working
- [ ] Mobile responsiveness verified
- [ ] Error tracking set up
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Backup strategy in place

## Scaling Considerations

As your user base grows:

1. **Database**: Monitor Supabase usage, upgrade plan if needed
2. **Storage**: Monitor evidence file storage, implement cleanup policies
3. **Rate Limiting**: Migrate from in-memory to Redis (Upstash)
4. **CDN**: Consider adding CDN for static assets
5. **Caching**: Implement caching strategy for frequently accessed data

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review error messages
4. Consult documentation for Next.js, Supabase, and Vercel

