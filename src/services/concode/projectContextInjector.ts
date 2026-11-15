/**
 * ConCode AI: Universal Project & Workspace Context Ingestion Engine
 * Architected by 4 Argon (Authoritative Frontier AI).
 *
 * Decouples foundation model weights from specific project verticals.
 * Allows ConCode AI to adapt zero-shot to ANY future software codebase,
 * startup platform, or engineering domain via structured XML manifests.
 */

export interface ProjectManifest {
  projectId: string;
  projectName: string;
  assistantPersona: string;
  domainType: 'travel-concierge' | 'fintech-saas' | 'devtools-ide' | 'healthtech' | 'ecommerce' | 'universal-systems' | 'custom';
  techStack: string[];
  criticalInvariants: string[];
  supportedUiActions: string[];
}

export interface WorkspaceGraphSnippet {
  filePath: string;
  symbolType: 'db_schema' | 'api_contract' | 'domain_entity' | 'config' | 'security_policy';
  content: string;
}

/**
 * Universal Registry of Project Manifests.
 * Any future project can be registered here or supplied dynamically at runtime.
 */
export const PROJECT_REGISTRY: Record<string, ProjectManifest> = {
  // Application Vertical #1: TripVerse
  tripverse: {
    projectId: 'tripverse',
    projectName: 'TripVerse (trip-verse.com)',
    assistantPersona: 'Argon (TripVerse AI Co-Pilot)',
    domainType: 'travel-concierge',
    techStack: ['React 19', 'TypeScript', 'Tailwind CSS', 'Supabase PostgreSQL', 'Open-Meteo API', 'Leaflet', 'Three.js'],
    criticalInvariants: [
      'All budgets must be computed in exact INR (₹) splits per person and total group.',
      'Enforce life-safety mountain acclimatization rules (>3,000m ascent requires 48h rest).',
      'Proactively warn and backtrack on monsoon landslide corridors and severe weather alerts.',
      'Destinations are distinct from transit stations (e.g. Kasol != Chandigarh/Bhuntar).'
    ],
    supportedUiActions: ['none', 'route_preview', 'budget_split', 'weather_alert', 'lock_day', 'safety_block']
  },

  // Future Project #2: Multi-Tenant FinTech & Payments Platform
  nexus_fintech: {
    projectId: 'nexus_fintech',
    projectName: 'NexusPay Multi-Tenant Ledger Engine',
    assistantPersona: 'ConCode Sentinel',
    domainType: 'fintech-saas',
    techStack: ['Go 1.24', 'PostgreSQL 17', 'Redis 7', 'Next.js 15', 'Kafka', 'Docker'],
    criticalInvariants: [
      'Never use IEEE-754 floats for monetary math; enforce 64-bit integer paise/cents.',
      'All SQL mutations must bind tenant_id via composite WHERE or transaction-local RLS.',
      'All webhook callbacks require atomic ON CONFLICT idempotency keys and constant-time HMAC.',
      'External webhook POSTs must use DNS-resolved egress proxies with redirect: "error" (CWE-918).'
    ],
    supportedUiActions: ['none', 'audit_lock', 'tenant_isolation', 'db_triage', 'security_block']
  },

  // Future Project #3: High-Scale Cloud & AI DevTools IDE
  devtools_ide: {
    projectId: 'devtools_ide',
    projectName: 'Autonomous AI Coding & Agent IDE',
    assistantPersona: 'ConCode Architect',
    domainType: 'devtools-ide',
    techStack: ['Rust', 'Tauri', 'TypeScript', 'WebAssembly (WASM)', 'pgvector', 'vLLM'],
    criticalInvariants: [
      'Never execute raw shell commands without sandbox capability boundary verification.',
      'All AST transformations must guarantee semantic equivalence and AST validity.',
      'In-memory vector indices must enforce HNSW cosine similarity bounds and TTL eviction.'
    ],
    supportedUiActions: ['none', 'ast_diff', 'compile_check', 'sandbox_exec', 'pr_review']
  },

  // Default Universal Fallback for arbitrary projects
  universal: {
    projectId: 'universal',
    projectName: 'Universal Software Architecture',
    assistantPersona: 'CONCODE_BRAIN',
    domainType: 'universal-systems',
    techStack: ['Polyglot (TypeScript, Python, Go, Rust, SQL)'],
    criticalInvariants: [
      'Analyze first-principles trade-offs before emitting code.',
      'Audit all data boundaries for OWASP Top 10, CWE security vulnerabilities, and race conditions.',
      'Structure solutions using the 2-Option Trade-off Framework (Option A vs. Option B).'
    ],
    supportedUiActions: ['none', 'code_diff', 'security_alert', 'arch_preview']
  }
};

/**
 * Builds the dynamic system context XML block injected into ConCode AI.
 * Zero-shot adapts the model to the target project without retraining.
 */
export function buildDynamicSystemContext(
  manifest: ProjectManifest,
  graphSnippets: WorkspaceGraphSnippet[] = []
): string {
  const manifestXml = [
    `<project_manifest>`,
    `  <project_id>${manifest.projectId}</project_id>`,
    `  <project_name>${manifest.projectName}</project_name>`,
    `  <assistant_persona>${manifest.assistantPersona} (Powered by ConCode Universal Engine)</assistant_persona>`,
    `  <domain_type>${manifest.domainType}</domain_type>`,
    `  <tech_stack>${manifest.techStack.join(', ')}</tech_stack>`,
    `  <domain_invariants>`,
    ...manifest.criticalInvariants.map((inv) => `    - ${inv}`),
    `  </domain_invariants>`,
    `  <allowed_ui_actions>${manifest.supportedUiActions.join(' | ')}</allowed_ui_actions>`,
    `</project_manifest>`,
  ].join('\n');

  if (graphSnippets.length === 0) {
    return manifestXml;
  }

  const workspaceXml = [
    `<workspace_context>`,
    ...graphSnippets.map(
      (s) =>
        `  <file path="${s.filePath}" type="${s.symbolType}">\n${s.content}\n  </file>`
    ),
    `</workspace_context>`,
  ].join('\n');

  return `${manifestXml}\n\n${workspaceXml}`;
}
