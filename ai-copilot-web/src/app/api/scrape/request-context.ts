import { generateId } from "ai";

export type RequestContext = {
  requestId: string;
  userId: string;
  ip: string;
  modelRequestId?: string;
};

export function createRequestContext(req: Request): RequestContext {
  return {
    requestId: generateId(),
    userId: req.headers.get("x-user-id")?.trim() || "anonymous",
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "unknown",
  };
}
