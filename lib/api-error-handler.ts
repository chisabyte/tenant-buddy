/**
 * Centralized API Error Handling
 *
 * Provides consistent error responses without exposing
 * sensitive information or stack traces in production
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * Handles errors in API routes with proper logging and sanitization
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Log full error server-side (in production, send to monitoring service)
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Application errors (expected errors)
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any;

    // Map common Supabase errors
    switch (supabaseError.code) {
      case '23505': // Unique violation
        return NextResponse.json(
          {
            error: 'A record with this information already exists',
            code: 'DUPLICATE_ENTRY',
          },
          { status: 409 }
        );

      case '23503': // Foreign key violation
        return NextResponse.json(
          {
            error: 'Referenced record not found',
            code: 'INVALID_REFERENCE',
          },
          { status: 400 }
        );

      case 'PGRST116': // Row not found
        return NextResponse.json(
          {
            error: 'Resource not found',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );

      default:
        // Log the actual error for debugging (server-side only)
        console.error('Supabase error details:', {
          code: supabaseError.code,
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
        });
        // Don't expose Supabase error details to client
        return NextResponse.json(
          {
            error: 'Database operation failed',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        );
    }
  }

  // Generic errors (don't expose details)
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Common error constructors
 */
export const ApiErrors = {
  unauthorized: () => new AppError(401, 'Unauthorized', 'UNAUTHORIZED'),

  forbidden: () => new AppError(403, 'Forbidden', 'FORBIDDEN'),

  notFound: (resource: string = 'Resource') =>
    new AppError(404, `${resource} not found`, 'NOT_FOUND'),

  badRequest: (message: string) =>
    new AppError(400, message, 'BAD_REQUEST'),

  conflict: (message: string) => new AppError(409, message, 'CONFLICT'),

  tooManyRequests: () =>
    new AppError(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED'),

  internal: (message: string = 'Internal server error') =>
    new AppError(500, message, 'INTERNAL_ERROR'),

  serviceUnavailable: () =>
    new AppError(503, 'Service unavailable', 'SERVICE_UNAVAILABLE'),
};

/**
 * Request validation helper - throws if user is null/undefined
 * Returns the user with proper typing to indicate it's not null
 */
export function requireAuth<T>(user: T | null | undefined): asserts user is T {
  if (!user) {
    throw ApiErrors.unauthorized();
  }
}

/**
 * Resource ownership validation
 */
export function requireOwnership(
  resourceUserId: string,
  currentUserId: string,
  resourceName: string = 'Resource'
) {
  if (resourceUserId !== currentUserId) {
    throw ApiErrors.forbidden();
  }
}
