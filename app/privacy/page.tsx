import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Tenant Buddy",
  description: "Privacy Policy for Tenant Buddy - how we handle your data",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-dark">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-subtle hover:text-primary transition-colors text-sm font-medium mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <article className="prose prose-invert prose-slate max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Privacy Policy
          </h1>

          <p className="text-text-subtle text-sm mb-8">
            Last updated: {new Date().toLocaleDateString("en-AU", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              1. Information We Collect
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              We collect information you choose to provide, including:
            </p>
            <ul className="list-disc pl-6 text-text-subtle space-y-2">
              <li>Account details (such as email address)</li>
              <li>Tenancy issues, notes, and records</li>
              <li>Uploaded files (photos, PDFs, documents)</li>
              <li>Usage data required to operate the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              2. How Your Data Is Used
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              Your data is used solely to:
            </p>
            <ul className="list-disc pl-6 text-text-subtle space-y-2">
              <li>Operate the application</li>
              <li>Store and organise your records</li>
              <li>Generate evidence packs at your request</li>
              <li>Maintain security and prevent misuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              3. Data Ownership
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              You retain ownership of all content you upload or create using the service.
            </p>
            <p className="text-text-subtle leading-relaxed">
              We do not claim ownership over your documents, evidence, or records.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              4. Data Access & Privacy
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              Your data is private by default.
            </p>
            <p className="text-text-subtle leading-relaxed">
              Only you can access your records unless you choose to export or share them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              5. Data Storage & Security
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              We use industry-standard security measures to protect your data, including
              access controls and secure storage.
            </p>
            <p className="text-text-subtle leading-relaxed">
              No system is completely secure, but we take reasonable steps to protect
              your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              6. Third-Party Services
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              We may use third-party infrastructure providers (such as hosting or storage
              services) solely to operate the application.
            </p>
            <p className="text-text-subtle leading-relaxed">
              These providers do not have permission to use your data for their own purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              7. Data Retention
            </h2>
            <p className="text-text-subtle leading-relaxed mb-4">
              You may delete your account and associated data at any time.
            </p>
            <p className="text-text-subtle leading-relaxed">
              Some limited data may be retained temporarily for security, compliance,
              or backup purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              8. No Sale of Data
            </h2>
            <p className="text-text-subtle leading-relaxed">
              We do not sell your personal data.
            </p>
          </section>

          {/* Footer Links */}
          <div className="border-t border-card-lighter pt-8 mt-12">
            <p className="text-text-subtle text-sm">
              See also: <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
