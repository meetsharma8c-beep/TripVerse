/**
 * ═════════════════════════════════════════════════════════════════════════════
 * TripVerse • ConCode & Argon Hybrid Stream Router (concodeRouter.ts)
 * ═════════════════════════════════════════════════════════════════════════════
 * Bridges the TripVerse React 3D mascot widget to local Ollama (GGUF)
 * with transparent fast-failover to cloud LLMs (Groq, Gemini, OpenRouter).
 *
 * Implements:
 * 1. 1.8-second local Ollama probe with keep_alive: '30m'
 * 2. Two-Phase Stream State Parser (<concode_think> -> [STATE:...][ACTION:...] -> Markdown)
 * 3. Dynamic Speech Intensity & Mouth Waveform Lip-Sync Computation
 */

import { ARGON_HIGH_SYSTEM_PROMPT } from './argonHighPrompt';
import { preparePromptForConCode } from './normalizeUserPrompt';
import { resolveApiUrl } from '../deviceService';

export interface ConCodeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ArgonEmotion = 'idle' | 'excited' | 'warning';

export interface StreamCallbacks {
  onThinkingUpdate?: (thoughtText: string) => void;
  onHeaderParsed?: (state: ArgonEmotion, action: string) => void;
  onToken?: (cleanVisibleText: string, speechIntensity: number) => void;
  onComplete?: (finalState: ArgonEmotion, provider: 'ollama-local' | 'cloud-fallback') => void;
  onError?: (err: Error) => void;
}

const OLLAMA_LOCAL_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = 'concode-argon';

export async function streamConCodeArgonHigh(
  history: ConCodeMessage[],
  rawUserPrompt: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const normalizedPrompt = preparePromptForConCode(rawUserPrompt);
  const messages: ConCodeMessage[] = [
    { role: 'system', content: ARGON_HIGH_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: normalizedPrompt },
  ];

  let rawBuffer = '';
  let targetEmotion: ArgonEmotion = 'idle';
  let targetAction = 'none';
  let headerDispatched = false;
  let usedProvider: 'ollama-local' | 'cloud-fallback' = 'ollama-local';

  // Compute lip-sync speech intensity (0.25 to 1.0) based on vowel density in chunk
  const computeSpeechIntensity = (chunk: string): number => {
    const vowels = (chunk.match(/[aeiouAEIOU₹0-9]/g) || []).length;
    return Math.min(1, Math.max(0.25, vowels / Math.max(1, chunk.length) + 0.35));
  };

  // Real-time stream state parser
  const processIncomingChunk = (tokenChunk: string) => {
    rawBuffer += tokenChunk;

    // Phase 1: Inside <concode_think>...</concode_think>
    const thinkCloseIdx = rawBuffer.indexOf('</concode_think>');
    if (thinkCloseIdx === -1) {
      const thinkText = rawBuffer.replace('<concode_think>', '').trim();
      if (callbacks.onThinkingUpdate && thinkText) {
        callbacks.onThinkingUpdate(thinkText);
      }
      return;
    }

    // Phase 2: After </concode_think>, parse headers
    const afterThink = rawBuffer.slice(thinkCloseIdx + '</concode_think>'.length).trimStart();
    const headerRegex = /^\[STATE:(idle|excited|warning)\](?:\[ACTION:([a-z_]+)\])?/i;
    const match = afterThink.match(headerRegex);

    if (match) {
      if (!headerDispatched) {
        targetEmotion = match[1].toLowerCase() as ArgonEmotion;
        targetAction = (match[2] || 'none').toLowerCase();
        callbacks.onHeaderParsed?.(targetEmotion, targetAction);
        headerDispatched = true;
      }
      const visibleText = afterThink.replace(headerRegex, '').trimStart();
      callbacks.onToken?.(visibleText, computeSpeechIntensity(tokenChunk));
    } else if (afterThink.length > 40) {
      // Fallback if model omitted bracket tags
      callbacks.onToken?.(afterThink, computeSpeechIntensity(tokenChunk));
    }
  };

  try {
    // 1. ATTEMPT LOCAL OLLAMA FIRST (1.8s fast probe timeout)
    const probeController = new AbortController();
    const timeoutId = setTimeout(() => probeController.abort(), 1800);

    const ollamaRes = await fetch(OLLAMA_LOCAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: probeController.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
        keep_alive: '30m',
        options: {
          num_ctx: 8192,
          num_predict: 1536,
          temperature: 0.65,
          top_p: 0.90,
        },
      }),
    });

    clearTimeout(timeoutId);
    if (!ollamaRes.ok || !ollamaRes.body) {
      throw new Error(`Ollama local returned ${ollamaRes.status}`);
    }

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            processIncomingChunk(parsed.message.content);
          }
        } catch {
          // ignore partial JSON chunk
        }
      }
    }

    callbacks.onComplete?.(targetEmotion, usedProvider);
  } catch (_ollamaErr) {
    // 2. TRANSPARENT CLOUD FALLBACK
    usedProvider = 'cloud-fallback';
    rawBuffer = '';

    try {
      const cloudRes = await fetch(resolveApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: ARGON_HIGH_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: normalizedPrompt },
          ],
        }),
      });

      if (!cloudRes.ok) {
        throw new Error(`Cloud chat API error: ${cloudRes.statusText}`);
      }

      const data = await cloudRes.json();
      const content = data.content || data.reply || '';

      // Feed full content through state processor
      processIncomingChunk(content);
      callbacks.onComplete?.(targetEmotion, usedProvider);
    } catch (cloudErr) {
      callbacks.onError?.(cloudErr instanceof Error ? cloudErr : new Error(String(cloudErr)));
    }
  }
}
