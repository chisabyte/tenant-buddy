/**
 * Evidence Pack v2 PDF Generator
 *
 * STRICT MODE ENFORCEMENT:
 * - Concise Mode: HARD CAP of 5 pages total (including cover)
 * - Detailed Mode: No page limit, full content
 *
 * VERSION: 2.2
 * 
 * FIXES:
 * - Uses canonical evidence stats to prevent false "no evidence" reports
 * - Adds Case Facts block (Days Open, Notice, Response) per issue
 * - Normalized descriptions for tribunal readability
 */

import PDFDocument from "pdfkit";
import { getStateRules, STATE_INFO_DISCLAIMER, type AustralianState } from "@/lib/state-rules";
import type { PackReadinessStatus } from "@/lib/pack-readiness";
import type { CaseHealthStatus } from "@/lib/case-health";
import type { EvidencePackMode } from "@/lib/validations";
import { 
  getIssueEvidenceStats, 
  getIssueCommsStats, 
  getIssueCaseFacts,
  detectIssueGaps,
  isImageEvidence,
  type EvidenceStats,
  type CommsStats,
  type IssueCaseFacts,
  type DocumentationGap,
} from "@/lib/evidence-stats";
import { normalizeForConcise, normalizeForDetailed } from "@/lib/text-normalizer";

const VERSION = "2.2";

// STRICT LIMITS FOR CONCISE MODE
const CONCISE_MAX_PAGES = 5;
const CONCISE_MAX_IMAGES_PER_ISSUE = 2;
const CONCISE_MAX_ISSUES = 4; // Max issues that can fit in 5 pages (1 cover + 4 issue pages)

// ============================================================================
// Type Definitions
// ============================================================================

export interface EvidencePackV2Data {
  user: { email: string; id: string };
  property: { address_text: string; state: AustralianState };
  issues: Array<IssueForPack>;
  evidence: Array<EvidenceForPack>;
  comms: Array<CommsForPack>;
  dateRange: { from: string; to: string };
  packReadiness: { score: number; status: PackReadinessStatus; statusLabel: string };
  caseHealth?: { score: number; status: CaseHealthStatus; statusLabel: string };
  generatedAt: Date;
  previousVersionDate?: string;
  mode?: EvidencePackMode;
  imageBuffers?: Map<string, Buffer>;
}

