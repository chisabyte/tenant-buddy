/**
 * Case Health Enforcement System
 *
 * Enforces protective guardrails based on Case Health status to prevent users
 * from weakening their position through premature or risky actions.
 *
 * Enforcement Levels:
 * - allowed: Action proceeds normally
 * - warned: Action proceeds with inline warning
 * - soft-blocked: Action requires explicit confirmation with risk acknowledgment
 * - hard-blocked: Action is prevented entirely
 *
 * Plan Modes:
 * - Guided Mode (Free/Plus): Full enforcement with educational copy
 * - Advisor Mode (Pro): Softer enforcement, more autonomy, still logs overrides
 */

import type { CaseHealthStatus } from "./case-health";
import type { PlanId } from "./billing/plans";

// ============================================================================
// TYPES
// ============================================================================

export type EnforcementLevel = "allowed" | "warned" | "soft-blocked" | "hard-blocked";

export type EnforcementAction =
  | "generate_pack"
  | "close_issue"
  | "resolve_issue"
  | "delete_evidence"
  | "delete_comms"
  | "archive_issue";

export interface EnforcementResult {
  level: EnforcementLevel;
  allowed: boolean;
  requiresConfirmation: boolean;
  message: EnforcementMessage;
  context: EnforcementContext;
}

export interface EnforcementMessage {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  warningText?: string;
}

export interface EnforcementContext {
  action: EnforcementAction;
  healthStatus: CaseHealthStatus;
  healthScore: number;
  planMode: "guided" | "advisor";
  planId: PlanId;
}

export interface OverrideLogEntry {
  user_id: string;
  action: EnforcementAction;
  enforcement_level: EnforcementLevel;
  health_status: CaseHealthStatus;
  health_score: number;
  issue_id?: string;
  evidence_id?: string;
  pack_id?: string;
  reason?: string;
  created_at: string;
}

// ============================================================================
// ENFORCEMENT MATRIX
// ============================================================================

/**
 * The enforcement matrix defines what enforcement level applies for each
 * action at each Case Health status level.
 *
 * This is the SINGLE SOURCE OF TRUTH for enforcement rules.
 */
const ENFORCEMENT_MATRIX: Record<
  CaseHealthStatus,
  Record<EnforcementAction, EnforcementLevel>
> = {
  // Strong (80-100%): Case is well-documented
  strong: {
    generate_pack: "allowed",
    close_issue: "allowed",
    resolve_issue: "allowed",
    delete_evidence: "warned",
    delete_comms: "warned",
    archive_issue: "allowed",
  },

  // Adequate (60-79%): Case has minor gaps
  adequate: {
    generate_pack: "warned",
    close_issue: "warned",
    resolve_issue: "warned",
    delete_evidence: "soft-blocked",
    delete_comms: "soft-blocked",
    archive_issue: "warned",
  },

  // Weak (40-59%): Case has significant gaps
  weak: {
    generate_pack: "soft-blocked",
    close_issue: "soft-blocked",
    resolve_issue: "soft-blocked",
    delete_evidence: "soft-blocked",
    delete_comms: "soft-blocked",
    archive_issue: "soft-blocked",
  },

  // At-Risk (0-39%): Case is unprotected
  "at-risk": {
    generate_pack: "hard-blocked",
    close_issue: "hard-blocked",
    resolve_issue: "soft-blocked",
    delete_evidence: "hard-blocked",
    delete_comms: "hard-blocked",
    archive_issue: "hard-blocked",
  },
};

/**
 * Advisor mode (Pro plan) softens enforcement by one level
 * Hard-blocked becomes soft-blocked, soft-blocked becomes warned, etc.
 */
function softenEnforcement(level: EnforcementLevel): EnforcementLevel {
  switch (level) {
    case "hard-blocked":
      return "soft-blocked";
    case "soft-blocked":
      return "warned";
    case "warned":
      return "allowed";
    case "allowed":
      return "allowed";
  }
}

// ============================================================================
// ENFORCEMENT MESSAGES
// ============================================================================

const ACTION_LABELS: Record<EnforcementAction, string> = {
  generate_pack: "Generate Evidence Pack",
  close_issue: "Close Issue",
  resolve_issue: "Mark as Resolved",
  delete_evidence: "Delete Evidence",
  delete_comms: "Delete Communication Log",
  archive_issue: "Archive Issue",
};

const ACTION_RISK_DESCRIPTIONS: Record<EnforcementAction, string> = {
  generate_pack:
    "Generating a pack with incomplete documentation may weaken your position if used in a dispute.",
  close_issue:
    "Closing an issue without sufficient evidence or communication records may limit your options if the problem recurs.",
  resolve_issue:
    "Marking this as resolved will move it out of your active case. Ensure you have documented the resolution.",
  delete_evidence:
    "Deleting evidence permanently removes it from your case. This cannot be undone and may weaken your position.",
  delete_comms:
    "Deleting communication logs removes your documentation of landlord/agent contact. This cannot be undone.",
  archive_issue:
    "Archiving this issue will remove it from your active case without resolution documentation.",
};

