"use client";

import { useMemo } from "react";
import { SystemInsightPanel } from "./system-insight-panel";
import type { Severity } from "@/lib/severity";

interface Issue {
  id: string;
  title: string;
  status: string;
  severity?: Severity | null;
  created_at: string;
  updated_at: string;
}

interface DashboardInsightPanelProps {
  issues: Issue[];
  evidenceCounts: Record<string, number>;
  commsCounts: Record<string, number>;
}

/**
 * Client wrapper for SystemInsightPanel.
 * Converts serialized objects back to Maps for the insight logic.
 */
export function DashboardInsightPanel({
  issues,
  evidenceCounts,
  commsCounts,
}: DashboardInsightPanelProps) {
  // Convert objects to Maps
  const evidenceCountMap = useMemo(
    () => new Map(Object.entries(evidenceCounts)),
    [evidenceCounts]
  );

  const commsCountMap = useMemo(
    () => new Map(Object.entries(commsCounts)),
    [commsCounts]
  );

  // Filter to ensure we have valid severity values
  const validIssues = useMemo(
    () =>
      issues.map((issue) => ({
        ...issue,
        severity: (issue.severity || "Low") as Severity,
      })),
    [issues]
  );

  return (
    <SystemInsightPanel
      issues={validIssues}
      evidenceCountMap={evidenceCountMap}
      commsCountMap={commsCountMap}
    />
  );
}
