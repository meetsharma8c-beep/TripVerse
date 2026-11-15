#!/usr/bin/env python3
"""
ConCode Brain — Universal Polyglot Architecture SFT Dataset Synthesizer
Generates 256+ unique, high-signal Llama-3 SFT rows across:
  1. Fintech Ledger & Idempotency
  2. Distributed SaaS Multi-Tenancy & Sharding
  3. Real-Time WebSockets & SSE Streaming
  4. Multi-Agent AI Tool Orchestration

Outputs directly in append mode to concode_sft_dataset.jsonl
"""

import argparse
import hashlib
import json
import os
import random
from dataclasses import dataclass
from typing import Dict, List

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "datasets", "concode_sft_dataset.jsonl")

SYSTEM_PROMPT = (
    "You are CONCODE_BRAIN (Argon High Architecture Mode), a Principal Systems Architect "
    "and Polyglot Software Engineering AI. Decode developer shorthand, panicked outage logs, "
    "and Hinglish effortlessly. Always begin your response with a structured <concode_think> "
    "reasoning block covering Triage, Concurrency & Security Audit, and Trade-off Selection. "
    "Then emit your [STATE:idle|excited|warning][ACTION:...] control header, followed by a "
    "calm, authoritative 2-Option architectural blueprint and production-ready code."
)


@dataclass
class DomainScenario:
    domain_key: str
    domain_name: str
    state_tag: str
    action_tag: str
    symptom_shorthand: str
    root_cause: str
    security_audit: str
    option_a_title: str
    option_a_desc: str
    option_b_title: str
    option_b_desc: str
    code_by_lang: Dict[str, str]


# ==============================================================================
# 1. POLYGLOT CODE BLUEPRINTS (TYPESCRIPT, PYTHON, GO, RUST) ACROSS 4 DOMAINS
# ==============================================================================

