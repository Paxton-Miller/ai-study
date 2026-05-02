export type AuditStatus = "allowed" | "blocked" | "success" | "error";

export type AuditEntry = {
  time: string;
  requestId: string;
  modelRequestId?: string;
  userId: string;
  ip: string;
  toolName: string;
  status: AuditStatus;
  parameterSummary: string;
  detail?: string;
};

function truncate(value: string, maxLength = 160) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

export function summarizeParams(input: unknown): string {
  try {
    return truncate(JSON.stringify(input));
  } catch {
    return "[unserializable-params]";
  }
}

export function writeAuditLog(entry: AuditEntry) {
  console.info("[AUDIT]", JSON.stringify(entry));
}