interface IssueForPack {
  id: string;
  title: string;
  description?: string | null;
  severity?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EvidenceForPack {
  id: string;
  issue_id?: string | null;
  type: string;
  category?: string | null;
  note?: string | null;
  occurred_at: string;
  uploaded_at?: string;
  sha256: string;
  file_path?: string | null;
}

interface CommsForPack {
  id?: string;
  issue_id?: string | null;
  occurred_at: string;
  channel: string;
  summary: string;
  direction?: "outbound" | "inbound";
  response_status?: "awaiting" | "received" | "none";
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  primary: "#1a1a2e",
  secondary: "#4a4e69",
  accent: "#22577a",
  danger: "#dc2626",
  warning: "#f59e0b",
  success: "#059669",
  muted: "#6b7280",
  light: "#f3f4f6",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  in_person: "In Person",
  letter: "Letter",
  app: "App",
  other: "Other",
};

// A4 dimensions
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 25;
const FOOTER_HEIGHT = 25;
const CONTENT_START_Y = MARGIN + HEADER_HEIGHT + 10;
const CONTENT_END_Y = PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT - 10;

// ============================================================================
// Main Generator Function
// ============================================================================

export async function generateEvidencePackPDF(data: EvidencePackV2Data): Promise<Buffer> {
  const packData = normalizeData(data);
  const mode = packData.mode || "concise";
  const isConcise = mode === "concise";

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: true,
        autoFirstPage: false, // We control page creation
        info: {
          Title: `Evidence Pack (${mode}) - ${packData.property.address_text}`,
          Author: "Tenant Buddy",
          Subject: "Tenancy Evidence Documentation",
          CreationDate: packData.generatedAt,
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      if (isConcise) {
        generateConcisePDF(doc, packData);
      } else {
        generateDetailedPDF(doc, packData);
      }

      // CRITICAL: Stamp page numbers AFTER all content, on existing pages only
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      // VALIDATION: Concise mode must not exceed 5 pages
      if (isConcise && totalPages > CONCISE_MAX_PAGES) {
        console.error(`[PDF] CRITICAL: Concise mode generated ${totalPages} pages (max: ${CONCISE_MAX_PAGES})`);
      }

      // Stamp headers/footers on each existing page (NO new pages created here)
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        drawPageHeaderFooter(doc, i + 1, totalPages, packData, mode);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// CONCISE MODE - STRICT 5 PAGE LIMIT
// ============================================================================

function generateConcisePDF(doc: PDFKit.PDFDocument, data: EvidencePackV2Data): void {
  // Page 1: Cover page with summary
  doc.addPage();
  drawConciseCoverPage(doc, data);

  // Pages 2-5: Issue pages (max 4 issues, 1 page each)
  const issuesToInclude = data.issues.slice(0, CONCISE_MAX_ISSUES);
  const truncatedCount = data.issues.length - issuesToInclude.length;

  issuesToInclude.forEach((issue, index) => {
    // Safety check: don't exceed page limit
    const currentRange = doc.bufferedPageRange();
    if (currentRange.count >= CONCISE_MAX_PAGES) {
      console.warn(`[PDF] Skipping issue "${issue.title}" - page limit reached`);
      return;
    }

    doc.addPage();
    drawConciseIssuePage(doc, issue, data, index + 1, issuesToInclude.length, truncatedCount);
  });

  // If we have more issues than pages allow, add truncation notice on last page
  if (truncatedCount > 0) {
    const lastY = doc.y;
    if (lastY < CONTENT_END_Y - 30) {
      doc.fontSize(8)
        .fillColor(COLORS.warning)
        .text(
          `⚠ ${truncatedCount} additional issue${truncatedCount > 1 ? "s" : ""} not shown. Generate Detailed mode for full content.`,
          MARGIN,
          CONTENT_END_Y - 20,
          { width: CONTENT_WIDTH, align: "center" }
        );
    }
  }
}

function drawConciseCoverPage(doc: PDFKit.PDFDocument, data: EvidencePackV2Data): void {
  const stateInfo = getStateRules(data.property.state);
  let y = CONTENT_START_Y;

  // Title
  doc.fontSize(20)
    .font("Helvetica-Bold")
    .fillColor(COLORS.primary)
    .text("Evidence Pack", MARGIN, y, { align: "center", width: CONTENT_WIDTH });
  y += 30;

  doc.fontSize(10)
    .font("Helvetica")
    .fillColor(COLORS.muted)
    .text(`Concise Mode • v${VERSION} • ${formatDate(data.generatedAt)}`, MARGIN, y, { align: "center", width: CONTENT_WIDTH });
  y += 30;

  // Property info box
  doc.rect(MARGIN, y, CONTENT_WIDTH, 50).fill(COLORS.light);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Property:", MARGIN + 10, y + 10);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(data.property.address_text, MARGIN + 10, y + 22);
  doc.text(`${data.property.state} • ${stateInfo.tribunalName}`, MARGIN + 10, y + 34);
  y += 60;

  // Pack Readiness with STRICT disclaimer
  const statusColors: Record<string, string> = {
    strong: COLORS.success,
    moderate: COLORS.warning,
    weak: "#ea580c",
    "high-risk": COLORS.danger,
  };
  const statusColor = statusColors[data.packReadiness.status] || COLORS.muted;

  doc.rect(MARGIN, y, CONTENT_WIDTH, 55).fill(COLORS.light);
  doc.fontSize(14).font("Helvetica-Bold").fillColor(statusColor)
    .text(data.packReadiness.statusLabel.toUpperCase(), MARGIN + 10, y + 8);
  doc.fontSize(8).font("Helvetica").fillColor(COLORS.muted)
    .text(`Pack Readiness: ${data.packReadiness.score}%`, MARGIN + 10, y + 26);
  // MANDATORY DISCLAIMER
  doc.fontSize(7).fillColor(COLORS.secondary)
    .text("Completeness only. Not legal merit.", MARGIN + 10, y + 38);
  y += 65;

  // Summary stats using CANONICAL counts
  const openIssues = data.issues.filter(i => i.status === "open" || i.status === "in_progress").length;
  const totalEvidence = data.evidence.length;
  const totalComms = data.comms.length;

  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Summary", MARGIN, y);
  y += 15;
  doc.fontSize(9).font("Helvetica").fillColor(COLORS.secondary);
  doc.text(`• ${data.issues.length} issue${data.issues.length !== 1 ? "s" : ""} documented (${openIssues} unresolved)`, MARGIN, y);
  y += 12;
  doc.text(`• ${totalEvidence} evidence item${totalEvidence !== 1 ? "s" : ""}`, MARGIN, y);
  y += 12;
  doc.text(`• ${totalComms} communication${totalComms !== 1 ? "s" : ""} logged`, MARGIN, y);
  y += 18;

  // Documentation Gaps Box (REQUIRED per spec)
  const allGaps = calculateCanonicalGaps(data);
  
  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Documentation Gaps", MARGIN, y);
  y += 14;
  
  if (allGaps.length > 0) {
    doc.fontSize(8).font("Helvetica");
    // Group by issue
    const criticalGaps = allGaps.filter(g => g.type === "critical");
    const warningGaps = allGaps.filter(g => g.type === "warning");
    
    [...criticalGaps, ...warningGaps].slice(0, 4).forEach(gap => {
      const color = gap.type === "critical" ? COLORS.danger : COLORS.warning;
      const icon = gap.type === "critical" ? "⚠" : "•";
      doc.fillColor(color).text(`${icon} ${truncate(gap.description, 65)}`, MARGIN, y);
      y += 11;
    });
    
    if (allGaps.length > 4) {
      doc.fillColor(COLORS.muted).text(`+ ${allGaps.length - 4} more gaps in Detailed mode`, MARGIN, y);
      y += 11;
    }
  } else {
    doc.fontSize(8).fillColor(COLORS.success).text("✓ No critical documentation gaps identified", MARGIN, y);
    y += 11;
  }
  y += 8;

  // Issues overview with CANONICAL evidence counts
  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Issues Overview", MARGIN, y);
  y += 14;
  doc.fontSize(8).font("Helvetica");

  data.issues.slice(0, 6).forEach((issue, idx) => {
    const sevColor = issue.severity === "Urgent" ? COLORS.danger : 
                     issue.severity === "High" ? "#ea580c" : COLORS.secondary;
    // Use CANONICAL evidence stats
    const stats = getIssueEvidenceStats(issue.id, data.evidence);
    const commsStats = getIssueCommsStats(issue.id, data.comms);
    
    doc.fillColor(sevColor).text(
      `${idx + 1}. ${truncate(issue.title, 30)} • ${issue.severity || "Low"} • ${stats.totalCount} ev • ${commsStats.totalCount} comms`,
      MARGIN, y
    );
    y += 11;
  });

  if (data.issues.length > 6) {
    doc.fillColor(COLORS.muted).text(`+ ${data.issues.length - 6} more issues...`, MARGIN, y);
  }

  // Disclaimer at bottom
  doc.fontSize(7).fillColor(COLORS.muted).text(
    "This document is for record-keeping only. It does not constitute legal advice.",
    MARGIN, CONTENT_END_Y - 15, { width: CONTENT_WIDTH, align: "center" }
  );
}

function drawConciseIssuePage(
  doc: PDFKit.PDFDocument,
  issue: IssueForPack,
  data: EvidencePackV2Data,
  issueNum: number,
  totalIssues: number,
  truncatedCount: number
): void {
  // ========================================================================
  // USE CANONICAL STATS - Prevents false "no evidence" reports
  // ========================================================================
  const caseFacts = getIssueCaseFacts(issue, data.evidence, data.comms, data.generatedAt);
  const { evidenceStats, commsStats } = caseFacts;
  
  // Get images using CANONICAL filter
  const imageEvidence = data.evidence.filter(
    e => e.issue_id === issue.id && isImageEvidence(e.type)
  );
  
  let y = CONTENT_START_Y;

  // Issue header
  const sevColor = issue.severity === "Urgent" ? COLORS.danger : 
                   issue.severity === "High" ? "#ea580c" : 
                   issue.severity === "Medium" ? COLORS.warning : COLORS.muted;

  doc.fontSize(12).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text(`Issue ${issueNum}: ${truncate(issue.title, 45)}`, MARGIN, y);
  y += 18;

  doc.fontSize(9).font("Helvetica").fillColor(sevColor)
    .text(`${issue.severity || "Low"} Severity`, MARGIN, y, { continued: true });
  doc.fillColor(COLORS.muted)
    .text(` • ${issue.status} • Reported: ${formatDate(issue.created_at)}`);
  y += 16;

  // ========================================================================
  // CASE FACTS BLOCK (Days Open, Notice, Response) - REQUIRED
  // ========================================================================
  doc.rect(MARGIN, y, CONTENT_WIDTH, 38).fill(COLORS.light);
  const factsY = y + 6;
  
  // Row 1: Days Open | Notice Status
  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Days Open:", MARGIN + 8, factsY);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(`${caseFacts.daysOpen}`, MARGIN + 55, factsY);
  
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Notice:", MARGIN + 100, factsY);
  const noticeColor = caseFacts.noticeStatus === "Sent" ? COLORS.success : COLORS.warning;
  doc.font("Helvetica").fillColor(noticeColor)
    .text(caseFacts.noticeStatus, MARGIN + 132, factsY);
  
  // Row 2: Response Status | Evidence/Comms counts
  const factsY2 = factsY + 14;
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Response:", MARGIN + 8, factsY2);
  const responseColor = commsStats.hasResponse ? COLORS.success : COLORS.warning;
  doc.font("Helvetica").fillColor(responseColor)
    .text(commsStats.hasResponse ? "Recorded" : "None recorded", MARGIN + 55, factsY2);
  
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Evidence:", MARGIN + 150, factsY2);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(`${evidenceStats.totalCount}`, MARGIN + 190, factsY2);
  
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Comms:", MARGIN + 220, factsY2);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(`${commsStats.totalCount}`, MARGIN + 255, factsY2);
  
  y += 46;

  // Brief description (NORMALIZED for tribunal, max 2 lines)
  if (issue.description) {
    const normalizedDesc = normalizeForConcise(issue.description);
    if (normalizedDesc) {
      doc.fontSize(8).fillColor(COLORS.secondary)
        .text(truncate(normalizedDesc, 140), MARGIN, y, { width: CONTENT_WIDTH });
      y = doc.y + 8;
    }
  }

  // Key events (max 3 bullets)
  doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.primary).text("Timeline:", MARGIN, y);
  y += 12;
  doc.fontSize(8).font("Helvetica").fillColor(COLORS.secondary);

  const events: string[] = [];
  events.push(`${formatDate(issue.created_at)}: Issue reported`);
  
  // Use CANONICAL evidence stats
  if (evidenceStats.totalCount > 0 && evidenceStats.lastEvidenceDate) {
    events.push(`Evidence: ${evidenceStats.totalCount} item${evidenceStats.totalCount !== 1 ? "s" : ""} uploaded`);
  }
  
  if (commsStats.outboundCount > 0 && commsStats.lastOutboundDate) {
    events.push(`Notice sent (${commsStats.outboundCount} outbound)`);
  }

  if (commsStats.hasResponse) {
    events.push(`Response received (${commsStats.inboundCount})`);
  } else if (commsStats.outboundCount > 0) {
    events.push(`⚠ No response as of ${formatDate(data.generatedAt)}`);
  }

  events.slice(0, 4).forEach(event => {
    doc.text(`• ${event}`, MARGIN + 5, y);
    y += 11;
  });
  y += 6;

  // ========================================================================
  // IMAGE EVIDENCE - Uses CANONICAL image count from evidenceStats
  // This prevents false "no evidence" when evidence exists
  // ========================================================================
  const imagesToShow = selectImages(imageEvidence, CONCISE_MAX_IMAGES_PER_ISSUE);
  const additionalImages = imageEvidence.length - imagesToShow.length;
  
  // DEBUG: Log if there's a mismatch (dev only)
  if (evidenceStats.imageCount !== imageEvidence.length) {
    console.warn(`[PDF] Image count mismatch for issue ${issue.id}: stats=${evidenceStats.imageCount}, filter=${imageEvidence.length}`);
  }

  if (imagesToShow.length > 0 && data.imageBuffers) {
    doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.primary).text("Image Evidence:", MARGIN, y);
    y += 14;

    // Layout: 2 images side by side
    const imgWidth = (CONTENT_WIDTH - 10) / 2;
    const imgHeight = 120;
    let imgX = MARGIN;

    imagesToShow.forEach((evidence, idx) => {
      const buffer = data.imageBuffers?.get(evidence.id);
      
      // Check if we have space
      if (y + imgHeight + 30 > CONTENT_END_Y) {
        // No more space - show truncation notice instead
        doc.fontSize(7).fillColor(COLORS.warning)
          .text(`+ ${imagesToShow.length - idx} image(s) not shown (page limit)`, MARGIN, y);
        return;
      }

      if (buffer) {
        try {
          doc.image(buffer, imgX, y, {
            fit: [imgWidth - 5, imgHeight],
            align: "center",
            valign: "center",
          });
          // Border
          doc.rect(imgX, y, imgWidth - 5, imgHeight).lineWidth(0.5).stroke(COLORS.light);
          // Caption
          doc.fontSize(6).fillColor(COLORS.muted)
            .text(truncate(evidence.note || evidence.type, 25), imgX, y + imgHeight + 2, { width: imgWidth - 5, align: "center" });
        } catch (err) {
          // Draw placeholder
          doc.rect(imgX, y, imgWidth - 5, imgHeight).fill(COLORS.light);
          doc.fontSize(8).fillColor(COLORS.muted)
            .text("Image unavailable", imgX, y + imgHeight / 2 - 5, { width: imgWidth - 5, align: "center" });
        }
      } else {
        // No buffer - placeholder
        doc.rect(imgX, y, imgWidth - 5, imgHeight).fill(COLORS.light);
        doc.fontSize(8).fillColor(COLORS.muted)
          .text("Image not loaded", imgX, y + imgHeight / 2 - 5, { width: imgWidth - 5, align: "center" });
      }

      // Move to next position
      if (idx === 0 && imagesToShow.length > 1) {
        imgX = MARGIN + imgWidth + 5;
      } else {
        imgX = MARGIN;
        y += imgHeight + 20;
      }
    });

    if (imagesToShow.length === 1) {
      y += imgHeight + 20;
    }

    // Show additional images count
    if (additionalImages > 0) {
      doc.fontSize(7).fillColor(COLORS.muted)
        .text(`+ ${additionalImages} more image${additionalImages > 1 ? "s" : ""} in Detailed mode`, MARGIN, y);
      y += 12;
    }

    // SHA-256 integrity (compact)
    doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.primary).text("Integrity:", MARGIN, y);
    y += 10;
    doc.font("Helvetica").fontSize(6).fillColor(COLORS.muted);
    imagesToShow.slice(0, 2).forEach(ev => {
      doc.text(`${truncate(ev.note || ev.type, 12)}: ${ev.sha256.substring(0, 24)}...`, MARGIN, y);
      y += 9;
    });

  } else if (evidenceStats.imageCount === 0) {
    // NO IMAGES - Based on CANONICAL count, not filter result
    doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.primary).text("Image Evidence:", MARGIN, y);
    y += 14;
    doc.fontSize(8).fillColor(COLORS.warning)
      .text("⚠ No image evidence attached to this issue.", MARGIN, y);
    y += 14;
  } else {
    // Images exist (per CANONICAL count) but buffers not available
    doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.primary).text("Image Evidence:", MARGIN, y);
    y += 14;
    doc.fontSize(8).fillColor(COLORS.muted)
      .text(`${evidenceStats.imageCount} image${evidenceStats.imageCount > 1 ? "s" : ""} attached (not embedded in PDF)`, MARGIN, y);
    y += 14;
  }

  // Evidence/Comms summary line (using CANONICAL stats)
  y = Math.max(y, CONTENT_END_Y - 40);
  doc.fontSize(8).fillColor(COLORS.secondary)
    .text(`Evidence: ${evidenceStats.totalCount} item${evidenceStats.totalCount !== 1 ? "s" : ""} • Communications: ${commsStats.totalCount} logged`, MARGIN, y);
}