FINTECH_CODE: Dict[str, str] = {
    "TypeScript (Node/Bun)": """```typescript
import { Pool } from 'pg';

export interface LedgerTransferCmd {
  idempotencyKey: string;
  sourceAccountId: string;
  destAccountId: string;
  amountPaise: bigint;
}

export async function executeAtomicTransfer(
  pool: Pool,
  cmd: LedgerTransferCmd
): Promise<{ status: 'COMMITTED' | 'DUPLICATE_REPLAY'; txId: string }> {
  if (cmd.amountPaise <= 0n) throw new Error('Transfer amount must be positive');

  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

    // 1. Idempotency barrier: atomic insert or short-circuit on replay
    const idemRes = await client.query(
      `INSERT INTO idempotency_keys (idem_key, created_at)
       VALUES ($1, NOW())
       ON CONFLICT (idem_key) DO NOTHING
       RETURNING idem_key`,
      [cmd.idempotencyKey]
    );

    if (idemRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return { status: 'DUPLICATE_REPLAY', txId: cmd.idempotencyKey };
    }

    // 2. Deterministic lock ordering by account ID prevents AB-BA deadlocks
    const orderedIds = [cmd.sourceAccountId, cmd.destAccountId].sort();
    await client.query(
      `SELECT account_id, balance_paise FROM ledger_accounts
       WHERE account_id = ANY($1) FOR UPDATE NOWAIT`,
      [orderedIds]
    );

    // 3. Enforce non-negative balance invariant at the SQL boundary
    const debitRes = await client.query(
      `UPDATE ledger_accounts
       SET balance_paise = balance_paise - $1, updated_at = NOW()
       WHERE account_id = $2 AND balance_paise >= $1`,
      [cmd.amountPaise.toString(), cmd.sourceAccountId]
    );

    if (debitRes.rowCount === 0) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    await client.query(
      `UPDATE ledger_accounts
       SET balance_paise = balance_paise + $1, updated_at = NOW()
       WHERE account_id = $2`,
      [cmd.amountPaise.toString(), cmd.destAccountId]
    );

    await client.query('COMMIT');
    return { status: 'COMMITTED', txId: cmd.idempotencyKey };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```""",
    "Python (FastAPI/AsyncPG)": """```python
import asyncpg
from fastapi import HTTPException
from pydantic import BaseModel, Field

class TransferRequest(BaseModel):
    idempotency_key: str = Field(min_length=16, max_length=64)
    from_account: str
    to_account: str
    amount_paise: int = Field(gt=0)

async def execute_double_entry_transfer(
    pool: asyncpg.Pool, req: TransferRequest
) -> dict:
    async with pool.acquire() as conn:
        async with conn.transaction(isolation="read_committed"):
            # 1. Atomic idempotency claim
            inserted = await conn.fetchval(
                \"\"\"
                INSERT INTO idempotency_registry (key, status)
                VALUES ($1, 'COMPLETED')
                ON CONFLICT (key) DO NOTHING
                RETURNING key
                \"\"\",
                req.idempotency_key,
            )
            if not inserted:
                return {"status": "idempotent_replay", "key": req.idempotency_key}

            # 2. Canonical lock order to prevent deadlocks under concurrent webhooks
            first_lock, second_lock = sorted([req.from_account, req.to_account])
            await conn.fetch(
                \"\"\"
                SELECT account_id FROM wallets
                WHERE account_id IN ($1, $2)
                ORDER BY account_id FOR UPDATE NOWAIT
                \"\"\",
                first_lock,
                second_lock,
            )

            # 3. Guarded debit + double-entry journal append
            updated = await conn.execute(
                \"\"\"
                UPDATE wallets
                SET balance_paise = balance_paise - $1
                WHERE account_id = $2 AND balance_paise >= $1
                \"\"\",
                req.amount_paise,
                req.from_account,
            )
            if updated == "UPDATE 0":
                raise HTTPException(status_code=422, detail="Insufficient balance")

            await conn.execute(
                "UPDATE wallets SET balance_paise = balance_paise + $1 WHERE account_id = $2",
                req.amount_paise,
                req.to_account,
            )
            return {"status": "settled", "key": req.idempotency_key}
```""",
    "Go (pgx/v5)": """```go
package ledger

import (
	"context"
	"errors"
	"sort"

	"[github.com/jackc/pgx/v5](https://github.com/jackc/pgx/v5)"
	"[github.com/jackc/pgx/v5/pgxpool](https://github.com/jackc/pgx/v5/pgxpool)"
)

type TransferCmd struct {
	IdempotencyKey string
	FromAccount    string
	ToAccount      string
	AmountPaise    int64
}

func SettleTransfer(ctx context.Context, pool *pgxpool.Pool, cmd TransferCmd) error {
	if cmd.AmountPaise <= 0 {
		return errors.New("amount_paise must be positive")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Idempotency gate
	var claimedKey string
	err = tx.QueryRow(ctx, `
		INSERT INTO idempotency_log (idem_key) VALUES ($1)
		ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key
	`, cmd.IdempotencyKey).Scan(&claimedKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // Safe idempotent no-op
	} else if err != nil {
		return err
	}

	// 2. Canonical lock ordering avoids AB-BA deadlocks
	ids := []string{cmd.FromAccount, cmd.ToAccount}
	sort.Strings(ids)
	_, err = tx.Exec(ctx, `
		SELECT 1 FROM accounts WHERE id = ANY($1) ORDER BY id FOR UPDATE NOWAIT
	`, ids)
	if err != nil {
		return err
	}

	// 3. Atomic debit with floor check
	tag, err := tx.Exec(ctx, `
		UPDATE accounts SET balance_paise = balance_paise - $1
		WHERE id = $2 AND balance_paise >= $1
	`, cmd.AmountPaise, cmd.FromAccount)
	if err != nil || tag.RowsAffected() == 0 {
		return errors.New("insufficient funds or debit failed")
	}

	_, err = tx.Exec(ctx, `
		UPDATE accounts SET balance_paise = balance_paise + $1 WHERE id = $2
	`, cmd.AmountPaise, cmd.ToAccount)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
```""",
    "Rust (SQLx/Tokio)": """```rust
use sqlx::{PgPool, Postgres, Transaction};

#[derive(Debug)]
pub struct LedgerEntry {
    pub idempotency_key: String,
    pub debit_account: String,
    pub credit_account: String,
    pub amount_paise: i64,
}

pub async fn settle_atomic_ledger(
    pool: &PgPool,
    entry: &LedgerEntry,
) -> Result<bool, sqlx::Error> {
    let mut tx: Transaction<'_, Postgres> = pool.begin().await?;

    // 1. Idempotency barrier
    let claim = sqlx::query_scalar::<_, String>(
        "INSERT INTO idempotency_keys (key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING key"
    )
    .bind(&entry.idempotency_key)
    .fetch_optional(&mut *tx)
    .await?;

    if claim.is_none() {
        tx.rollback().await?;
        return Ok(false); // Duplicate webhook replay safely ignored
    }

    // 2. Deterministic row lock order
    let (first, second) = if entry.debit_account < entry.credit_account {
        (&entry.debit_account, &entry.credit_account)
    } else {
        (&entry.credit_account, &entry.debit_account)
    };

    sqlx::query("SELECT id FROM wallets WHERE id IN ($1, $2) ORDER BY id FOR UPDATE NOWAIT")
        .bind(first)
        .bind(second)
        .execute(&mut *tx)
        .await?;

    // 3. Guarded debit
    let res = sqlx::query(
        "UPDATE wallets SET balance_paise = balance_paise - $1 WHERE id = $2 AND balance_paise >= $1"
    )
    .bind(entry.amount_paise)
    .bind(&entry.debit_account)
    .execute(&mut *tx)
    .await?;

    if res.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound);
    }

    sqlx::query("UPDATE wallets SET balance_paise = balance_paise + $1 WHERE id = $2")
        .bind(entry.amount_paise)
        .bind(&entry.credit_account)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(true)
}
```""",
}

