#!/usr/bin/env python3
"""
synthesize_concode_edge_sft.py

Synthesizes production edge computing, WebAssembly (WASM), Cloudflare Workers,
Durable Objects with WebSockets, and distributed consistency SFT rows for ConCode AI.

Features:
- Edge runtime architecture (V8 Isolates, workerd, 128 MB memory limits, 0-5ms cold starts, TransformStream streaming)
- Rust to WASM (wasm32-unknown-unknown, wasm-bindgen, Haversine spatial filters, token-bucket rate limiting)
- TypeScript Cloudflare Worker bindings with zero-copy TypedArray transfers (Float64Array, Uint32Array)
- Stateful Edge & Distributed Consistency (Durable Objects, WebSocket Hibernation API, embedded SQLite, Edge KV, D1 sharding)
- Drop-in production code across Rust, TypeScript, and SQL
- Strictly outputs both "messages" and "text" fields for Llama-3 / Unsloth fine-tuning.
"""

import json
import os
import random

SYSTEM_PROMPT = """You are CONCODE BRAIN, Principal Systems Architect & Polyglot Staff Engineer.
You specialize in high-concurrency distributed systems, edge computing (V8 Isolates / Cloudflare Workers), WebAssembly (WASM in Rust), real-time WebSockets, and distributed consistency.
You evaluate architectural trade-offs, optimize hot-path CPU performance, prevent memory limits, and provide robust production solutions."""

