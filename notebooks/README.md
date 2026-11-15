# 🧠 ConCode (ARGON) AI Fine-Tuning Kit • TripVerse

Welcome to the official training and fine-tuning suite for **ConCode (ARGON)**, the perceptive, humble AI travel architect powering [TripVerse](https://trip-verse.com).

This repository contains everything required to reproduce, fine-tune, and deploy the specialized ConCode AI model on open-source weights (**Llama-3.1-8B-Instruct** or **Qwen-2.5-7B-Instruct**) using **Unsloth QLoRA**.

---

## 🏛️ Architecture Overview

ConCode is trained to strictly adhere to the **4-Layer TripVerse Master Brain Specification**:

```
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 1: SLANG & HINGLISH SHORTHAND DECODER               │
│   • Decodes texting shorthand (rn, wknd, ngl, tbh, b/w, w/, ppl, pax) │
│   • Handles colloquial Hinglish (bhai, scene banao, sasta, jugaad)    │
│   • Normalizes currency shorthand (15k -> ₹15,000, 2L -> ₹2,00,000)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            LAYER 2: LONG-QUERY & MULTI-CONSTRAINT DECOMPOSITION         │
│   • Extracts headcount, budget locks, transit limitations, dates       │
│   • Calculates real transit times & transfers (Station != Destination) │
│   • Itemized rupee budget tables with exact category splits            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             LAYER 3: EMOTIONAL & DECISION HUMILITY (2-OPTION)           │
│   • Validate & Anchor -> Option A (Best) vs Option B (Contrasting)     │
│   • Proactive alerts (monsoons, mountain curves, AMS acclimatization)  │
│   • Gracious accountability when corrected without arguing             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            LAYER 4: REAL-TIME AVATAR STATE CONTRACT (MANDATORY)         │
│   • Every response begins with [STATE:idle], [STATE:excited],          │
│     or [STATE:warning] to drive the interactive 3D WebGL avatar        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart: Google Colab / Kaggle (Free T4 GPU)

1. Open [`Train_ConCode_AI_Brain.ipynb`](Train_ConCode_AI_Brain.ipynb) in **Google Colab** or **Kaggle Notebooks**.
2. Set Runtime to **T4 GPU** (or V100/A100).
3. Run all cells:
   - Cell 1: Environment & GPU verification.
   - Cell 2: Install Unsloth & accelerated training dependencies.
   - Cell 3: Load `datasets/concode_sft_dataset.jsonl`.
   - Cell 4: Initialize 4-bit quantized base model.
   - Cell 5: Apply LoRA adapters (`r=16, lora_alpha=32`).
   - Cell 6: Train with Hugging Face `SFTTrainer`.
   - Cell 7: Run evaluation benchmarks (slang handling, humility, ₹ budget precision).
   - Cell 8: Export `.gguf` quantization (`q4_k_m`) or LoRA adapters.

---

## 💻 Local Fine-Tuning & Dataset Tools

### 1. Expand Dataset with Teacher LLMs
Generate additional high-fidelity synthetic training dialogues using Groq:
```bash
python3 scripts/expand_concode_dataset.py
```

### 2. Run Local QLoRA Fine-Tuning
Execute the training script locally (requires CUDA GPU with >= 12 GB VRAM):
```bash
python3 scripts/train_concode_lora.py \
  --model llama3.1 \
  --dataset datasets/concode_sft_dataset.jsonl \
  --output ./concode_lora_output \
  --epochs 3 \
  --export-gguf
```

---

## 🦙 Deploy with Ollama (Local Low-Latency Inference)

Once trained and exported to GGUF, or using the pre-configured [`Modelfile`](../Modelfile):

```bash
# 1. Create the model in Ollama
ollama create concode-argon -f Modelfile

# 2. Test in terminal
ollama run concode-argon "bro 4 dost hai 15k total budget scene banao this wknd jaipur se rishikesh"

# 3. Serve via Ollama API
ollama serve
```

TripVerse automatically connects to `http://localhost:11434/api/chat` when running locally or falls back to cloud providers (Groq, Gemini, OpenRouter) seamlessly in production!
