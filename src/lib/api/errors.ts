import { NextResponse } from "next/server";

/**
 * Maps thrown errors to HTTP responses so permission failures return 401/403
 * rather than being reported as server errors.
 */
export function apiError(err: unknown) {
  const e = err as { name?: string; message?: string; issues?: { message: string }[] };
  if (e?.name === "UnauthorizedError") {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
  if (e?.name === "ForbiddenError") {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  if (e?.name === "ZodError" && e.issues?.length) {
    return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
  }
  if (e?.name === "BusinessRuleError") {
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
  console.error(err);
  return NextResponse.json({ error: e?.message || "Unexpected server error" }, { status: 500 });
}

/** A violated business rule (e.g. invoice already finalized). Reported as 409. */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}
