import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CONCODE_BRAIN_MASTER_PROMPT } from '../src/services/concode/concodeBrainMasterPrompt';
import { preparePromptForConCode } from '../src/services/concode/normalizeUserPrompt';
import { CONCODE_COMPACT_PROMPT } from '../api/concodePrompt.js';

describe('ConCode AI Brain Master Architecture & Training Suite', () => {
  it('verifies that CONCODE_BRAIN_MASTER_PROMPT contains all 4 core layers', () => {
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('LAYER 1: NATURAL LANGUAGE, SLANG & SHORTHAND DECODER');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('LAYER 2: LONG-QUERY & MULTI-CONSTRAINT ENGINE');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('LAYER 3: EMOTIONAL & DECISION HUMILITY');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('LAYER 4: ARGON WIDGET STATE TAG (MANDATORY)');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('[STATE:idle]');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('[STATE:excited]');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('[STATE:warning]');
  });

  it('validates few-shot training examples embedded in the master prompt', () => {
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('Example 1: Heavy Slang + Multi-Constraint Long Command');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('Example 2: Long, Messy, Anxious Family Query with Shorthand');
    expect(CONCODE_BRAIN_MASTER_PROMPT).toContain('Example 3: User Correcting ConCode / Route Parameter');
  });

  it('verifies CONCODE_COMPACT_PROMPT enforces the 4-layer protocol for cloud LLMs', () => {
    expect(CONCODE_COMPACT_PROMPT).toContain('AVATAR STATE CONTRACT');
    expect(CONCODE_COMPACT_PROMPT).toContain('SLANG, SHORTHAND & HINGLISH DECODER');
    expect(CONCODE_COMPACT_PROMPT).toContain('LONG-QUERY DECOMPOSITION');
    expect(CONCODE_COMPACT_PROMPT).toContain('2-OPTION DECISION FRAMEWORK & HUMILITY');
    expect(CONCODE_COMPACT_PROMPT).toContain('DESTINATION != STATION');
  });

  it('verifies prompt normalizer expands shorthand, currency, and multi-part constraint locks', () => {
    const raw = 'yo argon pls plan trip b/w delhi and kasol rn for 3 ppl w/ budget under 25k cuz boss approved leave';
    const normalized = preparePromptForConCode(raw);
    expect(normalized).toContain('between');
    expect(normalized).toContain('with');
    expect(normalized).toContain('right now');
    expect(normalized).toContain('people');
    expect(normalized).toContain('₹25,000');
    expect(normalized).toContain('because');
    expect(normalized).toContain('please');
  });

  it('verifies the Engine Modelfile format, parameters, and few-shot conversations', () => {
    const modelfilePath = path.resolve(__dirname, '../Modelfile');
    expect(fs.existsSync(modelfilePath)).toBe(true);

    const content = fs.readFileSync(modelfilePath, 'utf-8');
    expect(content).toContain('FROM llama3.1:8b');
    expect(content).toContain('PARAMETER temperature 0.65');
    expect(content).toContain('PARAMETER top_p 0.90');
    expect(content).toContain('PARAMETER num_ctx 8192');
    expect(content).toContain('PARAMETER num_predict 1536');
    expect(content).toContain('SYSTEM """');
    expect(content).toContain('MESSAGE user');
    expect(content).toContain('MESSAGE assistant');
    expect(content).toContain('[STATE:excited]');
    expect(content).toContain('[STATE:warning]');
    expect(content).toContain('[STATE:idle]');
  });

  it('verifies the Supervised Fine-Tuning (SFT) dataset concode_sft_dataset.jsonl', () => {
    const sftPath = path.resolve(__dirname, '../datasets/concode_sft_dataset.jsonl');
    expect(fs.existsSync(sftPath)).toBe(true);

    const lines = fs.readFileSync(sftPath, 'utf-8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(5);

    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty('messages');
      expect(Array.isArray(parsed.messages)).toBe(true);
      expect(parsed.messages.length).toBeGreaterThanOrEqual(3);

      const roles = parsed.messages.map((m: any) => m.role);
      expect(roles).toEqual(expect.arrayContaining(['system', 'user', 'assistant']));

      const assistantMsg = parsed.messages.find((m: any) => m.role === 'assistant');
      expect(assistantMsg.content).toMatch(/^\[STATE:(idle|excited|warning)\]/);
    }
  });

  it('verifies the training dataset generator script generate_concode_training.py', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/generate_concode_training.py');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const generatedPath = path.resolve(__dirname, '../datasets/concode_train_ready.jsonl');
    expect(fs.existsSync(generatedPath)).toBe(true);

    const lines = fs.readFileSync(generatedPath, 'utf-8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(4);

    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed.messages.length).toBe(3);
      expect(parsed.messages[2].content).toMatch(/^\[STATE:(idle|excited|warning)\]/);
    }
  });

  it('verifies the Unsloth QLoRA training script supports Llama-3.1 and Qwen-2.5 architectures', () => {
    const loraScriptPath = path.resolve(__dirname, '../scripts/train_concode_lora.py');
    expect(fs.existsSync(loraScriptPath)).toBe(true);

    const content = fs.readFileSync(loraScriptPath, 'utf-8');
    expect(content).toContain('MODEL_CATALOG');
    expect(content).toContain('llama3.1');
    expect(content).toContain('qwen2.5');
    expect(content).toContain('unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit');
    expect(content).toContain('unsloth/Qwen2.5-7B-Instruct-bnb-4bit');
    expect(content).toContain('save_pretrained_gguf');
  });
});
