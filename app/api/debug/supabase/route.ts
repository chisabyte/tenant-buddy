import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DIAGNOSTIC ENDPOINT: Check Supabase configuration
 * DISABLED IN PRODUCTION - Only enabled when DEBUG_TOOLS_ENABLED=true
 */
export async function GET() {
  // Disable in production unless explicitly enabled via env var
  const debugEnabled = process.env.DEBUG_TOOLS_ENABLED === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && !debugEnabled) {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Extract project ref from URL if present
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
  
  try {
    const supabase = await createClient();
    
    // Try a simple query to verify connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    return NextResponse.json({
      diagnostic: {
        supabaseUrl: supabaseUrl || 'NOT SET',
        projectRef,
        hasAnonKey,
        connectionStatus: healthError ? 'error' : 'ok',
        connectionError: healthError?.message || null,
      },
      note: 'This is a diagnostic endpoint. Remove after fixing the issue.',
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({
      diagnostic: {
        supabaseUrl: supabaseUrl || 'NOT SET',
        projectRef,
        hasAnonKey,
        connectionStatus: 'error',
        connectionError: error instanceof Error ? error.message : 'Unknown error',
      },
      note: 'This is a diagnostic endpoint. Remove after fixing the issue.',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

