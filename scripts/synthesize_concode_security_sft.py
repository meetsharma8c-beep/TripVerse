#!/usr/bin/env python3
"""
ConCode Brain — Principal Security Auditor & PR Code Review SFT Synthesizer
Generates 160 unique Llama-3 SFT rows across TypeScript/Next.js, Python/FastAPI,
Go, and Rust covering:
  1. CWE-639: Multi-Tenant IDOR / Broken Object Level Authorization (OWASP API1)
  2. CWE-918: Webhook SSRF & DNS Rebinding (OWASP API7)
  3. CWE-208: Cryptographic Timing Side-Channel in HMAC Verification
  4. CWE-400 / CWE-401: Concurrency, Goroutine, Task & Closure Memory Leaks
  5. CWE-1333 / CWE-1321: Catastrophic ReDoS & Prototype/Mass-Assignment Pollution

Appends deduplicated rows directly to concode_sft_dataset.jsonl
"""

import argparse
import hashlib
import json
import os
import random
from dataclasses import dataclass
from typing import Dict, List

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "datasets", "concode_sft_dataset.jsonl")

SECURITY_SYSTEM_PROMPT = (
    "You are CONCODE_BRAIN (Principal Security Auditor & PR Code Review Mode). "
    "Analyze pull request diffs across TypeScript/Next.js, Python/FastAPI, Go, and Rust. "
    "Always start your response with a structured <concode_think> block performing an "
    "AST Source-to-Sink Taint Trace, CWE/OWASP Classification, and Memory/Concurrency "
    "Invariant Check. Then emit [STATE:warning][ACTION:security_block] followed by a "
    "5-part Automated PR Review: Severity & CWE Tag, Exact Failing Line, Exploit PoC, "
    "Drop-in Safe Remediation Diff, and Verification Unit Test Gate."
)


@dataclass
class LangVulnImplementation:
    vulnerable_diff: str
    failing_line: str
    ast_trace: str
    safe_diff: str
    verification_test: str


@dataclass
class VulnerabilityClass:
    vuln_id: str
    cwe_tag: str
    owasp_tag: str
    severity: str
    title: str
    exploit_poc: str
    invariant_rule: str
    implementations: Dict[str, LangVulnImplementation]


# ==============================================================================
# 1. MULTI-LANGUAGE VULNERABILITY & REMEDIATION CATALOG (5 CLASSES x 4 STACKS)
# ==============================================================================

