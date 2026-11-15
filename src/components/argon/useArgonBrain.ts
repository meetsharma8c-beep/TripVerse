/**
 * ═════════════════════════════════════════════════════════════════════════════
 * TripVerse • React Hook for Argon High Brain (useArgonBrain.ts)
 * ═════════════════════════════════════════════════════════════════════════════
 * Wires the 3D WebGL Argon Avatar and AIChatDrawer directly into the
 * local Ollama + Cloud Hybrid Router.
 *
 * State flow:
 * 1. userPrompt sent -> 'thinking' (purple radar pulse while <concode_think> streams)
 * 2. headers parsed -> 'speaking' (mouth waveform driven by speechIntensity)
 * 3. stream completes -> semantic emotion ('excited' | 'warning' | 'idle')
 * 4. idle timeout (4.5s) -> 'idle'
 */

import { useState, useCallback } from 'react';
import { ArgonState } from './argon.types';
import { ConCodeMessage, streamConCodeArgonHigh, ArgonEmotion } from '../../services/concode/concodeRouter';

export function useArgonBrain() {
  const [argonState, setArgonState] = useState<ArgonState>('idle');
  const [speechIntensity, setSpeechIntensity] = useState<number>(0.5);
  const [liveThought, setLiveThought] = useState<string>('');
  const [activeProvider, setActiveProvider] = useState<'ollama-local' | 'cloud-fallback'>('ollama-local');
  const [streamingReply, setStreamingReply] = useState<string>('');
  const [lastAction, setLastAction] = useState<string>('none');

  const sendToArgon = useCallback(
    async (
      userPrompt: string,
      chatHistory: ConCodeMessage[],
      onFinalMessage?: (reply: string, emotion: ArgonState, action: string) => void
    ) => {
      // 1. Enter purple radar 'thinking' state while <concode_think> streams
      setArgonState('thinking');
      setLiveThought('Decoding constraints & calculating route math...');
      setStreamingReply('');

      let capturedAction = 'none';
      let latestVisibleText = '';

      await streamConCodeArgonHigh(chatHistory, userPrompt, {
        onThinkingUpdate: (thought) => {
          setLiveThought(thought);
        },
        onHeaderParsed: (_emotion: ArgonEmotion, action: string) => {
          capturedAction = action;
          setLastAction(action);
          setArgonState('speaking');
          setLiveThought('');
        },
        onToken: (cleanText, intensity) => {
          latestVisibleText = cleanText;
          setStreamingReply(cleanText);
          setSpeechIntensity(intensity);
          setArgonState('speaking');
        },
        onComplete: (finalEmotion, provider) => {
          setActiveProvider(provider);
          setSpeechIntensity(0);
          // Settle on semantic emotion ('excited' | 'warning' | 'idle')
          setArgonState(finalEmotion);
          onFinalMessage?.(latestVisibleText, finalEmotion, capturedAction);

          // Return gently to idle after 4.5 seconds
          setTimeout(() => setArgonState('idle'), 4500);
        },
        onError: (_err) => {
          setLiveThought('');
          setArgonState('warning');
          const fallbackMsg = "I hit a brief connection bump while checking that route—could you try sending that again?";
          onFinalMessage?.(fallbackMsg, 'warning', 'none');
        },
      });
    },
    []
  );

  return {
    argonState,
    setArgonState,
    speechIntensity,
    liveThought,
    streamingReply,
    activeProvider,
    lastAction,
    sendToArgon,
  };
}
