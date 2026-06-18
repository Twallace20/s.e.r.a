const SECRET_PATTERNS: RegExp[] = [
  /(api[_-]?key\s*[=:]\s*)[^\s"']+/gi,
  /(token\s*[=:]\s*)[^\s"']+/gi,
  /(password\s*[=:]\s*)[^\s"']+/gi,
  /(secret\s*[=:]\s*)[^\s"']+/gi,
  /(sk-[A-Za-z0-9_\-]{16,})/g
];

export function redactSecrets(input: unknown): string {
  let text = typeof input === "string" ? input : JSON.stringify(input, null, 2);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix) => {
      if (typeof prefix === "string" && match.toLowerCase().startsWith(prefix.toLowerCase())) {
        return `${prefix}[REDACTED]`;
      }
      return "[REDACTED]";
    });
  }
  return text;
}
