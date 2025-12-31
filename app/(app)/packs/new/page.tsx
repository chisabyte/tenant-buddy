"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Check,
  Image as ImageIcon,
  Mail,
  File,
  ChevronRight,
  Gavel,
  Download,
  X,
  Loader2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import {
  calculatePackReadiness,
  getPackFilename,
  type PackReadiness,
} from "@/lib/pack-readiness";
import type { Severity } from "@/lib/severity";
import {
  checkEnforcement,
  type EnforcementResult,
} from "@/lib/enforcement";
import { EnforcementModal, EnforcementBlock } from "@/components/enforcement-modal";
import type { CaseHealthStatus } from "@/lib/case-health";
import type { PlanId } from "@/lib/billing/plans";

interface EvidenceItem {
  id: string;
  type: string;
  note: string | null;
  file_path: string | null;
  uploaded_at: string;
}

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity?: Severity | null;
  created_at: string;
  updated_at: string;
  evidence_items: EvidenceItem[];
}

interface CommsLog {
  issue_id: string;
  occurred_at: string;
}

export default function NewPackPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [commsLogs, setCommsLogs] = useState<CommsLog[]>([]);
  const [propertyAddress, setPropertyAddress] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selection state
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(
    new Set()
  );
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [sortBy, setSortBy] = useState<string>("date_newest");

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAcknowledged, setConfirmationAcknowledged] =
    useState(false);

  // Enforcement state
  const [enforcement, setEnforcement] = useState<EnforcementResult | null>(null);
  const [showEnforcementModal, setShowEnforcementModal] = useState(false);
  const [userPlanId, setUserPlanId] = useState<PlanId>("free");

  // Pack mode state
  const [packMode, setPackMode] = useState<"concise" | "detailed">("concise");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch property
    const { data: properties } = await supabase
      .from("properties")
      .select("address_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (properties?.[0]) {
      setPropertyAddress(properties[0].address_text);
    }

    // Fetch issues with evidence
    const { data: issuesData, error } = await supabase
      .from("issues")
      .select(
        `
        id,
        title,
        description,
        status,
        severity,
        created_at,
        updated_at,
        evidence_items!left(
          id,
          type,
          note,
          file_path,
          uploaded_at
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching issues:", error);
      setLoading(false);
      return;
    }

    // Fetch comms logs
    const { data: commsData } = await supabase
      .from("comms_logs")
      .select("issue_id, occurred_at")
      .eq("user_id", user.id)
      .not("issue_id", "is", null);

    // Fetch user's subscription to determine plan
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("price_id, status")
      .eq("user_id", user.id)
      .single();

    // Determine plan from subscription
    let planId: PlanId = "free";
    if (subscription?.status === "active" || subscription?.status === "trialing") {
      // Check price_id to determine plan (simplified - would use getPlanFromPriceId in real impl)
      if (subscription.price_id?.includes("pro")) {
        planId = "pro";
      } else if (subscription.price_id?.includes("plus")) {
        planId = "plus";
      }
    }
    setUserPlanId(planId);

    setCommsLogs(commsData || []);
    setIssues(issuesData || []);

    // Auto-select all open issues
    const openIssues =
      issuesData?.filter(
        (i) => i.status === "open" || i.status === "in_progress"
      ) || [];

    if (openIssues.length > 0) {
      const selectedIds = new Set(openIssues.map((i) => i.id));
      setSelectedIssues(selectedIds);

      // Auto-expand first issue
      setExpandedIssues(new Set([openIssues[0].id]));

      // Auto-select all evidence from selected issues
      const evidenceIds = new Set<string>();
      openIssues.forEach((issue) => {
        issue.evidence_items?.forEach((e: EvidenceItem) => evidenceIds.add(e.id));
      });
      setSelectedEvidence(evidenceIds);
    }

    setLoading(false);
  };

  // Calculate pack readiness
  const packReadiness = useMemo(() => {
    return calculatePackReadiness(issues, selectedIssues, commsLogs);
  }, [issues, selectedIssues, commsLogs]);

  // Calculate enforcement based on pack readiness
  const packEnforcement = useMemo(() => {
    // Map pack readiness status to case health status
    const statusMap: Record<PackReadiness["status"], CaseHealthStatus> = {
      strong: "strong",
      moderate: "adequate",
      weak: "weak",
      "high-risk": "at-risk",
    };
    const healthStatus = statusMap[packReadiness.status];
    return checkEnforcement("generate_pack", healthStatus, packReadiness.score, userPlanId);
  }, [packReadiness, userPlanId]);

  const toggleIssueSelection = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    const issue = issues.find((i) => i.id === issueId);

    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
      // Also deselect all evidence from this issue
      if (issue) {
        const newEvidenceSelected = new Set(selectedEvidence);
        issue.evidence_items?.forEach((e) => newEvidenceSelected.delete(e.id));
        setSelectedEvidence(newEvidenceSelected);
      }
    } else {
      newSelected.add(issueId);
      // Also select all evidence from this issue
      if (issue) {
        const newEvidenceSelected = new Set(selectedEvidence);
        issue.evidence_items?.forEach((e) => newEvidenceSelected.add(e.id));
        setSelectedEvidence(newEvidenceSelected);
      }
    }
    setSelectedIssues(newSelected);
  };

  const toggleEvidenceSelection = (evidenceId: string) => {
    const newSelected = new Set(selectedEvidence);
    if (newSelected.has(evidenceId)) {
      newSelected.delete(evidenceId);
    } else {
      newSelected.add(evidenceId);
    }
    setSelectedEvidence(newSelected);
  };

  const toggleIssueExpanded = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const openPreview = async (item: EvidenceItem) => {
    if (!item.file_path) return;

    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewUrl(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("evidence")
        .createSignedUrl(item.file_path, 3600);

      if (error) {
        console.error("Error getting signed URL:", error);
        setPreviewLoading(false);
        return;
      }

      setPreviewUrl(data.signedUrl);
    } catch (err) {
      console.error("Error opening preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewUrl(null);
  };

  const handleGenerateClick = () => {
    if (selectedIssues.size === 0) {
      alert("Please select at least one issue to include in the pack.");
      return;
    }

    // Check enforcement level
    if (!packEnforcement.allowed) {
      // Hard-blocked - show enforcement modal with block message
      setEnforcement(packEnforcement);
      setShowEnforcementModal(true);
      return;
    }

    if (packEnforcement.requiresConfirmation) {
      // Soft-blocked - show enforcement confirmation modal
      setEnforcement(packEnforcement);
      setShowEnforcementModal(true);
      return;
    }

    if (packEnforcement.level === "warned") {
      // Warned - still show original confirmation with readiness info
      setShowConfirmation(true);
      setConfirmationAcknowledged(false);
      return;
    }

    // Allowed - generate directly
    handleGeneratePack();
  };

  const handleEnforcementConfirm = async (reason?: string) => {
    setShowEnforcementModal(false);

    // Log the override
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && enforcement) {
        // Log override to database
        await supabase.from("override_logs").insert({
          user_id: user.id,
          action: "generate_pack",
          enforcement_level: enforcement.level,
          health_status: enforcement.context.healthStatus,
          health_score: enforcement.context.healthScore,
          reason: reason || null,
          plan_id: enforcement.context.planId,
          plan_mode: enforcement.context.planMode,
        });
      }
    } catch (err) {
      console.error("Error logging override:", err);
    }

    // Proceed with generation
    handleGeneratePack();
  };

  const handleEnforcementCancel = () => {
    setShowEnforcementModal(false);
    setEnforcement(null);
  };

  const handleGeneratePack = async () => {
    setShowConfirmation(false);
    setGenerating(true);

    try {
      if (selectedIssues.size === 0) {
        alert("Please select at least one issue to include in the pack.");
        setGenerating(false);
        return;
      }

      const issueIds = Array.from(selectedIssues);
      
      // Calculate date range from all selected issues
      const selectedIssuesData = issues.filter(issue => issueIds.includes(issue.id));
      const allDates: Date[] = [
        ...selectedIssuesData.map(issue => new Date(issue.created_at)),
        ...selectedIssuesData.flatMap(issue => 
          (issue.evidence_items || []).map(e => new Date(e.uploaded_at))
        ),
        ...commsLogs.filter(c => issueIds.includes(c.issue_id)).map(c => new Date(c.occurred_at)),
      ];
      
      const minDate = allDates.length > 0 
        ? new Date(Math.min(...allDates.map(d => d.getTime())))
        : new Date(new Date().getFullYear(), 0, 1);
      const maxDate = allDates.length > 0
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : new Date();

      const fromDate = minDate.toISOString().split('T')[0];
      const toDate = maxDate.toISOString().split('T')[0];

      const response = await fetch("/api/evidence-packs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueIds,
          fromDate,
          toDate,
          mode: packMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.downloadUrl) {
        // Trigger download
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show success message with mode-specific details
        const readinessLabel = data.packReadiness?.statusLabel || "Generated";
        const healthLabel = data.caseHealth?.statusLabel || "N/A";
        const modeLabel = data.mode === "concise" ? "Concise (5 pages max)" : "Detailed (Full content)";
        
        alert(
          `✅ Evidence Pack v${data.version || "2.0"} Generated Successfully!\n\n` +
          `📄 Mode: ${modeLabel}\n` +
          `📊 Pack Readiness: ${readinessLabel} (${data.packReadiness?.score || 0}%)\n` +
          `🏥 Case Health: ${healthLabel} (${data.caseHealth?.score || 0}%)\n\n` +
          `📋 Contents:\n` +
          `   • Issues: ${data.issuesCount}\n` +
          `   • Evidence items: ${data.evidenceCount}\n` +
          `   • Communications: ${data.commsCount}\n` +
          (data.imagesEmbedded ? `   • Images embedded: ${data.imagesEmbedded}\n` : "") +
          `\n📥 The file has been downloaded.`
        );
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Error generating pack:", err);
      const errorMessage = err.message || "Failed to generate evidence pack. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  // Filter and sort issues
  const filteredIssues = issues
    .filter((issue) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "open")
        return issue.status === "open" || issue.status === "in_progress";
      return issue.status === statusFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "severity":
          const severityOrder: Record<string, number> = {
            Urgent: 0,
            High: 1,
            Medium: 2,
            Low: 3,
          };
          return (
            (severityOrder[a.severity || "Low"] || 3) -
            (severityOrder[b.severity || "Low"] || 3)
          );
        case "date_newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

  // Calculate stats
  const totalSelectedEvidence = selectedEvidence.size;
  const packFilename = getPackFilename(propertyAddress || "Property");

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "photo":
      case "screenshot":
        return ImageIcon;
      case "email":
        return Mail;
      case "pdf":
      case "document":
        return FileText;
      default:
        return File;
    }
  };

  const getIconColors = (type: string) => {
    switch (type?.toLowerCase()) {
      case "photo":
      case "screenshot":
        return "bg-blue-500/20 text-blue-400";
      case "email":
        return "bg-purple-500/20 text-purple-400";
      case "pdf":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-700 text-slate-400";
    }
  };

  const isImageType = (type: string) => {
    return ["photo", "screenshot"].includes(type?.toLowerCase());
  };

  const isPdfType = (type: string) => {
    return type?.toLowerCase() === "pdf";
  };

  const getReadinessConfig = (status: PackReadiness["status"]) => {
    switch (status) {
      case "strong":
        return {
          icon: Shield,
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          text: "text-green-600 dark:text-green-400",
          progressBg: "bg-green-500",
          // Dark text for light backgrounds
          bodyText: "text-slate-700 dark:text-white/80",
          statLabel: "text-slate-600 dark:text-white/70",
        };
      case "moderate":
        return {
          icon: CheckCircle,
          bg: "bg-primary/10",
          border: "border-primary/30",
          text: "text-primary dark:text-primary",
          progressBg: "bg-primary",
          // Dark text for light backgrounds
          bodyText: "text-slate-700 dark:text-white/80",
          statLabel: "text-slate-600 dark:text-white/70",
        };
      case "weak":
        return {
          icon: AlertCircle,
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-600 dark:text-amber-400",
          progressBg: "bg-amber-500",
          // Dark text for light backgrounds
          bodyText: "text-slate-700 dark:text-white/80",
          statLabel: "text-slate-600 dark:text-white/70",
        };
      case "high-risk":
        return {
          icon: ShieldAlert,
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-600 dark:text-red-400",
          progressBg: "bg-red-500",
          // Dark text for light backgrounds
          bodyText: "text-slate-700 dark:text-white/80",
          statLabel: "text-slate-600 dark:text-white/70",
        };
    }
  };

  const readinessConfig = getReadinessConfig(packReadiness.status);
  const ReadinessIcon = readinessConfig.icon;

  // Get comms count for an issue
  const getCommsCount = (issueId: string) => {
    return commsLogs.filter((c) => c.issue_id === issueId).length;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/evidence-packs"
          className="text-text-subtle hover:text-primary font-medium"
        >
          Evidence Packs
        </Link>
        <ChevronRight className="h-4 w-4 text-text-subtle" />
        <span className="text-white font-medium">Create Pack</span>
      </div>

      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white">
            Create Evidence Pack
          </h1>
          <p className="text-text-subtle text-lg leading-relaxed">
            Select the issues and evidence to bundle into a tribunal-ready PDF
            submission.
          </p>
        </div>
      </div>

      {/* Pack Readiness Indicator */}
      <div
        className={`rounded-xl ${readinessConfig.bg} border ${readinessConfig.border} p-5 mb-8`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${readinessConfig.bg}`}>
              <ReadinessIcon className={`h-6 w-6 ${readinessConfig.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className={`text-lg font-bold ${readinessConfig.text}`}>
                  Pack Readiness: {packReadiness.statusLabel}
                </h2>
                <span className={`text-2xl font-black ${readinessConfig.text}`}>
                  {packReadiness.score}%
                </span>
              </div>
              <p className={`text-sm ${readinessConfig.bodyText}`}>
                {packReadiness.statusDescription}
              </p>
            </div>
          </div>

          {/* Coverage Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-slate-900 dark:text-white font-bold text-xl">
                {packReadiness.coverage.includedIssues}
              </p>
              <p className={`text-xs ${readinessConfig.statLabel}`}>
                of {packReadiness.coverage.totalOpenIssues} included
              </p>
            </div>
            {packReadiness.coverage.excludedIssues > 0 && (
              <div className="text-center">
                <p className="text-amber-600 dark:text-amber-400 font-bold text-xl">
                  {packReadiness.coverage.excludedIssues}
                </p>
                <p className={`text-xs ${readinessConfig.statLabel}`}>excluded</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-card-lighter rounded-full overflow-hidden mt-4">
          <div
            className={`h-full ${readinessConfig.progressBg} rounded-full transition-all duration-500`}
            style={{ width: `${packReadiness.score}%` }}
          />
        </div>

        {/* Warnings */}
        {packReadiness.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            {packReadiness.warnings.slice(0, 3).map((warning, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 text-sm ${
                  warning.type === "critical"
                    ? "text-red-700 dark:text-red-400"
                    : warning.type === "warning"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-slate-700 dark:text-white/90"
                }`}
              >
                {warning.type === "critical" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : warning.type === "warning" ? (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>
                  <strong>{warning.title}:</strong> {warning.message}
                </span>
              </div>
            ))}
            {packReadiness.warnings.length > 3 && (
              <p className={`text-xs ml-6 ${readinessConfig.bodyText}`}>
                + {packReadiness.warnings.length - 3} more warnings
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-8 h-full">
        {/* Left Column: Builder (Selection) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Filters and Controls */}
          <div className="bg-card-dark rounded-xl p-4 border border-card-lighter shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setStatusFilter("open")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  statusFilter === "open"
                    ? "bg-primary text-background-dark shadow-lg shadow-primary/20"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                Open Issues
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-primary text-background-dark"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                All Issues
              </button>
              <button
                onClick={() => setStatusFilter("closed")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  statusFilter === "closed"
                    ? "bg-primary text-background-dark"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                Resolved
              </button>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none bg-background-dark border border-card-lighter text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="date_newest">Date (Newest)</option>
                  <option value="date_oldest">Date (Oldest)</option>
                  <option value="severity">Severity</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-text-subtle pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-text-subtle">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading issues...
              </div>
            ) : filteredIssues && filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => {
                const evidenceItems = issue.evidence_items || [];
                const commsCount = getCommsCount(issue.id);
                const isExpanded = expandedIssues.has(issue.id);
                const isSelected = selectedIssues.has(issue.id);
                const reportedDate = format(
                  new Date(issue.created_at),
                  "MMM d, yyyy"
                );
                const isHighSeverity =
                  issue.severity === "Urgent" || issue.severity === "High";
                const isOpen =
                  issue.status === "open" || issue.status === "in_progress";

                // Determine exclusion warning
                const exclusionWarning =
                  !isSelected && isOpen
                    ? isHighSeverity
                      ? "This high-severity issue will NOT be documented in the pack. This may significantly weaken your position."
                      : evidenceItems.length > 0
                      ? `This issue has ${evidenceItems.length} evidence item${evidenceItems.length > 1 ? "s" : ""} but will NOT be included.`
                      : commsCount > 0
                      ? `This issue has ${commsCount} logged communication${commsCount > 1 ? "s" : ""} but will NOT be included.`
                      : null
                    : null;

                return (
                  <div
                    key={issue.id}
                    className={`bg-card-dark rounded-xl overflow-hidden shadow-sm transition-all ${
                      isSelected
                        ? "border-l-4 border-l-primary border-y border-r border-card-lighter"
                        : exclusionWarning
                        ? "border-l-4 border-l-amber-500 border-y border-r border-card-lighter"
                        : "border border-card-lighter hover:border-card-lighter/80"
                    }`}
                  >
                    <div className="p-5 flex items-start gap-4">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIssueSelection(issue.id)}
                          className="h-5 w-5 rounded border-card-lighter text-primary focus:ring-0 bg-background-dark cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {isHighSeverity && (
                                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-semibold">
                                  {issue.severity}
                                </span>
                              )}
                              <h3 className="text-lg font-bold text-white">
                                {issue.title}
                              </h3>
                            </div>
                            <p className="text-sm text-white/80">
                              Reported: {reportedDate} • {evidenceItems.length}{" "}
                              evidence • {commsCount} comms
                            </p>
                          </div>
                          {isSelected ? (
                            <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Included
                            </span>
                          ) : isOpen ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
                              Excluded
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-semibold">
                              {issue.status === "closed"
                                ? "Resolved"
                                : issue.status}
                            </span>
                          )}
                        </div>

                        {/* Exclusion Warning */}
                        {exclusionWarning && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-amber-300 text-sm font-medium">
                              {exclusionWarning}
                            </p>
                          </div>
                        )}

                        {isExpanded && (
                          <>
                            <p className="text-text-subtle text-sm mb-4">
                              {issue.description || "No description provided."}
                            </p>
                            {/* Evidence Items */}
                            {evidenceItems.length > 0 ? (
                              <div className="space-y-2 bg-background-dark rounded-lg p-3 border border-card-lighter">
                                {evidenceItems.map((item) => {
                                  const Icon = getFileIcon(item.type);
                                  const iconColors = getIconColors(item.type);
                                  const isEvidenceSelected =
                                    selectedEvidence.has(item.id);

                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 p-2 hover:bg-card-dark rounded-md transition-colors group"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isEvidenceSelected}
                                        onChange={() =>
                                          toggleEvidenceSelection(item.id)
                                        }
                                        disabled={!isSelected}
                                        className="h-4 w-4 rounded border-card-lighter text-primary focus:ring-0 bg-transparent cursor-pointer disabled:opacity-50"
                                      />
                                      <div
                                        className={`h-8 w-8 rounded ${iconColors} flex items-center justify-center`}
                                      >
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                          {item.note ||
                                            item.file_path?.split("/").pop() ||
                                            "Evidence item"}
                                        </p>
                                        <p className="text-xs text-text-subtle">
                                          {format(
                                            new Date(item.uploaded_at),
                                            "MMM d"
                                          )}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => openPreview(item)}
                                        className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-primary transition-all p-1"
                                        title="Preview file"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-amber-400 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                No evidence attached. This weakens your
                                position.
                              </div>
                            )}
                          </>
                        )}
                        {!isExpanded && (
                          <div className="flex items-center gap-2 mt-1">
                            {evidenceItems.length === 0 && isOpen && (
                              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                No Evidence
                              </span>
                            )}
                            {commsCount === 0 && isOpen && (
                              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                No Comms
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleIssueExpanded(issue.id)}
                        className="p-2 text-text-subtle hover:text-primary transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-text-subtle">
                No issues available.{" "}
                <Link href="/issues/new" className="text-primary hover:underline">
                  Create an issue first
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pack Summary */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="sticky top-24 space-y-6">
            {/* Summary Card */}
            <div className="bg-card-dark rounded-xl border border-card-lighter shadow-xl overflow-hidden flex flex-col relative group">
              <div className="absolute inset-0 bg-primary/10 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-6 border-b border-card-lighter">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-primary" />
                    Pack Summary
                  </h2>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${readinessConfig.bg} ${readinessConfig.text}`}
                  >
                    {packReadiness.statusLabel}
                  </span>
                </div>
              </div>
              <div className="relative p-6 flex flex-col bg-background-dark/50">
                {/* Mode Selector */}
                <div className="mb-4">
                  <p className="text-xs text-text-subtle uppercase font-semibold mb-2">
                    Pack Mode
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPackMode("concise")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        packMode === "concise"
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-card-lighter bg-card-dark hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${packMode === "concise" ? "bg-primary" : "bg-card-lighter"}`} />
                        <span className={`text-sm font-bold ${packMode === "concise" ? "text-primary" : "text-white"}`}>
                          Concise
                        </span>
                      </div>
                      <p className="text-xs text-text-subtle">
                        5 pages max • Embedded images
                      </p>
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                        Recommended
                      </span>
                    </button>
                    <button
                      onClick={() => setPackMode("detailed")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        packMode === "detailed"
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-card-lighter bg-card-dark hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${packMode === "detailed" ? "bg-primary" : "bg-card-lighter"}`} />
                        <span className={`text-sm font-bold ${packMode === "detailed" ? "text-primary" : "text-white"}`}>
                          Detailed
                        </span>
                      </div>
                      <p className="text-xs text-text-subtle">
                        Full content • All images
                      </p>
                    </button>
                  </div>
                </div>

                {/* Filename */}
                <div className="mb-4">
                  <p className="text-xs text-text-subtle uppercase font-semibold mb-1">
                    Filename
                  </p>
                  <p className="text-white font-medium text-sm truncate">
                    {packFilename.replace("Evidence_Pack", `Evidence_Pack_${packMode === "concise" ? "Concise" : "Detailed"}`)}
                  </p>
                </div>

                {/* Coverage - Primary */}
                <div className="p-4 rounded-lg bg-card-dark border border-card-lighter mb-4">
                  <p className="text-xs text-text-subtle uppercase font-semibold mb-2">
                    Issue Coverage
                  </p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {packReadiness.coverage.includedIssues} of{" "}
                    {packReadiness.coverage.totalOpenIssues}
                  </p>
                  <p className="text-sm text-text-subtle">
                    open issues included
                  </p>
                  {packReadiness.coverage.excludedIssues > 0 && (
                    <p className="text-sm text-amber-400 mt-2">
                      {packReadiness.coverage.excludedIssues} issue
                      {packReadiness.coverage.excludedIssues > 1 ? "s" : ""}{" "}
                      excluded
                    </p>
                  )}
                </div>

                {/* Secondary stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-card-dark p-3 rounded-lg border border-card-lighter">
                    <p className="text-xs text-text-subtle uppercase font-semibold">
                      Evidence
                    </p>
                    <p className="text-xl font-bold text-white">
                      {totalSelectedEvidence}
                    </p>
                  </div>
                  <div className="bg-card-dark p-3 rounded-lg border border-card-lighter">
                    <p className="text-xs text-text-subtle uppercase font-semibold">
                      Issues
                    </p>
                    <p className="text-xl font-bold text-white">
                      {selectedIssues.size}
                    </p>
                  </div>
                </div>

                {/* Risk Warning */}
                {(packReadiness.status === "weak" ||
                  packReadiness.status === "high-risk") && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                    <p className="text-amber-400 text-sm">
                      <strong>Warning:</strong> This pack may weaken your
                      position if submitted. Review excluded issues and gaps
                      before generating.
                    </p>
                  </div>
                )}

                {/* Hard-blocked warning */}
                {!packEnforcement.allowed && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 text-sm font-medium">
                          Generation Blocked
                        </p>
                        <p className="text-text-subtle text-xs mt-1">
                          Your case health is too weak to generate a pack safely.
                          Add evidence and communications first.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerateClick}
                  disabled={generating || selectedIssues.size === 0}
                  className={`w-full py-4 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    !packEnforcement.allowed
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-red-500/30"
                      : packEnforcement.requiresConfirmation
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/30"
                      : "bg-primary hover:bg-primary/90 text-background-dark shadow-primary/30"
                  }`}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : !packEnforcement.allowed ? (
                    <>
                      <ShieldAlert className="h-5 w-5 mr-2" />
                      Blocked - Strengthen Case
                    </>
                  ) : packEnforcement.requiresConfirmation ? (
                    <>
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Generate with Confirmation
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Generate Evidence Pack
                    </>
                  )}
                </Button>
                {selectedIssues.size === 0 && (
                  <p className="mt-2 text-xs text-red-400 text-center">
                    Select at least one issue to generate a pack
                  </p>
                )}

                {/* Plan mode indicator */}
                <div className="mt-3 text-center">
                  <span className="text-xs text-text-subtle">
                    Mode:{" "}
                    <span className="text-white font-medium capitalize">
                      {packEnforcement.context.planMode}
                    </span>
                    {packEnforcement.context.planMode === "guided" && (
                      <span className="text-text-subtle"> - Protective guardrails active</span>
                    )}
                  </span>
                </div>
                <p className="mt-4 text-xs text-text-subtle text-center">
                  Formatted for tribunal/dispute resolution.{" "}
                  <span className="text-white font-medium">
                    Not legal advice.
                  </span>
                </p>
              </div>
            </div>

            {/* Document Structure - v2 */}
            <div className="bg-card-dark rounded-xl border border-card-lighter p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                  {packMode === "concise" ? "Concise Layout" : "Detailed Layout"}
                </h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  packMode === "concise" 
                    ? "text-green-400 bg-green-500/10" 
                    : "text-primary bg-primary/10"
                }`}>
                  {packMode === "concise" ? "≤5 pages" : "Full content"}
                </span>
              </div>
              <div className="space-y-0 relative text-xs">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-card-lighter" />
                {packMode === "concise" ? (
                  // Concise mode structure
                  <>
                    {[
                      { label: "Page 1", active: true, desc: "Cover + Readiness + Summary + Gaps" },
                      { label: "Pages 2-5", active: selectedIssues.size > 0, desc: `Issue sections with embedded images` },
                    ].map((item, idx) => (
                      <div key={idx} className="relative flex items-center gap-2 pb-2">
                        <div
                          className={`h-4 w-4 rounded-full border border-card-dark z-10 flex items-center justify-center ${
                            item.active ? "bg-green-500" : "bg-card-lighter"
                          }`}
                        >
                          {item.active && <Check className="h-2 w-2 text-white" />}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className={item.active ? "text-white" : "text-text-subtle"}>
                            {item.label}
                          </span>
                          <span className="text-text-subtle">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                      <p className="text-green-400 text-[10px] font-medium mb-1">Per Issue Section:</p>
                      <ul className="text-text-subtle text-[10px] space-y-0.5">
                        <li>• Issue facts + mini timeline</li>
                        <li>• Up to 4 images (2×2 grid)</li>
                        <li>• Recent comms + response status</li>
                        <li>• SHA-256 hashes</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  // Detailed mode structure
                  [
                    { label: "Cover Page", active: true, desc: "Property & jurisdiction" },
                    { label: "Pack Readiness", active: true, desc: packReadiness.statusLabel },
                    { label: "Executive Summary", active: true, desc: "Factual conclusion" },
                    { label: "Risk & Urgency", active: selectedIssues.size > 0, desc: "Priority overview" },
                    { label: "Master Timeline", active: selectedIssues.size > 0, desc: "All events" },
                    { label: "Issue Details", active: selectedIssues.size > 0, desc: `${selectedIssues.size} full sections` },
                    { label: "Evidence Inventory", active: totalSelectedEvidence > 0, desc: `${totalSelectedEvidence} items + SHA-256` },
                    { label: "Comms Log", active: true, desc: "Full history" },
                    { label: "Documentation Gaps", active: true, desc: "All gaps" },
                    { label: "Disclaimers", active: true, desc: "Legal notices" },
                  ].map((item, idx) => (
                    <div key={idx} className="relative flex items-center gap-2 pb-2">
                      <div
                        className={`h-4 w-4 rounded-full border border-card-dark z-10 flex items-center justify-center ${
                          item.active ? "bg-primary" : "bg-card-lighter"
                        }`}
                      >
                        {item.active && <Check className="h-2 w-2 text-white" />}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className={item.active ? "text-white" : "text-text-subtle"}>
                          {item.label}
                        </span>
                        <span className="text-text-subtle">{item.desc}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowConfirmation(false)}
        >
          <div
            className="relative max-w-lg w-full bg-card-dark rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-card-lighter">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Confirm Pack Generation
                  </h3>
                  <p className="text-sm text-white/80">
                    Your pack has gaps that may affect your position
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Critical warnings first */}
              {packReadiness.warnings.filter((w) => w.type === "critical")
                .length > 0 && (
                <div className="mb-4">
                  <h4 className="text-red-400 font-bold text-sm uppercase mb-2">
                    Critical Issues
                  </h4>
                  <div className="space-y-2">
                    {packReadiness.warnings
                      .filter((w) => w.type === "critical")
                      .map((warning, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-red-400 font-medium">
                              {warning.title}
                            </p>
                            <p className="text-white/90">{warning.message}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Other warnings */}
              {packReadiness.warnings.filter((w) => w.type !== "critical")
                .length > 0 && (
                <div className="mb-4">
                  <h4 className="text-amber-400 font-bold text-sm uppercase mb-2">
                    Warnings
                  </h4>
                  <div className="space-y-2">
                    {packReadiness.warnings
                      .filter((w) => w.type !== "critical")
                      .map((warning, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-sm text-white/90"
                        >
                          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{warning.message}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Coverage summary */}
              <div className="p-4 rounded-lg bg-card-lighter mb-4">
                <p className="text-white text-sm">
                  <strong>This pack includes:</strong>{" "}
                  {packReadiness.coverage.includedIssues} of{" "}
                  {packReadiness.coverage.totalOpenIssues} open issues
                  {packReadiness.coverage.excludedIssues > 0 && (
                    <span className="text-amber-400">
                      {" "}
                      ({packReadiness.coverage.excludedIssues} excluded)
                    </span>
                  )}
                </p>
              </div>

              {/* Acknowledgement */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmationAcknowledged}
                  onChange={(e) =>
                    setConfirmationAcknowledged(e.target.checked)
                  }
                  className="h-5 w-5 rounded border-card-lighter text-primary focus:ring-0 bg-background-dark cursor-pointer mt-0.5"
                />
                <span className="text-sm text-white/90">
                  I understand that excluded issues will{" "}
                  <strong className="text-white">not</strong> be included in
                  this submission artifact. I have reviewed the warnings and
                  accept responsibility for the pack contents.
                </span>
              </label>
            </div>

            <div className="p-6 border-t border-card-lighter flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-background-dark font-bold"
                disabled={!confirmationAcknowledged}
                onClick={handleGeneratePack}
              >
                Generate Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closePreview}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full bg-card-dark rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-card-lighter">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getFileIcon(previewItem.type);
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
                <div>
                  <h3 className="text-white font-semibold">
                    {previewItem.note ||
                      previewItem.file_path?.split("/").pop() ||
                      "Evidence"}
                  </h3>
                  <p className="text-xs text-text-subtle">
                    Uploaded{" "}
                    {format(new Date(previewItem.uploaded_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-text-subtle hover:text-primary transition-colors"
                    title="Open in new tab"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                )}
                <button
                  onClick={closePreview}
                  className="p-2 text-text-subtle hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-80px)] overflow-auto">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-text-subtle">Loading preview...</p>
                </div>
              ) : previewUrl ? (
                isImageType(previewItem.type) ? (
                  <img
                    src={previewUrl}
                    alt={previewItem.note || "Evidence"}
                    className="max-w-full max-h-[calc(90vh-120px)] object-contain"
                  />
                ) : isPdfType(previewItem.type) ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[calc(90vh-120px)]"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="h-16 w-16 text-text-subtle" />
                    <p className="text-text-subtle">
                      Preview not available for this file type
                    </p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download to view
                    </a>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <FileText className="h-16 w-16 text-text-subtle" />
                  <p className="text-text-subtle">Unable to load preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enforcement Modal */}
      {enforcement && (
        <EnforcementModal
          open={showEnforcementModal}
          onOpenChange={setShowEnforcementModal}
          enforcement={enforcement}
          onConfirm={handleEnforcementConfirm}
          onCancel={handleEnforcementCancel}
          showReasonInput={enforcement.level === "soft-blocked"}
        />
      )}
    </div>
  );
}
