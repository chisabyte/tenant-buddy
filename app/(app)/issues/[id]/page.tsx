import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  FileText,
  Mail,
  Image,
  Paperclip,
  Calendar,
  ChevronRight,
} from "lucide-react";

export default async function IssueDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: issue, error } = await supabase
    .from("issues")
    .select(
      `
      *,
      properties!inner(address_text, state)
    `
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !issue) {
    redirect("/issues");
  }

  // Get related evidence
  const { data: evidence } = await supabase
    .from("evidence_items")
    .select("*")
    .eq("issue_id", params.id)
    .order("occurred_at", { ascending: false });

  // Get related communications
  const { data: comms } = await supabase
    .from("comms_logs")
    .select("*")
    .eq("issue_id", params.id)
    .order("occurred_at", { ascending: false });

  const statusConfig = getStatusConfig(issue.status);

  return (
    <div className="flex flex-col max-w-[1000px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Back Button */}
      <Link
        href="/issues"
        className="inline-flex items-center gap-2 text-text-subtle hover:text-primary transition-colors text-sm font-medium w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Issues
      </Link>

      {/* Issue Header Card */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{issue.title}</h1>
            <p className="text-text-subtle text-sm">
              {issue.properties?.address_text} • {issue.properties?.state}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.classes} shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
            {statusConfig.label}
          </span>
        </div>

        {issue.description && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
            <p className="text-text-subtle text-sm whitespace-pre-wrap">
              {issue.description}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-text-subtle border-t border-card-lighter pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Created: {new Date(issue.created_at).toLocaleDateString("en-AU")}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Updated: {new Date(issue.updated_at).toLocaleDateString("en-AU")}
          </div>
        </div>
      </div>

      {/* Evidence Section */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <Paperclip className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Evidence ({evidence?.length || 0})
            </h2>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
          >
            <Link href={`/evidence/upload?issueId=${params.id}`}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Link>
          </Button>
        </div>

        {!evidence || evidence.length === 0 ? (
          <div className="text-center py-8 text-text-subtle text-sm">
            No evidence items attached to this issue yet.
          </div>
        ) : (
          <div className="space-y-2">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-card-lighter/50 hover:bg-card-lighter transition-colors group"
              >
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  {item.type === "photo" || item.type === "screenshot" ? (
                    <Image className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.note || item.type}
                  </p>
                  <p className="text-xs text-text-subtle">
                    {new Date(item.occurred_at).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Communications Section */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Communications ({comms?.length || 0})
            </h2>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
          >
            <Link href={`/comms/new?issueId=${params.id}`}>
              <Plus className="h-4 w-4 mr-1" />
              Log
            </Link>
          </Button>
        </div>

        {!comms || comms.length === 0 ? (
          <div className="text-center py-8 text-text-subtle text-sm">
            No communications logged for this issue yet.
          </div>
        ) : (
          <div className="space-y-3">
            {comms.map((comm) => (
              <div
                key={comm.id}
                className="p-4 rounded-lg bg-card-lighter/50 hover:bg-card-lighter transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-primary uppercase">
                    {comm.channel}
                  </span>
                  <span className="text-xs text-text-subtle">
                    {new Date(comm.occurred_at).toLocaleDateString("en-AU")}
                  </span>
                </div>
                <p className="text-sm text-white">{comm.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Evidence Pack */}
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-card-dark border border-primary/20 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              Ready to generate an evidence pack?
            </h3>
            <p className="text-text-subtle text-sm">
              Create a PDF bundle with all evidence and communications for this issue.
            </p>
          </div>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-background-dark font-bold shadow-lg shadow-primary/20"
          >
            <Link href={`/packs/new?issueId=${params.id}`}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Pack
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function getStatusConfig(status: string) {
  const configs: Record<
    string,
    { label: string; classes: string; dotColor: string }
  > = {
    open: {
      label: "Open",
      classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dotColor: "bg-emerald-500",
    },
    in_progress: {
      label: "In Progress",
      classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      dotColor: "bg-amber-500",
    },
    resolved: {
      label: "Resolved",
      classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      dotColor: "bg-slate-400",
    },
    closed: {
      label: "Closed",
      classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      dotColor: "bg-slate-400",
    },
  };

  return (
    configs[status] || {
      label: status.replace("_", " "),
      classes: "bg-primary/10 text-primary border-primary/20",
      dotColor: "bg-primary",
    }
  );
}