function getEnforcementMessage(
  action: EnforcementAction,
  level: EnforcementLevel,
  status: CaseHealthStatus,
  mode: "guided" | "advisor"
): EnforcementMessage {
  const actionLabel = ACTION_LABELS[action];
  const riskDescription = ACTION_RISK_DESCRIPTIONS[action];

  // Guided mode uses more educational, protective language
  // Advisor mode uses more neutral, informational language
  const isGuided = mode === "guided";

  switch (level) {
    case "allowed":
      return {
        title: actionLabel,
        description: `Your case is in ${status} health. Proceed when ready.`,
      };

    case "warned":
      return {
        title: isGuided ? `Consider Before Proceeding` : `Note`,
        description: isGuided
          ? `Your case health is "${status}". ${riskDescription}`
          : `Case health: ${status}. ${riskDescription}`,
        warningText: isGuided
          ? "We recommend addressing the gaps in your documentation first."
          : undefined,
      };

    case "soft-blocked":
      return {
        title: isGuided
          ? `Are You Sure? Your Case Has Gaps`
          : `Confirm ${actionLabel}`,
        description: isGuided
          ? `Your case health is "${status}", indicating significant documentation gaps. ${riskDescription}`
          : `Case health is ${status}. ${riskDescription}`,
        confirmLabel: isGuided
          ? "I Understand the Risk - Proceed Anyway"
          : "Proceed",
        cancelLabel: isGuided ? "Go Back and Strengthen Case" : "Cancel",
        warningText: isGuided
          ? "This action will be logged. Consider improving your case documentation first."
          : "This action will be logged for your records.",
      };

    case "hard-blocked":
      return {
        title: isGuided
          ? `Action Blocked - Case Not Ready`
          : `Cannot ${actionLabel}`,
        description: isGuided
          ? `Your case health is "${status}", which means your documentation is insufficient to proceed safely. ${riskDescription}`
          : `Case health of "${status}" prevents this action. Improve documentation first.`,
        cancelLabel: "Go Back",
        warningText: isGuided
          ? "Build your case by adding evidence and logging communications before attempting this action."
          : "Minimum documentation requirements not met.",
      };
  }
}

// ============================================================================
// MAIN ENFORCEMENT FUNCTION
// ============================================================================

/**
 * Check if an action is allowed based on Case Health and plan.
 *
 * @param action - The action being attempted
 * @param healthStatus - Current Case Health status
 * @param healthScore - Current Case Health score (0-100)
 * @param planId - User's plan ID
 * @returns EnforcementResult with level, messages, and context
 */
export function checkEnforcement(
  action: EnforcementAction,
  healthStatus: CaseHealthStatus,
  healthScore: number,
  planId: PlanId
): EnforcementResult {
  // Determine plan mode
  const planMode: "guided" | "advisor" = planId === "pro" ? "advisor" : "guided";

  // Get base enforcement level from matrix
  let level = ENFORCEMENT_MATRIX[healthStatus][action];

  // Soften enforcement for Advisor mode (Pro users)
  if (planMode === "advisor") {
    level = softenEnforcement(level);
  }

  // Build result
  const allowed = level !== "hard-blocked";
  const requiresConfirmation = level === "soft-blocked";
  const message = getEnforcementMessage(action, level, healthStatus, planMode);

  return {
    level,
    allowed,
    requiresConfirmation,
    message,
    context: {
      action,
      healthStatus,
      healthScore,
      planMode,
      planId,
    },
  };
}

/**
 * Get a quick check for whether an action is blocked
 */
export function isActionBlocked(
  action: EnforcementAction,
  healthStatus: CaseHealthStatus,
  planId: PlanId
): boolean {
  const result = checkEnforcement(action, healthStatus, 0, planId);
  return !result.allowed;
}

/**
 * Get a quick check for whether an action requires confirmation
 */
export function requiresConfirmation(
  action: EnforcementAction,
  healthStatus: CaseHealthStatus,
  planId: PlanId
): boolean {
  const result = checkEnforcement(action, healthStatus, 0, planId);
  return result.requiresConfirmation;
}

// ============================================================================
// SCORING WEIGHTS (for Case Health updates)
// ============================================================================

/**
 * Recommended weights for Case Health scoring factors.
 * These can be adjusted for tuning.
 */
export const SCORING_WEIGHTS = {
  evidence: 0.30, // 30% - Evidence quality and quantity
  communications: 0.25, // 25% - Communication trail
  severity: 0.15, // 15% - Proper severity classification
  documentation: 0.15, // 15% - Issue description quality
  recency: 0.15, // 15% - Recent activity
} as const;

/**
 * Score thresholds for each status band
 */
export const SCORE_THRESHOLDS = {
  strong: 80, // 80-100
  adequate: 60, // 60-79
  weak: 40, // 40-59
  "at-risk": 0, // 0-39
} as const;

/**
 * Get status from score
 */
export function getStatusFromScore(score: number): CaseHealthStatus {
  if (score >= SCORE_THRESHOLDS.strong) return "strong";
  if (score >= SCORE_THRESHOLDS.adequate) return "adequate";
  if (score >= SCORE_THRESHOLDS.weak) return "weak";
  return "at-risk";
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all actions and their current enforcement level for a given health status
 */
export function getEnforcementSummary(
  healthStatus: CaseHealthStatus,
  planId: PlanId
): Record<EnforcementAction, EnforcementLevel> {
  const actions: EnforcementAction[] = [
    "generate_pack",
    "close_issue",
    "resolve_issue",
    "delete_evidence",
    "delete_comms",
    "archive_issue",
  ];

  const summary = {} as Record<EnforcementAction, EnforcementLevel>;

  for (const action of actions) {
    const result = checkEnforcement(action, healthStatus, 0, planId);
    summary[action] = result.level;
  }

  return summary;
}

/**
 * Get user-friendly explanation of enforcement for UI
 */
export function getEnforcementExplanation(
  planMode: "guided" | "advisor"
): string {
  if (planMode === "guided") {
    return "Guided Mode protects your case by requiring confirmation for risky actions when your documentation has gaps. This helps prevent accidentally weakening your position.";
  }
  return "Advisor Mode gives you more flexibility while still logging important actions. You'll see recommendations but have more control over your workflow.";
}
