// Simple JS syntax highlighter (no dependencies)
export function highlightJS(code: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const KEYWORDS = new Set([
    "const","let","var","function","return","if","else","for","while","of","in",
    "new","true","false","null","undefined","typeof","instanceof","this","class",
    "import","export","default","from","await","async","try","catch","throw",
    "switch","case","break","continue",
  ]);
  const BUILTINS = new Set([
    "console","Math","Date","Object","Array","JSON","Map","Set","Promise","Error",
  ]);

  // Single-pass tokenizer regex — order matters (first match wins)
  const TOKEN =
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|[a-zA-Z_$][a-zA-Z0-9_$]*/g;

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN.exec(code)) !== null) {
    // Append any plain text between tokens
    if (match.index > lastIndex) {
      result += esc(code.slice(lastIndex, match.index));
    }
    const tok = match[0];
    const escaped = esc(tok);

    if (tok.startsWith("/*") || tok.startsWith("//")) {
      result += `<span class="hl-comment">${escaped}</span>`;
    } else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith("`")) {
      result += `<span class="hl-string">${escaped}</span>`;
    } else if (/^\d/.test(tok)) {
      result += `<span class="hl-number">${escaped}</span>`;
    } else if (KEYWORDS.has(tok)) {
      result += `<span class="hl-keyword">${escaped}</span>`;
    } else if (BUILTINS.has(tok)) {
      result += `<span class="hl-builtin">${escaped}</span>`;
    } else {
      result += escaped;
    }

    lastIndex = match.index + tok.length;
  }

  // Append any remaining plain text
  if (lastIndex < code.length) {
    result += esc(code.slice(lastIndex));
  }

  return result;
}
