/**
 * User Prompt Normalizer & Constraint Pre-Processor (normalizeUserPrompt.ts)
 * Expands conversational abbreviations, currency shorthand (e.g. 15k -> ₹15,000),
 * and injects multi-part constraint locks so smaller or fast LLMs never miss
 * detailed budget, pacing, or transport requirements.
 */

const SLANG_DICTIONARY: Record<string, string> = {
  '\\brn\\b': 'right now',
  '\\bwknd\\b': 'weekend',
  '\\bngl\\b': 'honestly',
  '\\btbh\\b': 'to be honest',
  '(?<=\\s|^)b/w(?=\\s|$)': 'between',
  '(?<=\\s|^)w/(?=\\s|$)': 'with',
  '(?<=\\s|^)w/o(?=\\s|$)': 'without',
  '\\bppl\\b': 'people',
  '\\bpax\\b': 'travelers',
  '\\bbcz\\b': 'because',
  '\\bcuz\\b': 'because',
  '\\bidk\\b': 'I do not know',
  '\\bpls\\b': 'please',
  '\\bplz\\b': 'please',
  '\\bhv\\b': 'have',
  '\\bacc\\b': 'according',
  '(\\d+)k\\b': '₹$1,000', // Converts "15k" -> "₹15,000" automatically
};

export function preparePromptForConCode(rawUserText: string): string {
  if (!rawUserText || typeof rawUserText !== 'string') return '';
  let normalized = rawUserText.trim();

  // 1. Expand abbreviations & currency shorthand
  for (const [pattern, replacement] of Object.entries(SLANG_DICTIONARY)) {
    normalized = normalized.replace(new RegExp(pattern, 'gi'), replacement);
  }

  // 2. Detect long/complex multi-part queries and inject a constraint-lock reminder
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const questionMarks = (normalized.match(/\?/g) || []).length;

  if (wordCount > 25 || questionMarks >= 2) {
    return `${normalized}\n\n[SYSTEM NOTE: This is a multi-part user query. Extract every constraint (budget, headcount, dates, vibe, travel mode) and answer every single question genuinely with concrete numbers and trade-offs. Do not give a short generic summary.]`;
  }

  return normalized;
}
