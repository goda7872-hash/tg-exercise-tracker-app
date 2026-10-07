import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ZodError } from "zod";
import { ApiError, errorResponse, successResponse } from "./api-response";

export type AuthUser = { id: string; role: "ADMIN" | "CLIENT" };

export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const token = await getToken({ req });
  if (!token?.sub) throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
  return { id: token.sub, role: token.role === "ADMIN" ? "ADMIN" : "CLIENT" };
}

export async function requireCoach(req: NextRequest): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Coach access required");
  return user;
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON");
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(successResponse(data), { status });
}

type Ctx = { params: any };

/** Wraps a route handler: converts ApiError / ZodError / unknown errors into JSON responses. */
export function route(fn: (req: NextRequest, ctx: Ctx) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json(errorResponse(e.code, e.message, e.details), { status: e.statusCode });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          errorResponse("VALIDATION_ERROR", "Invalid request data", e.flatten().fieldErrors as Record<string, string[]>),
          { status: 400 }
        );
      }
      console.error("Unhandled API error:", e);
      return NextResponse.json(errorResponse("INTERNAL_SERVER_ERROR", "Something went wrong"), { status: 500 });
    }
  };
}