// ============================================================================
// DETAILED MODE - NO PAGE LIMIT
// ============================================================================

function generateDetailedPDF(doc: PDFKit.PDFDocument, data: EvidencePackV2Data): void {
  const stateInfo = getStateRules(data.property.state);
  const gaps = calculateGaps(data);

  // Page 1: Cover
  doc.addPage();
  drawDetailedCoverPage(doc, data, stateInfo);

  // Page 2: Pack Readiness + Summary
  doc.addPage();
  drawDetailedReadinessPage(doc, data, gaps);

  // Page 3: Timeline
  doc.addPage();
  drawDetailedTimelinePage(doc, data);

  // Issue pages (one or more per issue)
  data.issues.forEach((issue, index) => {
    doc.addPage();
    drawDetailedIssuePage(doc, issue, data, index + 1);
  });

  // Evidence Inventory
  doc.addPage();
  drawDetailedEvidenceInventory(doc, data);

  // Communications Log
  doc.addPage();
  drawDetailedCommsLog(doc, data);

  // Documentation Gaps
  doc.addPage();
  drawDetailedGapsPage(doc, gaps);

  // Disclaimers
  doc.addPage();
  drawDetailedDisclaimers(doc, data, stateInfo);
}

function drawDetailedCoverPage(
  doc: PDFKit.PDFDocument,
  data: EvidencePackV2Data,
  stateInfo: ReturnType<typeof getStateRules>
): void {
  let y = CONTENT_START_Y + 30;

  // Title
  doc.fontSize(24).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Evidence Pack", MARGIN, y, { align: "center", width: CONTENT_WIDTH });
  y += 35;

  doc.fontSize(12).font("Helvetica").fillColor(COLORS.muted)
    .text(`Detailed Mode • Version ${VERSION}`, MARGIN, y, { align: "center", width: CONTENT_WIDTH });
  y += 40;

  // Purpose statement
  doc.fontSize(9).fillColor(COLORS.secondary)
    .text(
      "This document is a factual record of tenancy documentation compiled by the tenant. " +
      "It is intended for reference purposes in dispute resolution proceedings.",
      MARGIN, y, { align: "center", width: CONTENT_WIDTH }
    );
  y += 40;

  // Property box
  doc.rect(MARGIN, y, CONTENT_WIDTH, 70).lineWidth(1).stroke(COLORS.light);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Property", MARGIN + 15, y + 12);
  doc.fontSize(11).font("Helvetica").fillColor(COLORS.secondary)
    .text(data.property.address_text, MARGIN + 15, y + 30);
  doc.text(`${data.property.state}, Australia`, MARGIN + 15, y + 46);
  y += 85;

  // Jurisdiction
  doc.fontSize(9).fillColor(COLORS.muted)
    .text(`Jurisdiction: ${stateInfo.tribunalName} (${data.property.state})`, MARGIN, y);
  y += 14;
  doc.text(`Documentation Period: ${formatDate(data.dateRange.from)} to ${formatDate(data.dateRange.to)}`, MARGIN, y);
  y += 14;
  doc.text(`Generated: ${formatDateTime(data.generatedAt)}`, MARGIN, y);
  y += 25;

  if (data.previousVersionDate) {
    doc.fillColor(COLORS.warning)
      .text(`⚠ This pack supersedes version from ${formatDate(data.previousVersionDate)}`, MARGIN, y);
    y += 20;
  }

  // Stats
  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text(`Issues: ${data.issues.length} • Evidence: ${data.evidence.length} • Communications: ${data.comms.length}`, 
      MARGIN, y, { align: "center", width: CONTENT_WIDTH });

  // Disclaimer
  doc.fontSize(7).fillColor(COLORS.muted)
    .text(STATE_INFO_DISCLAIMER, MARGIN, CONTENT_END_Y - 20, { width: CONTENT_WIDTH, align: "center" });
}