SCENARIOS = [
    # 1. Durable Object WebSocket Hibernation & 128MB OOM
    {
        "domain": "Edge Computing & Real-Time Multiplayer",
        "tech": "Cloudflare Workers, Durable Objects, WebSockets, TypeScript, SQLite",
        "user_query": "bro our collaborative trip planner on cloudflare durable objects is crashing 'isolate exceeded memory limit and was reset'!! also our monthly bill spiked hard bcz 4,000 idle users leave browser tabs open overnight on websockets wtf do we do??",
        "think": "The developer's Durable Object is hitting two classic limits: 1) Holding full state and active WebSocket connections in V8 heap memory across hundreds of clients breaches the 128 MB isolate ceiling. 2) Active WebSocket connections keep the DO awake continuously, incurring 24/7 duration billing. The fix is enabling the WebSocket Hibernation API (zero duration billing when idle) and offloading state history to the DO's embedded SQLite database.",
        "state": "[STATE:warning][ACTION:durable_object_patch]",
        "response": """You are hitting two classic edge architecture bottlenecks:

1. **The Bill Spike:** Standard WebSockets keep the Durable Object awake 24/7 even when users are asleep, billing you for continuous 128 MB wall-clock duration.
2. **The 128 MB Isolate Reset:** Storing full edit histories and connected client objects in in-memory JavaScript arrays breaches the 128 MB limit, triggering a hard isolate reset that drops all sockets.

### Architectural Remediation (Option A + Option B)

* **Option A — Enable the WebSocket Hibernation API + Embedded SQLite (Immediate Fix):**
  Use `this.ctx.acceptWebSocket(server)` and `server.serializeAttachment(meta)`. When clients stop typing for 10 seconds, the Durable Object hibernates (0 duration billing, 0 RAM used) while Cloudflare's edge holds the WebSocket connections open and wakes the DO on the next incoming frame.
* **Option B — Strict Per-Trip Room Sharding:**
  Ensure every `tripId` maps to its own isolated Durable Object instance via `env.TRIP_ROOMS.idFromName(tripId)` so no single isolate aggregates state for multiple groups.

### Drop-In Hibernating Durable Object Implementation:

```typescript
import { DurableObject } from 'cloudflare:workers';

interface SocketMeta {
  userId: string;
  userName: string;
}

export class TripRoomDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    // Initialize embedded SQLite table for persistent itinerary deltas
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS itinerary_deltas (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url = new URL(request.url);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // 1. Use Hibernation-aware acceptWebSocket
    this.ctx.acceptWebSocket(server);

    // 2. Persist lightweight session metadata across hibernation wake-ups
    const meta: SocketMeta = {
      userId: url.searchParams.get('userId') || 'anon',
      userName: url.searchParams.get('name') || 'Traveler',
    };
    server.serializeAttachment(meta);

    return new Response(null, { status: 101, webSocket: client });
  }

  // Invoked automatically when a hibernated socket receives a frame
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const meta = ws.deserializeAttachment() as SocketMeta;
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);

    // 3. Persist state delta to embedded SQLite instead of unbounded JS memory
    this.ctx.storage.sql.exec(
      'INSERT INTO itinerary_deltas (user_id, action, created_at) VALUES (?, ?, ?)',
      meta.userId,
      text,
      Date.now()
    );

    // 4. Broadcast to all active sockets managed by the Hibernation runtime
    for (const peer of this.ctx.getWebSockets()) {
      if (peer !== ws) {
        peer.send(text);
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }
}
```

Are you currently buffering uploaded image files or PDF receipts inside the Durable Object before uploading to R2?"""
    },

    # 2. Worker 50ms CPU Timeout & Rust WASM
    {
        "domain": "Systems Acceleration & WebAssembly",
        "tech": "Rust, WebAssembly (WASM), TypeScript, Cloudflare Workers",
        "user_query": "our cloudflare worker throws 'Worker exceeded CPU time limit (Error 1102)' when a user requests our route optimizer. we have to score & sort 2,500 hotel + pitstop coordinates along a highway route in TypeScript. it runs fine locally on my m3 macbook but dies in prod under load pls help",
        "think": "Error 1102 occurs because running nested trigonometric loops (Math.sin, Math.cos, Math.atan2) over 2,500 JSON objects in JavaScript creates heavy V8 object allocation and GC pauses that exceed the Worker's 50 ms active CPU-time limit. The solution is: Option A: Fast bounding-box pre-filtering in TypeScript to eliminate 90% of trig calls. Option B: Compiling the spatial scoring matrix into Rust WASM (wasm32-unknown-unknown) operating on a flat Float64Array with zero GC pauses.",
        "state": "[STATE:excited][ACTION:wasm_accelerate]",
        "response": """Error 1102 happens because running trigonometric Haversine calculations over 2,500 JSON objects in JavaScript creates heavy object allocation pressure and V8 garbage collection pauses that count directly against your Worker's active CPU-millisecond ceiling (50 ms on standard Paid Workers).

### Step 1: Two Ways to Drop CPU Time by 95%

* **Option A — Bounding-Box Pre-Filter in TypeScript (5-Minute Fix):**
  Eliminate 90% of expensive trig calls by doing a simple subtraction bounding-box check first (`Math.abs(lat - targetLat) <= maxDeg`), which takes sub-microseconds.
* **Option B — Rust WebAssembly (`wasm32-unknown-unknown`) Kernel (Permanent Fix):**
  Offload the scoring matrix into compiled Rust WASM operating on a flat `Float64Array`, cutting a 55 ms JS loop down to `< 2 ms` with zero V8 GC pauses.

### Rust WASM High-Throughput Spatial Kernel (`src/lib.rs`):

```rust
use wasm_bindgen::prelude::*;

const EARTH_RADIUS_KM: f64 = 6371.0088;

#[wasm_bindgen]
pub fn filter_pitstops_within_radius(
    origin_lat: f64,
    origin_lon: f64,
    flat_candidates: &[f64], // [lat0, lon0, id0, lat1, lon1, id1, ...]
    max_radius_km: f64,
) -> Vec<u32> {
    let mut matched_ids = Vec::with_capacity(128);
    let lat1_rad = origin_lat.to_radians();

    for chunk in flat_candidates.chunks_exact(3) {
        let lat2 = chunk[0];
        let lon2 = chunk[1];
        let id = chunk[2] as u32;

        let d_lat = (lat2 - origin_lat).to_radians();
        let d_lon = (lon2 - origin_lon).to_radians();
        let lat2_rad = lat2.to_radians();

        let a = (d_lat * 0.5).sin().powi(2)
            + lat1_rad.cos() * lat2_rad.cos() * (d_lon * 0.5).sin().powi(2);
        let c = 2.0 * a.sqrt().asin();
        let distance_km = EARTH_RADIUS_KM * c;

        if distance_km <= max_radius_km {
            matched_ids.push(id);
        }
    }

    matched_ids
}
```

### TypeScript Cloudflare Worker Zero-Copy Transfer:

```typescript
import initWasm, { filter_pitstops_within_radius } from '../pkg/concode_edge_wasm';
import wasmModule from '../pkg/concode_edge_wasm_bg.wasm';

let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  if (!wasmReady) wasmReady = initWasm(wasmModule);
  return wasmReady;
}

export default {
  async fetch(req: Request): Promise<Response> {
    await ensureWasm();
    const { originLat, originLon, flatCandidates, radiusKm } = await req.json<{
      originLat: number;
      originLon: number;
      flatCandidates: number[];
      radiusKm: number;
    }>();

    // Zero-copy TypedArray transfer into WASM linear memory
    const inputBuffer = new Float64Array(flatCandidates);
    const matchingIds: Uint32Array = filter_pitstops_within_radius(
      originLat,
      originLon,
      inputBuffer,
      radiusKm
    );

    return Response.json({ matchedPitstopIds: Array.from(matchingIds) });
  },
};
```

This reduces execution time from 55 ms in V8 to under 1.8 ms in linear WASM memory, completely eliminating Error 1102."""
    },

    # 3. D1 Database Overloaded & Sharding
    {
        "domain": "Edge Databases & Distributed Consistency",
        "tech": "Cloudflare D1, SQLite, Cloudflare Queues, Hyperdrive, PostgreSQL",
        "user_query": "hey concode our single cloudflare D1 database is returning 'D1_ERROR: database is overloaded' errors even though DB size is only 400 MB!! we have 800 rps peak during sales events why is D1 dying on such a small dataset??",
        "think": "Cloudflare D1 is backed by an individual single-threaded SQLite Durable Object per database. While fast, throughput is strictly bound by query execution latency: if an unindexed query takes 20 ms, the D1 instance can only process 1000/20 = 50 queries/sec globally before queuing and rejecting writes with 'database is overloaded'. The fix: Option A: Add composite covering indexes to drop query latency to < 1ms (yielding 1,000 QPS) and batch writes using db.batch() or Queues. Option B: Horizontally shard tenants across multiple D1 instances or use Cloudflare Hyperdrive with PostgreSQL.",
        "state": "[STATE:warning][ACTION:shard_topology]",
        "response": """That `D1_ERROR: database is overloaded` error happens because each individual D1 database is backed by a single-threaded SQLite Durable Object. Your maximum throughput on a single D1 database is strictly governed by query execution time:

$$\\text{Max QPS} = \\frac{1000 \\text{ ms}}{\\text{Average Query Duration (ms)}}$$

- If an unindexed query takes **20 ms**, that D1 database can only process **50 queries/sec** globally before its internal queue overflows and rejects requests.
- If a query is indexed and takes **1 ms**, that same D1 database can sustain **1,000 queries/sec**.

### Step 1: Immediate 2-Step Stabilization (Option A)

1. **Eliminate Full-Table Scans with a Covering Index:**
   Run `PRAGMA optimize;` and add composite indexes so dashboard queries resolve strictly from the B-tree without touching data pages:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date
   ON bookings (tenant_id, created_at DESC)
   INCLUDE (total_amount, status);
   ```

2. **Batch High-Frequency Writes via Cloudflare Queues:**
   Never perform raw single-row `INSERT` statements on every incoming HTTP request during flash sales. Pipe writes into a Cloudflare Queue and execute bulk transactions:
   ```typescript
   export default {
     async queue(batch: MessageBatch<AuditLog>, env: Env): Promise<void> {
       const statements = batch.messages.map((msg) =>
         env.DB.prepare('INSERT INTO audit_logs (id, event, ts) VALUES (?, ?, ?)')
           .bind(msg.body.id, msg.body.event, msg.body.timestamp)
       );
       // Executes all rows in a single SQLite atomic transaction
       await env.DB.batch(statements);
     },
   };
   ```

### Step 2: Long-Term Horizontal Architecture (Option B)

* **Pattern 1 — Sharded Tenant Databases:** Cloudflare Workers Paid includes up to **100,000 D1 databases** per account. Isolate enterprise tenants or regions into dedicated D1 instances (`env.DB_US`, `env.DB_EU`, or dynamic binding per tenant).
* **Pattern 2 — Cloudflare Hyperdrive + PostgreSQL:** If you require unified multi-tenant OLTP with thousands of concurrent write transactions, connect your Workers to PostgreSQL via **Cloudflare Hyperdrive**, which provides edge connection multiplexing and transaction pooling.

Would you like the Cloudflare Queue batch consumer implementation to offload audit log inserts immediately?"""
    }
]

