import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FileText,
  Plus,
  Calendar,
  ChevronRight,
  Shield,
  Gavel,
  FileCheck,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";

export default async function EvidencePacksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's property for filename context
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address_text")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const property = properties?.[0];

  // Get existing packs (ONE row per pack, idempotent)
  const { data: packs, error } = await supabase
    .from("evidence_pack_runs")
    .select(
      `
      id,
      from_date,
      to_date,
      generated_at,
      mode,
      issue_ids,
      pdf_path
    `
    )
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false });

  if (error) {
    console.error("Error fetching evidence packs:", error);
  }

  // Fetch issue details for all packs (to show a human-friendly preview)
  const allIssueIds = Array.from(
    new Set(
      (packs || [])
        .flatMap((p: any) => (Array.isArray(p.issue_ids) ? p.issue_ids : []))
        .filter(Boolean)
    )
  );

  const { data: issuesForPreview } =
    allIssueIds.length > 0
      ? await supabase
          .from("issues")
          .select("id, title, severity")
          .in("id", allIssueIds)
          .eq("user_id", user.id)
      : { data: [] as any[] };

  const issueById = new Map<string, any>();
  (issuesForPreview || []).forEach((i: any) => issueById.set(i.id, i));

  // Get open issues count for context
  const { count: openIssuesCount } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["open", "in_progress"]);

  // Get total evidence count
  const { count: evidenceCount } = await supabase
    .from("evidence_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasPacks = packs && packs.length > 0;

  return (
    <div className="flex flex-col max-w-[1200px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-card-lighter">
        <div className="flex gap-4">
          <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              Evidence Packs
            </h1>
            <p className="text-sm text-text-subtle">
              Tribunal-ready PDF bundles of your documentation
            </p>
          </div>
        </div>
        {hasPacks && (
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-background-dark font-bold shadow-lg shadow-primary/20"
          >
            <Link href="/packs/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New Pack
            </Link>
          </Button>
        )}
      </div>

      {!hasPacks ? (
        /* Empty State - Onboarding */
        <div className="flex flex-col gap-8">
          {/* Hero Card */}
          <div className="rounded-xl bg-card-dark border border-card-lighter p-8 md:p-10">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 text-primary mb-6">
                <Gavel className="h-10 w-10" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Prepare for Disputes with Evidence Packs
              </h2>
              <p className="text-text-subtle text-lg mb-8 leading-relaxed">
                An Evidence Pack is a professional PDF document that bundles
                your issues, evidence, and communications into a single,
                indexed submission artifact for tribunal hearings or formal
                disputes.
              </p>

              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-background-dark font-bold shadow-lg shadow-primary/20 h-14 px-8 text-lg"
              >
                <Link href="/packs/new">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Evidence Pack
                </Link>
              </Button>

              {/* Current Status */}
              {openIssuesCount !== null && openIssuesCount > 0 && (
                <p className="mt-6 text-sm text-text-subtle">
                  You have{" "}
                  <span className="text-white font-medium">
                    {openIssuesCount} open issue{openIssuesCount !== 1 ? "s" : ""}
                  </span>{" "}
                  and{" "}
                  <span className="text-white font-medium">
                    {evidenceCount || 0} evidence item{(evidenceCount || 0) !== 1 ? "s" : ""}
                  </span>{" "}
                  ready to include.
                </p>
              )}
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-card-dark border border-card-lighter">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-white font-bold mb-2">
                Comprehensive Documentation
              </h3>
              <p className="text-text-subtle text-sm">
                Bundles issues, evidence photos, PDFs, and communication logs
                into a single indexed document.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card-dark border border-card-lighter">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-white font-bold mb-2">
                Integrity Verified
              </h3>
              <p className="text-text-subtle text-sm">
                Each evidence item includes SHA-256 hash verification to prove
                files haven&apos;t been tampered with.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card-dark border border-card-lighter">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <Gavel className="h-6 w-6" />
              </div>
              <h3 className="text-white font-bold mb-2">
                Tribunal-Ready Format
              </h3>
              <p className="text-text-subtle text-sm">
                Professional layout with cover page, table of contents, and
                chronological timeline for official submissions.
              </p>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold mb-1">Before You Create a Pack</h4>
                <p className="text-text-subtle text-sm">
                  Ensure you have uploaded all relevant evidence and logged all
                  communications for the issues you want to include. An incomplete
                  pack may weaken your position in a dispute.{" "}
                  <span className="text-white font-medium">
                    This tool organises your records - it is not legal advice.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pack List */
        <div className="flex flex-col gap-6">
          {/* Summary Stats */}
          <div className="flex items-center gap-4 text-sm text-text-subtle">
            <span>
              <span className="text-white font-medium">{packs.length}</span>{" "}
              pack{packs.length !== 1 ? "s" : ""} generated
            </span>
            {openIssuesCount !== null && openIssuesCount > 0 && (
              <>
                <span className="text-card-lighter">•</span>
                <span>
                  <span className="text-white font-medium">{openIssuesCount}</span>{" "}
                  open issue{openIssuesCount !== 1 ? "s" : ""} available
                </span>
              </>
            )}
          </div>

          {/* Pack Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack: any) => {
              const packIssueIds: string[] = Array.isArray(pack.issue_ids) ? pack.issue_ids : [];
              const previewIssues = packIssueIds
                .map((id) => issueById.get(id))
                .filter(Boolean);

              const hasHighSeverity = previewIssues.some(
                (i: any) => i?.severity === "Urgent" || i?.severity === "High"
              );

              const generatedDate = new Date(pack.generated_at || pack.created_at);
              const issuesCount = packIssueIds.length;
              const modeLabel = pack.mode === "detailed" ? "Detailed" : "Concise";

              return (
                <div
                  key={pack.id}
                  className="group flex flex-col p-5 rounded-xl bg-card-dark border border-card-lighter hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {hasHighSeverity && (
                        <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          High priority
                        </span>
                      )}
                      <span className="text-xs font-medium text-text-subtle bg-card-lighter px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        Generated
                      </span>
                    </div>
                  </div>

                  <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
                    Evidence Pack ({issuesCount} issue{issuesCount !== 1 ? "s" : ""})
                  </h3>

                  <p className="text-text-subtle text-xs">
                    Mode: <span className="text-white/80 font-medium">{modeLabel}</span>
                  </p>

                  {previewIssues.length > 0 && (
                    <div className="mt-3 text-xs text-text-subtle space-y-1">
                      {previewIssues.slice(0, 2).map((i: any) => (
                        <div key={i.id} className="line-clamp-1">
                          • {i.title}
                        </div>
                      ))}
                      {previewIssues.length > 2 && (
                        <div className="text-white/70">+ {previewIssues.length - 2} more</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-text-subtle text-xs mt-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {format(new Date(pack.from_date), "MMM d")} -{" "}
                      {format(new Date(pack.to_date), "MMM d, yyyy")}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-card-lighter mt-4">
                    <span className="text-xs text-text-subtle">
                      Last generated {format(generatedDate, "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA for more */}
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-card-dark border border-dashed border-card-lighter text-center">
            <p className="text-text-subtle text-sm mb-4">
              Need to create another pack for a different issue or time period?
            </p>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
            >
              <Link href="/packs/new">
                <Plus className="h-4 w-4 mr-2" />
                Create New Evidence Pack
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
