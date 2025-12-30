import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Plus, Calendar, ChevronRight } from "lucide-react";

export default async function EvidencePacksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: packs, error } = await supabase
    .from("evidence_pack_runs")
    .select(
      `
      id,
      from_date,
      to_date,
      created_at,
      issues!inner(title)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching evidence packs:", error);
  }

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
              PDF bundles of your documentation for your records.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-background-dark font-bold shadow-lg shadow-primary/20"
        >
          <Link href="/packs/new">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Pack
          </Link>
        </Button>
      </div>

      {!packs || packs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl bg-card-dark border border-card-lighter text-center">
          <div className="w-16 h-16 rounded-full bg-card-lighter flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-text-subtle" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            No evidence packs yet
          </h3>
          <p className="text-text-subtle text-sm mb-6 max-w-md">
            Generate your first evidence pack to create a PDF bundle of your
            issues and evidence.
          </p>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
          >
            <Link href="/packs/new">
              <Plus className="h-4 w-4 mr-2" />
              Generate Your First Pack
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((pack: any) => (
            <div
              key={pack.id}
              className="group flex flex-col p-5 rounded-xl bg-card-dark border border-card-lighter hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-text-subtle bg-card-lighter px-2 py-1 rounded">
                  PDF
                </span>
              </div>
              <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
                {pack.issues?.title || "Untitled Issue"}
              </h3>
              <div className="flex items-center gap-2 text-text-subtle text-xs mt-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(pack.from_date).toLocaleDateString("en-AU", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(pack.to_date).toLocaleDateString("en-AU", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-xs text-text-subtle">
                  Generated{" "}
                  {new Date(pack.created_at).toLocaleDateString("en-AU")}
                </span>
                <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
