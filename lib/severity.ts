/**
 * Issue Severity Classification System
 *
 * IMPORTANT: This system is designed for legal defensibility.
 * Severity reflects the RISK and IMPACT of an issue, NOT its current status.
 *
 * Severity Rules:
 * 1. Severity is determined by risk/impact, not by age or status
 * 2. Severity NEVER decreases automatically
 * 3. Resolved issues retain their original severity (historical accuracy)
 * 4. High-risk keywords immediately elevate severity regardless of other factors
 * 5. Age may only ESCALATE severity, never reduce it
 */

export type Severity = "Urgent" | "High" | "Medium" | "Low";

/**
 * High-risk keywords that indicate immediate danger or significant impact.
 * These keywords trigger automatic severity elevation.
 */
const URGENT_KEYWORDS = [
  // Fire/smoke hazards
  "fire", "smoke", "burning", "flames",
  // Gas hazards
  "gas leak", "gas smell", "carbon monoxide",
  // Electrical hazards
  "electrical fire", "sparking", "electrocution", "shock",
  // Flooding/major water
  "flood", "flooding", "burst pipe", "burst tap", "sewage",
  // Security emergencies
  "break-in", "intruder", "assault",
];

const HIGH_KEYWORDS = [
  // Water issues (non-flooding)
  "burst", "leak", "leaking", "water damage", "water",
  // Electrical issues
  "electrical", "power outage", "no power", "wiring", "outlet",
  // Security issues
  "door", "lock", "broken lock", "window", "security",
  // Plumbing emergencies
  "toilet", "overflow", "blocked drain", "no hot water", "sewage smell",
  // Health hazards
  "mould", "mold", "asbestos", "pest", "rodent", "cockroach", "infestation",
  // Structural issues
  "ceiling collapse", "wall crack", "structural",
  // Heating/cooling failures
  "no heating", "no cooling", "heater broken", "ac broken",
];

const MEDIUM_KEYWORDS = [
  // Functional but non-dangerous
  "appliance", "dishwasher", "washing machine", "dryer", "fridge", "oven", "stove",
  // Minor plumbing
  "dripping", "tap", "faucet", "slow drain",
  // Minor electrical
  "light", "switch", "bulb",
  // Minor structural
  "crack", "paint", "peeling", "stain",
  // Fixtures
  "handle", "hinge", "cabinet", "drawer",
  // Outdoor
  "fence", "gate", "garden", "gutter",
];

/**
 * Calculates severity based on issue content.
 * This function analyzes title and description for risk indicators.
 *
 * @param title - The issue title
 * @param description - The issue description (optional)
 * @returns The calculated severity level
 */
export function calculateSeverity(
  title: string,
  description?: string | null
): Severity {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Check for URGENT keywords first (life safety, immediate danger)
  for (const keyword of URGENT_KEYWORDS) {
    if (text.includes(keyword)) {
      return "Urgent";
    }
  }

  // Check for HIGH keywords (significant risk/impact)
  for (const keyword of HIGH_KEYWORDS) {
    if (text.includes(keyword)) {
      return "High";
    }
  }

  // Check for MEDIUM keywords (functional issues)
  for (const keyword of MEDIUM_KEYWORDS) {
    if (text.includes(keyword)) {
      return "Medium";
    }
  }

  // Default to Low for cosmetic/minor issues with no risk indicators
  return "Low";
}

/**
 * Escalates severity based on age (days since creation).
 * Age can ONLY escalate severity, NEVER reduce it.
 *
 * @param currentSeverity - The current severity level
 * @param daysOld - Number of days since issue was created
 * @returns The escalated severity (or unchanged if no escalation needed)
 */
export function escalateSeverityByAge(
  currentSeverity: Severity,
  daysOld: number
): Severity {
  // Urgent stays Urgent
  if (currentSeverity === "Urgent") {
    return "Urgent";
  }

  // High can escalate to Urgent after 14 days unresolved
  if (currentSeverity === "High" && daysOld > 14) {
    return "Urgent";
  }

  // Medium can escalate to High after 21 days
  if (currentSeverity === "Medium" && daysOld > 21) {
    return "High";
  }

  // Low can escalate to Medium after 30 days
  if (currentSeverity === "Low" && daysOld > 30) {
    return "Medium";
  }

  // No change
  return currentSeverity;
}

/**
 * Gets the display severity for an issue.
 * This considers both the stored severity and age-based escalation.
 *
 * IMPORTANT: This function NEVER downgrades severity.
 * Status (resolved/closed) does NOT affect severity display.
 *
 * @param storedSeverity - The severity stored in the database
 * @param createdAt - The issue creation date
 * @param status - The issue status (NOT used for severity, only for escalation decisions)
 * @returns The display severity
 */
export function getDisplaySeverity(
  storedSeverity: Severity,
  createdAt: string,
  status: string
): Severity {
  // For resolved/closed issues, return the stored severity unchanged.
  // Historical accuracy: severity reflects what the issue WAS, not its current state.
  if (status === "resolved" || status === "closed") {
    return storedSeverity;
  }

  // For open/in_progress issues, check if age warrants escalation
  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysOld = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return escalateSeverityByAge(storedSeverity, daysOld);
}

/**
 * Returns the severity badge color classes for UI display
 */
export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case "Urgent":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "High":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "Medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "Low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

/**
 * Validates that a severity value is valid
 */
export function isValidSeverity(value: string): value is Severity {
  return ["Urgent", "High", "Medium", "Low"].includes(value);
}
