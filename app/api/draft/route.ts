import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDraft, DraftRequest } from "@/lib/ai-letter-generator";
import { handleApiError, requireAuth } from "@/lib/api-error-handler";
import { checkRateLimit } from "@/app/api/rate-limit-wrapper";
import { z } from "zod";

const draftRequestSchema = z.object({
  draftType: z.enum([
    "Repair Request",
    "General Query",
    "Follow Up",
    "Information Request",
    "Other",
  ]),
  recipient: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  contextDetails: z.string().min(10, "Please provide more details"),
  propertyAddress: z.string().optional(),
  tenantName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (using 'ai' type for AI draft generation)
    const rateLimitResponse = await checkRateLimit(request, "ai");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    requireAuth(user);

    const body = await request.json();
    const validatedData = draftRequestSchema.parse(body);

    // Get user's state from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("state")
      .eq("id", user.id)
      .single();

    const draftRequest: DraftRequest = {
      draftType: validatedData.draftType,
      recipient: validatedData.recipient,
      subject: validatedData.subject,
      contextDetails: validatedData.contextDetails,
      state: profile?.state || "NSW",
      tenantName: validatedData.tenantName || user.email?.split("@")[0],
      propertyAddress: validatedData.propertyAddress,
    };

    const result = await generateDraft(draftRequest);

    return NextResponse.json({
      success: true,
      draft: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
