/**
 * Error Reporting and Monitoring
 *
 * Production-ready error reporting that integrates with external monitoring services.
 * Configure SENTRY_DSN in environment variables to enable Sentry integration.
 *
 * For Sentry setup:
 * 1. Create account at sentry.io
 * 2. Create a new Next.js project
 * 3. Add SENTRY_DSN to your environment variables
 * 4. Optionally add @sentry/nextjs package for full integration
 */

type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

interface ErrorContext {
  userId?: string;
  email?: string;
  page?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: string;
  environment: string;
  release?: string;
}

// Check if we're in production
const isProduction = process.env.NODE_ENV === "production";

// Check if Sentry is configured
const isSentryConfigured = !!process.env.SENTRY_DSN;

/**
 * Initialize error reporting (call once at app start)
 */
export function initErrorReporting(): void {
  if (isProduction && !isSentryConfigured) {
    console.warn(
      "[Error Reporting] No error monitoring service configured. " +
        "Set SENTRY_DSN environment variable for production monitoring."
    );
  }

  // Set up global error handlers for uncaught errors
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      captureException(event.error, {
        action: "uncaught_error",
        extra: { message: event.message },
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      captureException(event.reason, {
        action: "unhandled_promise_rejection",
      });
    });
  }
}

/**
 * Capture an exception and report it
 */
export function captureException(
  error: Error | unknown,
  context: ErrorContext = {}
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  const report: ErrorReport = {
    message: errorObj.message,
    stack: errorObj.stack,
    severity: "error",
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version,
  };

  // Always log in development
  if (!isProduction) {
    console.error("[Error Captured]", report);
    return;
  }

  // Send to Sentry if configured
  if (isSentryConfigured) {
    sendToSentry(report);
  }

  // Log to server-side logs (picked up by hosting platform)
  console.error(JSON.stringify(report));
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  severity: ErrorSeverity = "info",
  context: ErrorContext = {}
): void {
  const report: ErrorReport = {
    message,
    severity,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version,
  };

  if (!isProduction) {
    console.log(`[${severity.toUpperCase()}]`, message, context);
    return;
  }

  if (isSentryConfigured && ["error", "fatal", "warning"].includes(severity)) {
    sendToSentry(report);
  }

  console.log(JSON.stringify(report));
}

/**
 * Set user context for error reports
 */
export function setUser(user: { id: string; email?: string } | null): void {
  // Store user context for subsequent error reports
  if (typeof window !== "undefined") {
    if (user) {
      (window as unknown as Record<string, unknown>).__errorReportingUser = user;
    } else {
      delete (window as unknown as Record<string, unknown>).__errorReportingUser;
    }
  }
}

/**
 * Get current user context
 */
function getCurrentUser(): { id: string; email?: string } | null {
  if (typeof window !== "undefined") {
    return (window as unknown as Record<string, unknown>).__errorReportingUser as {
      id: string;
      email?: string;
    } | null;
  }
  return null;
}

/**
 * Send error to Sentry via their HTTP API
 */
async function sendToSentry(report: ErrorReport): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Parse DSN to extract project info
    const dsnMatch = dsn.match(
      /^https:\/\/([^@]+)@([^/]+)\/(.+)$/
    );
    if (!dsnMatch) {
      console.error("[Sentry] Invalid DSN format");
      return;
    }

    const [, publicKey, host, projectId] = dsnMatch;
    const endpoint = `https://${host}/api/${projectId}/store/`;

    const user = getCurrentUser();

    const sentryEvent = {
      event_id: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      timestamp: report.timestamp,
      level: report.severity,
      platform: "javascript",
      environment: report.environment,
      release: report.release,
      message: report.message,
      exception: report.stack
        ? {
            values: [
              {
                type: "Error",
                value: report.message,
                stacktrace: {
                  frames: parseStackTrace(report.stack),
                },
              },
            ],
          }
        : undefined,
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : undefined,
      extra: report.context.extra,
      tags: {
        action: report.context.action,
        page: report.context.page,
      },
    };

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(sentryEvent),
    });
  } catch (e) {
    // Don't throw errors from error reporting
    console.error("[Sentry] Failed to send error:", e);
  }
}

/**
 * Parse stack trace into Sentry format
 */
function parseStackTrace(
  stack: string
): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  const lines = stack.split("\n").slice(1);
  return lines
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    filename: string;
    function: string;
    lineno?: number;
    colno?: number;
  }>;
}

/**
 * Note: For React error boundaries, use @sentry/nextjs ErrorBoundary component
 * or create a class-based error boundary. try-catch doesn't work for React
 * render errors - you need componentDidCatch or the Sentry ErrorBoundary.
 *
 * Example with @sentry/nextjs:
 *
 * import * as Sentry from "@sentry/nextjs";
 *
 * <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </Sentry.ErrorBoundary>
 */
