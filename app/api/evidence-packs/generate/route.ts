import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEvidencePackPDF, type EvidencePackV2Data } from "@/lib/pdf-generator";
import { evidencePackSchema, type EvidencePackMode } from "@/lib/validations";
import { handleApiError, requireAuth, ApiErrors } from "@/lib/api-error-handler";
import { checkRateLimit } from "@/app/api/rate-limit-wrapper";
import { getPlan, checkLimit } from "@/lib/billing";
import { formatLimit } from "@/lib/billing/plans";
import { calculatePackReadiness, type IssueForPack, type CommsForPack } from "@/lib/pack-readiness";
import { calculateOverallHealth, type IssueHealthData } from "@/lib/case-health";
import type { AustralianState } from "@/lib/state-rules";

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting for expensive PDF generation
    const rateLimitResponse = await checkRateLimit(request, "evidencePack");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    requireAuth(user);

    // Check plan limits for evidence pack generation
    const plan = await getPlan(user);
    
    // Count packs generated this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { count: packsThisMonth, error: countError } = await supabase
      .from("evidence_pack_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", firstDayOfMonth.toISOString());

    if (countError) {
      console.error("Error counting packs this month:", countError);
      // Wrap Supabase error in Error object so it's properly handled
      const error = new Error(countError.message || "Failed to count packs");
      (error as any).code = countError.code;
      throw error;
    }

    const limitCheck = await checkLimit(
      user.id,
      "evidencePacksPerMonth",
      packsThisMonth || 0
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `You have reached your monthly limit of ${formatLimit(limitCheck.limit)} evidence packs. Please upgrade your plan to generate more packs.`,
          code: "LIMIT_EXCEEDED",
          limit: limitCheck.limit,
          usage: limitCheck.usage,
          planId: limitCheck.planId,
        },
        { status: 403 }
      );
    }

    // PRODUCTION SAFETY: Daily cap per user (conservative fallback if billing tier not reliable)
    // Only enforced when ENFORCE_LIMITS=true (default: false for backward compatibility)
    const enforceLimits = process.env.ENFORCE_LIMITS === 'true';
    if (enforceLimits) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const { count: packsToday, error: dailyCountError } = await supabase
        .from("evidence_pack_runs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString());

      if (dailyCountError) {
        console.error("Error counting packs today:", dailyCountError);
        // Wrap Supabase error in Error object so it's properly handled
        const error = new Error(dailyCountError.message || "Failed to count packs today");
        (error as any).code = dailyCountError.code;
        throw error;
      }

      // Conservative daily cap: 10 packs per day (applies to all users regardless of plan)
      // This prevents abuse even if billing system has issues
      const DAILY_CAP = 10;
      if ((packsToday || 0) >= DAILY_CAP) {
        return NextResponse.json(
          {
            error: `You have reached the daily limit of ${DAILY_CAP} evidence packs. Please try again tomorrow.`,
            code: "DAILY_LIMIT_EXCEEDED",
            limit: DAILY_CAP,
            usage: packsToday || 0,
            retryAfter: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
          { 
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((todayStart.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 1000)),
            },
          }
        );
      }
    }

    const body = await request.json();
    const { issueIds, fromDate, toDate, mode } = evidencePackSchema.parse(body);

    // Fetch all selected issues with full data for health calculation
    const { data: issues, error: issuesError } = await supabase
      .from("issues")
      .select(`
        *,
        properties!inner(*),
        evidence_items(id, type, uploaded_at)
      `)
      .in("id", issueIds)
      .eq("user_id", user.id);

    if (issuesError || !issues || issues.length === 0) {
      throw ApiErrors.notFound("Issues");
    }

    // Use the first issue's property info (all issues should be from same property)
    const property = issues[0].properties;
    
    // Calculate date range if not provided
    const defaultFromDate = fromDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const defaultToDate = toDate || now.toISOString().split('T')[0];

    // Fetch all evidence items for selected issues
    // CRITICAL: Filter by issue_id AND user_id to match UI behavior
    // Date range filter is for pack scope, but we need all evidence for accurate counting
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence_items")
      .select("id, type, category, note, occurred_at, sha256, issue_id, uploaded_at, file_path")
      .in("issue_id", issueIds)
      .eq("user_id", user.id)
      .gte("occurred_at", defaultFromDate)
      .lte("occurred_at", defaultToDate)
      .order("occurred_at", { ascending: true });

    if (evidenceError) {
      console.error("Error fetching evidence:", {
        error: evidenceError,
        code: evidenceError.code,
        message: evidenceError.message,
        details: evidenceError.details,
        hint: evidenceError.hint,
        issueIds,
      });
      // Wrap Supabase error in Error object so it's properly handled
      const error = new Error(evidenceError.message || "Failed to fetch evidence");
      (error as any).code = evidenceError.code;
      throw error;
    }

    // SANITY CHECK: Verify evidence counts and warn on potential issues
    // Always log in dev, warn in production if data seems wrong
    const evidenceByIssue = new Map<string, number>();
    (evidence || []).forEach(e => {
      if (e.issue_id) {
        evidenceByIssue.set(e.issue_id, (evidenceByIssue.get(e.issue_id) || 0) + 1);
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PDF] Evidence counts by issue:', Object.fromEntries(evidenceByIssue));
      console.log('[PDF] Total evidence in date range:', evidence?.length || 0);
    }
    
    // CRITICAL: Warn if we have issues but no evidence (might indicate date range issue)
    if (issueIds.length > 0 && (evidence?.length || 0) === 0) {
      console.warn('[PDF] WARNING: No evidence found for issues in date range:', defaultFromDate, 'to', defaultToDate);
      console.warn('[PDF] This may indicate evidence exists outside the date range. Issue IDs:', issueIds);
      
      // Fetch total evidence count without date filter to compare
      const { count: totalEvidenceCount } = await supabase
        .from("evidence_items")
        .select("*", { count: "exact", head: true })
        .in("issue_id", issueIds)
        .eq("user_id", user.id);
      
      if (totalEvidenceCount && totalEvidenceCount > 0) {
        console.warn(`[PDF] MISMATCH: ${totalEvidenceCount} evidence items exist but 0 in date range. Expanding date range to include all evidence.`);
        // Re-fetch evidence without date filter to include all
        const { data: allEvidence } = await supabase
          .from("evidence_items")
          .select("id, type, category, note, occurred_at, sha256, issue_id, uploaded_at, file_path")
          .in("issue_id", issueIds)
          .eq("user_id", user.id)
          .order("occurred_at", { ascending: true });
        
        if (allEvidence && allEvidence.length > 0) {
          // Replace evidence with full dataset
          evidence?.splice(0, evidence.length, ...allEvidence);
          if (!evidence) {
            // If evidence was null, this won't work - handled below
            console.warn('[PDF] Evidence array was null, using allEvidence instead');
          }
        }
      }
    }

    // Fetch all communications for selected issues
    const { data: comms, error: commsError } = await supabase
      .from("comms_logs")
      .select("id, occurred_at, channel, summary, issue_id, created_at")
      .in("issue_id", issueIds)
      .eq("user_id", user.id)
      .gte("occurred_at", defaultFromDate)
      .lte("occurred_at", defaultToDate)
      .order("occurred_at", { ascending: true });

    if (commsError) {
      console.error("Error fetching communications:", {
        error: commsError,
        code: commsError.code,
        message: commsError.message,
        details: commsError.details,
        hint: commsError.hint,
        issueIds,
      });
      // Wrap Supabase error in Error object so it's properly handled
      const error = new Error(commsError.message || "Failed to fetch communications");
      (error as any).code = commsError.code;
      throw error;
    }

    // SANITY CHECK: Verify comms counts and warn on potential issues
    const commsByIssue = new Map<string, number>();
    (comms || []).forEach(c => {
      if (c.issue_id) {
        commsByIssue.set(c.issue_id, (commsByIssue.get(c.issue_id) || 0) + 1);
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PDF] Comms counts by issue:', Object.fromEntries(commsByIssue));
      console.log('[PDF] Total comms in date range:', comms?.length || 0);
    }
    
    // CRITICAL: Warn if we have issues but no comms (might indicate date range issue)
    if (issueIds.length > 0 && (comms?.length || 0) === 0) {
      console.warn('[PDF] WARNING: No comms found for issues in date range:', defaultFromDate, 'to', defaultToDate);
      
      // Fetch total comms count without date filter to compare
      const { count: totalCommsCount } = await supabase
        .from("comms_logs")
        .select("*", { count: "exact", head: true })
        .in("issue_id", issueIds)
        .eq("user_id", user.id);
      
      if (totalCommsCount && totalCommsCount > 0) {
        console.warn(`[PDF] MISMATCH: ${totalCommsCount} comms exist but 0 in date range. Expanding date range to include all comms.`);
        // Re-fetch comms without date filter to include all
        const { data: allComms } = await supabase
          .from("comms_logs")
          .select("id, occurred_at, channel, summary, issue_id, created_at")
          .in("issue_id", issueIds)
          .eq("user_id", user.id)
          .order("occurred_at", { ascending: true });
        
        if (allComms && allComms.length > 0) {
          // Replace comms with full dataset
          comms?.splice(0, comms.length, ...allComms);
        }
      }
    }

    // Fetch image buffers for embedding in PDF
    // Only fetch for photo/screenshot types
    const imageEvidence = (evidence || []).filter(
      (e) => e.file_path && ["photo", "screenshot"].includes(e.type?.toLowerCase())
    );

    // Fetch signed URLs and download image buffers
    const imageBuffers: Map<string, Buffer> = new Map();
    
    for (const item of imageEvidence) {
      if (!item.file_path) continue;
      
      try {
        // Get signed URL
        const { data: urlData } = await supabase.storage
          .from("evidence")
          .createSignedUrl(item.file_path, 300); // 5 min expiry for fetching
        
        if (urlData?.signedUrl) {
          // Fetch the image
          const response = await fetch(urlData.signedUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            imageBuffers.set(item.id, Buffer.from(arrayBuffer));
          }
        }
      } catch (err) {
        console.error(`Failed to fetch image for evidence ${item.id}:`, err);
        // Continue without this image
      }
    }

    // Prepare data for pack readiness calculation
    const issuesForPack: IssueForPack[] = issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      severity: issue.severity,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      evidence_items: issue.evidence_items || [],
    }));

    const commsForPack: CommsForPack[] = (comms || []).map((c) => ({
      issue_id: c.issue_id || "",
      occurred_at: c.occurred_at,
    }));

    // Calculate pack readiness
    const packReadiness = calculatePackReadiness(
      issuesForPack,
      new Set(issueIds),
      commsForPack
    );

    // Calculate case health
    const issueHealthData: IssueHealthData[] = issues.map((issue) => {
      const issueComms = (comms || []).filter((c) => c.issue_id === issue.id);
      const issueEvidence = (evidence || []).filter((e) => e.issue_id === issue.id);
      
      return {
        issue: {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          severity: issue.severity,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        },
        evidenceCount: issueEvidence.length,
        commsCount: issueComms.length,
        lastCommsDate: issueComms.length > 0 
          ? issueComms[issueComms.length - 1].occurred_at 
          : null,
        lastEvidenceDate: issueEvidence.length > 0 
          ? issueEvidence[issueEvidence.length - 1].occurred_at 
          : null,
      };
    });

    const caseHealth = calculateOverallHealth(issueHealthData);

    // Infer communication direction from content (heuristic)
    const commsWithDirection = (comms || []).map((comm) => {
      const summaryLower = comm.summary.toLowerCase();
      const isInbound = 
        summaryLower.includes("received") ||
        summaryLower.includes("from agent") ||
        summaryLower.includes("from landlord") ||
        summaryLower.includes("from property manager") ||
        summaryLower.includes("they called") ||
        summaryLower.includes("they replied") ||
        summaryLower.includes("their response") ||
        summaryLower.includes("agent responded") ||
        summaryLower.includes("landlord responded");

      const isAwaiting = 
        summaryLower.includes("waiting") ||
        summaryLower.includes("no response") ||
        summaryLower.includes("awaiting") ||
        summaryLower.includes("pending response");

      return {
        id: comm.id,
        issue_id: comm.issue_id,
        occurred_at: comm.occurred_at,
        channel: comm.channel,
        summary: comm.summary,
        direction: isInbound ? "inbound" as const : "outbound" as const,
        response_status: isAwaiting ? "awaiting" as const : (isInbound ? "received" as const : "none" as const),
      };
    });

    // Check for previous pack versions
    const { data: previousPacks, error: previousPacksError } = await supabase
      .from("evidence_pack_runs")
      .select("created_at")
      .in("issue_id", issueIds)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (previousPacksError) {
      console.error("Error fetching previous packs:", previousPacksError);
      // Don't throw - this is optional metadata
    }

    const previousVersionDate = previousPacks && previousPacks.length > 0 
      ? previousPacks[0].created_at 
      : undefined;

    // Prepare v2 data structure with mode and image buffers
    const packData: EvidencePackV2Data = {
      user: {
        email: user.email || "",
        id: user.id,
      },
      property: {
        address_text: property.address_text,
        state: property.state as AustralianState,
      },
      issues: issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      })),
      evidence: (evidence || []).map((e) => ({
        id: e.id,
        issue_id: e.issue_id,
        type: e.type,
        category: e.category,
        note: e.note,
        occurred_at: e.occurred_at,
        uploaded_at: e.uploaded_at,
        sha256: e.sha256,
        file_path: e.file_path,
      })),
      comms: commsWithDirection,
      dateRange: {
        from: defaultFromDate,
        to: defaultToDate,
      },
      packReadiness: {
        score: packReadiness.score,
        status: packReadiness.status,
        statusLabel: packReadiness.statusLabel,
      },
      caseHealth: {
        score: caseHealth.score,
        status: caseHealth.status,
        statusLabel: caseHealth.statusLabel,
      },
      generatedAt: now,
      previousVersionDate,
      mode: mode as EvidencePackMode,
      imageBuffers,
    };

    // Generate PDF with specified mode
    const pdfBuffer = await generateEvidencePackPDF(packData);

    // Generate filename with mode indicator
    const timestamp = now.toISOString().split('T')[0];
    const sanitizedAddress = property.address_text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const modeLabel = mode === "concise" ? "Concise" : "Detailed";
    const filename = `Evidence_Pack_v2_${modeLabel}_${issues.length}_${sanitizedAddress}_${timestamp}.pdf`;
    const filePath = `${user.id}/evidence-packs/${Date.now()}-${filename}`;

    // Upload PDF to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      throw new Error(`Failed to upload evidence pack: ${uploadError.message}`);
    }

    // Get signed URL for download (valid for 1 year)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("evidence")
      .createSignedUrl(filePath, 31536000);

    if (urlError || !urlData) {
      console.error("Error creating signed URL:", urlError);
      throw new Error("Failed to generate download URL");
    }

    // Save pack run record for each issue
    const packRunRecords = issueIds.map((issueId) => ({
      user_id: user.id,
      issue_id: issueId,
      pdf_path: filePath,
      from_date: defaultFromDate,
      to_date: defaultToDate,
    }));

    const { error: insertError } = await supabase
      .from("evidence_pack_runs")
      .insert(packRunRecords);

    if (insertError) {
      console.error("Error inserting pack run records:", {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        records: packRunRecords,
      });
      // Log the error but don't fail the request - PDF was already generated and uploaded
      // The pack can still be downloaded, we just won't have a record of it
      // In production, you might want to log this to a monitoring service
    }

    // Return download URL with metadata
    return NextResponse.json({
      success: true,
      downloadUrl: urlData.signedUrl,
      filename: filename,
      filePath: filePath,
      issuesCount: issues.length,
      evidenceCount: evidence?.length || 0,
      commsCount: comms?.length || 0,
      imagesEmbedded: imageBuffers.size,
      packReadiness: {
        score: packReadiness.score,
        status: packReadiness.status,
        statusLabel: packReadiness.statusLabel,
      },
      caseHealth: {
        score: caseHealth.score,
        status: caseHealth.status,
        statusLabel: caseHealth.statusLabel,
      },
      mode: mode,
      version: "2.0",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