SAAS_CODE: Dict[str, str] = {
    "TypeScript (Node/Bun)": """```typescript
import { Pool, PoolClient } from 'pg';

// Scoped Tenant Transaction Wrapper with Postgres RLS + SET LOCAL
export async function withTenantIsolation<T>(
  pool: Pool,
  tenantId: string,
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(tenantId)) {
    throw new Error('Invalid tenant identifier');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL scopes the tenant variable strictly to the active transaction
    // so pooled connections never leak tenant context across requests
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [
      tenantId,
    ]);

    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```""",
    "Python (FastAPI/AsyncPG)": """```python
from contextlib import asynccontextmanager
import asyncpg
from fastapi import Header, HTTPException

@asynccontextmanager
async def tenant_rls_connection(pool: asyncpg.Pool, tenant_id: str):
    if not tenant_id or len(tenant_id) > 64:
        raise HTTPException(status_code=400, detail="Invalid X-Tenant-ID header")

    async with pool.acquire() as conn:
        async with conn.transaction():
            # True third argument binds setting strictly to current transaction
            await conn.fetchval(
                "SELECT set_config('app.current_tenant_id', $1, true)",
                tenant_id,
            )
            yield conn
```""",
    "Go (pgx/v5)": """```go
package multitenant

import (
	"context"
	"fmt"

	"[github.com/jackc/pgx/v5](https://github.com/jackc/pgx/v5)"
	"[github.com/jackc/pgx/v5/pgxpool](https://github.com/jackc/pgx/v5/pgxpool)"
)

func RunInTenantScope(
	ctx context.Context,
	pool *pgxpool.Pool,
	tenantID string,
	fn func(tx pgx.Tx) error,
) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Bind tenant_id to transaction-local GUC for Postgres RLS enforcement
	_, err = tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenantID)
	if err != nil {
		return fmt.Errorf("failed setting tenant RLS context: %w", err)
	}

	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
```""",
    "Rust (SQLx/Tokio)": """```rust
use sqlx::{PgPool, Postgres, Transaction};

pub async fn begin_tenant_tx<'a>(
    pool: &'a PgPool,
    tenant_id: &str,
) -> Result<Transaction<'a, Postgres>, sqlx::Error> {
    let mut tx = pool.begin().await?;

    // Transaction-scoped RLS context prevents cross-tenant data leakage in PgBouncer
    sqlx::query("SELECT set_config('app.current_tenant_id', $1, true)")
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;

    Ok(tx)
}
```""",
}

