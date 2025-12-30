"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Upload, Filter, ChevronDown, SortAsc, MoreVertical, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { IssueStatus } from "@/lib/database.types";

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  properties: { address_text: string; state: string }[];
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIssuesCount, setOpenIssuesCount] = useState(0);
  const [evidenceCountMap, setEvidenceCountMap] = useState<Map<string, number>>(new Map());
  const [totalEvidenceCount, setTotalEvidenceCount] = useState(0);

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_newest");

  const fetchIssues = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Get all issues
    const { data: issuesData, error } = await supabase
      .from("issues")
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at,
        properties!inner(address_text, state)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching issues:", error);
      setLoading(false);
      return;
    }

    setIssues(issuesData || []);

    // Get stats - count open issues
    const { count: openCount } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["open", "in_progress"]);

    setOpenIssuesCount(openCount || 0);

    // Get total evidence count (all evidence for this user)
    const { count: totalEvidence } = await supabase
      .from("evidence_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setTotalEvidenceCount(totalEvidence || 0);

    // Get evidence counts per issue (for the table)
    const issueIds = issuesData?.map((i) => i.id) || [];
    if (issueIds.length > 0) {
      const { data: evidenceCounts } = await supabase
        .from("evidence_items")
        .select("issue_id")
        .eq("user_id", user.id)
        .not("issue_id", "is", null);

      const countMap = new Map<string, number>();
      evidenceCounts?.forEach((item) => {
        if (item.issue_id) {
          countMap.set(
            item.issue_id,
            (countMap.get(item.issue_id) || 0) + 1
          );
        }
      });
      setEvidenceCountMap(countMap);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Filter and sort issues
  const filteredIssues = issues
    .filter((issue) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "open") return issue.status === "open";
      if (statusFilter === "pending") return issue.status === "in_progress";
      if (statusFilter === "resolved") return issue.status === "resolved" || issue.status === "closed";
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "date_newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "status":
          const statusOrder: Record<string, number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        case "title":
          return a.title.localeCompare(b.title);
      }
    });

  // Stats calculations
  const pendingAgentCount = issues.filter((i) => i.status === "in_progress").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="flex flex-col max-w-6xl mx-auto w-full p-4 md:p-8 gap-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex gap-4">
          <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <FileText className="h-8 w-8" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              Issue Tracking
            </h1>
            <p className="text-sm text-text-subtle">
              Log maintenance requests and disputes for your evidence pack.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="hidden md:flex bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80"
          >
            <Link href="/packs/new">
              <Upload className="h-4 w-4 mr-2" />
              Export Log
            </Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Link href="/issues/new">
              <Plus className="h-4 w-4 mr-2" />
              Log New Issue
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl border border-card-lighter bg-card-dark p-4">
          <span className="text-xs font-medium text-text-subtle">Open Issues</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? "..." : openIssuesCount}
            </span>
            {openIssuesCount > 0 && (
              <span className="flex items-center text-xs font-medium text-amber-500">
                <span className="mr-0.5">Action Req</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-card-lighter bg-card-dark p-4">
          <span className="text-xs font-medium text-text-subtle">Pending Agent</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? "..." : pendingAgentCount}
            </span>
            {issues.length > 0 && (
              <span className="text-xs text-text-subtle">
                Since {format(new Date(issues[issues.length - 1]?.created_at || new Date()), "MMM d")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-card-lighter bg-card-dark p-4">
          <span className="text-xs font-medium text-text-subtle">Resolved this year</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? "..." : resolvedCount}
            </span>
            {resolvedCount > 0 && (
              <span className="flex items-center text-xs font-medium text-emerald-500">
                Good progress
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-card-lighter bg-card-dark p-4">
          <span className="text-xs font-medium text-text-subtle">Evidence Files</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? "..." : totalEvidenceCount}
            </span>
            <span className="text-xs text-text-subtle">Total attached</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 py-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-primary text-background-dark"
              : "bg-card-lighter text-white hover:bg-card-lighter/80"
          }`}
        >
          <Filter className="h-4 w-4" />
          All Issues
        </button>
        <button
          onClick={() => setStatusFilter("open")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "open"
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-text-subtle hover:bg-card-lighter hover:text-white"
          }`}
        >
          <span className="size-2 rounded-full bg-emerald-500" />
          Open
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "pending"
              ? "bg-amber-500/20 text-amber-400"
              : "text-text-subtle hover:bg-card-lighter hover:text-white"
          }`}
        >
          <span className="size-2 rounded-full bg-amber-500" />
          Pending
        </button>
        <button
          onClick={() => setStatusFilter("resolved")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "resolved"
              ? "bg-slate-500/20 text-slate-300"
              : "text-text-subtle hover:bg-card-lighter hover:text-white"
          }`}
        >
          <span className="size-2 rounded-full bg-slate-400" />
          Resolved
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card-lighter rounded-lg border border-card-lighter">
              <SortAsc className="h-4 w-4 text-text-subtle" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-card-lighter border-none text-sm text-white focus:ring-0 cursor-pointer py-0 pr-6 pl-0 [&>option]:bg-card-dark [&>option]:text-white"
              >
                <option value="date_newest">Date (Newest)</option>
                <option value="date_oldest">Date (Oldest)</option>
                <option value="status">Status</option>
                <option value="title">Title (A-Z)</option>
              </select>
              <ChevronDown className="h-4 w-4 text-text-subtle pointer-events-none -ml-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-card-lighter bg-card-dark shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-card-lighter bg-background-dark">
              <tr>
                <th className="px-6 py-4 font-medium text-white" scope="col">
                  Issue Title
                </th>
                <th className="px-6 py-4 font-medium text-white" scope="col">
                  Date Logged
                </th>
                <th className="px-6 py-4 font-medium text-white" scope="col">
                  Severity
                </th>
                <th className="px-6 py-4 font-medium text-white" scope="col">
                  Evidence
                </th>
                <th className="px-6 py-4 font-medium text-white" scope="col">
                  Status
                </th>
                <th className="px-6 py-4 font-medium text-white text-right" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-lighter">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-subtle">
                    Loading...
                  </td>
                </tr>
              ) : filteredIssues && filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => {
                  const propertiesArr = issue.properties as unknown as Array<{
                    address_text: string;
                    state: string;
                  }>;
                  const properties = propertiesArr?.[0] ?? null;
                  const status = issue.status as IssueStatus;
                  const evidenceCount = evidenceCountMap.get(issue.id) || 0;
                  const referenceId = issue.id.substring(0, 8).toUpperCase();
                  const loggedDate = format(new Date(issue.created_at), "MMM d, yyyy");

                  const severity = getSeverity(issue);

                  return (
                    <tr
                      key={issue.id}
                      className="group hover:bg-card-lighter/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {issue.title}
                          </span>
                          <span className="text-xs text-text-subtle">
                            Reference #{referenceId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-subtle">
                        {loggedDate}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityClasses(severity)}`}
                        >
                          {severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-text-subtle">
                          <FileText className="h-4 w-4" />
                          {evidenceCount} {evidenceCount === 1 ? "File" : "Files"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClasses(status)}`}
                        >
                          <span
                            className={`mr-1.5 size-1.5 rounded-full ${getStatusDotColor(status)}`}
                          />
                          {formatStatus(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/issues/${issue.id}`}
                          className="rounded p-1 text-text-subtle hover:bg-card-lighter hover:text-white inline-block"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-subtle">
                    {statusFilter !== "all" ? (
                      <>
                        No {statusFilter} issues found.{" "}
                        <button
                          onClick={() => setStatusFilter("all")}
                          className="text-primary hover:underline"
                        >
                          View all issues
                        </button>
                      </>
                    ) : (
                      <>
                        No issues yet.{" "}
                        <Link href="/issues/new" className="text-primary hover:underline">
                          Create your first issue
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredIssues && filteredIssues.length > 0 && (
          <div className="flex items-center justify-between border-t border-card-lighter bg-background-dark px-6 py-3">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-text-subtle">
                  Showing <span className="font-medium text-white">1</span> to{" "}
                  <span className="font-medium text-white">
                    {Math.min(filteredIssues.length, 10)}
                  </span>{" "}
                  of <span className="font-medium text-white">{filteredIssues.length}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  aria-label="Pagination"
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                >
                  <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-subtle ring-1 ring-inset ring-card-lighter hover:bg-card-lighter">
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    aria-current="page"
                    className="relative z-10 inline-flex items-center bg-primary px-4 py-2 text-sm font-semibold text-background-dark focus:z-20"
                  >
                    1
                  </button>
                  <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-subtle ring-1 ring-inset ring-card-lighter hover:bg-card-lighter">
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getSeverity(issue: { status: string }): "Urgent" | "Critical" | "Routine" {
  const status = issue.status;
  if (status === "in_progress") return "Urgent";
  if (status === "open") return "Critical";
  if (status === "resolved" || status === "closed") return "Routine";
  return "Routine";
}

function getSeverityClasses(severity: string): string {
  const classes: Record<string, string> = {
    Urgent: "bg-red-500/20 text-red-400",
    Critical: "bg-orange-500/20 text-orange-400",
    Routine: "bg-slate-700 text-slate-300",
  };
  return classes[severity] || classes.Routine;
}

function getStatusClasses(status: IssueStatus): string {
  const classes: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    in_progress: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    resolved: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
    closed: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  };
  return classes[status] || classes.open;
}

function getStatusDotColor(status: IssueStatus): string {
  const colors: Record<string, string> = {
    open: "bg-emerald-500",
    in_progress: "bg-amber-500",
    resolved: "bg-slate-400",
    closed: "bg-slate-400",
  };
  return colors[status] || colors.open;
}

function formatStatus(status: IssueStatus): string {
  const labels: Record<string, string> = {
    open: "Open",
    in_progress: "Pending Agent",
    resolved: "Resolved",
    closed: "Resolved",
  };
  return labels[status] || status;
}
