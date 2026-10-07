export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string[]> };
  timestamp: string;
};

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>
): ApiResponse {
  return { success: false, error: { code, message, details }, timestamp: new Date().toISOString() };
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}