VULNERABILITY_CATALOG: List[VulnerabilityClass] = [
    # --------------------------------------------------------------------------
    # CLASS 1: CWE-639 Multi-Tenant IDOR / BOLA (OWASP API1)
    # --------------------------------------------------------------------------
    VulnerabilityClass(
        vuln_id="idor_bola_multitenant",
        cwe_tag="CWE-639 (Broken Object Level Authorization / IDOR)",
        owasp_tag="OWASP API1:2023 - Broken Object Level Authorization",
        severity="CRITICAL",
        title="Cross-Tenant IDOR via Unscoped Primary Key Mutation",
        exploit_poc=(
            "An authenticated user in Tenant A captures their own valid JWT session and "
            "replaces the target resource UUID in the request path/body with a UUID belonging "
            "to Tenant B. Because the database query filters solely by primary key (`id`) without "
            "binding `tenant_id` from the verified session context, the attacker reads or mutates "
            "Tenant B's confidential records."
        ),
        invariant_rule="Every data-access sink in a multi-tenant system must bind both the object ID and the caller's authenticated tenant_id inside a composite WHERE clause or transaction-scoped RLS policy.",
        implementations={
            "TypeScript (Next.js App Router / Prisma)": LangVulnImplementation(
                vulnerable_diff="""```typescript
// app/api/v1/invoices/[invoiceId]/route.ts
export async function DELETE(req: Request, { params }: { params: { invoiceId: string } }) {
  const session = await verifyJwtSession(req);
  if (!session) return new Response('Unauthorized', { status: 401 });

  // BUG: Deletes by invoiceId alone without verifying session.tenantId ownership
  await prisma.invoice.delete({
    where: { id: params.invoiceId },
  });
  return Response.json({ deleted: true });
}
```""",
                failing_line="await prisma.invoice.delete({ where: { id: params.invoiceId } });",
                ast_trace="Untrusted route param `params.invoiceId` flows directly into `prisma.invoice.delete` sink while `session.tenantId` is unused after authentication.",
                safe_diff="""```typescript
// app/api/v1/invoices/[invoiceId]/route.ts
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await verifyJwtSession(req);
  if (!session?.tenantId) return new Response('Unauthorized', { status: 401 });

  const { invoiceId } = await params;

  // SAFE: Enforce composite tenant ownership at the atomic SQL DELETE boundary
  const result = await prisma.invoice.deleteMany({
    where: {
      id: invoiceId,
      tenantId: session.tenantId,
    },
  });

  if (result.count === 0) {
    return new Response('Invoice not found', { status: 404 });
  }
  return Response.json({ deleted: true });
}
```""",
                verification_test="Assert that calling `DELETE /api/v1/invoices/inv_tenant_B` with `session.tenantId = 'tenant_A'` returns HTTP 404 and leaves `inv_tenant_B` intact in Postgres.",
            ),
            "Python (FastAPI / SQLAlchemy Async)": LangVulnImplementation(
                vulnerable_diff="""```python
@router.patch("/v1/webhooks/{endpoint_id}")
async def update_webhook_secret(
    endpoint_id: str,
    payload: WebhookUpdateSchema,
    current_user: UserCtx = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == endpoint_id)
    endpoint = (await db.execute(stmt)).scalar_one_or_none()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Not found")

    endpoint.secret = payload.new_secret
    await db.commit()
    return {"status": "updated"}
```""",
                failing_line="stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == endpoint_id)",
                ast_trace="Path parameter `endpoint_id` queries `WebhookEndpoint` without joining or filtering on `current_user.tenant_id`.",
                safe_diff="""```python
@router.patch("/v1/webhooks/{endpoint_id}")
async def update_webhook_secret(
    endpoint_id: str,
    payload: WebhookUpdateSchema,
    current_user: UserCtx = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # SAFE: Scope query strictly to both endpoint_id and authenticated tenant_id
    stmt = (
        select(WebhookEndpoint)
        .where(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.tenant_id == current_user.tenant_id,
        )
        .with_for_update()
    )
    endpoint = (await db.execute(stmt)).scalar_one_or_none()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Not found")

    endpoint.secret = payload.new_secret
    await db.commit()
    return {"status": "updated"}
```""",
                verification_test="Run pytest async test where `user_tenant_a` attempts `PATCH /v1/webhooks/ep_tenant_b`; assert HTTP 404 and verify `ep_tenant_b.secret` is unchanged.",
            ),
            "Go (Chi / pgx/v5)": LangVulnImplementation(
                vulnerable_diff="""```go
func GetPayoutReportHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := auth.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		reportID := chi.URLParam(r, "reportID")

		var payload []byte
		err := pool.QueryRow(r.Context(),
			"SELECT report_json FROM payout_reports WHERE id = $1", reportID,
		).Scan(&payload)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Write(payload)
	}
}
```""",
                failing_line='"SELECT report_json FROM payout_reports WHERE id = $1", reportID',
                ast_trace="`chi.URLParam(r, \"reportID\")` is passed to `pool.QueryRow` while `claims.TenantID` is ignored.",
                safe_diff="""```go
func GetPayoutReportHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := auth.ClaimsFromContext(r.Context())
		if claims == nil || claims.TenantID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		reportID := chi.URLParam(r, "reportID")

		var payload []byte
		// SAFE: Composite primary key + tenant_id check prevents cross-tenant reads
		err := pool.QueryRow(r.Context(),
			"SELECT report_json FROM payout_reports WHERE id = $1 AND tenant_id = $2",
			reportID, claims.TenantID,
		).Scan(&payload)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(payload)
	}
}
```""",
                verification_test="Execute table-driven Go handler test with Tenant A JWT requesting Tenant B `reportID`; assert `http.StatusNotFound`.",
            ),
            "Rust (Axum / SQLx)": LangVulnImplementation(
                vulnerable_diff="""```rust
pub async fn rotate_api_key(
    State(pool): State<PgPool>,
    Extension(auth): Extension<AuthContext>,
    Path(key_id): Path<Uuid>,
) -> Result<Json<ApiKeyResponse>, StatusCode> {
    let record = sqlx::query_as!(
        ApiKeyRecord,
        "UPDATE api_keys SET key_hash = gen_random_uuid()::text WHERE id = $1 RETURNING id, key_hash",
        key_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    record.map(|r| Json(ApiKeyResponse::from(r))).ok_or(StatusCode::NOT_FOUND)
}
```""",
                failing_line='"UPDATE api_keys SET key_hash = gen_random_uuid()::text WHERE id = $1 RETURNING id, key_hash"',
                ast_trace="Path extractor `key_id` mutates `api_keys` table without binding `auth.tenant_id` in the SQL predicate.",
                safe_diff="""```rust
pub async fn rotate_api_key(
    State(pool): State<PgPool>,
    Extension(auth): Extension<AuthContext>,
    Path(key_id): Path<Uuid>,
) -> Result<Json<ApiKeyResponse>, StatusCode> {
    // SAFE: Bind both key_id and auth.tenant_id in the UPDATE predicate
    let record = sqlx::query_as!(
        ApiKeyRecord,
        "UPDATE api_keys SET key_hash = gen_random_uuid()::text
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, key_hash",
        key_id,
        auth.tenant_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    record.map(|r| Json(ApiKeyResponse::from(r))).ok_or(StatusCode::NOT_FOUND)
}
```""",
                verification_test="Write `#[sqlx::test]` verifying that `rotate_api_key` with mismatched `auth.tenant_id` returns `StatusCode::NOT_FOUND`.",
            ),
        },
    ),

    # --------------------------------------------------------------------------
    # CLASS 2: CWE-918 Webhook SSRF & DNS Rebinding (OWASP API7)
    # --------------------------------------------------------------------------
    VulnerabilityClass(
        vuln_id="ssrf_webhook_egress",
        cwe_tag="CWE-918 (Server-Side Request Forgery / SSRF)",
        owasp_tag="OWASP API7:2023 - Server Side Request Forgery",
        severity="CRITICAL",
        title="Unvalidated Webhook Egress & Open Redirect SSRF to Internal Metadata",
        exploit_poc=(
            "An attacker registers a webhook URL pointing to an external server under their "
            "control that responds with an HTTP 302 redirect to `http://169.254.169.254/latest/meta-data/iam/security-credentials/` "
            "or uses a DNS-rebinding A record resolving to `127.0.0.1` / RFC 1918 private subnets, "
            "exfiltrating cloud IAM credentials and scanning internal VPC services."
        ),
        invariant_rule="All user-supplied outbound URLs must enforce HTTPS, resolve DNS prior to socket connection, block all loopback/private/link-local CIDR blocks (IPv4 and IPv6), and disable HTTP redirects.",
        implementations={
            "TypeScript (Next.js / Node Fetch)": LangVulnImplementation(
                vulnerable_diff="""```typescript
export async function dispatchCustomerWebhook(targetUrl: string, eventPayload: unknown) {
  if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
    throw new Error('Blocked internal host');
  }
  const res = await fetch(targetUrl, {
    method: 'POST',
    body: JSON.stringify(eventPayload),
  });
  return res.status;
}
```""",
                failing_line="if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1'))",
                ast_trace="String substring check is bypassed via `http://169.254.169.254`, IPv6 `[::1]`, decimal IP encoding, or 302 redirects inside default `fetch()`.",
                safe_diff="""```typescript
import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return (
      ip.startsWith('10.') ||
      ip.startsWith('127.') ||
      ip.startsWith('169.254.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
      ip === '0.0.0.0'
    );
  }
  return ip === '::1' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd');
}

export async function dispatchCustomerWebhook(targetUrl: string, eventPayload: unknown) {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS webhook endpoints are permitted');
  }

  const records = await dns.lookup(parsed.hostname, { all: true });
  if (records.length === 0 || records.some((r) => isPrivateOrReservedIp(r.address))) {
    throw new Error('Egress to private, loopback, or link-local IP ranges is forbidden');
  }

  const res = await fetch(parsed.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventPayload),
    redirect: 'error', // Block 301/302 SSRF pivot redirects
    signal: AbortSignal.timeout(3500),
  });
  return res.status;
}
```""",
                verification_test="Verify that `https://169.254.169.254/latest`, `https://[::1]/hook`, and a mock server returning `302 Found -> http://127.0.0.1:6379` all throw errors before reading response bodies.",
            ),
            "Python (FastAPI / HTTPX)": LangVulnImplementation(
                vulnerable_diff="""```python
async def trigger_tenant_webhook(callback_url: str, data: dict) -> int:
    if "localhost" in callback_url:
        raise ValueError("Invalid webhook URL")
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.post(callback_url, json=data)
        return resp.status_code
```""",
                failing_line="async with httpx.AsyncClient(follow_redirects=True) as client:",
                ast_trace="Substring check ignores `169.254.169.254` and internal CIDR blocks, while `follow_redirects=True` allows open-redirect SSRF pivoting.",
                safe_diff="""```python
import ipaddress
import socket
from urllib.parse import urlparse
import httpx

def verify_safe_egress_target(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Webhook URL must use HTTPS with a valid hostname")

    addr_list = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    for _, _, _, _, sockaddr in addr_list:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError(f"Blocked egress to non-public IP: {ip}")
    return url

async def trigger_tenant_webhook(callback_url: str, data: dict) -> int:
    safe_url = verify_safe_egress_target(callback_url)
    timeout = httpx.Timeout(3.5, connect=1.5)
    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout) as client:
        resp = await client.post(safe_url, json=data)
        return resp.status_code
```""",
                verification_test="Write pytest unit tests passing `https://10.0.0.1/hook`, `https://169.254.169.254/`, and a 302 redirect response; assert `ValueError` or non-followed status.",
            ),
            "Go (net/http Safe Dialer)": LangVulnImplementation(
                vulnerable_diff="""```go
func SendWebhook(urlStr string, body []byte) (*http.Response, error) {
	if strings.Contains(urlStr, "127.0.0.1") {
		return nil, errors.New("local url blocked")
	}
	return http.Post(urlStr, "application/json", bytes.NewReader(body))
}
```""",
                failing_line='return http.Post(urlStr, "application/json", bytes.NewReader(body))',
                ast_trace="`http.Post` uses `http.DefaultClient` which has no timeout, follows up to 10 redirects automatically, and permits socket connections to RFC 1918 / AWS IMDSv1 (`169.254.169.254`).",
                safe_diff="""```go
func NewSSRFSafeClient() *http.Client {
	dialer := &net.Dialer{Timeout: 2 * time.Second}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil || len(ips) == 0 {
				return nil, errors.New("dns lookup failed")
			}
			for _, ipAddr := range ips {
				ip := ipAddr.IP
				if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
					return nil, errors.New("ssrf protection: blocked non-public IP")
				}
			}
			// Connect directly to the verified public IP to defeat DNS rebinding
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
		},
	}
	return &http.Client{
		Transport: transport,
		Timeout:   4 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Disable automatic redirect following
		},
	}
}
```""",
                verification_test="Test `NewSSRFSafeClient()` against a local `httptest.NewServer` (loopback `127.0.0.1`) and verify the dialer rejects the connection with `ssrf protection: blocked non-public IP`.",
            ),
            "Rust (Reqwest / SocketAddr Guard)": LangVulnImplementation(
                vulnerable_diff="""```rust
pub async fn post_webhook(target_url: &str, payload: &serde_json::Value) -> Result<u16, reqwest::Error> {
    let client = reqwest::Client::new();
    let res = client.post(target_url).json(payload).send().await?;
    Ok(res.status().as_u16())
}
```""",
                failing_line="let res = client.post(target_url).json(payload).send().await?;",
                ast_trace="Default `reqwest::Client::new()` follows redirects up to 10 hops and resolves internal/link-local IP addresses without filtering.",
                safe_diff="""```rust
use std::net::IpAddr;
use std::time::Duration;
use reqwest::{redirect::Policy, Client, Url};
use tokio::net::lookup_host;

fn is_global_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            !v4.is_private()
                && !v4.is_loopback()
                && !v4.is_link_local()
                && !v4.is_broadcast()
                && !v4.is_unspecified()
        }
        IpAddr::V6(v6) => !v6.is_loopback() && !v6.is_unspecified() && (v6.segments()[0] & 0xfe00) != 0xfc00,
    }
}

pub async fn post_webhook_safe(target_url: &str, payload: &serde_json::Value) -> Result<u16, &'static str> {
    let parsed = Url::parse(target_url).map_err(|_| "Invalid URL")?;
    if parsed.scheme() != "https" {
        return Err("HTTPS required");
    }
    let host = parsed.host_str().ok_or("Missing host")?;
    let port = parsed.port_or_known_default().unwrap_or(443);

    let addrs = lookup_host((host, port)).await.map_err(|_| "DNS lookup failed")?;
    for addr in addrs {
        if !is_global_public_ip(addr.ip()) {
            return Err("SSRF guard: non-public IP blocked");
        }
    }

    let client = Client::builder()
        .redirect(Policy::none())
        .timeout(Duration::from_secs(4))
        .build()
        .map_err(|_| "Client build error")?;

    let res = client.post(parsed).json(payload).send().await.map_err(|_| "Request failed")?;
    Ok(res.status().as_u16())
}
```""",
                verification_test="Add a `#[tokio::test]` asserting `post_webhook_safe(\"https://169.254.169.254/latest\", &json!({}))` returns `Err(\"SSRF guard: non-public IP blocked\")`.",
            ),
        },
    ),

    # --------------------------------------------------------------------------
    # CLASS 3: CWE-208 Cryptographic Timing Attack in Signature Verification
    # --------------------------------------------------------------------------
    VulnerabilityClass(
        vuln_id="crypto_timing_attack",
        cwe_tag="CWE-208 (Observable Timing Discrepancy)",
        owasp_tag="OWASP A04:2025 - Cryptographic Failures",
        severity="HIGH",
        title="Non-Constant-Time HMAC Signature Verification Side-Channel",
        exploit_poc=(
            "Standard equality operators (`===`, `==`) compare strings byte-by-byte and terminate "
            "at the first mismatch. By sending thousands of signed requests and measuring nanosecond "
            "response time distributions, an attacker iteratively guesses each byte of the expected "
            "HMAC digest without knowing the webhook signing secret."
        ),
        invariant_rule="All cryptographic MAC, signature, and secret token comparisons must execute in constant time using fixed-length byte slice comparators.",
        implementations={
            "TypeScript (Node / Bun Crypto)": LangVulnImplementation(
                vulnerable_diff="""```typescript
import crypto from 'node:crypto';

export function verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signatureHeader === expected;
}
```""",
                failing_line="return signatureHeader === expected;",
                ast_trace="V8 `===` string equality short-circuits on the first differing character between `signatureHeader` and `expected` HMAC digest.",
                safe_diff="""```typescript
import crypto from 'node:crypto';

export function verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const provided = Buffer.from(signatureHeader, 'hex');

  if (expected.length !== provided.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
}
```""",
                verification_test="Test `verifyWebhookSignature` with valid hex, invalid-length hex, and single-bit-flipped hex to verify `false` without throwing `RangeError`.",
            ),
            "Python (FastAPI / HMAC)": LangVulnImplementation(
                vulnerable_diff="""```python
import hashlib
import hmac

def verify_razorpay_signature(body: bytes, header_sig: str, secret: str) -> bool:
    computed = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return header_sig == computed
```""",
                failing_line="return header_sig == computed",
                ast_trace="Python `==` operator on `str` objects exits early on the first mismatched byte.",
                safe_diff="""```python
import hashlib
import hmac

def verify_razorpay_signature(body: bytes, header_sig: str, secret: str) -> bool:
    if not header_sig or len(header_sig) != 64:
        return False
    computed = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(header_sig.encode("ascii", errors="ignore"), computed.encode("ascii"))
```""",
                verification_test="Assert `verify_razorpay_signature` uses `hmac.compare_digest` and rejects malformed non-ASCII headers cleanly.",
            ),
            "Go (crypto/subtle)": LangVulnImplementation(
                vulnerable_diff="""```go
func VerifySignature(body []byte, sigHex string, secret []byte) bool {
	mac := hmac.New(sha256.New, secret)
	mac.Write(body)
	expectedHex := hex.EncodeToString(mac.Sum(nil))
	return sigHex == expectedHex
}
```""",
                failing_line="return sigHex == expectedHex",
                ast_trace="Go `==` string comparison leaks prefix match length via CPU branch prediction and execution time.",
                safe_diff="""```go
func VerifySignature(body []byte, sigHex string, secret []byte) bool {
	providedMAC, err := hex.DecodeString(sigHex)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, secret)
	mac.Write(body)
	expectedMAC := mac.Sum(nil)

	return subtle.ConstantTimeCompare(providedMAC, expectedMAC) == 1
}
```""",
                verification_test="Verify `VerifySignature` returns `true` for valid HMAC-SHA256 hex and `false` for truncated or tampered hex inputs.",
            ),
            "Rust (subtle::ConstantTimeEq)": LangVulnImplementation(
                vulnerable_diff="""```rust
pub fn verify_hmac_hex(expected_hex: &str, provided_hex: &str) -> bool {
    expected_hex == provided_hex
}
```""",
                failing_line="expected_hex == provided_hex",
                ast_trace="Standard slice equality `==` uses `memcmp` which terminates on the first differing byte.",
                safe_diff="""```rust
use subtle::ConstantTimeEq;

pub fn verify_hmac_bytes(expected: &[u8], provided: &[u8]) -> bool {
    if expected.len() != provided.len() {
        return false;
    }
    expected.ct_eq(provided).into()
}
```""",
                verification_test="Run `cargo test` confirming `verify_hmac_bytes` returns `false` on mismatched lengths and `true` on identical 32-byte digests.",
            ),
        },
    ),

    # --------------------------------------------------------------------------
    # CLASS 4: CWE-400 / CWE-401 Concurrency, Goroutine & Memory Leaks
    # --------------------------------------------------------------------------
    VulnerabilityClass(
        vuln_id="concurrency_memory_leak",
        cwe_tag="CWE-400 / CWE-401 (Uncontrolled Resource Consumption & Memory Leak)",
        owasp_tag="OWASP API4:2023 - Unrestricted Resource Consumption",
        severity="CRITICAL",
        title="Async Task / Goroutine / Listener Retention Leak Under Timeout & Disconnect",
        exploit_poc=(
            "Under high-concurrency traffic or client disconnects, background tasks/goroutines "
            "or event listeners remain permanently referenced in memory (blocked on unbuffered "
            "channels, unremoved EventEmitter closures, or uncollected asyncio tasks), steadily "
            "growing pod RSS memory until the Linux OOM killer terminates the container."
        ),
        invariant_rule="Every spawned concurrent task, channel send, or event subscription must be bound to an explicit lifecycle cleanup hook or buffered/select cancellation path.",
        implementations={
            "TypeScript (Node EventEmitter / WebSocket)": LangVulnImplementation(
                vulnerable_diff="""```typescript
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const { roomId } = JSON.parse(raw.toString());
    roomEvents.on(roomId, (event) => {
      ws.send(JSON.stringify(event));
    });
  });
});
```""",
                failing_line="roomEvents.on(roomId, (event) => { ws.send(JSON.stringify(event)); });",
                ast_trace="Closure capturing `ws` is registered on singleton `roomEvents` without deduplication and is never removed on `ws.on('close')`, leaking every disconnected socket.",
                safe_diff="""```typescript
wss.on('connection', (ws) => {
  const subscriptions = new Map<string, (event: unknown) => void>();

  ws.on('message', (raw) => {
    let parsed: { roomId?: unknown };
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const roomId = typeof parsed.roomId === 'string' ? parsed.roomId : '';
    if (!roomId || subscriptions.has(roomId) || subscriptions.size >= 20) return;

    const listener = (event: unknown) => {
      if (ws.readyState === ws.OPEN && ws.bufferedAmount < 512 * 1024) {
        ws.send(JSON.stringify(event));
      }
    };
    subscriptions.set(roomId, listener);
    roomEvents.on(roomId, listener);
  });

  const cleanup = () => {
    for (const [roomId, listener] of subscriptions.entries()) {
      roomEvents.off(roomId, listener);
    }
    subscriptions.clear();
  };
  ws.on('close', cleanup);
  ws.on('error', cleanup);
});
```""",
                verification_test="Simulate 500 WebSocket connections subscribing to `'room_1'` and disconnecting; assert `roomEvents.listenerCount('room_1') === 0`.",
            ),
            "Python (FastAPI / Asyncio Background Tasks)": LangVulnImplementation(
                vulnerable_diff="""```python
@app.post("/v1/events/ingest")
async def ingest_telemetry(payload: TelemetryBatch):
    # BUG: Unreferenced task can be garbage-collected mid-flight, or pile up unbounded
    asyncio.create_task(flush_to_clickhouse(payload))
    return {"accepted": True}
```""",
                failing_line="asyncio.create_task(flush_to_clickhouse(payload))",
                ast_trace="`asyncio.create_task` is called without saving a strong reference and without a concurrency semaphore, risking silent GC task disappearance or OOM under burst load.",
                safe_diff="""```python
_ACTIVE_TASKS: set[asyncio.Task] = set()
_INGEST_SEMAPHORE = asyncio.Semaphore(64)

async def _bounded_flush(payload: TelemetryBatch) -> None:
    async with _INGEST_SEMAPHORE:
        await flush_to_clickhouse(payload)

@app.post("/v1/events/ingest")
async def ingest_telemetry(payload: TelemetryBatch):
    if _INGEST_SEMAPHORE.locked() and len(_ACTIVE_TASKS) >= 256:
        raise HTTPException(status_code=429, detail="Ingestion backpressure limit reached")

    task = asyncio.create_task(_bounded_flush(payload))
    _ACTIVE_TASKS.add(task)
    task.add_done_callback(_ACTIVE_TASKS.discard)
    return {"accepted": True}
```""",
                verification_test="Verify that `_ACTIVE_TASKS` retains strong references during execution and returns to length `0` once all tasks complete.",
            ),
            "Go (Unbuffered Channel Goroutine Leak)": LangVulnImplementation(
                vulnerable_diff="""```go
func CheckInventoryAsync(ctx context.Context, sku string) (int, error) {
	ch := make(chan int)
	go func() {
		count := queryWarehouseRPC(sku)
		ch <- count
	}()
	select {
	case c := <-ch:
		return c, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}
```""",
                failing_line="ch := make(chan int)",
                ast_trace="Unbuffered channel `ch` causes `ch <- count` in child goroutine to block forever whenever `ctx.Done()` wins the `select` race.",
                safe_diff="""```go
func CheckInventoryAsync(ctx context.Context, sku string) (int, error) {
	// Buffer of 1 ensures sender goroutine never blocks if caller exits on ctx.Done()
	ch := make(chan int, 1)
	go func() {
		count := queryWarehouseRPCWithCtx(ctx, sku)
		ch <- count
	}()
	select {
	case c := <-ch:
		return c, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}
```""",
                verification_test="Run `goleak.VerifyNone(t)` with a pre-canceled `context.Context` to prove the child goroutine exits cleanly.",
            ),
            "Rust (Tokio Unbounded Spawn / Channel Exhaustion)": LangVulnImplementation(
                vulnerable_diff="""```rust
pub async fn broadcast_metrics(payload: String) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    tokio::spawn(async move {
        let _ = tx.send(payload);
    });
}
```""",
                failing_line="let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();",
                ast_trace="`unbounded_channel` lacks backpressure bounds, allowing fast producers to exhaust system heap when downstream consumers slow down.",
                safe_diff="""```rust
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};

pub async fn enqueue_metric_bounded(
    tx: &mpsc::Sender<String>,
    payload: String,
) -> Result<(), &'static str> {
    timeout(Duration::from_millis(25), tx.send(payload))
        .await
        .map_err(|_| "Backpressure timeout: queue full")?
        .map_err(|_| "Receiver dropped")
}
```""",
                verification_test="Create a bounded `mpsc::channel(2)`, fill both slots, and assert the 3rd `enqueue_metric_bounded` call returns `Err(\"Backpressure timeout: queue full\")` within 30ms.",
            ),
        },
    ),

    # --------------------------------------------------------------------------
    # CLASS 5: CWE-1333 / CWE-915 ReDoS & Mass Assignment Property Pollution
    # --------------------------------------------------------------------------
    VulnerabilityClass(
        vuln_id="redos_mass_assignment",
        cwe_tag="CWE-1333 / CWE-915 (Catastrophic ReDoS & Mass Assignment)",
        owasp_tag="OWASP API3:2023 - Broken Object Property Level Authorization",
        severity="HIGH",
        title="Catastrophic Regex Backtracking (ReDoS) & Unfiltered Schema Binding",
        exploit_poc=(
            "An attacker submits a crafted 50-character input string that triggers $O(2^n)$ "
            "backtracking in a nested quantifier regex, pinning CPU cores at 100%, or injects "
            "privileged fields (`role: 'admin'`, `is_verified: true`) into an unfiltered body "
            "spread operation."
        ),
        invariant_rule="Never use nested repeating regex groups on untrusted input without linear-time engines or strict length caps, and always whitelist mutable fields explicitly.",
        implementations={
            "TypeScript (Node / Zod Strict Whitelisting)": LangVulnImplementation(
                vulnerable_diff="""```typescript
export async function updateUserProfile(userId: string, body: Record<string, unknown>) {
  // BUG 1: Nested quantifier regex causes catastrophic ReDoS on malformed slugs
  if (typeof body.handle === 'string' && /^([a-z0-9]+-?)+$/.test(body.handle)) {
    // BUG 2: Spreading raw body allows mass assignment of { role: 'superadmin' }
    return db.user.update({ where: { id: userId }, data: { ...body } });
  }
  throw new Error('Invalid handle');
}
```""",
                failing_line="if (typeof body.handle === 'string' && /^([a-z0-9]+-?)+$/.test(body.handle))",
                ast_trace="`/^([a-z0-9]+-?)+$/` has star-height 2 causing exponential backtracking in V8, and `{ ...body }` passes unvalidated properties (`role`, `balance`) straight to the ORM.",
                safe_diff="""```typescript
import { z } from 'zod';

// Linear O(n) slug validation + strict property allowlist
const ProfileUpdateSchema = z
  .object({
    handle: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    bio: z.string().max(160).optional(),
  })
  .strict();

export async function updateUserProfile(userId: string, rawBody: unknown) {
  const validated = ProfileUpdateSchema.parse(rawBody);
  return db.user.update({
    where: { id: userId },
    data: {
      handle: validated.handle,
      bio: validated.bio,
    },
  });
}
```""",
                verification_test="Verify that `handle: 'a'.repeat(30) + '!'` completes validation in `< 2ms` and passing `{\"handle\": \"dev\", \"role\": \"admin\"}` throws a Zod strict unrecognized_keys error.",
            ),
            "Python (FastAPI / Pydantic v2 Extra Forbid)": LangVulnImplementation(
                vulnerable_diff="""```python
@router.put("/v1/users/me")
async def update_me(raw_data: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for key, value in raw_data.items():
        setattr(user, key, value)
    await db.commit()
    return user
```""",
                failing_line="for key, value in raw_data.items(): setattr(user, key, value)",
                ast_trace="Iterating over `raw_data.items()` with `setattr` allows an attacker to overwrite `user.is_superuser = True` or `user.tenant_id`.",
                safe_diff="""```python
from pydantic import BaseModel, ConfigDict, Field

class UserSelfUpdateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    display_name: str = Field(min_length=2, max_length=50)
    timezone: str = Field(pattern=r"^[A-Za-z_]+/[A-Za-z_]+$", max_length=40)

@router.put("/v1/users/me")
async def update_me(
    payload: UserSelfUpdateSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.display_name = payload.display_name
    user.timezone = payload.timezone
    await db.commit()
    return {"display_name": user.display_name, "timezone": user.timezone}
```""",
                verification_test="Send `PUT /v1/users/me` with `{\"display_name\": \"Meet\", \"is_admin\": true}` and assert FastAPI returns HTTP 422 `extra_forbidden`.",
            ),
            "Go (Linear RE2 / Explicit Struct Binding)": LangVulnImplementation(
                vulnerable_diff="""```go
func UpdateAccountSettings(db *gorm.DB, userID string, rawJSON []byte) error {
	var updates map[string]interface{}
	if err := json.Unmarshal(rawJSON, &updates); err != nil {
		return err
	}
	return db.Model(&Account{}).Where("id = ?", userID).Updates(updates).Error
}
```""",
                failing_line='return db.Model(&Account{}).Where("id = ?", userID).Updates(updates).Error',
                ast_trace="Unmarshaling arbitrary JSON into `map[string]interface{}` and passing it to GORM `.Updates()` allows mass assignment of `role`, `credit_limit`, or `tenant_id` columns.",
                safe_diff="""```go
type SafeAccountUpdateInput struct {
	DisplayName string `json:"display_name"`
	Locale      string `json:"locale"`
}

func UpdateAccountSettings(db *gorm.DB, userID string, tenantID string, rawJSON []byte) error {
	dec := json.NewDecoder(bytes.NewReader(rawJSON))
	dec.DisallowUnknownFields() // Reject unexpected JSON fields immediately

	var input SafeAccountUpdateInput
	if err := dec.Decode(&input); err != nil {
		return err
	}
	return db.Model(&Account{}).
		Where("id = ? AND tenant_id = ?", userID, tenantID).
		Select("display_name", "locale").
		Updates(Account{DisplayName: input.DisplayName, Locale: input.Locale}).Error
}
```""",
                verification_test="Pass `{\"display_name\":\"test\",\"is_admin\":true}` to `UpdateAccountSettings` and assert `dec.Decode` returns an unknown field error.",
            ),
            "Rust (Serde deny_unknown_fields)": LangVulnImplementation(
                vulnerable_diff="""```rust
#[derive(Deserialize)]
pub struct UpdateOrgPayload {
    pub org_name: String,
    #[serde(flatten)]
    pub extra: std::collections::HashMap<String, serde_json::Value>,
}
```""",
                failing_line="pub extra: std::collections::HashMap<String, serde_json::Value>,",
                ast_trace="`#[serde(flatten)]` captures arbitrary unvalidated keys into `extra`, risking downstream query injection or mass property overwrite.",
                safe_diff="""```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateOrgPayload {
    pub org_name: String,
    pub billing_email: String,
}
```""",
                verification_test="Deserialize `{\"org_name\":\"ConCode\",\"billing_email\":\"a@b.com\",\"plan_tier\":\"enterprise_free\"}` and assert `serde_json::from_str` fails with `unknown field`.",
            ),
        },
    ),
]


