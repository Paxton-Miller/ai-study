import { tool, type ToolSet } from "ai";
import { TOOL_RATE_LIMIT } from "../config";
import type { RequestContext } from "../request-context";
import {
  summarizeParams,
  writeAuditLog,
} from "../observability/audit-log";
import { checkRateLimit } from "../resilience/rate-limit";

export function protectToolsWithPolicies(
  tools: ToolSet,
  requestContext: RequestContext
): ToolSet {
  const protectedTools = Object.fromEntries(
    Object.entries(tools).map(([toolName, toolDefinition]) => [
      toolName,
      tool({
        description: toolDefinition.description,
        inputSchema: toolDefinition.inputSchema,
        execute: async (input, options) => {
          const parameterSummary = summarizeParams(input);
          const rateLimit = checkRateLimit({
            subject: `${requestContext.ip}:${requestContext.userId}`,
            toolName,
            limit: TOOL_RATE_LIMIT.limit,
            windowMs: TOOL_RATE_LIMIT.windowMs,
          });

          if (!rateLimit.allowed) {
            writeAuditLog({
              time: new Date().toISOString(),
              requestId: requestContext.requestId,
              modelRequestId: requestContext.modelRequestId,
              userId: requestContext.userId,
              ip: requestContext.ip,
              toolName,
              status: "blocked",
              parameterSummary,
              detail: `rate_limited retry_after_ms=${rateLimit.retryAfterMs}`,
            });

            throw new Error(
              `工具调用过于频繁，请在 ${Math.ceil(
                rateLimit.retryAfterMs / 1000
              )} 秒后重试。`
            );
          }

          writeAuditLog({
            time: new Date().toISOString(),
            requestId: requestContext.requestId,
            modelRequestId: requestContext.modelRequestId,
            userId: requestContext.userId,
            ip: requestContext.ip,
            toolName,
            status: "allowed",
            parameterSummary,
            detail: `remaining=${rateLimit.remaining}`,
          });

          try {
            const output = await toolDefinition.execute?.(input, options);

            writeAuditLog({
              time: new Date().toISOString(),
              requestId: requestContext.requestId,
              modelRequestId: requestContext.modelRequestId,
              userId: requestContext.userId,
              ip: requestContext.ip,
              toolName,
              status: "success",
              parameterSummary,
              detail: `tool_call_id=${options.toolCallId}`,
            });

            return output;
          } catch (error) {
            writeAuditLog({
              time: new Date().toISOString(),
              requestId: requestContext.requestId,
              modelRequestId: requestContext.modelRequestId,
              userId: requestContext.userId,
              ip: requestContext.ip,
              toolName,
              status: "error",
              parameterSummary,
              detail:
                error instanceof Error ? error.message : "unknown_tool_error",
            });

            throw error;
          }
        },
      }),
    ])
  );

  return protectedTools as ToolSet;
}
