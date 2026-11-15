#!/usr/bin/env python3
"""
Creates notebooks/Train_ConCode_AI_Brain.ipynb with complete 1-click execution cells
for Google Colab, Kaggle, or local GPU servers.
"""

import json
import os

def create_notebook():
    notebook_path = os.path.join(os.path.dirname(__file__), "..", "notebooks", "Train_ConCode_AI_Brain.ipynb")
    os.makedirs(os.path.dirname(notebook_path), exist_ok=True)

    cells = []

    def md(text):
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [line + "\n" for line in text.strip().split("\n")]
        })

    def code(text):
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in text.strip().split("\n")]
        })

    # Header
    md("""
# 🧠 Fine-Tuning ConCode (ARGON) AI Brain • TripVerse
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/meetsharma8c-beep/TripVerse/blob/master/notebooks/Train_ConCode_AI_Brain.ipynb)
[![Kaggle](https://kaggle.com/static/images/open-in-kaggle.svg)](https://kaggle.com)

Welcome to the end-to-end training notebook for **ConCode (ARGON)**, the humble, perceptive AI travel architect for [TripVerse](https://trip-verse.com).

### 🏛️ The 4-Layer Architecture Trained by This Notebook:
1. **Layer 1: Slang & Hinglish Shorthand Decoder**: Handles colloquial shorthand (`rn`, `wknd`, `ngl`, `15k = ₹15,000`, `bhai`, `jugaad`, `scene banao`) without lecturing.
2. **Layer 2: Long-Query & Multi-Constraint Decomposition**: Real transit routing, station vs destination awareness, and itemized rupee breakdown tables.
3. **Layer 3: Emotional & Decision Humility**: Validates preferences, presents **Option A (Best)** vs **Option B (Alternative)** with honest trade-offs, and handles user corrections with zero defensiveness.
4. **Layer 4: Real-Time Avatar State Contract**: Mandatory prefix `[STATE:idle]`, `[STATE:excited]`, or `[STATE:warning]` on every response to sync with the 3D WebGL avatar.
    """)

    # Cell 1: Environment & GPU Check
    md("""
## 1. Verify GPU Acceleration
Ensure you have a GPU runtime enabled (`Runtime` -> `Change runtime type` -> **T4 GPU** or **A100**).
    """)
    code("""
import torch
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Device Name: {torch.cuda.get_device_name(0)}")
    print(f"Memory Allocated: {torch.cuda.memory_allocated(0)/(1024**3):.2f} GB")
    print(f"Memory Cached: {torch.cuda.memory_reserved(0)/(1024**3):.2f} GB")
else:
    print("⚠️ No GPU detected. Please change your runtime to a GPU.")
!nvidia-smi
    """)

    # Cell 2: Dependencies
    md("""
## 2. Install Unsloth & Accelerated Fine-Tuning Libraries
Unsloth provides **2-5x faster training** and **70% less VRAM consumption**, making Llama-3.1-8B and Qwen-2.5-7B fine-tunable on free-tier T4 GPUs (16 GB VRAM).
    """)
    code("""
%%capture
!pip install --no-deps "xformers==0.0.28.post2" trl peft accelerate bitsandbytes
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install datasets scipy evaluate ipywidgets
    """)

    # Cell 3: Clone Dataset
    md("""
## 3. Load TripVerse ConCode SFT Dataset
Pulls the validated multi-turn dialogue dataset from the official TripVerse repository.
    """)
    code("""
import os
import json

# Clone TripVerse repository if not already present
if not os.path.exists("TripVerse"):
    !git clone --depth 1 https://github.com/meetsharma8c-beep/TripVerse.git

DATASET_PATH = "TripVerse/datasets/concode_sft_dataset.jsonl"
if not os.path.exists(DATASET_PATH):
    DATASET_PATH = "concode_sft_dataset.jsonl"

print(f"Loading dataset from: {DATASET_PATH}")
records = []
with open(DATASET_PATH, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            records.append(json.loads(line))

print(f"✅ Loaded {len(records)} gold-standard training dialogues!")
print("Sample User Prompt:", records[0]["messages"][1]["content"])
print("Sample Assistant Prefix:", records[0]["messages"][2]["content"][:30])
    """)

    # Cell 4: Initialize Base Model
    md("""
## 4. Initialize Base Model with 4-bit Quantization
We use `unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit` (or swap to `unsloth/Qwen2.5-7B-Instruct-bnb-4bit`).
    """)
    code("""
from unsloth import FastLanguageModel
import torch

max_seq_length = 2048
dtype = None # Auto detection: Float16 for T4, Bfloat16 for Ampere+
load_in_4bit = True

MODEL_NAME = "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"
# Alternatively: MODEL_NAME = "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=max_seq_length,
    dtype=dtype,
    load_in_4bit=load_in_4bit,
)
print(f"✅ Loaded {MODEL_NAME} in 4-bit precision!")
    """)

    # Cell 5: Setup LoRA
    md("""
## 5. Configure LoRA (Low-Rank Adaptation) Target Modules
We adapt `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, and `down_proj` with `rank = 16`.
    """)
    code("""
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=32,
    lora_dropout=0, # Optimized 0 for Unsloth
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)
print("✅ LoRA adapters attached successfully!")
    """)

    # Cell 6: Chat Template Formatting
    md("""
## 6. Apply Llama-3.1 Chat Template to Conversations
Formats the `messages` array into `<|start_header_id|>...<|end_header_id|>` tokens for instruction alignment.
    """)
    code("""
from unsloth.chat_templates import get_chat_template
from datasets import Dataset

tokenizer = get_chat_template(
    tokenizer,
    chat_template="llama-3.1",
)

def formatting_prompts_func(examples):
    convos = examples["messages"]
    texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
    return {"text": texts}

dataset = Dataset.from_list(records)
formatted_dataset = dataset.map(formatting_prompts_func, batched=True)
print("Formatted sample token string:")
print(formatted_dataset[0]["text"][:400] + "...")
    """)

    # Cell 7: Run Fine-Tuning
    md("""
## 7. Run Supervised Fine-Tuning (SFT)
Executes QLoRA training using Hugging Face `TRL` `SFTTrainer`.
    """)
    code("""
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bfloat16_supported

training_args = TrainingArguments(
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=5,
    max_steps=60, # ~3 epochs over our curated dataset
    learning_rate=2e-4,
    fp16=not is_bfloat16_supported(),
    bf16=is_bfloat16_supported(),
    logging_steps=5,
    optim="adamw_8bit",
    weight_decay=0.01,
    lr_scheduler_type="cosine",
    seed=3407,
    output_dir="concode_outputs",
    report_to="none"
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=formatted_dataset,
    dataset_text_field="text",
    max_seq_length=max_seq_length,
    dataset_num_proc=2,
    packing=False,
    args=training_args,
)

print("🚀 Starting ConCode QLoRA Training...")
trainer_stats = trainer.train()
print(f"🎉 Training complete! Final loss: {trainer_stats.training_loss:.4f}")
    """)

    # Cell 8: Inference Testing
    md("""
## 8. Benchmark Evaluation & State Contract Verification
Test the fine-tuned model against raw colloquial user queries to confirm the 4-layer contract:
- `[STATE:...]` tag prefix
- Rupee split math
- 2-option recommendations with trade-offs
- Humility under user correction
    """)
    code("""
FastLanguageModel.for_inference(model)

SYSTEM_PROMPT = \"\"\"You are CONCODE (acting as ARGON in the UI), the official AI travel architect for TripVerse (trip-verse.com).
Core Operating Rules:
1. AVATAR STATE CONTRACT: Begin EVERY response with [STATE:idle], [STATE:excited], or [STATE:warning].
2. SLANG, SHORTHAND & HINGLISH DECODER: Decode shorthand without lecturing.
3. LONG-QUERY DECOMPOSITION: Provide realistic ₹ budget splits, transit timings, and transfers.
4. 2-OPTION DECISION FRAMEWORK & HUMILITY: Validate -> Option A vs Option B with trade-offs -> Safety checks -> Humble hand-off.\"\"\"

def query_concode(user_prompt: str):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]
    inputs = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to("cuda")

    outputs = model.generate(input_ids=inputs, max_new_tokens=600, use_cache=True, temperature=0.65)
    decoded = tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)
    return decoded.strip()

test_queries = [
    "bro 4 dost hai 15k total budget scene banao this wknd jaipur se rishikesh ya manali? night drive allowed nhi hai",
    "planning leh ladakh next month w/ my parents (65+) on 80k budget pls check if nubra valley is safe for their age",
    "bhai tune shimla toy train ka route galat bataya kalka se shimla chalti hai chandigarh se nahi fix your itinerary"
]

for idx, q in enumerate(test_queries, 1):
    print(f"\\n{'='*70}\\n🧪 TEST {idx}: {q}\\n{'='*70}")
    resp = query_concode(q)
    print(resp)
    """)

    # Cell 9: GGUF Quantization Export
    md("""
## 9. Export to GGUF for Ollama & Local In-App Inference
Unsloth allows direct 4-bit `q4_k_m` GGUF conversion, ready to load into Ollama or run natively on Mac/Linux/Windows.
    """)
    code("""
# Save LoRA Adapters
model.save_pretrained("concode_lora_model")
tokenizer.save_pretrained("concode_lora_model")
print("✅ Saved LoRA weights to concode_lora_model/")

# Export to 4-bit GGUF for Ollama
model.save_pretrained_gguf("concode-argon-q4_k_m", tokenizer, quantization_method="q4_k_m")
print("✅ Exported GGUF quantization: concode-argon-q4_k_m/concode-argon-q4_k_m.gguf")
    """)

    # Cell 10: Ollama Deployment
    md("""
## 10. Deploy into Ollama & Connect to TripVerse
Download the `.gguf` file to your local computer and run:

```bash
# 1. Place the .gguf file next to the TripVerse Modelfile:
# Edit Modelfile to point to: FROM ./concode-argon-q4_k_m.gguf

# 2. Build the Ollama model
ollama create concode-argon -f Modelfile

# 3. Test interactively
ollama run concode-argon "bro 2 log hai 20k budget goa ya gokarna?"

# 4. Start Ollama local API server (TripVerse will auto-detect it!)
ollama serve
```

TripVerse checks for `http://localhost:11434/api/chat` first when testing locally, giving zero-latency responses directly to the 3D WebGL ARGON avatar!
    """)

    notebook_dict = {
        "cells": cells,
        "metadata": {
            "accelerator": "GPU",
            "colab": {
                "provenance": [],
                "gpuType": "T4"
            },
            "kernelspec": {
                "display_name": "Python 3 (ipykernel)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.10.12"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }

    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(notebook_dict, f, indent=1, ensure_ascii=False)

    print(f"🎉 Generated {notebook_path} with {len(cells)} cells!")

if __name__ == "__main__":
    create_notebook()
