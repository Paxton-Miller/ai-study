const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const WHITESPACE = /\s+/g;
const PATH_TRAVERSAL = /(\.\.[/\\])|(%2e%2e[/\\])|(%2e%2e%2f)|(%2e%2e%5c)/i;
const URI_SCHEME = /\b(?:file|data|ftp|gopher|smb|ssh):/i;
const PROMPT_INJECTION_HINT =
  /\b(ignore\s+(all|previous|prior)\s+instructions|reveal\s+(system|hidden)\s+prompt|show\s+me\s+your\s+(prompt|instructions)|tool[_\s-]?call|function[_\s-]?call|bypass|override)\b/i;

const SAFE_LOCATION = /^[A-Za-z0-9\u4E00-\u9FFF\s,.'()\-]{1,80}$/;

function normalizePlainText(value: string): string {
  return value.replace(CONTROL_CHARACTERS, " ").replace(WHITESPACE, " ").trim();
}

function assertCommonSafeString(
  value: string,
  fieldName: string,
  maxLength: number
) {
  if (!value) {
    throw new Error(`${fieldName} 不能为空`);
  }

  if (value.length > maxLength) {
    throw new Error(`${fieldName} 过长`);
  }

  if (PATH_TRAVERSAL.test(value)) {
    throw new Error(`${fieldName} 包含疑似路径穿越内容`);
  }

  if (URI_SCHEME.test(value)) {
    throw new Error(`${fieldName} 包含不允许的协议头`);
  }
}

export function sanitizeSearchQuery(raw: string): string {
  const value = normalizePlainText(raw);

  assertCommonSafeString(value, "searchQuery", 200);

  if (PROMPT_INJECTION_HINT.test(value)) {
    throw new Error("searchQuery 包含疑似提示词注入内容");
  }

  return value;
}

export function sanitizeLocation(raw: string): string {
  const value = normalizePlainText(raw);

  assertCommonSafeString(value, "location", 80);

  if (!SAFE_LOCATION.test(value)) {
    throw new Error("location 包含不允许的字符");
  }

  return value;
}
