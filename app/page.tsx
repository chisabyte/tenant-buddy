import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { BrandLogo } from "@/components/brand-logo";
import { FileText, Lock, CheckCircle2, Clock, Upload, FolderOpen, Info, Calendar, CloudUpload, Download, Handshake, Home, Eye, Folder } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <PublicNav />

      <main className="flex flex-col flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-24 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                  <Info className="h-4 w-4" />
                  Not legal advice. Evidence organisation only.
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Missing records can cost you your bond—or weaken your case.
                </h1>
                <p className="text-lg text-muted-foreground sm:text-xl">
                  Build a documented timeline and evidence-ready pack designed to help you present a clear record for disputes or tribunal preparation.
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Button asChild size="lg" className="h-12 px-6 text-base font-bold shadow-lg shadow-primary/20">
                    <Link href="/auth/signup">Create Your Evidence Pack</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base font-bold">
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Private by default. You control your records.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Free to start</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Private by default</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Secure & confidential</span>
                  </div>
                </div>
              </div>
              <div className="relative lg:ml-auto w-full max-w-[600px]">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl border border-border bg-muted">
                  <Image
                    src="/images/hero-evidence-pack.png"
                    alt="Evidence Pack PDF preview showing table of contents, issue timeline, and evidence index"
                    fill
                    className="object-cover rounded-2xl"
                    priority
                    sizes="(max-width: 1024px) 100vw, 600px"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preview Section */}
        <section className="bg-card py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-muted p-8 md:p-12 lg:p-16 border border-border shadow-sm">
              <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">Evidence Pack Preview</h2>
                  <p className="text-lg text-muted-foreground">
                    Your Evidence Pack is a professional, evidence-ready PDF with a documented timeline of your tenancy records, designed to help you present a clear record for disputes or tribunal preparation.
                  </p>
                  <ul className="space-y-4 pt-4">
                    <li className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-foreground">Documented Timeline</h4>
                        <p className="text-sm text-muted-foreground">A clear sequence of events showing exactly what happened and when, protecting your position.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-foreground">Indexed Attachments</h4>
                        <p className="text-sm text-muted-foreground">Photos, videos, and documents automatically referenced in your evidence-ready pack.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-foreground">Dated Communication Record</h4>
                        <p className="text-sm text-muted-foreground">Your context and observations alongside a complete record of all communications and follow-ups.</p>
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="relative w-full max-w-md overflow-hidden rounded-xl shadow-2xl border border-border">
                    <Image
                      src="/images/evidence-pack-interior.png"
                      alt="Evidence Pack interior showing timeline table and evidence references"
                      width={600}
                      height={800}
                      className="w-full h-auto rounded-xl"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Goes Wrong Without This */}
        <section className="py-16 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center">What Goes Wrong Without This</h2>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-red-600 dark:text-red-400 text-sm font-bold">×</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Missing timeline and dates</h3>
                    <p className="text-sm text-muted-foreground">Without a clear sequence of events, it's hard to show when issues occurred or how long they've persisted.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-red-600 dark:text-red-400 text-sm font-bold">×</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Scattered evidence</h3>
                    <p className="text-sm text-muted-foreground">Photos, emails, and documents spread across your phone, inbox, and folders make it difficult to present a complete picture.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-red-600 dark:text-red-400 text-sm font-bold">×</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">No record of communication or follow-ups</h3>
                    <p className="text-sm text-muted-foreground">Without a dated communication record, you can't demonstrate that you notified the landlord or agent, or that they failed to respond.</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-muted-foreground text-sm">
                Tenant Buddy helps you keep a clear, dated record in one place.
              </p>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-extrabold text-foreground">How It Works</h2>
              <p className="mt-4 text-lg text-muted-foreground">Three simple steps to protect your position with documented evidence.</p>
              <div className="mt-8 flex justify-center">
                <Image
                  src="/images/how-it-works-icons.png"
                  alt="Three step process: Log issue, Upload evidence, Export evidence pack"
                  width={700}
                  height={150}
                  className="w-full max-w-2xl h-auto"
                  sizes="(max-width: 768px) 100vw, 700px"
                />
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-transparent hover:border-primary/20 hover:shadow-lg transition-all">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">1. Log Events</h3>
                <p className="text-muted-foreground">
                  Log any tenancy issues, communications, and important dates as they happen.
                </p>
              </div>
              {/* Step 2 */}
              <div className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-transparent hover:border-primary/20 hover:shadow-lg transition-all">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <CloudUpload className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">2. Upload Evidence</h3>
                <p className="text-muted-foreground">
                  Securely upload photos, videos, emails, and documents directly to your timeline.
                </p>
              </div>
              {/* Step 3 */}
              <div className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-transparent hover:border-primary/20 hover:shadow-lg transition-all">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Download className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">3. Export Pack</h3>
                <p className="text-muted-foreground">
                  Generate and download your complete, indexed evidence pack as a PDF in one click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases & Benefits Combined */}
        <section className="bg-card py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Who this is for */}
            <div className="mb-16">
              <h2 className="mb-8 text-2xl font-bold text-foreground">Who This Is For</h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl bg-muted p-6 border border-border flex flex-col">
                  <Handshake className="h-8 w-8 mb-4 text-blue-500" />
                  <h3 className="mb-2 text-lg font-bold text-foreground">Bond Disputes</h3>
                  <p className="text-sm text-muted-foreground mb-4">Protect your position with a documented timeline of communications and photos showing the property condition.</p>
                  <div className="mt-auto rounded-lg overflow-hidden border border-border">
                    <Image
                      src="/images/ui-bond-disputes.png"
                      alt="Issue list showing bond withheld status"
                      width={400}
                      height={200}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-muted p-6 border border-border flex flex-col">
                  <Home className="h-8 w-8 mb-4 text-red-500" />
                  <h3 className="mb-2 text-lg font-bold text-foreground">Unresolved Repairs</h3>
                  <p className="text-sm text-muted-foreground mb-4">Build a documented timeline of issues over time to protect your position.</p>
                  <div className="mt-auto rounded-lg overflow-hidden border border-border">
                    <Image
                      src="/images/ui-unresolved-repairs.png"
                      alt="Issue timeline with photo thumbnails"
                      width={400}
                      height={200}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-muted p-6 border border-border flex flex-col">
                  <FileText className="h-8 w-8 mb-4 text-orange-500" />
                  <h3 className="mb-2 text-lg font-bold text-foreground">Tribunal Preparation</h3>
                  <p className="text-sm text-muted-foreground mb-4">Present a clear, documented record with an evidence-ready pack designed for disputes or tribunal preparation.</p>
                  <div className="mt-auto rounded-lg overflow-hidden border border-border">
                    <Image
                      src="/images/ui-tribunal-prep.png"
                      alt="Evidence Pack builder with Generate PDF button"
                      width={400}
                      height={200}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Core Benefits */}
            <div>
              <h2 className="mb-8 text-2xl font-bold text-foreground">Why use Tenant Buddy?</h2>
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Folder className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Protect Your Position</h4>
                    <p className="text-sm text-muted-foreground">Build a documented timeline that helps protect your position in disputes.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Eye className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Evidence-Ready Pack</h4>
                    <p className="text-sm text-muted-foreground">Present your evidence clearly with a complete, dated record of events.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Dated Communication Record</h4>
                    <p className="text-sm text-muted-foreground">Track all communications and follow-ups in one place with timestamps.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Private Record</h4>
                    <p className="text-sm text-muted-foreground">Maintain a secure, personal history of your tenancy that only you control.</p>
                  </div>
                </div>
                {/* Dashboard Preview */}
                <div className="relative rounded-xl overflow-hidden border border-border shadow-lg bg-gradient-to-br from-muted to-muted/50 p-8 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FolderOpen className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-center gap-4 text-sm">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">3 Issues</span>
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">12 Evidence Items</span>
                      </div>
                      <div className="mt-4">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                          <Download className="h-4 w-4" />
                          Generate Evidence Pack
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-background-dark py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold tracking-tight mb-4">Security & Privacy</h2>
                <p className="text-gray-400 text-lg mb-8">We believe your tenancy history belongs to you. Our platform is built on privacy-first principles.</p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <span className="font-medium">Private by default, always</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <span className="font-medium">You control your data, completely</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <span className="font-medium">Secure storage protects your records</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="font-medium">Export your full history anytime</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-5/12">
                <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center p-8 relative overflow-hidden">
                  {/* Neutral document visual - stacked folders with lock */}
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-16 h-20 rounded bg-gray-700/50 border border-gray-600/30 transform -rotate-3"></div>
                      <div className="w-16 h-20 rounded bg-gray-600/50 border border-gray-500/30 transform rotate-2"></div>
                      <div className="w-16 h-20 rounded bg-gray-700/50 border border-gray-600/30 transform -rotate-1"></div>
                    </div>
                    <div className="absolute bottom-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 border border-gray-600">
                        <Lock className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <details className="group rounded-lg border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-foreground">
                  <span>Is this legal advice?</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  No. This tool helps you build a documented timeline and evidence-ready pack. It does not provide legal advice or predict outcomes.
                </div>
              </details>
              <details className="group rounded-lg border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-foreground">
                  <span>Will this work in my state?</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  Yes, this tool is designed for evidence organisation, which is applicable regardless of your location.
                </div>
              </details>
              <details className="group rounded-lg border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-foreground">
                  <span>What can I upload?</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  You can upload photos, videos, documents, emails, and any other relevant files.
                </div>
              </details>
              <details className="group rounded-lg border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-foreground">
                  <span>Can I export a PDF?</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  Yes, you can export a comprehensive PDF evidence pack at any time.
                </div>
              </details>
              <details className="group rounded-lg border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-foreground">
                  <span>Who owns my data?</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  You own your data. We simply provide the platform for you to build your documented timeline and store it securely.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-primary/5 py-20 dark:bg-white/5">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-extrabold text-foreground">Ready to protect your position?</h2>
            <p className="mb-8 text-xl text-muted-foreground">Start building your documented timeline and evidence-ready pack today.</p>
            <div className="flex justify-center">
              <Button asChild size="lg" className="h-12 min-w-[200px] px-8 text-base font-bold shadow-lg">
                <Link href="/auth/signup">Create Your Evidence Pack</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <BrandLogo size="tablet" variant="primary" />
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Tenant Buddy. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