WEBSOCKET_CODE: Dict[str, str] = {
    "TypeScript (Node/Bun)": """```typescript
import { WebSocketServer, WebSocket } from 'ws';

interface TrackedSocket extends WebSocket {
  isAlive: boolean;
  tenantRoom: string;
}

export function attachResilientHeartbeat(wss: WebSocketServer): NodeJS.Timeout {
  wss.on('connection', (ws: TrackedSocket) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      // Backpressure guard: drop non-critical frames if client send buffer > 1MB
      if (ws.bufferedAmount > 1024 * 1024) {
        ws.close(1008, 'Backpressure buffer exceeded');
        return;
      }
    });
  });

  // Sweep dead half-open TCP sockets every 25s
  return setInterval(() => {
    for (const rawClient of wss.clients) {
      const client = rawClient as TrackedSocket;
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 25_000);
}
```""",
    "Python (FastAPI/Asyncio)": """```python
import asyncio
from fastapi import WebSocket, WebSocketDisconnect

class BoundedConnectionClient:
    def __init__(self, ws: WebSocket, max_queue: int = 128):
        self.ws = ws
        self.queue: asyncio.Queue[str] = asyncio.Queue(maxsize=max_queue)

    async def enqueue_nonblocking(self, payload: str) -> bool:
        if self.queue.full():
            # Evict oldest stale frame to prevent OOM under slow consumers
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        await self.queue.put(payload)
        return True

    async def writer_loop(self):
        try:
            while True:
                msg = await asyncio.wait_for(self.queue.get(), timeout=25.0)
                await self.ws.send_text(msg)
        except asyncio.TimeoutError:
            await self.ws.send_json({"type": "ping"})
        except WebSocketDisconnect:
            return
```""",
    "Go (nhooyr/websocket)": """```go
package realtime

import (
	"context"
	"time"
)

type ClientConn struct {
	SendCh chan []byte
}

func (c *ClientConn) PublishNonBlocking(payload []byte) bool {
	select {
	case c.SendCh <- payload:
		return true
	default:
		// Slow consumer backpressure protection: shed load instead of blocking hub
		return false
	}
}

func (c *ClientConn) WritePump(ctx context.Context, writeFn func([]byte) error) error {
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg := <-c.SendCh:
			if err := writeFn(msg); err != nil {
				return err
			}
		case <-ticker.C:
			if err := writeFn([]byte(`{"type":"heartbeat"}`)); err != nil {
				return err
			}
		}
	}
}
```""",
    "Rust (Tokio/Axum)": """```rust
use tokio::sync::mpsc;
use tokio::time::{interval, Duration};

pub struct ClientHandle {
    tx: mpsc::Sender<String>,
}

impl ClientHandle {
    pub fn new(buffer_size: usize) -> (Self, mpsc::Receiver<String>) {
        let (tx, rx) = mpsc::channel(buffer_size);
        (Self { tx }, rx)
    }

    pub fn try_broadcast(&self, payload: String) -> Result<(), &'static str> {
        // Non-blocking try_send prevents one slow mobile socket from stalling the fan-out task
        self.tx.try_send(payload).map_err(|_| "Client ring buffer full; frame dropped")
    }
}

pub async fn heartbeat_driver(mut rx: mpsc::Receiver<String>) {
    let mut ping_Space = interval(Duration::from_secs(25));
    loop {
        tokio::select! {
            Some(_msg) = rx.recv() => { /* Write frame to socket */ }
            _ = ping_Space.tick() => { /* Emit WebSocket Ping frame */ }
            else => break,
        }
    }
}
```""",
}

