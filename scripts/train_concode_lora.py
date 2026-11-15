#!/usr/bin/env python3
"""
═════════════════════════════════════════════════════════════════════════════════
TripVerse • ConCode AI Brain — QLoRA Fine-Tuning & GGUF Export Engine
═════════════════════════════════════════════════════════════════════════════════
This script trains ConCode AI (Argon) using Unsloth on a single free T4 GPU
(Google Colab or Kaggle). It fine-tunes either Llama-3.1-8B or Qwen-2.5-7B on your
concode_sft_dataset.jsonl, embeds the 4-layer travel reasoning protocol,
and exports directly to GGUF (q4_k_m) for instant Ollama deployment.

INSTALL DEPENDENCIES (in Colab/Kaggle Cell):
!pip install --no-deps "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps trl peft accelerate bitsandbytes datasets

RUN TRAINING:
python scripts/train_concode_lora.py --base_model llama3.1
"""

import os
import sys
import argparse
import json
from datasets import load_dataset

# ═════════════════════════════════════════════════════════════════════════════
# 1. MODEL ARCHITECTURE CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════
MODEL_CATALOG = {
    "llama3.1": {
        "model_id": "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
        "chat_template": "llama-3.1",
        "tokens": {
            "bos": "<|begin_of_text|>",
            "header_start": "<|start_header_id|>",
            "header_end": "<|end_header_id|>",
            "eot": "<|eot_id|>"
        }
    },
    "qwen2.5": {
        "model_id": "unsloth/Qwen2.5-7B-Instruct-bnb-4bit",
        "chat_template": "chatml",
        "tokens": {
            "im_start": "<|im_start|>",
            "im_end": "<|im_end|>"
        }
    },
    "mistral": {
        "model_id": "unsloth/mistral-7b-instruct-v0.3-bnb-4bit",
        "chat_template": "mistral",
        "tokens": {
            "inst_open": "[INST]",
            "inst_close": "[/INST]"
        }
    }
}

def train_concode(
    base_model_key: str = "llama3.1",
    dataset_path: str = "datasets/concode_sft_dataset.jsonl",
    output_dir: str = "concode_lora_model",
    max_seq_length: int = 4096,
    num_train_epochs: int = 3,
    export_gguf: bool = True
):
    print("=" * 80)
    print(f"🚀 TripVerse ConCode AI Fine-Tuning Engine: {base_model_key.upper()}")
    print("=" * 80)

    if base_model_key not in MODEL_CATALOG:
        raise ValueError(f"Unknown base model key: {base_model_key}. Choose from {list(MODEL_CATALOG.keys())}")

    config = MODEL_CATALOG[base_model_key]
    model_name = config["model_id"]

    try:
        from unsloth import FastLanguageModel
        from trl import SFTTrainer
        from transformers import TrainingArguments
    except ImportError:
        print("⚠️ Unsloth not installed in local environment.")
        print("ℹ️ This script is designed to run in GPU environments (Google Colab / Kaggle).")
        print("💡 Follow instructions in header: pip install unsloth")
        return

    # 1. Load Model with 4-bit Quantization
    print(f"📦 Loading base model weights: {model_name}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=None,
        load_in_4bit=True
    )

    # 2. Add LoRA Adapters
    print("⚡ Applying QLoRA adapters to all attention and MLP projection layers...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0.0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407
    )

    # 3. Formatting Dataset with Tokenizer Chat Template
    from unsloth.chat_templates import get_chat_template
    tokenizer = get_chat_template(
        tokenizer,
        chat_template=config["chat_template"],
        mapping={"role": "role", "content": "content", "user": "user", "assistant": "assistant", "system": "system"}
    )

    def formatting_prompts_func(examples):
        convos = examples["messages"]
        texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
        return {"text": texts}

    print(f"📂 Loading supervised fine-tuning dataset: {dataset_path}...")
    dataset = load_dataset("json", data_files=dataset_path, split="train")
    dataset = dataset.map(formatting_prompts_func, batched=True)

    # 4. Initialize Trainer
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        dataset_num_proc=2,
        packing=False,
        args=TrainingArguments(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            num_train_epochs=num_train_epochs,
            learning_rate=2e-4,
            fp16=not FastLanguageModel.is_bfloat16_supported(),
            bf16=FastLanguageModel.is_bfloat16_supported(),
            logging_steps=1,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
            output_dir=output_dir,
            report_to="none"
        )
    )

    print("🔥 Starting QLoRA Fine-Tuning (~15 minutes on T4)...")
    trainer.train()

    # 5. Save LoRA Adapters
    print(f"💾 Saving fine-tuned LoRA weights to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # 6. Optional GGUF Export for Ollama
    if export_gguf:
        print("📦 Exporting merged quantized GGUF (q4_k_m) for instant Ollama deployment...")
        model.save_pretrained_gguf("concode-argon-q4_k_m", tokenizer, quantization_method="q4_k_m")
        print("✅ GGUF export complete: concode-argon-q4_k_m.gguf")
        print("💡 Deploy with: ollama create concode-argon -f Modelfile")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ConCode AI Brain QLoRA Fine-Tuner")
    parser.add_argument("--base_model", choices=["llama3.1", "qwen2.5", "mistral"], default="llama3.1")
    parser.add_argument("--dataset", default="datasets/concode_sft_dataset.jsonl")
    parser.add_argument("--epochs", type=int, default=3)
    args = parser.parse_args()

    train_concode(
        base_model_key=args.base_model,
        dataset_path=args.dataset,
        num_train_epochs=args.epochs
    )
