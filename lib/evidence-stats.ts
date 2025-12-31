/**
 * Canonical Evidence Statistics
 * 
 * SINGLE SOURCE OF TRUTH for evidence counting across UI and PDF.
 * All evidence counts must use these functions to avoid discrepancies.
 */

import type { EvidenceType } from "@/lib/database.types";

// ============================================================================
// Types
// ============================================================================

export interface EvidenceStats {
  totalCount: number;
  imageCount: number;
  documentCount: number;
  lastEvidenceDate: string | null;
  evidenceIds: string[];
  imageIds: string[];
}

export interface CommsStats {
  totalCount: number;
  outboundCount: number;
  inboundCount: number;
  lastOutboundDate: string | null;
  lastInboundDate: string | null;
  hasNotice: boolean;        // At least 1 outbound
  hasResponse: boolean;      // At least 1 inbound
}

export interface IssueCaseFacts {
  daysOpen: number;
  noticeStatus: "Sent" | "Not sent";
  responseStatus: string;  // "Response recorded" or "No response recorded as of <date>"
  evidenceStats: EvidenceStats;
  commsStats: CommsStats;
}

export interface EvidenceItem {
  id: string;
  issue_id?: string | null;
  type: string;
  occurred_at: string;
  uploaded_at?: string;
  file_path?: string | null;
}

export interface CommsItem {
  id?: string;
  issue_id?: string | null;
  occurred_at: string;
  direction?: "outbound" | "inbound";
}

// ============================================================================
// Image Type Detection
// ============================================================================

const IMAGE_TYPES: string[] = ["photo", "screenshot"];

export function isImageEvidence(type: string): boolean {
  return IMAGE_TYPES.includes(type?.toLowerCase());
}

export function isDocumentEvidence(type: string): boolean {
  return ["pdf", "document"].includes(type?.toLowerCase());
}

// ============================================================================
// Canonical Evidence Stats Function
// ============================================================================

/**
 * Get evidence statistics for a specific issue.
 * This is the CANONICAL function - use this everywhere.
 * 
 * @param issueId - The issue ID to get stats for
 * @param allEvidence - All evidence items (pre-filtered by user)
 * @returns EvidenceStats object
 */
export function getIssueEvidenceStats(
  issueId: string,
  allEvidence: EvidenceItem[]
): EvidenceStats {
  // CRITICAL: Filter by issue_id, nothing else
  const issueEvidence = allEvidence.filter(e => e.issue_id === issueId);
  
  const images = issueEvidence.filter(e => isImageEvidence(e.type));
  const documents = issueEvidence.filter(e => isDocumentEvidence(e.type));
  
  // Get last evidence date
  const dates = issueEvidence
    .map(e => new Date(e.occurred_at).getTime())
    .filter(d => !isNaN(d));
  const lastDate = dates.length > 0 
    ? new Date(Math.max(...dates)).toISOString() 
    : null;

  return {
    totalCount: issueEvidence.length,
    imageCount: images.length,
    documentCount: documents.length,
    lastEvidenceDate: lastDate,
    evidenceIds: issueEvidence.map(e => e.id),
    imageIds: images.map(e => e.id),
  };
}

/**
 * Get communications statistics for a specific issue.
 * This is the CANONICAL function - use this everywhere.
 * 
 * @param issueId - The issue ID to get stats for
 * @param allComms - All communications (pre-filtered by user)
 * @returns CommsStats object
 */
export function getIssueCommsStats(
  issueId: string,
  allComms: CommsItem[]
): CommsStats {
  // CRITICAL: Filter by issue_id, nothing else
  const issueComms = allComms.filter(c => c.issue_id === issueId);
  
  const outbound = issueComms.filter(c => c.direction !== "inbound");
  const inbound = issueComms.filter(c => c.direction === "inbound");
  
  // Get last dates
  const outboundDates = outbound
    .map(c => new Date(c.occurred_at).getTime())
    .filter(d => !isNaN(d));
  const inboundDates = inbound
    .map(c => new Date(c.occurred_at).getTime())
    .filter(d => !isNaN(d));
  
  const lastOutbound = outboundDates.length > 0 
    ? new Date(Math.max(...outboundDates)).toISOString() 
    : null;
  const lastInbound = inboundDates.length > 0 
    ? new Date(Math.max(...inboundDates)).toISOString() 
    : null;

  return {
    totalCount: issueComms.length,
    outboundCount: outbound.length,
    inboundCount: inbound.length,
    lastOutboundDate: lastOutbound,
    lastInboundDate: lastInbound,
    hasNotice: outbound.length > 0,
    hasResponse: inbound.length > 0,
  };
}

