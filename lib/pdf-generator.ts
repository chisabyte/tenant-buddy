/**
 * PDF Generator for Evidence Packs
 *
 * Generates a single, indexed PDF bundle with:
 * - Cover page (user details, property, state reference)
 * - Index of evidence items
 * - Chronology table (date, event, linked evidence)
 * - Evidence attachments section
 *
 * IMPORTANT: This generates a record of user-entered information only.
 * It does not provide legal advice or assessment.
 */

import PDFDocument from "pdfkit";
import { getStateRules, STATE_INFO_DISCLAIMER } from "@/lib/state-rules";

interface EvidencePackData {
  user: {
    email: string;
    id: string;
  };
  property: {
    address_text: string;
    state: string;
  };
  issue: {
    title: string;
    description?: string;
  };
  evidence: Array<{
    id: string;
    type: string;
    category?: string;
    note?: string;
    occurred_at: string;
    sha256: string;
  }>;
  comms: Array<{
    occurred_at: string;
    channel: string;
    summary: string;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

export async function generateEvidencePackPDF(
  data: EvidencePackData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      const stateInfo = getStateRules(data.property.state as any);

      // Cover Page
      doc.fontSize(24).text("Evidence Pack", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).text("A record of your tenancy documentation", { align: "center" });
      doc.moveDown(2);

      doc.fontSize(16).text("Property Information", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Address: ${data.property.address_text}`);
      doc.text(`State/Territory: ${data.property.state}`);
      doc.moveDown();

      // State info with disclaimer
      doc.fontSize(10).text(`Reference - Tribunal: ${stateInfo.tribunalName}`);
      doc.text(`Reference - Regulator: ${stateInfo.regulatorName}`);
      doc.moveDown(0.5);
      doc
        .font("Helvetica-Oblique")
        .fontSize(9)
        .text(STATE_INFO_DISCLAIMER)
        .font("Helvetica");

      doc.moveDown();
      doc.fontSize(16).text("Issue Summary", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Title: ${data.issue.title}`);
      if (data.issue.description) {
        doc.text(`Description: ${data.issue.description}`);
      }
      doc.moveDown();
      doc.fontSize(12).text(
        `Date Range: ${new Date(data.dateRange.from).toLocaleDateString()} to ${new Date(data.dateRange.to).toLocaleDateString()}`
      );
      doc.moveDown(2);

      // Important disclaimer
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Important Notice", { align: "center" })
        .font("Helvetica-Oblique")
        .text(
          "This document is a record of information you have entered into the Tenant Buddy app. " +
            "It does not constitute legal advice and should not be relied upon as such. " +
            "Before taking any action regarding your tenancy, seek advice from a qualified professional " +
            "or your local Tenants' Union.",
          { align: "center" }
        )
        .font("Helvetica");

      // New Page - Index
      doc.addPage();
      doc.fontSize(18).text("Index of Evidence", { underline: true });
      doc.moveDown();

      if (data.evidence.length > 0) {
        doc.fontSize(12).text("Evidence Items:", { underline: true });
        doc.moveDown(0.5);
        data.evidence.forEach((item, index) => {
          doc.text(
            `${index + 1}. ${item.type.toUpperCase()} - ${item.category || "Uncategorized"} - ${new Date(item.occurred_at).toLocaleDateString()}`
          );
          if (item.note) {
            doc.fontSize(10).text(`   Note: ${item.note}`, { indent: 20 });
            doc.fontSize(12);
          }
          doc.moveDown(0.3);
        });
      } else {
        doc.fontSize(12).text("No evidence items in this pack.");
      }

      // New Page - Chronology
      doc.addPage();
      doc.fontSize(18).text("Timeline of Events", { underline: true });
      doc.moveDown();

      // Combine and sort all events by date
      const allEvents: Array<{
        date: Date;
        type: "evidence" | "communication";
        description: string;
        reference?: string;
      }> = [];

      data.evidence.forEach((item) => {
        allEvents.push({
          date: new Date(item.occurred_at),
          type: "evidence",
          description: `${item.type.toUpperCase()}: ${item.note || item.category || "Evidence item"}`,
          reference: `Evidence Item ${data.evidence.indexOf(item) + 1}`,
        });
      });

      data.comms.forEach((comm) => {
        allEvents.push({
          date: new Date(comm.occurred_at),
          type: "communication",
          description: `${comm.channel.toUpperCase()}: ${comm.summary}`,
        });
      });

      allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      if (allEvents.length === 0) {
        doc.fontSize(12).text("No events recorded in this date range.");
      } else {
        // Create chronology table
        doc.fontSize(10);
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 150;
        const col3 = 400;

        // Header
        doc.font("Helvetica-Bold");
        doc.text("Date", col1, tableTop);
        doc.text("Event", col2, tableTop);
        doc.text("Reference", col3, tableTop);
        doc.moveDown(0.5);

        // Rows
        doc.font("Helvetica");
        allEvents.forEach((event) => {
          const y = doc.y;
          if (y > 750) {
            doc.addPage();
            doc.font("Helvetica-Bold");
            doc.text("Date", col1, doc.y);
            doc.text("Event", col2, doc.y);
            doc.text("Reference", col3, doc.y);
            doc.font("Helvetica");
            doc.moveDown(0.5);
          }

          doc.text(event.date.toLocaleDateString(), col1, doc.y);
          doc.text(event.description.substring(0, 50), col2, doc.y, {
            width: 250,
            ellipsis: true,
          });
          doc.text(event.reference || "-", col3, doc.y);
          doc.moveDown(0.5);
        });
      }

      // New Page - Evidence Details
      if (data.evidence.length > 0) {
        doc.addPage();
        doc.fontSize(18).text("Evidence Items Detail", { underline: true });
        doc.moveDown();

        data.evidence.forEach((item, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.fontSize(14).text(`Evidence Item ${index + 1}`, { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(12);
          doc.text(`Type: ${item.type.toUpperCase()}`);
          if (item.category) doc.text(`Category: ${item.category}`);
          doc.text(`Date: ${new Date(item.occurred_at).toLocaleString()}`);
          doc.text(`SHA256 Hash: ${item.sha256}`);
          if (item.note) {
            doc.moveDown(0.3);
            doc.text(`Notes: ${item.note}`);
          }
          doc.moveDown(1);
        });
      }

      // Final page - footer disclaimer
      doc.addPage();
      doc.fontSize(14).text("About This Document", { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(
        "This Evidence Pack was generated by Tenant Buddy, an evidence organisation tool for renters. " +
          "The information contained in this document is based solely on data you have entered into the application."
      );
      doc.moveDown();
      doc.text(
        "This document is provided for your personal records and information organisation purposes only. " +
          "It does not:"
      );
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.list([
        "Constitute legal advice",
        "Assess your legal rights or entitlements",
        "Guarantee any particular outcome",
        "Replace professional legal advice",
      ]);
      doc.moveDown();
      doc.fontSize(11).text(
        "If you need advice about your tenancy situation, please contact your local Tenants' Union " +
          "or a qualified legal professional."
      );
      doc.moveDown(2);
      doc.fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, { align: "right" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