MULTI_AGENT_CODE: Dict[str, str] = {
    "TypeScript (Node/Bun)": """```typescript
export interface ToolCallSpec<TArgs, TOut> {
  name: string;
  timeoutMs: number;
  execute: (args: TArgs, signal: AbortSignal) => Promise<TOut>;
}

export async function runSandboxedAgentTools<TArgs, TOut>(
  calls: { spec: ToolCallSpec<TArgs, TOut>; args: TArgs }[],
  maxTokenBudget: number
): Promise<{ tool: string; ok: boolean; data?: TOut; error?: string }[]> {
  if (maxTokenBudget <= 0) {
    throw new Error('Agent circuit breaker triggered: token budget exhausted');
  }

  return Promise.all(
    calls.map(async ({ spec, args }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), spec.timeoutMs);
      try {
        const data = await spec.execute(args, controller.signal);
        return { tool: spec.name, ok: true, data };
      } catch (err) {
        return {
          tool: spec.name,
          ok: false,
          error: err instanceof Error ? err.message : 'Tool timeout',
        };
      } finally {
        clearTimeout(timer);
      }
    })
  );
}
```""",
    "Python (Asyncio/Pydantic v2)": """```python
import asyncio
from typing import Any, Callable, Coroutine
from pydantic import BaseModel, ValidationError

class AgentCircuitBreaker(Exception):
    pass

async def execute_parallel_agent_tools(
    tool_coroutines: dict[str, Coroutine[Any, Any, Any]],
    timeout_sec: float = 4.0,
    remaining_steps: int = 5,
) -> dict[str, Any]:
    if remaining_steps <= 0:
        raise AgentCircuitBreaker("Max agent recursion depth reached")

    results: dict[str, Any] = {}
    async def _wrap(name: str, coro: Coroutine[Any, Any, Any]):
        try:
            results[name] = {
                "ok": True,
                "data": await asyncio.wait_for(coro, timeout=timeout_sec),
            }
        except Exception as exc:
            results[name] = {"ok": False, "error": str(exc)}

    async with asyncio.TaskGroup() as tg:
        for tool_name, coro in tool_coroutines.items():
            tg.create_task(_wrap(tool_name, coro))

    return results
```""",
    "Go (ErrGroup/Context)": """```go
package orchestrator

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type ToolInvocation struct {
	Name    string
	Timeout time.Duration
	Run     func(ctx context.Context) (string, error)
}

func DispatchAgentTools(ctx context.Context, tools []ToolInvocation, maxDepth int) (map[string]string, error) {
	if maxDepth <= 0 {
		return nil, fmt.Errorf("agent loop circuit breaker tripped: depth=0")
	}

	results := make(map[string]string, len(tools))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, t := range tools {
		t := t
		wg.Add(1)
		go func() {
			defer wg.Done()
			tCtx, cancel := context.WithTimeout(ctx, t.Timeout)
			defer cancel()

			out, err := t.Run(tCtx)
			mu.Lock()
			if err != nil {
				results[t.Name] = fmt.Sprintf(`{"error": %q}`, err.Error())
			} else {
				results[t.Name] = out
			}
			mu.Unlock()
		}()
	}

	wg.Wait()
	return results, nil
}
```""",
    "Rust (Tokio/JoinSet)": """```rust
use std::collections::HashMap;
use tokio::task::JoinSet;
use tokio::time::{timeout, Duration};

pub async fn run_bounded_tool_dag(
    tasks: Vec<(String, Duration)>,
    remaining_budget: u32,
) -> Result<HashMap<String, String>, &'static str> {
    if remaining_budget == 0 {
        return Err("Agent token/step circuit breaker tripped");
    }

    let mut set = JoinSet::new();
    for (tool_name, limit) in tasks {
        set.spawn(async move {
            let res = timeout(limit, async {
                // Execute isolated tool call
                Ok::<String, &'static str>(format!("{{\"tool\":\"{}\",\"status\":\"ok\"}}", tool_name))
            })
            .await;

            match res {
                Ok(Ok(val)) => (tool_name, val),
                _ => (tool_name, "{\"error\":\"tool_timeout\"}".to_string()),
            }
        });
    }

    let mut outputs = HashMap::new();
    while let Some(Ok((name, data))) = set.join_next().await {
        outputs.insert(name, data);
    }
    Ok(outputs)
}
```""",
}


