"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import {
  checkEnforcement,
  type EnforcementResult,
  type EnforcementAction,
} from "@/lib/enforcement";
import { EnforcementModal } from "@/components/enforcement-modal";
import type { CaseHealthStatus } from "@/lib/case-health";
import type { PlanId } from "@/lib/billing/plans";

interface IssueActionsProps {
  issueId: string;
  issueTitle: string;
  currentStatus: string;
  evidenceCount?: number;
  commsCount?: number;
}

export function IssueActions({ issueId, issueTitle, currentStatus, evidenceCount = 0, commsCount = 0 }: IssueActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enforcement state
  const [enforcement, setEnforcement] = useState<EnforcementResult | null>(null);
  const [showEnforcementModal, setShowEnforcementModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [userPlanId, setUserPlanId] = useState<PlanId>("free");
  const [healthData, setHealthData] = useState<{ status: CaseHealthStatus; score: number }>({
    status: "adequate",
    score: 60,
  });

  // Fetch issue health and plan data on mount
  useEffect(() => {
    const fetchHealthData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get subscription for plan
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("price_id, status")
        .eq("user_id", user.id)
        .single();

      let planId: PlanId = "free";
      if (subscription?.status === "active" || subscription?.status === "trialing") {
        if (subscription.price_id?.includes("pro")) {
          planId = "pro";
        } else if (subscription.price_id?.includes("plus")) {
          planId = "plus";
        }
      }
      setUserPlanId(planId);

      // Get evidence count
      const { count: evCount } = await supabase
        .from("evidence_items")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issueId);

      // Get comms count
      const { count: cmCount } = await supabase
        .from("comms_logs")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issueId);

      // Calculate simple health score based on evidence and comms
      const ev = evCount || 0;
      const cm = cmCount || 0;

      let score = 40; // Base score
      if (ev >= 1) score += 15;
      if (ev >= 3) score += 15;
      if (cm >= 1) score += 15;
      if (cm >= 2) score += 15;

      let status: CaseHealthStatus = "at-risk";
      if (score >= 80) status = "strong";
      else if (score >= 60) status = "adequate";
      else if (score >= 40) status = "weak";

      setHealthData({ status, score });
    };

    fetchHealthData();
  }, [issueId]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${issueTitle}"?\n\nThis will permanently remove the issue and unlink any associated evidence and communications. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("issues")
        .delete()
        .eq("id", issueId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Redirect to issues list after successful deletion
      router.push("/issues");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete issue";
      setError(errorMessage);
      setDeleting(false);
    }
  };

  const checkStatusEnforcement = useCallback((newStatus: string): EnforcementResult | null => {
    // Only check enforcement for closing/resolving
    if (newStatus !== "closed" && newStatus !== "resolved") {
      return null;
    }

    const action: EnforcementAction = newStatus === "closed" ? "close_issue" : "resolve_issue";
    return checkEnforcement(action, healthData.status, healthData.score, userPlanId);
  }, [healthData, userPlanId]);

  const handleStatusChange = async (newStatus: string) => {
    // Check enforcement
    const enforcementResult = checkStatusEnforcement(newStatus);

    if (enforcementResult) {
      if (!enforcementResult.allowed) {
        // Hard blocked - show modal
        setEnforcement(enforcementResult);
        setPendingStatus(newStatus);
        setShowEnforcementModal(true);
        return;
      }

      if (enforcementResult.requiresConfirmation) {
        // Soft blocked - show confirmation modal
        setEnforcement(enforcementResult);
        setPendingStatus(newStatus);
        setShowEnforcementModal(true);
        return;
      }

      if (enforcementResult.level === "warned") {
        // Show warning but allow
        const proceed = window.confirm(
          `${enforcementResult.message.title}\n\n${enforcementResult.message.description}\n\nDo you want to proceed?`
        );
        if (!proceed) return;
      }
    }

    // Proceed with status change
    await performStatusChange(newStatus);
  };

  const performStatusChange = async (newStatus: string, reason?: string) => {
    setUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Log override if enforcement was bypassed
      if (enforcement && user && (enforcement.level === "warned" || enforcement.level === "soft-blocked")) {
        await supabase.from("override_logs").insert({
          user_id: user.id,
          action: newStatus === "closed" ? "close_issue" : "resolve_issue",
          enforcement_level: enforcement.level,
          health_status: enforcement.context.healthStatus,
          health_score: enforcement.context.healthScore,
          issue_id: issueId,
          reason: reason || null,
          plan_id: enforcement.context.planId,
          plan_mode: enforcement.context.planMode,
        });
      }

      const { error: updateError } = await supabase
        .from("issues")
        .update({ status: newStatus })
        .eq("id", issueId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status";
      setError(errorMessage);
    } finally {
      setUpdating(false);
      setEnforcement(null);
      setPendingStatus(null);
    }
  };

  const handleEnforcementConfirm = async (reason?: string) => {
    setShowEnforcementModal(false);
    if (pendingStatus) {
      await performStatusChange(pendingStatus, reason);
    }
  };

  const handleEnforcementCancel = () => {
    setShowEnforcementModal(false);
    setEnforcement(null);
    setPendingStatus(null);
  };

  // Get enforcement preview for status
  const closeEnforcement = checkStatusEnforcement("closed");
  const resolveEnforcement = checkStatusEnforcement("resolved");

  const getOptionStyle = (status: string): string => {
    if (status === "closed" && closeEnforcement && !closeEnforcement.allowed) {
      return "text-red-400";
    }
    if (status === "resolved" && resolveEnforcement && !resolveEnforcement.allowed) {
      return "text-red-400";
    }
    return "";
  };

  // Check if any close/resolve options are blocked
  const hasBlockedOptions =
    (closeEnforcement && !closeEnforcement.allowed) ||
    (resolveEnforcement && !resolveEnforcement.allowed);

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Enforcement warning for blocked statuses */}
      {hasBlockedOptions && (currentStatus === "open" || currentStatus === "in_progress") && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-medium">Case Needs Strengthening</p>
            <p className="text-text-subtle text-xs mt-1">
              Some status options are restricted until you add more evidence or log communications.
              Case health: <span className="text-white font-medium">{healthData.score}%</span> ({healthData.status})
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Status Change Dropdown */}
        <div className="relative">
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updating}
            className="h-9 px-3 pr-8 rounded-lg border border-card-lighter bg-card-lighter text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 appearance-none cursor-pointer [&>option]:bg-card-dark [&>option]:text-white"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved" className={getOptionStyle("resolved")}>
              Resolved {resolveEnforcement && !resolveEnforcement.allowed ? "(Blocked)" : resolveEnforcement?.requiresConfirmation ? "(Needs Confirmation)" : ""}
            </option>
            <option value="closed" className={getOptionStyle("closed")}>
              Closed {closeEnforcement && !closeEnforcement.allowed ? "(Blocked)" : closeEnforcement?.requiresConfirmation ? "(Needs Confirmation)" : ""}
            </option>
          </select>
          {updating && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Delete Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        >
          {deleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Issue
            </>
          )}
        </Button>
      </div>

      {/* Plan mode indicator */}
      <div className="text-xs text-text-subtle">
        Mode:{" "}
        <span className="text-white font-medium capitalize">
          {userPlanId === "pro" ? "advisor" : "guided"}
        </span>
        {userPlanId !== "pro" && (
          <span className="text-text-subtle"> - Protective guardrails active</span>
        )}
      </div>

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
