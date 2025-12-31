"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { passwordResetConfirmSchema } from "@/lib/validations";
import { Shield, Loader2, CheckCircle2, XCircle, KeyRound } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  // Password strength indicators
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    // Check if user has a valid session from the reset link
    // Also handle hash fragment tokens (implicit flow)
    async function checkSession() {
      const supabase = createClient();
      
      // Check for hash fragment tokens (implicit flow)
      // Format: #access_token=...&refresh_token=...&type=recovery
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1); // Remove #
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        // If we have a recovery token in the hash, set the session
        if (accessToken && refreshToken && type === 'recovery') {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Error setting session from hash:', error);
              setValidSession(false);
              return;
            }
            
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            setValidSession(!!data.session);
            return;
          } catch (err) {
            console.error('Error processing hash token:', err);
            setValidSession(false);
            return;
          }
        }
      }
      
      // Check for existing session (PKCE flow or already authenticated)
      const { data: { session } } = await supabase.auth.getSession();
      setValidSession(!!session);
    }
    checkSession();
  }, []);

  useEffect(() => {
    // Update password strength indicators
    setPasswordChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate input
      const result = passwordResetConfirmSchema.safeParse({ password, confirmPassword });
      if (!result.success) {
        throw new Error(result.error.errors[0].message);
      }

      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: result.data.password,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Invalid session
  if (!validSession) {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <header className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <div className="bg-primary/20 rounded-lg p-1.5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Tenant Buddy</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-xl bg-card-dark border border-card-lighter p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h1>
              <p className="text-text-subtle text-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/auth/reset-password">
                <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-background-dark font-bold">
                  Request New Link
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <header className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <div className="bg-primary/20 rounded-lg p-1.5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Tenant Buddy</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-xl bg-card-dark border border-card-lighter p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Password Updated</h1>
              <p className="text-text-subtle text-sm mb-6">
                Your password has been successfully updated. Redirecting to dashboard...
              </p>
              <Link href="/dashboard">
                <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-background-dark font-bold">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const allChecksPass = Object.values(passwordChecks).every(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <div className="bg-primary/20 rounded-lg p-1.5">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold">Tenant Buddy</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-xl bg-card-dark border border-card-lighter p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
              <p className="text-text-subtle text-sm">
                Create a strong password for your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="h-11 bg-background-dark border-card-lighter text-white placeholder:text-text-subtle focus:border-primary focus:ring-primary"
                />

                {/* Password strength indicators */}
                <div className="text-xs space-y-1.5 mt-3 p-3 bg-background-dark/50 rounded-lg">
                  <p className="font-medium text-text-subtle mb-2">Password requirements:</p>
                  {[
                    { check: passwordChecks.length, label: "At least 8 characters" },
                    { check: passwordChecks.uppercase, label: "One uppercase letter" },
                    { check: passwordChecks.lowercase, label: "One lowercase letter" },
                    { check: passwordChecks.number, label: "One number" },
                    { check: passwordChecks.special, label: "One special character" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 ${item.check ? "text-green-400" : "text-text-subtle"}`}>
                      {item.check ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-current" />
                      )}
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white text-sm font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="h-11 bg-background-dark border-card-lighter text-white placeholder:text-text-subtle focus:border-primary focus:ring-primary"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Passwords don&apos;t match
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-background-dark font-bold"
                disabled={loading || !allChecksPass || password !== confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
