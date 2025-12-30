import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    storage: {
      status: "up" | "down";
      error?: string;
    };
  };
  uptime: number;
}

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp,
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: { status: "down" },
      storage: { status: "down" },
    },
    uptime,
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    const supabase = await createClient();

    // Simple query to check database connectivity
    const { error } = await supabase.from("profiles").select("id").limit(1);

    const dbLatency = Date.now() - dbStart;

    if (error && !error.message.includes("no rows")) {
      healthStatus.checks.database = {
        status: "down",
        latency: dbLatency,
        error: "Database query failed",
      };
    } else {
      healthStatus.checks.database = {
        status: "up",
        latency: dbLatency,
      };
    }
  } catch (error) {
    healthStatus.checks.database = {
      status: "down",
      error: "Database connection failed",
    };
  }

  // Check storage connection
  try {
    const supabase = await createClient();

    // List buckets to check storage connectivity
    const { error } = await supabase.storage.listBuckets();

    if (error) {
      healthStatus.checks.storage = {
        status: "down",
        error: "Storage connection failed",
      };
    } else {
      healthStatus.checks.storage = {
        status: "up",
      };
    }
  } catch (error) {
    healthStatus.checks.storage = {
      status: "down",
      error: "Storage connection failed",
    };
  }

  // Determine overall status
  const allChecksUp = Object.values(healthStatus.checks).every(
    (check) => check.status === "up"
  );
  const someChecksUp = Object.values(healthStatus.checks).some(
    (check) => check.status === "up"
  );

  if (allChecksUp) {
    healthStatus.status = "healthy";
  } else if (someChecksUp) {
    healthStatus.status = "degraded";
  } else {
    healthStatus.status = "unhealthy";
  }

  // Return appropriate status code
  const statusCode = healthStatus.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