function drawDetailedReadinessPage(
  doc: PDFKit.PDFDocument,
  data: EvidencePackV2Data,
  gaps: Array<{ type: string; description: string }>
): void {
  let y = CONTENT_START_Y;

  // Section header
  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Pack Readiness Assessment", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 150, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 35;

  // Status
  const statusColors: Record<string, string> = {
    strong: COLORS.success, moderate: COLORS.warning, weak: "#ea580c", "high-risk": COLORS.danger,
  };
  const statusColor = statusColors[data.packReadiness.status] || COLORS.muted;

  doc.fontSize(28).font("Helvetica-Bold").fillColor(statusColor)
    .text(data.packReadiness.statusLabel.toUpperCase(), MARGIN, y, { align: "center", width: CONTENT_WIDTH });
  y += 40;

  doc.fontSize(12).font("Helvetica").fillColor(COLORS.secondary)
    .text(`Score: ${data.packReadiness.score}/100`, MARGIN, y, { align: "center", width: CONTENT_WIDTH });
  y += 30;

  // Disclaimer box
  doc.rect(MARGIN, y, CONTENT_WIDTH, 40).fill(COLORS.light);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.primary).text("Important:", MARGIN + 10, y + 8);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text("Pack Readiness reflects documentation completeness only. It does not assess legal merit.", MARGIN + 10, y + 20, { width: CONTENT_WIDTH - 20 });
  y += 55;

  // Executive summary
  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Executive Summary", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 120, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 35;

  const openIssues = data.issues.filter(i => i.status === "open" || i.status === "in_progress").length;
  const outbound = data.comms.filter(c => c.direction !== "inbound").length;
  const inbound = data.comms.filter(c => c.direction === "inbound").length;

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.secondary);
  doc.text(
    `As of ${formatDate(data.generatedAt)}, this Evidence Pack documents ${data.issues.length} issue${data.issues.length !== 1 ? "s" : ""}. ` +
    `${openIssues} remain${openIssues === 1 ? "s" : ""} unresolved.`,
    MARGIN, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 15;

  doc.text(`• Evidence items: ${data.evidence.length}`, MARGIN, y);
  y += 14;
  doc.text(`• Communications: ${data.comms.length} (Outbound: ${outbound}, Inbound: ${inbound})`, MARGIN, y);
  y += 20;

  // Gaps summary
  const criticalGaps = gaps.filter(g => g.type === "critical").length;
  if (criticalGaps > 0) {
    doc.fillColor(COLORS.danger).text(`${criticalGaps} critical gap${criticalGaps !== 1 ? "s" : ""} identified.`, MARGIN, y);
  } else if (gaps.length > 0) {
    doc.fillColor(COLORS.warning).text(`${gaps.length} area${gaps.length !== 1 ? "s" : ""} for improvement identified.`, MARGIN, y);
  } else {
    doc.fillColor(COLORS.success).text("No significant documentation gaps identified.", MARGIN, y);
  }
}

