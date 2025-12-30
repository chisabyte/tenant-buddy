"use client";

import Link from "next/link";
import { MoreVertical, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  created_at: string;
  evidence_count?: number;
  reference?: string;
  severity?: "routine" | "urgent" | "critical";
}

interface IssuesTableProps {
  issues: Issue[];
  showPagination?: boolean;
}

const statusConfig: Record<
  IssueStatus,
  { label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  open: {
    label: "Open",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10 ring-emerald-500/20",
    textColor: "text-emerald-400",
  },
  in_progress: {
    label: "In Progress",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10 ring-amber-500/20",
    textColor: "text-amber-400",
  },
  resolved: {
    label: "Resolved",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-500/10 ring-slate-500/20",
    textColor: "text-slate-400",
  },
  closed: {
    label: "Closed",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-500/10 ring-slate-500/20",
    textColor: "text-slate-400",
  },
};

const severityConfig: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  routine: {
    label: "Routine",
    bgColor: "bg-slate-100 dark:bg-slate-700",
    textColor: "text-slate-700 dark:text-slate-300",
  },
  urgent: {
    label: "Urgent",
    bgColor: "bg-red-100 dark:bg-red-500/20",
    textColor: "text-red-700 dark:text-red-400",
  },
  critical: {
    label: "Critical",
    bgColor: "bg-orange-100 dark:bg-orange-500/20",
    textColor: "text-orange-700 dark:text-orange-400",
  },
};

export function IssuesTable({ issues, showPagination = true }: IssuesTableProps) {
  if (!issues || issues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No issues found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-accent/50">
            <tr>
              <th className="px-6 py-4 font-medium text-foreground" scope="col">
                Issue Title
              </th>
              <th className="px-6 py-4 font-medium text-foreground hidden sm:table-cell" scope="col">
                Date Logged
              </th>
              <th className="px-6 py-4 font-medium text-foreground hidden md:table-cell" scope="col">
                Evidence
              </th>
              <th className="px-6 py-4 font-medium text-foreground" scope="col">
                Status
              </th>
              <th className="px-6 py-4 font-medium text-foreground text-right" scope="col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {issues.map((issue) => {
              const status = statusConfig[issue.status] || statusConfig.open;
              const severity = issue.severity
                ? severityConfig[issue.severity]
                : null;
              return (
                <tr
                  key={issue.id}
                  className="group hover:bg-accent/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {issue.title}
                      </span>
                      {issue.reference && (
                        <span className="text-xs text-muted-foreground">
                          Ref #{issue.reference}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground sm:hidden mt-1">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">
                    {new Date(issue.created_at).toLocaleDateString("en-AU", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      {issue.evidence_count || 0} Files
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        status.bgColor,
                        status.textColor
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1.5 h-1.5 w-1.5 rounded-full",
                          status.dotColor
                        )}
                      />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Link href={`/issues/${issue.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showPagination && issues.length > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-accent/30 px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">1</span> to{" "}
            <span className="font-medium text-foreground">{issues.length}</span>{" "}
            of <span className="font-medium text-foreground">{issues.length}</span>{" "}
            results
          </p>
        </div>
      )}
    </div>
  );
}