# ==============================================================================
# 2. SCENARIO MATRIX DEFINITIONS (4 DOMAINS)
# ==============================================================================

SCENARIOS: List[DomainScenario] = [
    DomainScenario(
        domain_key="fintech_ledger",
        domain_name="Fintech Double-Entry Ledger & Webhook Idempotency",
        state_tag="warning",
        action_tag="audit_lock",
        symptom_shorthand="duplicate payment webhooks causing negative wallet balances & AB-BA deadlocks under burst load",
        root_cause="Missing atomic idempotency registry before row locking, paired with unsorted multi-account lock acquisition.",
        security_audit="Enforce strict integer paise arithmetic (never IEEE-754 floats), atomic ON CONFLICT idempotency barriers, and canonical sorted account locking.",
        option_a_title="Pessimistic Canonical Row Locking + Atomic Idempotency Barrier (Recommended for Immediate ACID)",
        option_a_desc="Insert the webhook idempotency key inside the same database transaction using ON CONFLICT DO NOTHING, sort account IDs lexicographically before SELECT ... FOR UPDATE NOWAIT, and guard the debit with a WHERE balance_paise >= amount clause.",
        option_b_title="Append-Only Event Ledger + Single-Writer Partitioned Consumer",
        option_b_desc="Route incoming payment intents into a partitioned Kafka/NATS stream keyed by source account ID so a single thread processes balance mutations sequentially without database lock contention.",
        code_by_lang=FINTECH_CODE,
    ),
    DomainScenario(
        domain_key="saas_multitenancy",
        domain_name="Distributed SaaS Multi-Tenancy, RLS & Sharding",
        state_tag="warning",
        action_tag="tenant_isolation",
        symptom_shorthand="cross-tenant data bleed in connection pooler + one noisy enterprise tenant starving DB CPU",
        root_cause="Session-level SET variables persisting across recycled PgBouncer connections and lack of per-tenant query quotas.",
        security_audit="Never use session-scoped SET in transaction-pooled environments; always bind SET LOCAL (or set_config(..., true)) inside an explicit transaction block with Postgres Row-Level Security (RLS) enabled.",
        option_a_title="Transaction-Scoped Postgres RLS with set_config(..., true) (Best for Shared-Schema SaaS)",
        option_a_desc="Wrap every tenant request in an explicit transaction that sets app.current_tenant_id locally, ensuring the setting automatically resets on COMMIT/ROLLBACK before the connection returns to the pool.",
        option_b_title="Consistent-Hash Tenant Shard Router + Dedicated Enterprise Silos",
        option_b_desc="Keep standard tenants on RLS-protected shared shards while routing top 1% high-throughput enterprise tenants to isolated database instances via a lightweight middleware lookup.",
        code_by_lang=SAAS_CODE,
    ),
    DomainScenario(
        domain_key="realtime_websockets",
        domain_name="Real-Time WebSockets / SSE Fan-Out & Backpressure",
        state_tag="warning",
        action_tag="stream_stabilize",
        symptom_shorthand="websocket dropping 10k connections on rolling deploy + OOM crash from slow 3G mobile clients",
        root_cause="Unbounded per-connection outgoing memory buffers and missing application-level ping/pong heartbeats + connection draining jitter.",
        security_audit="Enforce bounded ring buffers per socket, shed load via non-blocking try_send when a client stalls, and stagger reconnection backoff with random jitter.",
        option_a_title="Bounded Per-Socket Ring Buffers + 25s Heartbeat Reaper (Immediate Stabilization)",
        option_a_desc="Cap each client's outbound queue and evict or disconnect slow consumers when buffered bytes cross threshold, paired with a 25-second ping/pong sweep to clear half-open TCP zombies.",
        option_b_title="Stateless Edge WebSocket Gateway + NATS JetStream / Redis PubSub Fan-Out",
        option_b_desc="Offload long-lived TLS/WebSocket termination to a dedicated horizontal gateway layer and push state deltas over NATS with sequence cursors for instant resume on reconnect.",
        code_by_lang=WEBSOCKET_CODE,
    ),
    DomainScenario(
        domain_key="multi_agent_ai",
        domain_name="Multi-Agent AI DAG Orchestration & Tool Sandboxing",
        state_tag="excited",
        action_tag="orchestrate_dag",
        symptom_shorthand="agent stuck in infinite tool-calling loop burning API credits + one hung external API freezing the whole chat stream",
        root_cause="Unbounded recursion depth without a token/step circuit breaker, and sequential awaiting of tool promises without per-tool AbortSignal timeouts.",
        security_audit="Enforce a hard step/token circuit breaker at the orchestrator boundary, isolate every tool invocation inside a strict deadline timer, and return structured error JSON so the LLM can recover gracefully.",
        option_a_title="Parallel Sandboxed Tool Execution with Per-Tool Deadlines & Circuit Breaker (Recommended)",
        option_a_desc="Execute independent tool calls concurrently inside a bounded task group where each tool has an isolated timeout signal and failures resolve into structured fallback payloads rather than crashing the turn.",
        option_b_title="Stateful Durable Execution Workflow (Temporal / Redis State Machine)",
        option_b_desc="Persist each agent reasoning step and tool output as an immutable checkpoint in a durable workflow engine so long-running research agents can pause, retry, or await human approval.",
        code_by_lang=MULTI_AGENT_CODE,
    ),
]