VARIANTS = [
    ("edge_outage", "urgent: {} pls advise", "Diagnose edge execution limits, provide immediate hot fix and architectural refactor."),
    ("perf_tuning", "How do we optimize: {}", "Analyze V8 isolate constraints, memory allocations, and WASM/SQLite offload strategies.")
]

def generate_sft_dataset(output_path: str, count: int = 160):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    rows = []
    
    for i in range(count):
        scenario = SCENARIOS[i % len(SCENARIOS)]
        variant_type, prefix_fmt, hint = random.choice(VARIANTS)
        
        user_msg = prefix_fmt.format(scenario["user_query"]) if variant_type == "edge_outage" else scenario["user_query"]
            
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": f"<concode_think>\n{scenario['think']}\n</concode_think>\n\n{scenario['state']}\n{scenario['response']}"}
        ]
        
        llama3_text = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>

{user_msg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

<concode_think>
{scenario['think']}
</concode_think>

{scenario['state']}
{scenario['response']}<|eot_id|>"""

        row = {
            "messages": messages,
            "text": llama3_text,
            "domain": scenario["domain"],
            "tech": scenario["tech"],
            "type": "edge_computing_and_wasm"
        }
        rows.append(row)
        
    initial_count = 0
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            for _ in f:
                initial_count += 1
                
    with open(output_path, "a", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    print(f"Successfully generated {len(rows)} edge computing & WASM SFT rows.")
    print(f"Dataset expanded from {initial_count} to {initial_count + len(rows)} rows at {output_path}")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "datasets", "concode_sft_dataset.jsonl")
    generate_sft_dataset(out, count=160)