function drawDetailedTimelinePage(doc: PDFKit.PDFDocument, data: EvidencePackV2Data): void {
  let y = CONTENT_START_Y;

  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Master Timeline", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 100, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 35;

  // Build events
  const events: Array<{ date: Date; type: string; text: string }> = [];
  
  data.issues.forEach(issue => {
    events.push({ date: new Date(issue.created_at), type: "Issue", text: `"${truncate(issue.title, 35)}" documented` });
  });

  data.evidence.forEach(e => {
    events.push({ date: new Date(e.occurred_at), type: "Evidence", text: `${e.type.toUpperCase()}: ${truncate(e.note || "Item", 35)}` });
  });

  data.comms.forEach(c => {
    const dir = c.direction === "inbound" ? "Received" : "Sent";
    events.push({ date: new Date(c.occurred_at), type: `Comms (${dir})`, text: `${CHANNEL_LABELS[c.channel] || c.channel}: ${truncate(c.summary, 35)}` });
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Table header
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.primary);
  doc.text("Date", MARGIN, y, { width: 70 });
  doc.text("Event", MARGIN + 75, y, { width: 80 });
  doc.text("Details", MARGIN + 160, y);
  y += 12;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke(COLORS.light);
  y += 8;

  doc.font("Helvetica").fontSize(7);
  events.forEach(event => {
    if (y > CONTENT_END_Y - 20) {
      doc.addPage();
      y = CONTENT_START_Y;
    }
    doc.fillColor(COLORS.secondary).text(formatDate(event.date), MARGIN, y, { width: 70 });
    doc.fillColor(COLORS.accent).text(event.type, MARGIN + 75, y, { width: 80 });
    doc.fillColor(COLORS.secondary).text(event.text, MARGIN + 160, y, { width: 280 });
    y += 12;
  });
}

function drawDetailedIssuePage(
  doc: PDFKit.PDFDocument,
  issue: IssueForPack,
  data: EvidencePackV2Data,
  issueNum: number
): void {
  // Use CANONICAL stats
  const caseFacts = getIssueCaseFacts(issue, data.evidence, data.comms, data.generatedAt);
  const { evidenceStats, commsStats } = caseFacts;
  
  const issueEvidence = data.evidence.filter(e => e.issue_id === issue.id);
  const issueComms = data.comms.filter(c => c.issue_id === issue.id);
  const imageEvidence = issueEvidence.filter(e => isImageEvidence(e.type));
  
  let y = CONTENT_START_Y;

  // Header
  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text(`Issue ${issueNum}: ${issue.title}`, MARGIN, y);
  y += 20;

  const sevColor = issue.severity === "Urgent" ? COLORS.danger : 
                   issue.severity === "High" ? "#ea580c" : COLORS.muted;
  doc.fontSize(9).font("Helvetica").fillColor(sevColor)
    .text(`${issue.severity || "Low"} Severity`, MARGIN, y, { continued: true });
  doc.fillColor(COLORS.muted).text(` • ${issue.status} • Reported: ${formatDate(issue.created_at)}`);
  y += 16;

  // ========================================================================
  // CASE FACTS BLOCK - REQUIRED
  // ========================================================================
  doc.rect(MARGIN, y, CONTENT_WIDTH, 45).fill(COLORS.light);
  const factsY = y + 8;
  
  // Row 1
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Days Open:", MARGIN + 10, factsY);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(`${caseFacts.daysOpen}`, MARGIN + 65, factsY);
  
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Notice Status:", MARGIN + 120, factsY);
  const noticeColor = caseFacts.noticeStatus === "Sent" ? COLORS.success : COLORS.warning;
  doc.font("Helvetica").fillColor(noticeColor)
    .text(caseFacts.noticeStatus, MARGIN + 185, factsY);
  
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Evidence:", MARGIN + 260, factsY);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(`${evidenceStats.totalCount}`, MARGIN + 305, factsY);
  
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Comms:", MARGIN + 350, factsY);
  doc.font("Helvetica").fillColor(COLORS.secondary)
    .text(`${commsStats.totalCount}`, MARGIN + 385, factsY);

  // Row 2
  const factsY2 = factsY + 18;
  doc.font("Helvetica-Bold").fillColor(COLORS.primary)
    .text("Response Status:", MARGIN + 10, factsY2);
  const responseColor = commsStats.hasResponse ? COLORS.success : COLORS.warning;
  doc.font("Helvetica").fillColor(responseColor)
    .text(caseFacts.responseStatus, MARGIN + 95, factsY2, { width: 350 });
  
  y += 55;

  // Description (normalized for tribunal)
  if (issue.description) {
    const normalizedDesc = normalizeForDetailed(issue.description);
    if (normalizedDesc) {
      doc.fontSize(9).fillColor(COLORS.secondary).text(normalizedDesc, MARGIN, y, { width: CONTENT_WIDTH });
      y = doc.y + 12;
    }
  }

  // Chronology
  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Issue Chronology:", MARGIN, y);
  y += 14;
  doc.fontSize(8).font("Helvetica").fillColor(COLORS.secondary);

  // Issue events
  const issueEvents: Array<{ date: Date; text: string }> = [];
  issueEvidence.forEach(e => {
    issueEvents.push({ date: new Date(e.occurred_at), text: `Evidence: ${e.type} - ${truncate(e.note || "Item", 40)}` });
  });
  issueComms.forEach(c => {
    const dir = c.direction === "inbound" ? "Received" : "Sent";
    issueEvents.push({ date: new Date(c.occurred_at), text: `${CHANNEL_LABELS[c.channel]} (${dir}): ${truncate(c.summary, 40)}` });
  });
  issueEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (issueEvents.length === 0) {
    doc.fillColor(COLORS.warning).text("No evidence or communications linked.", MARGIN, y);
    y += 14;
  } else {
    issueEvents.slice(0, 10).forEach(event => {
      if (y > CONTENT_END_Y - 150) return; // Leave room for images
      doc.fillColor(COLORS.secondary).text(`${formatDate(event.date)}: ${event.text}`, MARGIN, y);
      y += 12;
    });
    if (issueEvents.length > 10) {
      doc.fillColor(COLORS.muted).text(`+ ${issueEvents.length - 10} more events...`, MARGIN, y);
      y += 12;
    }
  }
  y += 10;

  // Images (all images in detailed mode) - Uses CANONICAL image count
  if (evidenceStats.imageCount > 0 && data.imageBuffers && imageEvidence.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Image Evidence:", MARGIN, y);
    y += 15;

    const imgWidth = (CONTENT_WIDTH - 20) / 3;
    const imgHeight = 100;
    let imgX = MARGIN;
    let col = 0;

    imageEvidence.forEach((evidence) => {
      if (y + imgHeight + 20 > CONTENT_END_Y) {
        doc.addPage();
        y = CONTENT_START_Y;
        imgX = MARGIN;
        col = 0;
      }

      const buffer = data.imageBuffers?.get(evidence.id);
      if (buffer) {
        try {
          doc.image(buffer, imgX, y, { fit: [imgWidth - 5, imgHeight], align: "center", valign: "center" });
          doc.rect(imgX, y, imgWidth - 5, imgHeight).lineWidth(0.5).stroke(COLORS.light);
          doc.fontSize(6).fillColor(COLORS.muted)
            .text(truncate(evidence.note || evidence.type, 20), imgX, y + imgHeight + 2, { width: imgWidth - 5, align: "center" });
        } catch {
          doc.rect(imgX, y, imgWidth - 5, imgHeight).fill(COLORS.light);
        }
      }

      col++;
      if (col >= 3) {
        col = 0;
        imgX = MARGIN;
        y += imgHeight + 18;
      } else {
        imgX += imgWidth + 5;
      }
    });
    if (col !== 0) y += imgHeight + 18;

  } else if (evidenceStats.imageCount === 0) {
    // Use CANONICAL count to determine if no images
    doc.fontSize(9).fillColor(COLORS.warning).text("⚠ No image evidence attached to this issue.", MARGIN, y);
  }
}

function drawDetailedEvidenceInventory(doc: PDFKit.PDFDocument, data: EvidencePackV2Data): void {
  let y = CONTENT_START_Y;

  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Evidence Inventory", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 120, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 30;

  doc.fontSize(8).fillColor(COLORS.muted).text("SHA-256 hashes generated at upload time.", MARGIN, y);
  y += 15;

  if (data.evidence.length === 0) {
    doc.fontSize(10).fillColor(COLORS.warning).text("No evidence items.", MARGIN, y);
    return;
  }

  // Table
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.primary);
  doc.text("#", MARGIN, y, { width: 20 });
  doc.text("Type", MARGIN + 25, y, { width: 50 });
  doc.text("Date", MARGIN + 80, y, { width: 60 });
  doc.text("SHA-256", MARGIN + 145, y);
  y += 10;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke(COLORS.light);
  y += 5;

  doc.font("Helvetica").fontSize(6);
  data.evidence.forEach((evidence, idx) => {
    if (y > CONTENT_END_Y - 15) {
      doc.addPage();
      y = CONTENT_START_Y;
    }
    doc.fillColor(COLORS.secondary);
    doc.text(`${idx + 1}`, MARGIN, y, { width: 20 });
    doc.text(evidence.type.toUpperCase(), MARGIN + 25, y, { width: 50 });
    doc.text(formatDate(evidence.occurred_at), MARGIN + 80, y, { width: 60 });
    doc.fillColor(COLORS.muted).text(evidence.sha256, MARGIN + 145, y, { width: 300 });
    y += 10;
  });
}

