/** Shared shell command guard for HTTP exec and agent tools. */
export function terminalCommandBlockedReason(cmd: string): string | null {
  const t = cmd.trim();
  if (!t) return "empty command";
  if (t.length > 20000) return "command too long";
  const patterns = [
    /rm\s+(-[a-zA-Z]*f|--force)\s+[/~]/i,
    /rm\s+(-[a-zA-Z]*r[a-zA-Z\s]*f|--recursive)\s+[/~]/i,
    /:\(\)\s*\{\s*:\|:&\s*\};:/,
    /mkfs\.[a-z]+/i,
    /dd\s+if=/i,
    />\s*\/dev\/[sh]d/i,
    /curl\s+[^|]*\|\s*(ba)?sh/i,
  ];
  if (patterns.some((re) => re.test(t))) return "blocked dangerous pattern";
  return null;
}