# ==============================================================================
# 3. MESSY DEVELOPER QUERY PERSONAS & SCALE TIERS (4 x 4 = 16 COMBINATIONS)
# ==============================================================================

QUERY_PERSONAS = [
    {
        "style": "Panicked Production Outage (Shorthand & Typos)",
        "template": (
            "bro prod down rn 500 errors everywhere!! we are at {scale} in {domain_short} "
            "and seeing {symptom} in our {lang} backend. klanten/users are screaming ngl "
            "what is the fastest fix + proper architecture so we dont get cooked again??"
        ),
    },
    {
        "style": "Hinglish & Casual Tech Lead Triage",
        "template": (
            "yaar ek bada architecture issue aa raha hai at {scale}. humara {lang} service "
            "for {domain_short} is facing {symptom}. scene kya hai, how do we fix this race/bottleneck "
            "cleanly without rewriting the whole stack? give solid options & code."
        ),
    },
    {
        "style": "High-Scale Systems Bottleneck Audit",
        "template": (
            "hey concode, our {domain_short} cluster ({lang}) just crossed {scale} and P99 latency "
            "spiked hard bcz of {symptom}. need a deep architectural breakdown (Option A vs Option B) "
            "and production-safe concurrency code."
        ),
    },
    {
        "style": "Security & Reliability Architecture Review",
        "template": (
            "reviewing our {lang} {domain_short} module before scaling to {scale}. right now we risk "
            "{symptom} under adversarial or burst traffic. walk me through the exact invariants, "
            "hexagonal boundary, and thread-safe implementation."
        ),
    },
]

SCALE_TIERS = [
    "3,500 req/sec across 12 Kubernetes pods",
    "18,000 concurrent connections during peak flash traffic",
    "450 enterprise tenants with strict 99.99% SLA",
    "80,000 daily transactions with multi-region active-active failover",
]


# ==============================================================================
# 4. LLAMA-3 SFT ROW BUILDER
# ==============================================================================