function drawDetailedCommsLog(doc: PDFKit.PDFDocument, data: EvidencePackV2Data): void {
  let y = CONTENT_START_Y;

  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Communications Log", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 130, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 35;

  if (data.comms.length === 0) {
    doc.fontSize(10).fillColor(COLORS.warning).text("No communications logged.", MARGIN, y);
    return;
  }

  const sorted = [...data.comms].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  sorted.forEach((comm, idx) => {
    if (y > CONTENT_END_Y - 30) {
      doc.addPage();
      y = CONTENT_START_Y;
    }

    const dirColor = comm.direction === "inbound" ? COLORS.success : "#7c3aed";
    doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.primary)
      .text(`${idx + 1}. ${formatDate(comm.occurred_at)} - ${CHANNEL_LABELS[comm.channel] || comm.channel}`, MARGIN, y);
    y += 12;

    doc.font("Helvetica").fontSize(7).fillColor(dirColor)
      .text(comm.direction === "inbound" ? "INBOUND" : "OUTBOUND", MARGIN, y, { continued: true });
    doc.fillColor(COLORS.secondary).text(`: ${comm.summary}`, { width: CONTENT_WIDTH - 60 });
    y = doc.y + 8;
  });

  // Summary
  y += 10;
  const outbound = data.comms.filter(c => c.direction !== "inbound").length;
  const inbound = data.comms.filter(c => c.direction === "inbound").length;
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.primary)
    .text(`Total: ${data.comms.length} | Outbound: ${outbound} | Inbound: ${inbound}`, MARGIN, y);
}