# ==============================================================================
# 2. DEVELOPER PR SUBMISSION PERSONAS & ENVIRONMENTS (4 x 2 = 8 COMBINATIONS)
# ==============================================================================

PR_PERSONAS = [
    {
        "name": "Fast-Moving Startup PR Review",
        "prompt_template": (
            "hey concode pls review this PR diff for our {env} {lang} service before we merge "
            "to main rn. lmk if there are any hidden security holes, race conditions, or leaks:\n\n"
            "{diff}"
        ),
    },
    {
        "name": "Hinglish Security & Prod Readiness Audit",
        "prompt_template": (
            "bhai ek baar ye {lang} PR code check krde for {env}. prod deploy krna hai aaj sham ko, "
            "koi IDOR, SSRF, ya memory leak ka scene toh nahi hai na??\n\n"
            "{diff}"
        ),
    },
    {
        "name": "Principal SecOps Pre-Release Gate",
        "prompt_template": (
            "Run a full Principal Security Audit on the following {lang} diff targeting {env}. "
            "Include AST source-to-sink taint trace, CWE/OWASP tags, exploit PoC, and drop-in fix:\n\n"
            "{diff}"
        ),
    },
    {
        "name": "Post-Incident Root Cause Code Review",
        "prompt_template": (
            "we had a security/stability alert in {env} near this {lang} handler. audit this exact "
            "snippet, tell me what invariant broke, and give the hardened replacement diff:\n\n"
            "{diff}"
        ),
    },
]

