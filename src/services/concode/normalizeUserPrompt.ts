/**
 * User Prompt Normalizer & Constraint Pre-Processor (normalizeUserPrompt.ts)
 * Expands conversational abbreviations, currency shorthand (e.g. 15k -> ₹15,000),
 * and injects multi-part constraint locks so smaller or fast LLMs never miss
 * detailed budget, pacing, or transport requirements.
 */

const SLANG_RULES: Array<[RegExp, string]> = [
  [/\brn\b/gi, 'right now'],
  [/\bwknd\b/gi, 'weekend'],
  [/\bngl\b/gi, 'honestly'],
  [/\btbh\b/gi, 'to be honest'],
  // Safari 14-16.3 safe (no regex lookbehind): preserve leading whitespace/start anchor
  [/(^|\s)b\/w(?=\s|$)/gi, '$1between'],
  [/(^|\s)w\/(?=\s|$)/gi, '$1with'],
  [/(^|\s)w\/o(?=\s|$)/gi, '$1without'],
  [/\bppl\b/gi, 'people'],
  [/\bpax\b/gi, 'travelers'],
  [/\bbcz\b/gi, 'because'],
  [/\bcuz\b/gi, 'because'],
  [/\bidk\b/gi, 'I do not know'],
  [/\bpls\b/gi, 'please'],
  [/\bplz\b/gi, 'please'],
  [/\bhv\b/gi, 'have'],
  [/\bacc\b/gi, 'according'],
  [/(\d+)k\b/gi, '₹$1,000'], // Converts "15k" -> "₹15,000" automatically
];

export function preparePromptForConCode(rawUserText: string): string {
  if (!rawUserText || typeof rawUserText !== 'string') return '';
  let normalized = rawUserText.trim();

  // 1. Expand abbreviations & currency shorthand
  for (const [regex, replacement] of SLANG_RULES) {
    normalized = normalized.replace(regex, replacement);
  }

  // 2. Detect long/complex multi-part queries and inject a constraint-lock reminder
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const questionMarks = (normalized.match(/\?/g) || []).length;

  if (wordCount > 25 || questionMarks >= 2) {
    return `${normalized}\n\n[SYSTEM NOTE: This is a multi-part user query. Extract every constraint (budget, headcount, dates, vibe, travel mode) and answer every single question genuinely with concrete numbers and trade-offs. Do not give a short generic summary.]`;
  }

  return normalized;
}