function drawDetailedGapsPage(doc: PDFKit.PDFDocument, gaps: Array<{ type: string; issue?: string; description: string }>): void {
  let y = CONTENT_START_Y;

  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Documentation Gaps", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 130, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 35;

  if (gaps.length === 0) {
    doc.rect(MARGIN, y, CONTENT_WIDTH, 35).fill("#f0fdf4");
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.success)
      .text("✓ No Significant Gaps Identified", MARGIN + 10, y + 12);
    return;
  }

  const critical = gaps.filter(g => g.type === "critical");
  const warning = gaps.filter(g => g.type === "warning");
  const info = gaps.filter(g => g.type === "info");

  if (critical.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.danger).text("Critical Gaps:", MARGIN, y);
    y += 14;
    doc.fontSize(8).font("Helvetica");
    critical.forEach(gap => {
      doc.fillColor(COLORS.danger).text(`⚠ ${gap.description}`, MARGIN, y);
      y += 12;
    });
    y += 8;
  }

  if (warning.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.warning).text("Areas for Improvement:", MARGIN, y);
    y += 14;
    doc.fontSize(8).font("Helvetica").fillColor(COLORS.secondary);
    warning.forEach(gap => {
      doc.text(`• ${gap.description}`, MARGIN, y);
      y += 12;
    });
    y += 8;
  }

  if (info.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.muted).text("Notes:", MARGIN, y);
    y += 14;
    doc.fontSize(8).font("Helvetica").fillColor(COLORS.muted);
    info.forEach(gap => {
      doc.text(`• ${gap.description}`, MARGIN, y);
      y += 12;
    });
  }
}