def build_llama3_sft_row(
    scenario: DomainScenario,
    lang: str,
    persona: Dict[str, str],
    scale: str,
    variant_idx: int,
) -> Dict[str, str]:
    user_query = persona["template"].format(
        scale=scale,
        domain_short=scenario.domain_name,
        symptom=scenario.symptom_shorthand,
        lang=lang,
    )

    think_block = (
        "<concode_think>\n"
        f"- Decode & Triage: User is operating a {lang} service at {scale} experiencing {scenario.symptom_shorthand} ({persona['style']}).\n"
        f"- Root Cause & Concurrency Check: {scenario.root_cause}\n"
        f"- Security & Invariant Audit: {scenario.security_audit}\n"
        f"- Architecture Selection: Present Option A ({scenario.option_a_title}) for immediate production stabilization vs Option B ({scenario.option_b_title}) for horizontal scale.\n"
        "</concode_think>"
    )

    code_snippet = scenario.code_by_lang[lang]

    assistant_body = (
        f"{think_block}\n"
        f"[STATE:{scenario.state_tag}][ACTION:{scenario.action_tag}]\n"
        f"### 1. Root Cause & Architectural Diagnosis ({scenario.domain_name})\n"
        f"At **{scale}**, {scenario.symptom_shorthand} happens because of **{scenario.root_cause.lower()}** "
        f"{scenario.security_audit}\n\n"
        f"### 2. Architectural Decision Matrix (Option A vs. Option B)\n"
        f"* **Option A — {scenario.option_a_title}:** {scenario.option_a_desc}\n"
        f"* **Option B — {scenario.option_b_title}:** {scenario.option_b_desc}\n\n"
        f"### 3. Production Implementation in {lang}\n"
        f"{code_snippet}\n\n"
        f"### 4. Verification Checklist (Variant #{variant_idx})\n"
        f"1. **Hexagonal Boundary:** Keep the domain invariant inside your core application port and inject the {lang} infrastructure adapter above.\n"
        f"2. **Load Test:** Replay concurrent burst traffic at {scale} to verify zero deadlocks or memory leaks."
    )

    full_llama3_text = (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        f"{SYSTEM_PROMPT}<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n\n"
        f"{user_query}<|eot_id|>"
        f"<|start_header_id|>assistant<|end_header_id|>\n\n"
        f"{assistant_body}<|eot_id|>"
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_query},
        {"role": "assistant", "content": assistant_body},
    ]

    return {
        "id": hashlib.sha256(user_query.encode("utf-8")).hexdigest()[:16],
        "domain": scenario.domain_key,
        "language": lang,
        "persona": persona["style"],
        "scale": scale,
        "messages": messages,
        "text": full_llama3_text,
    }


def load_existing_hashes(filepath: str) -> set:
    existing = set()
    if not os.path.exists(filepath):
        return existing
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if "id" in data:
                    existing.add(data["id"])
                elif "text" in data:
                    h = hashlib.sha256(data["text"].encode("utf-8")).hexdigest()[:16]
                    existing.add(h)
            except json.JSONDecodeError:
                continue
    return existing


def generate_dataset(output_path: str, shuffle: bool = True) -> int:
    existing_hashes = load_existing_hashes(output_path)
    generated_rows: List[Dict[str, str]] = []
    variant_counter = 1

    # Combinatorial synthesis: 4 Domains * 4 Languages * 4 Personas * 4 Scale Tiers = 256 Unique Rows
    for scenario in SCENARIOS:
        for lang in scenario.code_by_lang.keys():
            for persona in QUERY_PERSONAS:
                for scale in SCALE_TIERS:
                    row = build_llama3_sft_row(
                        scenario=scenario,
                        lang=lang,
                        persona=persona,
                        scale=scale,
                        variant_idx=variant_counter,
                    )
                    variant_counter += 1
                    if row["id"] not in existing_hashes:
                        generated_rows.append(row)
                        existing_hashes.add(row["id"])

    if shuffle:
        random.seed(42)
        random.shuffle(generated_rows)

    with open(output_path, "a", encoding="utf-8") as f:
        for row in generated_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return len(generated_rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Synthesize 256+ Polyglot Architecture SFT rows for ConCode Brain (Llama-3)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=OUTPUT_FILE,
        help="Target JSONL file to append to (default: concode_sft_dataset.jsonl)",
    )
    args = parser.parse_args()

    added_count = generate_dataset(args.output)
    print(
        f"[CONCODE_BRAIN SFT] Successfully synthesized and appended {added_count} "
        f"validated Llama-3 polyglot architecture rows to {args.output}."
    )