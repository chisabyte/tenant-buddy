import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEvidencePackPDF } from "@/lib/pdf-generator";
import { evidencePackSchema } from "@/lib/validations";
import { handleApiError, requireAuth, ApiErrors } from "@/lib/api-error-handler";
import { checkRateLimit } from "@/app/api/rate-limit-wrapper";
import { getPlan, checkLimit } from "@/lib/billing";
import { formatLimit } from "@/lib/billing/plans";

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
    
    const { count: packsThisMonth } = await supabase
      .from("evidence_pack_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", firstDayOfMonth.toISOString());

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

    const body = await request.json();
    const { issueId, fromDate, toDate } = evidencePackSchema.parse(body);

    // Fetch issue
    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .select(`
        *,
        properties!inner(*)
      `)
      .eq("id", issueId)
      .eq("user_id", user.id)
      .single();

    if (issueError || !issue) {
      throw ApiErrors.notFound("Issue");
    }

    // Fetch evidence items
    const { data: evidence } = await supabase
      .from("evidence_items")
      .select("*")
      .eq("issue_id", issueId)
      .eq("user_id", user.id)
      .gte("occurred_at", fromDate)
      .lte("occurred_at", toDate)
      .order("occurred_at", { ascending: true });

    // Fetch communications
    const { data: comms } = await supabase
      .from("comms_logs")
      .select("*")
      .eq("issue_id", issueId)
      .eq("user_id", user.id)
      .gte("occurred_at", fromDate)
      .lte("occurred_at", toDate)
      .order("occurred_at", { ascending: true });

    // Generate PDF
    const pdfBuffer = await generateEvidencePackPDF({
      user: {
        email: user.email || "",
        id: user.id,
      },
      property: {
        address_text: issue.properties.address_text,
        state: issue.properties.state,
      },
      issue: {
        title: issue.title,
        description: issue.description || undefined,
      },
      evidence: evidence || [],
      comms: comms || [],
      dateRange: {
        from: fromDate,
        to: toDate,
      },
    });

    // Save pack run record
    await supabase.from("evidence_pack_runs").insert({
      user_id: user.id,
      issue_id: issueId,
      from_date: fromDate,
      to_date: toDate,
    });

    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evidence-pack-${issueId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