function drawDetailedDisclaimers(
  doc: PDFKit.PDFDocument,
  data: EvidencePackV2Data,
  stateInfo: ReturnType<typeof getStateRules>
): void {
  let y = CONTENT_START_Y;

  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary).text("Important Notices", MARGIN, y);
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + 120, y + 18).lineWidth(2).stroke(COLORS.accent);
  y += 35;

  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Purpose", MARGIN, y);
  y += 14;
  doc.fontSize(9).font("Helvetica").fillColor(COLORS.secondary)
    .text("This Evidence Pack is a compilation of information entered by the tenant. It provides an organised record for reference.", MARGIN, y, { width: CONTENT_WIDTH });
  y = doc.y + 20;

  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.danger).text("This Document Does NOT:", MARGIN, y);
  y += 14;
  doc.fontSize(9).font("Helvetica").fillColor(COLORS.secondary);
  ["Constitute legal advice", "Assess legal merit", "Predict outcomes", "Replace professional advice"].forEach(item => {
    doc.text(`• ${item}`, MARGIN, y);
    y += 12;
  });
  y += 15;

  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary).text("Seek Professional Advice", MARGIN, y);
  y += 14;
  doc.fontSize(9).font("Helvetica").fillColor(COLORS.secondary)
    .text("Contact your local Tenants' Union or community legal centre before taking action.", MARGIN, y, { width: CONTENT_WIDTH });

  // Footer
  doc.fontSize(7).fillColor(COLORS.muted)
    .text(`Evidence Pack v${VERSION} | Generated: ${formatDateTime(data.generatedAt)}`, MARGIN, CONTENT_END_Y - 10, { align: "center", width: CONTENT_WIDTH });
}

// ============================================================================
// Header/Footer (drawn on existing pages, NO new pages)
// ============================================================================

function drawPageHeaderFooter(
  doc: PDFKit.PDFDocument,
  pageNum: number,
  totalPages: number,
  data: EvidencePackV2Data,
  mode: string
): void {
  // Header line
  doc.moveTo(MARGIN, MARGIN + HEADER_HEIGHT)
    .lineTo(PAGE_WIDTH - MARGIN, MARGIN + HEADER_HEIGHT)
    .lineWidth(0.5)
    .stroke(COLORS.light);

  // Header text (only on page 2+)
  if (pageNum > 1) {
    doc.fontSize(7).fillColor(COLORS.muted)
      .text(`Evidence Pack v${VERSION} (${mode})`, MARGIN, MARGIN + 8)
      .text(truncate(data.property.address_text, 40), PAGE_WIDTH - MARGIN - 150, MARGIN + 8, { width: 150, align: "right" });
  }

  // Footer line
  doc.moveTo(MARGIN, PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT)
    .lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT)
    .lineWidth(0.5)
    .stroke(COLORS.light);

  // Footer: page number center, date right
  doc.fontSize(7).fillColor(COLORS.muted)
    .text(`Page ${pageNum} of ${totalPages}`, MARGIN, PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT + 8, { width: CONTENT_WIDTH, align: "center" })
    .text(formatDate(data.generatedAt), PAGE_WIDTH - MARGIN - 80, PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT + 8, { width: 80, align: "right" });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate documentation gaps using CANONICAL evidence stats.
 * This prevents false "no evidence" reports.
 */
function calculateCanonicalGaps(data: EvidencePackV2Data): DocumentationGap[] {
  const gaps: DocumentationGap[] = [];

  data.issues.forEach(issue => {
    // Use CANONICAL stats functions
    const caseFacts = getIssueCaseFacts(issue, data.evidence, data.comms, data.generatedAt);
    const issueGaps = detectIssueGaps(issue, caseFacts);
    gaps.push(...issueGaps);
  });

  return gaps;
}

// Legacy function - redirects to canonical
function calculateGaps(data: EvidencePackV2Data): Array<{ type: "critical" | "warning" | "info"; issue?: string; description: string }> {
  return calculateCanonicalGaps(data).map(g => ({
    type: g.type,
    issue: g.issueTitle,
    description: g.description,
  }));
}

function selectImages(images: EvidenceForPack[], maxCount: number): EvidenceForPack[] {
  if (images.length <= maxCount) return images;
  
  // Select first and last (chronologically)
  const sorted = [...images].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  const selected: EvidenceForPack[] = [sorted[0]];
  if (sorted.length > 1) selected.push(sorted[sorted.length - 1]);
  return selected.slice(0, maxCount);
}

function normalizeData(data: EvidencePackV2Data | LegacyEvidencePackData): EvidencePackV2Data {
  if (!("packReadiness" in data)) {
    const legacy = data as LegacyEvidencePackData;
    return {
      user: legacy.user,
      property: { address_text: legacy.property.address_text, state: legacy.property.state as AustralianState },
      issues: legacy.issues.map(i => ({
        id: i.id, title: i.title, description: i.description, severity: i.severity,
        status: i.status || "open", created_at: i.created_at || new Date().toISOString(), updated_at: i.updated_at || new Date().toISOString(),
      })),
      evidence: legacy.evidence,
      comms: legacy.comms,
      dateRange: legacy.dateRange,
      packReadiness: { score: 50, status: "moderate" as PackReadinessStatus, statusLabel: "Moderate" },
      generatedAt: new Date(),
      mode: "concise",
    };
  }
  return data as EvidencePackV2Data;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncate(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + "…";
}

// Legacy interface
interface LegacyEvidencePackData {
  user: { email: string; id: string };
  property: { address_text: string; state: string };
  issues: Array<{ id: string; title: string; description?: string; severity?: string; status?: string; created_at?: string; updated_at?: string }>;
  evidence: Array<{ id: string; issue_id?: string; type: string; category?: string; note?: string; occurred_at: string; sha256: string }>;
  comms: Array<{ issue_id?: string; occurred_at: string; channel: string; summary: string }>;
  dateRange: { from: string; to: string };
}

export type EvidencePackData = EvidencePackV2Data | LegacyEvidencePackData;