/**
 * Get complete case facts for an issue.
 * Combines evidence stats, comms stats, and computed fields.
 * 
 * @param issue - Issue with created_at date
 * @param allEvidence - All evidence items
 * @param allComms - All communications
 * @param asOfDate - Date to calculate "days open" from (defaults to now)
 * @returns IssueCaseFacts object
 */
export function getIssueCaseFacts(
  issue: { id: string; created_at: string; status?: string },
  allEvidence: EvidenceItem[],
  allComms: CommsItem[],
  asOfDate: Date = new Date()
): IssueCaseFacts {
  const evidenceStats = getIssueEvidenceStats(issue.id, allEvidence);
  const commsStats = getIssueCommsStats(issue.id, allComms);
  
  // Calculate days open
  const createdAt = new Date(issue.created_at);
  const daysOpen = Math.floor((asOfDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine notice status
  const noticeStatus: "Sent" | "Not sent" = commsStats.hasNotice ? "Sent" : "Not sent";
  
  // Determine response status
  const responseStatus = commsStats.hasResponse 
    ? "Response recorded"
    : `No response recorded as of ${formatDate(asOfDate)}`;

  return {
    daysOpen: Math.max(0, daysOpen),
    noticeStatus,
    responseStatus,
    evidenceStats,
    commsStats,
  };
}

/**
 * Validate evidence counts match between different sources.
 * Use this for debugging/dev logging.
 */
export function validateEvidenceCounts(
  issueId: string,
  source1Count: number,
  source2Count: number,
  source1Name: string = "Source1",
  source2Name: string = "Source2"
): { valid: boolean; message: string } {
  if (source1Count !== source2Count) {
    const message = `[EVIDENCE MISMATCH] Issue ${issueId}: ${source1Name}=${source1Count}, ${source2Name}=${source2Count}`;
    console.warn(message);
    return { valid: false, message };
  }
  return { valid: true, message: "Counts match" };
}

// ============================================================================
// Documentation Gap Detection
// ============================================================================

export interface DocumentationGap {
  type: "critical" | "warning" | "info";
  issueId: string;
  issueTitle: string;
  description: string;
  code: "no_comms" | "no_response" | "no_evidence" | "no_images" | "stale_evidence";
}

export function detectIssueGaps(
  issue: { id: string; title: string; severity?: string | null; created_at: string },
  caseFacts: IssueCaseFacts,
  staleDays: number = 90
): DocumentationGap[] {
  const gaps: DocumentationGap[] = [];
  const isHighPriority = issue.severity === "Urgent" || issue.severity === "High";
  
  // No communications logged
  if (caseFacts.commsStats.totalCount === 0) {
    gaps.push({
      type: isHighPriority ? "critical" : "warning",
      issueId: issue.id,
      issueTitle: issue.title,
      description: "No communications logged",
      code: "no_comms",
    });
  }
  
  // Notice sent but no response
  if (caseFacts.commsStats.hasNotice && !caseFacts.commsStats.hasResponse) {
    gaps.push({
      type: "info",
      issueId: issue.id,
      issueTitle: issue.title,
      description: "Notice sent, no response recorded",
      code: "no_response",
    });
  }
  
  // No evidence at all
  if (caseFacts.evidenceStats.totalCount === 0) {
    gaps.push({
      type: isHighPriority ? "critical" : "warning",
      issueId: issue.id,
      issueTitle: issue.title,
      description: "No evidence attached",
      code: "no_evidence",
    });
  }
  
  // No image evidence
  if (caseFacts.evidenceStats.imageCount === 0 && caseFacts.evidenceStats.totalCount > 0) {
    gaps.push({
      type: "warning",
      issueId: issue.id,
      issueTitle: issue.title,
      description: "No photo/screenshot evidence",
      code: "no_images",
    });
  }
  
  // Evidence is stale (older than staleDays)
  if (caseFacts.evidenceStats.lastEvidenceDate) {
    const lastDate = new Date(caseFacts.evidenceStats.lastEvidenceDate);
    const daysSinceEvidence = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceEvidence > staleDays) {
      gaps.push({
        type: "info",
        issueId: issue.id,
        issueTitle: issue.title,
        description: `Evidence is ${daysSinceEvidence} days old`,
        code: "stale_evidence",
      });
    }
  }

  return gaps;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });
}