ENVIRONMENTS = [
    "Multi-Tenant B2B SaaS Control Plane",
    "High-Throughput Fintech & Real-Time API Gateway",
]


# ==============================================================================
# 3. SFT ROW GENERATOR
# ==============================================================================

def build_security_sft_row(
    vuln: VulnerabilityClass,
    lang: str,
    impl: LangVulnImplementation,
    persona: Dict[str, str],
    env: str,
    idx: int,
) -> Dict[str, str]:
    user_prompt = persona["prompt_template"].format(
        env=env,
        lang=lang,
        diff=impl.vulnerable_diff,
    )

    think_block = (
        "<concode_think>\n"
        f"- AST Source-to-Sink Taint Trace: {impl.ast_trace}\n"
        f"- Classification: {vuln.cwe_tag} | {vuln.owasp_tag} (Severity: {vuln.severity}).\n"
        f"- Broken Invariant: {vuln.invariant_rule}\n"
        f"- Remediation Strategy: Replace `{impl.failing_line}` with a hardened {lang} implementation and enforce a regression test gate.\n"
        "</concode_think>"
    )

    assistant_response = (
        f"{think_block}\n"
        f"[STATE:warning][ACTION:security_block]\n"
        f"### Automated PR Security & Reliability Audit ({env})\n\n"
        f"* **Severity & Classification:** `[SEVERITY: {vuln.severity}]` — **{vuln.cwe_tag}** ({vuln.owasp_tag})\n"
        f"* **Exact Failing Line:** `{impl.failing_line}`\n"
        f"* **Broken Invariant:** {vuln.invariant_rule}\n"
        f"* **Proof-of-Concept Exploit / Failure Scenario:** {vuln.exploit_poc}\n\n"
        f"### Drop-In Safe Remediation Diff ({lang})\n"
        f"{impl.safe_diff}\n\n"
        f"### Mandatory Verification Gate (Audit #{idx})\n"
        f"* **Unit / Integration Test:** {impl.verification_test}"
    )

    llama3_text = (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        f"{SECURITY_SYSTEM_PROMPT}<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n\n"
        f"{user_prompt}<|eot_id|>"
        f"<|start_header_id|>assistant<|end_header_id|>\n\n"
        f"{assistant_response}<|eot_id|>"
    )

    messages = [
        {"role": "system", "content": SECURITY_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
        {"role": "assistant", "content": assistant_response},
    ]

    return {
        "id": hashlib.sha256(user_prompt.encode("utf-8")).hexdigest()[:16],
        "domain": f"security_audit_{vuln.vuln_id}",
        "cwe": vuln.cwe_tag,
        "language": lang,
        "persona": persona["name"],
        "environment": env,
        "messages": messages,
        "text": llama3_text,
    }


def load_existing_ids(filepath: str) -> set:
    existing = set()
    if not os.path.exists(filepath):
        return existing
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                if "id" in row:
                    existing.add(row["id"])
            except json.JSONDecodeError:
                continue
    return existing


def synthesize_security_dataset(output_path: str, shuffle: bool = True) -> int:
    existing_ids = load_existing_ids(output_path)
    new_rows: List[Dict[str, str]] = []
    counter = 1

    # 5 Vuln Classes * 4 Languages * 4 PR Personas * 2 Environments = 160 Unique Rows
    for vuln in VULNERABILITY_CATALOG:
        for lang, impl in vuln.implementations.items():
            for persona in PR_PERSONAS:
                for env in ENVIRONMENTS:
                    row = build_security_sft_row(
                        vuln=vuln,
                        lang=lang,
                        impl=impl,
                        persona=persona,
                        env=env,
                        idx=counter,
                    )
                    counter += 1
                    if row["id"] not in existing_ids:
                        new_rows.append(row)
                        existing_ids.add(row["id"])

    if shuffle:
        random.seed(1337)
        random.shuffle(new_rows)

    with open(output_path, "a", encoding="utf-8") as f:
        for row in new_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return len(new_rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate 160+ Automated PR Code Review & Security Audit SFT rows for ConCode Brain"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=OUTPUT_FILE,
        help="Target JSONL dataset file (default: concode_sft_dataset.jsonl)",
    )
    args = parser.parse_args()

    added = synthesize_security_dataset(args.output)
    print(
        f"[CONCODE_BRAIN SEC-AUDIT] Appended {added} unique Llama-3 PR Security Audit "
        f"training rows to {args.output}."
    )