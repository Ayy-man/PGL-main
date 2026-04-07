import { NextResponse } from "next/server";

/**
 * Structured API error codes used across all API routes.
 */
export type ApiErrorCode =
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "EXTERNAL_API_ERROR"
  | "INTERNAL_ERROR"
  | "OBFUSCATED_PROSPECT";

/**
 * Structured API error class.
 *
 * Throw this in API routes and catch with `handleApiError` for consistent
 * JSON error responses with machine-readable codes.
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Convert any caught error into a structured NextResponse.
 *
 * - ApiError -> { error, code, details? } with the specified status
 * - Unknown  -> generic 500 with INTERNAL_ERROR code
 *
 * Always logs the full error server-side.
 */
export function handleApiError(error: unknown): NextResponse {
  // Always log the full error server-side
  console.error("[handleApiError]", error);

  if (error instanceof ApiError) {
    const body: Record<string, unknown> = {
      error: error.message,
      code: error.code,
    };
    if (error.details !== undefined) {
      body.details = error.details;
    }
    return NextResponse.json(body, { status: error.status });
  }

  // Unknown error -> generic 500
  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR" satisfies ApiErrorCode,
    },
    { status: 500 }
  );
}
