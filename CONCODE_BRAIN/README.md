# 🧠 CONCODE BRAIN: Universal Cross-Project Foundation Model
**Architected under the direct guidance of 4 Argon (Authoritative Frontier AI)**

> **Autonomous Reasoning Engine, Principal Systems Architect & Multi-Domain AI Co-Pilot**  
> Decoupled from single-application constraints so you can train once and deploy across **TripVerse**, **future startups**, **fintech backends**, **cloud microservices**, or **any new software product**.

---

## 📁 Repository Structure

```
CONCODE_BRAIN/
├── README.md                      # This comprehensive guide & architecture overview
├── Modelfile                      # Ollama Universal Foundation Model definition
├── run_brain.py                   # Master CLI to test pillars and inject project manifests
│
├── core/                          # Project Ingestion & Universal Identity Contracts
│   ├── universal_master_prompt.py # Universal Master System Prompt (Python)
│   ├── universalMasterPrompt.ts   # Universal Master System Prompt (TypeScript)
│   ├── project_context_injector.py# Dynamic <project_manifest> ingestion (Python)
│   └── projectContextInjector.ts  # Dynamic <project_manifest> ingestion (TypeScript)
│
├── pillars/                       # The 4 Brain Advancement Pillars
│   ├── pillar1_mcts_search.py     # Test-Time Compute & Step-Level PRM MCTS Search Engine
│   ├── pillar2_self_play.py       # Autonomous STaR Synthetic Self-Play Data Engine
│   ├── pillar3_adversary.py       # Adversarial Red-Team Chaos Swarm & Fuzzer
│   └── pillar4_memory_graph.py    # Lifelong Memory Graph & Temporal GraphRAG Engine
│
├── verifiers/                     # Deterministic Compilers & GRPO Reward Judges
│   └── grpo_verifier.py           # Multi-language sandbox compiler, AST taint & GRPO rewards
│
├── training/                      # QLoRA, GRPOTrainer, Colab & Kaggle Notebooks
│   ├── train_qlora.py             # Unsloth Llama-3.1-8B and Qwen-2.5-7B fine-tuning script
│   ├── kaggle_concode_brain.py    # Kaggle automated GPU execution runner
│   └── Train_ConCode_AI_Brain.ipynb # 22-cell interactive Colab/Kaggle notebook
│
├── data/                          # Gold Datasets & Pinned Invariants
│   ├── concode_sft_dataset.jsonl  # 778 gold verified multi-domain reasoning trajectories
│   └── concode_memory_graph.json  # Pinned knowledge graph invariants and spatial nodes
│
└── spec/                          # Authoritative Frontier Architecture Specifications
    └── argon_universal_blueprint.md # Complete 288-line Master Blueprint by 4 Argon
```

---

## 🚀 How to Use ConCode Brain in Future Projects

ConCode Brain uses a **Two-Tier Architecture**:
1. **Model Weights (Layer 0):** Universal intelligence trained on first-principles reasoning (`<concode_think>`, `<step>`, `<verify>`, `<backtrack>`), polyglot code synthesis, cybersecurity auditing, and 2-option decision humility.
2. **Runtime Context Injection (Layer 1):** Ingests any project's identity via a structured `<project_manifest>` header.

### Example: Plugging ConCode Brain into a New Project

To use ConCode Brain in a completely new project (e.g. an e-commerce platform or healthcare SaaS), simply supply its manifest at inference time without retraining the weights:

```python
from core.project_context_injector import ProjectManifest, build_dynamic_system_context

my_future_startup = ProjectManifest(
    project_id="health_ai",
    project_name="CarePulse Health AI Platform",
    assistant_persona="CarePulse Copilot",
    domain_type="healthtech",
    tech_stack=["Python FastAPI", "React Native", "PostgreSQL", "FHIR API"],
    critical_invariants=[
        "All patient identifiers (PHI) must be scrubbed before logging (HIPAA compliance).",
        "Never recommend prescription medication dosages without a licensed physician review gate.",
        "Enforce zero-trust cryptographic token authentication on all telemetry endpoints."
    ],
    supported_ui_actions=["none", "patient_summary", "prescription_alert", "hipaa_lock"]
)

# Injects the manifest directly into the model's system context
system_prompt = build_dynamic_system_context(my_future_startup)
```

The model will instantly adopt the role of **CarePulse Copilot**, enforce HIPAA PHI scrubbing and zero-trust tokens, and use `[ACTION:patient_summary]`, while retaining all its deep algorithmic reasoning!

---

## ⚡ The 4 Brain Advancement Pillars

### Pillar 1: Test-Time Compute PRM MCTS Search
* **File:** `pillars/pillar1_mcts_search.py`
* Executes an Upper Confidence Bounds for Trees (UCT) search over `<step>`, `<verify>`, and `<backtrack>` tokens during inference.
* Dynamically backtracks on naive assumptions (e.g., distributed race conditions or budget overflows) before generating visible tokens.

### Pillar 2: Autonomous STaR Self-Play Engine
* **File:** `pillars/pillar2_self_play.py`
* Self-Taught Reasoner (STaR) curriculum engine that generates $K$ candidate rollouts per challenge.
* Rejection sampling keeps only trajectories scoring $R_{\text{total}} \ge 0.95$ on deterministic sandbox compilers.

### Pillar 3: Adversarial Red-Team Chaos Swarm
* **File:** `pillars/pillar3_adversary.py`
* Dual-agent game where `ChaosFuzzer` generates multi-vector attacks (Distributed Split-Brain NTP skew, CWE-639 IDOR, CWE-918 SSRF, CWE-208 Timing leaks, CWE-400 ReDoS, altitude sickness, and monsoon washouts).
* `ConCodeDefender` self-heals in feedback loops until achieving a perfect $+1.0000$ reward.

### Pillar 4: Lifelong Memory Graph & GraphRAG
* **File:** `pillars/pillar4_memory_graph.py`
* Directed multigraph featuring exponential temporal decay ($w(t) = w_0 e^{-\lambda(t - t_0)}$) for episodic session notes, while preserving sticky pinned invariants ($\lambda = 0$) for safety, security, and budgets.
* Injects a `<graph_rag_context>` block directly into `<concode_think>` for zero-hallucination execution.

---

## 🛠️ How to Run & Test

```bash
# Test all 4 pillars and verifier integrity
python3 CONCODE_BRAIN/run_brain.py --test

# Preview project manifest injection for TripVerse
python3 CONCODE_BRAIN/run_brain.py --project tripverse

# Preview project manifest injection for a FinTech Ledger
python3 CONCODE_BRAIN/run_brain.py --project nexus_fintech
```

---

## 🏋️ How to Train ConCode Brain

### Option A: Local Ollama Model
```bash
ollama create concode-universal -f CONCODE_BRAIN/Modelfile
ollama run concode-universal
```

### Option B: Google Colab / Kaggle (Free T4 or A100 GPU)
1. Open [`training/Train_ConCode_AI_Brain.ipynb`](training/Train_ConCode_AI_Brain.ipynb) in Google Colab or Kaggle.
2. Upload [`data/concode_sft_dataset.jsonl`](data/concode_sft_dataset.jsonl).
3. Run all cells: It trains Llama-3.1-8B or Qwen-2.5-7B with Unsloth 4-bit QLoRA, runs GRPO reinforcement learning with deterministic reward judges, and exports a quantized GGUF (`concode_universal_q4_k_m.gguf`).
