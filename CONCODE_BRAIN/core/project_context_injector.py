"""
ConCode AI: Universal Project & Workspace Context Ingestion Engine (Python Edition)
Architected by 4 Argon (Authoritative Frontier AI).
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass
class ProjectManifest:
    project_id: str
    project_name: str
    assistant_persona: str
    domain_type: str
    tech_stack: List[str]
    critical_invariants: List[str]
    supported_ui_actions: List[str]

@dataclass
class WorkspaceGraphSnippet:
    file_path: str
    symbol_type: str
    content: str

PROJECT_REGISTRY: Dict[str, ProjectManifest] = {
    "tripverse": ProjectManifest(
        project_id="tripverse",
        project_name="TripVerse (trip-verse.com)",
        assistant_persona="Argon (TripVerse AI Co-Pilot)",
        domain_type="travel-concierge",
        tech_stack=["React 19", "TypeScript", "Tailwind CSS", "Supabase PostgreSQL", "Open-Meteo API", "Leaflet", "Three.js"],
        critical_invariants=[
            "All budgets must be computed in exact INR (₹) splits per person and total group.",
            "Enforce life-safety mountain acclimatization rules (>3,000m ascent requires 48h rest).",
            "Proactively warn and backtrack on monsoon landslide corridors and severe weather alerts.",
            "Destinations are distinct from transit stations (Kasol != Chandigarh/Bhuntar)."
        ],
        supported_ui_actions=["none", "route_preview", "budget_split", "weather_alert", "lock_day", "safety_block"]
    ),
    "nexus_fintech": ProjectManifest(
        project_id="nexus_fintech",
        project_name="NexusPay Multi-Tenant Ledger Engine",
        assistant_persona="ConCode Sentinel",
        domain_type="fintech-saas",
        tech_stack=["Go 1.24", "PostgreSQL 17", "Redis 7", "Next.js 15", "Kafka", "Docker"],
        critical_invariants=[
            "Never use IEEE-754 floats for monetary math; enforce 64-bit integer paise/cents.",
            "All SQL mutations must bind tenant_id via composite WHERE or transaction-local RLS.",
            "All webhook callbacks require atomic ON CONFLICT idempotency keys and constant-time HMAC.",
            "External webhook POSTs must use DNS-resolved egress proxies with redirect: 'error' (CWE-918)."
        ],
        supported_ui_actions=["none", "audit_lock", "tenant_isolation", "db_triage", "security_block"]
    ),
    "devtools_ide": ProjectManifest(
        project_id="devtools_ide",
        project_name="Autonomous AI Coding & Agent IDE",
        assistant_persona="ConCode Architect",
        domain_type="devtools-ide",
        tech_stack=["Rust", "Tauri", "TypeScript", "WebAssembly (WASM)", "pgvector", "vLLM"],
        critical_invariants=[
            "Never execute raw shell commands without sandbox capability boundary verification.",
            "All AST transformations must guarantee semantic equivalence and AST validity.",
            "In-memory vector indices must enforce HNSW cosine similarity bounds and TTL eviction."
        ],
        supported_ui_actions=["none", "ast_diff", "compile_check", "sandbox_exec", "pr_review"]
    ),
    "universal": ProjectManifest(
        project_id="universal",
        project_name="Universal Software Architecture",
        assistant_persona="CONCODE_BRAIN",
        domain_type="universal-systems",
        tech_stack=["Polyglot (TypeScript, Python, Go, Rust, SQL)"],
        critical_invariants=[
            "Analyze first-principles trade-offs before emitting code.",
            "Audit all data boundaries for OWASP Top 10, CWE security vulnerabilities, and race conditions.",
            "Structure solutions using the 2-Option Trade-off Framework (Option A vs. Option B)."
        ],
        supported_ui_actions=["none", "code_diff", "security_alert", "arch_preview"]
    )
}

def build_dynamic_system_context(
    manifest: ProjectManifest,
    graph_snippets: Optional[List[WorkspaceGraphSnippet]] = None
) -> str:
    manifest_lines = [
        "<project_manifest>",
        f"  <project_id>{manifest.project_id}</project_id>",
        f"  <project_name>{manifest.project_name}</project_name>",
        f"  <assistant_persona>{manifest.assistant_persona} (Powered by ConCode Universal Engine)</assistant_persona>",
        f"  <domain_type>{manifest.domain_type}</domain_type>",
        f"  <tech_stack>{', '.join(manifest.tech_stack)}</tech_stack>",
        "  <domain_invariants>",
    ]
    for inv in manifest.critical_invariants:
        manifest_lines.append(f"    - {inv}")
    manifest_lines.append("  </domain_invariants>")
    manifest_lines.append(f"  <allowed_ui_actions>{' | '.join(manifest.supported_ui_actions)}</allowed_ui_actions>")
    manifest_lines.append("</project_manifest>")

    manifest_xml = "\n".join(manifest_lines)

    if not graph_snippets:
        return manifest_xml

    workspace_lines = ["<workspace_context>"]
    for s in graph_snippets:
        workspace_lines.append(f'  <file path="{s.file_path}" type="{s.symbol_type}">\n{s.content}\n  </file>')
    workspace_lines.append("</workspace_context>")

    return f"{manifest_xml}\n\n" + "\n".join(workspace_lines)
