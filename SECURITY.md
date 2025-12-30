# Security Documentation

## Threat Model Summary

Tenant Rights Tracker handles sensitive tenant data including:
- Personal information (email, addresses)
- Legal documents and evidence
- Communication logs
- Property and tenancy details

### Threat Categories

1. **Unauthorized Data Access**: Users accessing other users' data
2. **Data Breach**: Database or storage compromise
3. **File Upload Attacks**: Malicious file uploads
4. **Authentication Bypass**: Unauthorized account access
5. **Rate Limiting Bypass**: DoS attacks
6. **XSS/Injection**: Code injection through user input

## Security Measures Implemented

### 1. Row Level Security (RLS)

**All database tables have RLS enabled** with policies ensuring users can only access their own data.

**Implementation**:
- Every table has policies checking `auth.uid() = user_id`
- Policies are enforced at the database level, not application level
- No service role key is exposed to the client

**Example Policy**:
```sql
CREATE POLICY "Users can view own issues"
ON issues FOR SELECT
USING (auth.uid() = user_id);
```

**Tables Protected**:
- `profiles`
- `properties`
- `issues`
- `evidence_items`
- `comms_logs`
- `evidence_pack_runs`

### 2. Authentication & Authorization

- **Supabase Auth**: Industry-standard authentication
- **Session Management**: Secure cookie-based sessions
- **Password Requirements**: Minimum 8 characters (enforced by Zod)
- **Email Verification**: Can be enabled in Supabase dashboard

### 3. Input Validation

**Zod Schemas**: All user inputs are validated with Zod schemas before processing:

- Email format validation
- Password strength requirements
- UUID validation for IDs
- Date format validation
- String length limits
- Enum validation for state/channel/type fields

**Server-Side Validation**: Validation happens on the server, not just client-side.

### 4. File Upload Security

**Storage Policies**:
- Files stored in private Supabase Storage bucket
- Users can only upload to their own folder (`user_id/`)
- Users can only access their own files
- Signed URLs used for file access (time-limited)

**File Validation**:
- File type restrictions (images, PDFs)
- File size limits (handled by Supabase, default 50MB)
- SHA256 hashing for integrity verification

### 5. Rate Limiting

**Implementation**: In-memory rate limiting (MVP)
- 10 requests per minute per IP address
- Applied to all write endpoints
- Returns 429 status when limit exceeded

**Production Upgrade**: Should migrate to Upstash Redis or similar for:
- Distributed rate limiting
- Persistence across server restarts
- More sophisticated rate limiting strategies

### 6. Security Headers

Configured in `next.config.js`:

- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restricts camera, microphone, geolocation

### 7. SQL Injection Prevention

- **Parameterized Queries**: Supabase client uses parameterized queries
- **No Raw SQL**: No user input directly in SQL strings
- **Type Safety**: TypeScript helps prevent SQL injection

### 8. XSS Prevention

- **React Escaping**: React automatically escapes user input
- **Sanitization**: User-provided strings in PDFs are sanitized
- **Content Security Policy**: Can be added for additional protection

### 9. Data Encryption

- **In Transit**: HTTPS/TLS (enforced by Vercel)
- **At Rest**: Supabase encrypts database and storage
- **Sensitive Fields**: Consider encrypting sensitive notes/descriptions

### 10. Audit Trails

- **Timestamps**: All tables have `created_at` and `updated_at`
- **SHA256 Hashing**: Evidence items include SHA256 hash for integrity
- **Immutable Records**: Evidence items are append-only (no updates/deletes in MVP)

## Security Best Practices for Developers

### Environment Variables

- **Never commit** `.env` files
- Use `.env.local` for local development
- Use Vercel environment variables for production
- Rotate keys regularly

### Service Role Key

- **Never expose** to client-side code
- Only use in server-side API routes
- Store securely in environment variables

### Code Review

- Review all database queries for RLS compliance
- Verify all inputs are validated
- Check file upload handlers
- Review authentication flows

### Dependency Management

- Keep dependencies up to date
- Use `pnpm audit` to check for vulnerabilities
- Review security advisories

## Known Security Limitations (MVP)

1. **Rate Limiting**: In-memory, not distributed
2. **No 2FA**: Single-factor authentication only
3. **No Audit Logging**: No centralized audit log
4. **Basic File Validation**: Limited file type checking
5. **No Content Security Policy**: CSP not fully implemented
6. **No WAF**: No Web Application Firewall

## Recommendations for Production

1. **Implement 2FA**: Add two-factor authentication
2. **Upgrade Rate Limiting**: Use Redis-based rate limiting
3. **Add WAF**: Implement Web Application Firewall (Vercel Pro)
4. **Enhanced Logging**: Centralized logging with error tracking (Sentry)
5. **Regular Security Audits**: Schedule periodic security reviews
6. **Penetration Testing**: Conduct security testing before launch
7. **Backup Strategy**: Regular database backups
8. **Incident Response Plan**: Document response procedures
9. **GDPR Compliance**: If serving EU users, ensure GDPR compliance
10. **Privacy Policy**: Add comprehensive privacy policy

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to the development team
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Compliance Considerations

### Australian Privacy Principles (APP)

- **Data Collection**: Only collect necessary data
- **Data Storage**: Secure storage with encryption
- **Data Access**: Users can export their data
- **Data Deletion**: Users can delete their account

### Legal Information vs Advice

- Application provides **legal information** only
- Clear disclaimers throughout the app
- No legal advice provided
- Users directed to Tenants' Unions for advice

## Security Checklist

Before production launch:

- [ ] All RLS policies verified
- [ ] Environment variables secured
- [ ] Service role key not exposed
- [ ] File upload security tested
- [ ] Rate limiting functional
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] Authentication flow tested
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enforced
- [ ] Dependencies audited
- [ ] Security documentation reviewed

## Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Australian Privacy Principles](https://www.oaic.gov.au/privacy/australian-privacy-principles/)

