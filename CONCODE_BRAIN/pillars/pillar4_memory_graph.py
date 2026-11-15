#!/usr/bin/env python3
"""
Pillar 4: Lifelong Memory Graph & GraphRAG (concode_memory_graph.py)
--------------------------------------------------------------------
Implements a persistent Entity-Relationship Knowledge Graph and k-hop GraphRAG
retrieval engine for CONCODE_BRAIN across:
  1. System & Architecture Entities: Repositories, Databases, Schemas, Tables,
     Columns, Auth Roles, and Pinned Security Invariants (fencing_token, tenant_id,
     timingSafeEqual, SSRF egress guards).
  2. Real-World & Travel Entities: Traveler Profiles, Altitude Thresholds,
     Vehicle Clearances, Budget Ceilings, Fatigue Constraints, and Seasonal Hazards.
  3. Dynamic Temporal Decay: Exponential forgetting w(t) = w0 * exp(-lambda * (t - t0))
     with sticky pinning (pinned=True) for immutable security and life-safety invariants.
  4. GraphRAGEngine: Performs k-hop subgraph extraction, detects invariant conflicts
     in incoming prompts, and formats structured context for <concode_think> injection.
"""

from __future__ import annotations

import json
import math
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


# ==============================================================================
# 1. KNOWLEDGE GRAPH PRIMITIVES (NODES, EDGES & TEMPORAL DECAY)
# ==============================================================================


@dataclass
class KnowledgeGraphNode:
    """
    Represents an entity or invariant in ConCode's lifelong memory graph.
    If `pinned=True`, temporal decay is bypassed so critical security and
    life-safety invariants never fade over time.
    """

    node_id: str
    entity_type: str  # e.g., 'DatabaseTable', 'SecurityInvariant', 'TravelerProfile', 'SafetyThreshold'
    label: str
    domain: str  # 'system_architecture' | 'travel_logistics'
    attributes: Dict[str, Any] = field(default_factory=dict)
    aliases: List[str] = field(default_factory=list)
    base_weight: float = 1.0  # w0
    decay_lambda: float = 0.0001  # Exponential decay rate per second
    created_at: float = field(default_factory=time.time)  # t0
    last_accessed: float = field(default_factory=time.time)
    pinned: bool = False  # Sticky pinning for immutable invariants

    def current_weight(self, now: Optional[float] = None) -> float:
        """
        Computes w(t) = w0 * exp(-lambda * (t - t0)).
        Pinned nodes retain their full base_weight permanently.
        """
        if self.pinned:
            return self.base_weight
        current_time = now if now is not None else time.time()
        delta_t = max(0.0, current_time - self.last_accessed)
        return round(self.base_weight * math.exp(-self.decay_lambda * delta_t), 6)

    def touch(self, now: Optional[float] = None) -> None:
        """Refreshes the node's access timestamp upon retrieval ( synaptic reinforcement )."""
        self.last_accessed = now if now is not None else time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "entity_type": self.entity_type,
            "label": self.label,
            "domain": self.domain,
            "attributes": self.attributes,
            "aliases": self.aliases,
            "base_weight": self.base_weight,
            "decay_lambda": self.decay_lambda,
            "created_at": self.created_at,
            "last_accessed": self.last_accessed,
            "pinned": self.pinned,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "KnowledgeGraphNode":
        return cls(
            node_id=data["node_id"],
            entity_type=data["entity_type"],
            label=data["label"],
            domain=data["domain"],
            attributes=data.get("attributes", {}),
            aliases=data.get("aliases", []),
            base_weight=float(data.get("base_weight", 1.0)),
            decay_lambda=float(data.get("decay_lambda", 0.0001)),
            created_at=float(data.get("created_at", time.time())),
            last_accessed=float(data.get("last_accessed", time.time())),
            pinned=bool(data.get("pinned", False)),
        )


@dataclass
class KnowledgeGraphEdge:
    """
    Directed, weighted relationship between two KnowledgeGraphNodes.
    """

    source_id: str
    target_id: str
    relation: str  # e.g., 'HAS_COLUMN', 'ENFORCES_INVARIANT', 'HAS_CONSTRAINT', 'ROUTES_THROUGH'
    metadata: Dict[str, Any] = field(default_factory=dict)
    base_weight: float = 1.0
    decay_lambda: float = 0.0001
    created_at: float = field(default_factory=time.time)
    pinned: bool = False

    def current_weight(self, now: Optional[float] = None) -> float:
        if self.pinned:
            return self.base_weight
        current_time = now if now is not None else time.time()
        delta_t = max(0.0, current_time - self.created_at)
        return round(self.base_weight * math.exp(-self.decay_lambda * delta_t), 6)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relation": self.relation,
            "metadata": self.metadata,
            "base_weight": self.base_weight,
            "decay_lambda": self.decay_lambda,
            "created_at": self.created_at,
            "pinned": self.pinned,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "KnowledgeGraphEdge":
        return cls(
            source_id=data["source_id"],
            target_id=data["target_id"],
            relation=data["relation"],
            metadata=data.get("metadata", {}),
            base_weight=float(data.get("base_weight", 1.0)),
            decay_lambda=float(data.get("decay_lambda", 0.0001)),
            created_at=float(data.get("created_at", time.time())),
            pinned=bool(data.get("pinned", False)),
        )


# ==============================================================================
# 2. CORE KNOWLEDGE GRAPH STORAGE & PERSISTENCE
# ==============================================================================


class ConCodeKnowledgeGraph:
    """
    Bidirectionally indexed Entity-Relationship Knowledge Graph supporting
    temporal decay pruning, sticky invariant pinning, and JSON persistence.
    """

    def __init__(self, storage_path: str = "datasets/concode_memory_graph.json") -> None:
        self.storage_path = Path(storage_path)
        self.nodes: Dict[str, KnowledgeGraphNode] = {}
        self.edges: List[KnowledgeGraphEdge] = []
        self._adj_out: Dict[str, List[KnowledgeGraphEdge]] = {}
        self._adj_in: Dict[str, List[KnowledgeGraphEdge]] = {}

    def upsert_node(self, node: KnowledgeGraphNode) -> None:
        self.nodes[node.node_id] = node
        self._adj_out.setdefault(node.node_id, [])
        self._adj_in.setdefault(node.node_id, [])

    def add_edge(self, edge: KnowledgeGraphEdge) -> None:
        if edge.source_id not in self.nodes or edge.target_id not in self.nodes:
            raise ValueError(
                f"Cannot link non-existent nodes: {edge.source_id} -> {edge.target_id}"
            )
        # Prevent exact duplicate edges
        for existing in self._adj_out.get(edge.source_id, []):
            if (
                existing.target_id == edge.target_id
                and existing.relation == edge.relation
            ):
                existing.metadata.update(edge.metadata)
                existing.pinned = existing.pinned or edge.pinned
                return

        self.edges.append(edge)
        self._adj_out.setdefault(edge.source_id, []).append(edge)
        self._adj_in.setdefault(edge.target_id, []).append(edge)

    def get_neighbors(self, node_id: str) -> List[Tuple[KnowledgeGraphEdge, KnowledgeGraphNode]]:
        """Returns both outgoing and incoming incident edges and neighbor nodes."""
        neighbors: List[Tuple[KnowledgeGraphEdge, KnowledgeGraphNode]] = []
        for edge in self._adj_out.get(node_id, []):
            target = self.nodes.get(edge.target_id)
            if target:
                neighbors.append((edge, target))
        for edge in self._adj_in.get(node_id, []):
            source = self.nodes.get(edge.source_id)
            if source:
                neighbors.append((edge, source))
        return neighbors

    def prune_decayed_memories(
        self, min_weight_threshold: float = 0.15, now: Optional[float] = None
    ) -> int:
        """
        Evicts unpinned episodic nodes whose decayed weight w(t) falls below
        `min_weight_threshold`. Pinned security/safety invariants are never evicted.
        """
        to_remove: Set[str] = set()
        for node_id, node in self.nodes.items():
            if not node.pinned and node.current_weight(now) < min_weight_threshold:
                to_remove.add(node_id)

        if not to_remove:
            return 0

        for nid in to_remove:
            del self.nodes[nid]
            self._adj_out.pop(nid, None)
            self._adj_in.pop(nid, None)

        self.edges = [
            e
            for e in self.edges
            if e.source_id not in to_remove and e.target_id not in to_remove
        ]
        # Rebuild adjacency lists cleanly
        self._adj_out = {nid: [] for nid in self.nodes}
        self._adj_in = {nid: [] for nid in self.nodes}
        for e in self.edges:
            self._adj_out[e.source_id].append(e)
            self._adj_in[e.target_id].append(e)

        return len(to_remove)

    def save(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": "4.0.0-argon-frontier",
            "saved_at": time.time(),
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
        }
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

    def load(self) -> bool:
        if not self.storage_path.exists():
            return False
        with open(self.storage_path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        self.nodes.clear()
        self.edges.clear()
        self._adj_out.clear()
        self._adj_in.clear()

        for raw_node in payload.get("nodes", []):
            self.upsert_node(KnowledgeGraphNode.from_dict(raw_node))
        for raw_edge in payload.get("edges", []):
            self.add_edge(KnowledgeGraphEdge.from_dict(raw_edge))
        return True


# ==============================================================================
# 3. GRAPHRAG ENGINE (K-HOP RETRIEVAL, CONFLICT AUDITOR & PROMPT FORMATTER)
# ==============================================================================


@dataclass
class InvariantConflict:
    invariant_node_id: str
    severity: str  # 'CRITICAL' | 'HIGH'
    cwe_or_hazard_code: str
    description: str
    remediation_rule: str


@dataclass
class GraphRAGRetrievalResult:
    seed_node_ids: List[str]
    subgraph_nodes: List[KnowledgeGraphNode]
    subgraph_edges: List[KnowledgeGraphEdge]
    conflicts: List[InvariantConflict]
    formatted_think_context: str


class GraphRAGEngine:
    """
    Executes entity linking, k-hop BFS subgraph expansion weighted by temporal
    salience w(t), deterministic invariant conflict auditing, and structured
    <concode_think> prompt serialization.
    """

    def __init__(self, graph: ConCodeKnowledgeGraph) -> None:
        self.graph = graph

    def identify_seed_entities(self, prompt: str) -> List[str]:
        """Matches prompt tokens against node IDs, labels, and aliases."""
        lower_prompt = prompt.lower()
        matched_ids: List[str] = []

        for node_id, node in self.graph.nodes.items():
            candidates = [node.node_id.lower(), node.label.lower()] + [
                a.lower() for a in node.aliases
            ]
            if any(token and token in lower_prompt for token in candidates):
                matched_ids.append(node_id)

        return matched_ids

    def retrieve_k_hop_subgraph(
        self,
        prompt: str,
        k_hops: int = 2,
        min_weight: float = 0.20,
        now: Optional[float] = None,
    ) -> GraphRAGRetrievalResult:
        seed_ids = self.identify_seed_entities(prompt)
        visited_nodes: Set[str] = set(seed_ids)
        collected_edges: List[KnowledgeGraphEdge] = []
        seen_edge_keys: Set[Tuple[str, str, str]] = set()

        queue: deque[Tuple[str, int]] = deque((sid, 0) for sid in seed_ids)

        while queue:
            current_id, depth = queue.popleft()
            current_node = self.graph.nodes.get(current_id)
            if current_node:
                current_node.touch(now)

            if depth >= k_hops:
                continue

            for edge, neighbor in self.graph.get_neighbors(current_id):
                if neighbor.current_weight(now) < min_weight:
                    continue

                edge_key = (edge.source_id, edge.relation, edge.target_id)
                if edge_key not in seen_edge_keys:
                    seen_edge_keys.add(edge_key)
                    collected_edges.append(edge)

                if neighbor.node_id not in visited_nodes:
                    visited_nodes.add(neighbor.node_id)
                    queue.append((neighbor.node_id, depth + 1))

        # Sort retrieved nodes by pinned status first, then current temporal weight w(t)
        subgraph_nodes = sorted(
            [self.graph.nodes[nid] for nid in visited_nodes if nid in self.graph.nodes],
            key=lambda n: (n.pinned, n.current_weight(now)),
            reverse=True,
        )

        conflicts = self._detect_invariant_conflicts(prompt, subgraph_nodes)
        formatted_ctx = self._format_for_concode_think(
            subgraph_nodes, collected_edges, conflicts, now
        )

        return GraphRAGRetrievalResult(
            seed_node_ids=seed_ids,
            subgraph_nodes=subgraph_nodes,
            subgraph_edges=collected_edges,
            conflicts=conflicts,
            formatted_think_context=formatted_ctx,
        )

    def _detect_invariant_conflicts(
        self, prompt: str, subgraph_nodes: List[KnowledgeGraphNode]
    ) -> List[InvariantConflict]:
        """
        Audits the user prompt against pinned SecurityInvariants and SafetyThresholds
        discovered in the k-hop subgraph.
        """
        conflicts: List[InvariantConflict] = []
        lower_prompt = prompt.lower()

        for node in subgraph_nodes:
            if not node.pinned:
                continue

            rule_type = node.attributes.get("rule_type")

            # 1. Multi-Tenant BOLA / IDOR Check (Missing tenant_id scope)
            if rule_type == "composite_tenant_scope":
                required_col = node.attributes.get("required_column", "tenant_id")
                has_unscoped_query = (
                    "where" in lower_prompt
                    or "findunique" in lower_prompt
                    or "delete" in lower_prompt
                    or "update" in lower_prompt
                )
                if has_unscoped_query and required_col.lower() not in lower_prompt:
                    conflicts.append(
                        InvariantConflict(
                            invariant_node_id=node.node_id,
                            severity="CRITICAL",
                            cwe_or_hazard_code="CWE-639 (Multi-Tenant IDOR / BOLA)",
                            description=(
                                f"Prompt mutates or queries `{node.label}` without binding "
                                f"mandatory `{required_col}` column."
                            ),
                            remediation_rule=node.attributes.get(
                                "remediation",
                                f"Enforce composite WHERE id = $1 AND {required_col} = $2 or transaction-local RLS.",
                            ),
                        )
                    )

            # 2. Split-Brain Distributed Lock Fencing Check
            elif rule_type == "monotonic_fencing_token":
                if "date.now()" in lower_prompt or "wall-clock" in lower_prompt:
                    conflicts.append(
                        InvariantConflict(
                            invariant_node_id=node.node_id,
                            severity="CRITICAL",
                            cwe_or_hazard_code="SPLIT-BRAIN-CLOCK-SKEW",
                            description=(
                                "Prompt relies on wall-clock timestamp comparison for lease validity "
                                "instead of a monotonic fencing_token."
                            ),
                            remediation_rule=node.attributes.get(
                                "remediation",
                                "Require WHERE fencing_token < $new_token at the database storage boundary.",
                            ),
                        )
                    )

            # 3. AMS High-Altitude Acclimatization Threshold Check (>3,000m in <24h)
            elif rule_type == "ams_altitude_ceiling":
                max_safe_m = int(node.attributes.get("max_unacclimatized_meters", 3000))
                requested_Elevations = [
                    int(m.replace(",", ""))
                    for m in re.findall(r"(\d{1,2},?\d{3})\s*m\b", lower_prompt)
                ]
                rapid_ascent_keywords = any(
                    kw in lower_prompt
                    for kw in ["day 1", "same day", "same afternoon", "straight to", "<24h"]
                )
                if rapid_ascent_keywords and any(
                    elev > max_safe_m for elev in requested_Elevations
                ):
                    conflicts.append(
                        InvariantConflict(
                            invariant_node_id=node.node_id,
                            severity="CRITICAL",
                            cwe_or_hazard_code="LIFE-SAFETY-AMS-HAZARD",
                            description=(
                                f"Prompt requests rapid ascent to {max(requested_Elevations)}m on Day 1, "
                                f"violating pinned acclimatization ceiling of {max_safe_m}m."
                            ),
                            remediation_rule=node.attributes.get(
                                "remediation",
                                "Enforce 24-48h acclimatization at <=3,500m (Leh/Sham Valley 3,100m) before crossing passes >4,000m.",
                            ),
                        )
                    )

            # 4. Group Budget Ceiling Check
            elif rule_type == "budget_ceiling_inr":
                max_budget = int(node.attributes.get("max_budget_inr", 0))
                estimated_min = int(node.attributes.get("estimated_route_min_inr", 0))
                if max_budget > 0 and estimated_min > max_budget:
                    conflicts.append(
                        InvariantConflict(
                            invariant_node_id=node.node_id,
                            severity="HIGH",
                            cwe_or_hazard_code="BUDGET-OVERFLOW-CONFLICT",
                            description=(
                                f"Requested route minimum cost (₹{estimated_min:,}) exceeds traveler's "
                                f"pinned budget ceiling (₹{max_budget:,})."
                            ),
                            remediation_rule=node.attributes.get(
                                "remediation",
                                "Pivot from private SUV to shared tempo/homestay split or alternate destination within ceiling.",
                            ),
                        )
                    )

        return conflicts

    def _format_for_concode_think(
        self,
        nodes: List[KnowledgeGraphNode],
        edges: List[KnowledgeGraphEdge],
        conflicts: List[InvariantConflict],
        now: Optional[float] = None,
    ) -> str:
        lines: List[str] = ["<graph_rag_context>"]
        lines.append("  [Retrieved Subgraph Entities]")
        for n in nodes:
            pin_tag = "PINNED_INVARIANT" if n.pinned else f"w(t)={n.current_weight(now):.3f}"
            lines.append(
                f"  - ({n.entity_type}) {n.node_id} [{pin_tag}]: {n.label} | attrs={json.dumps(n.attributes, ensure_ascii=False)}"
            )

        lines.append("  [Retrieved Relationships]")
        for e in edges:
            lines.append(f"  - {e.source_id} --[{e.relation}]--> {e.target_id}")

        if conflicts:
            lines.append("  [DETECTED INVARIANT CONFLICTS — MUST BACKTRACK & REMEDIATE]")
            for c in conflicts:
                lines.append(
                    f"  - [{c.severity} | {c.cwe_or_hazard_code}] Node={c.invariant_node_id}: "
                    f"{c.description} -> Fix: {c.remediation_rule}"
                )
        else:
            lines.append("  [Invariant Audit: PASS — Zero conflicts detected]")

        lines.append("</graph_rag_context>")
        return "\n".join(lines)


# ==============================================================================
# 4. DEFAULT ENTERPRISE & TRAVEL KNOWLEDGE GRAPH SEEDER
# ==============================================================================


def seed_concode_lifelong_memory(graph: ConCodeKnowledgeGraph, t0: float) -> None:
    """
    Populates the Knowledge Graph with both:
      1. System Architecture Entities (Postgres tables, columns, auth roles, CWE invariants)
      2. Real-World Travel Entities (Traveler profile, AMS altitude threshold, monsoon hazards)
    """
    # --- A. System & Architecture Domain ---
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="repo:fintech_core",
            entity_type="Repository",
            label="TripVerse & Fintech Core Ledger Service",
            domain="system_architecture",
            aliases=["fintech", "payout service", "billing repo"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="table:payouts",
            entity_type="DatabaseTable",
            label="payouts",
            domain="system_architecture",
            attributes={"schema": "public", "rls_enabled": True, "pk": "id"},
            aliases=["db.payout", "payouts table", "payout"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="col:payouts.tenant_id",
            entity_type="TableColumn",
            label="payouts.tenant_id (UUID NOT NULL)",
            domain="system_architecture",
            attributes={"type": "UUID", "nullable": False, "indexed": True},
            aliases=["tenant_id", "tenantid"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="inv:cwe_639_tenant_scope",
            entity_type="SecurityInvariant",
            label="CWE-639 Composite Tenant Isolation Invariant",
            domain="system_architecture",
            attributes={
                "rule_type": "composite_tenant_scope",
                "required_column": "tenant_id",
                "remediation": "Bind WHERE id = $1 AND tenant_id = $2 on every query/mutation against payouts.",
            },
            aliases=["idor", "bola"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="inv:split_brain_fencing",
            entity_type="SecurityInvariant",
            label="Monotonic Fencing Token Lease Invariant",
            domain="system_architecture",
            attributes={
                "rule_type": "monotonic_fencing_token",
                "required_column": "fencing_token",
                "remediation": "Reject wall-clock Date.now() lease checks; enforce WHERE fencing_token < $new_token in Postgres.",
            },
            aliases=["fencing_token", "lease", "split-brain"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )

    # Ephemeral episodic debug note (unpinned -> subject to exponential decay)
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="ephemeral:staging_log_note_42",
            entity_type="EpisodicDebugNote",
            label="Temporary staging CSS tweak note from last month",
            domain="system_architecture",
            base_weight=1.0,
            decay_lambda=0.05,  # Fast decay for temporary notes
            created_at=t0,
            last_accessed=t0,
            pinned=False,
        )
    )

    # Link System Architecture Edges
    graph.add_edge(
        KnowledgeGraphEdge("repo:fintech_core", "table:payouts", "OWNS_TABLE", pinned=True)
    )
    graph.add_edge(
        KnowledgeGraphEdge(
            "table:payouts", "col:payouts.tenant_id", "HAS_COLUMN", pinned=True
        )
    )
    graph.add_edge(
        KnowledgeGraphEdge(
            "table:payouts",
            "inv:cwe_639_tenant_scope",
            "ENFORCES_INVARIANT",
            pinned=True,
        )
    )
    graph.add_edge(
        KnowledgeGraphEdge(
            "table:payouts",
            "inv:split_brain_fencing",
            "ENFORCES_INVARIANT",
            pinned=True,
        )
    )

    # --- B. Real-World & Travel Logistics Domain ---
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="traveler:group_mumbai_4pax",
            entity_type="TravelerProfile",
            label="Mumbai 4-Friends Group Profile (Sea-Level Origin)",
            domain="travel_logistics",
            attributes={
                "origin_city": "Mumbai",
                "origin_elevation_m": 14,
                "pax_count": 4,
                "max_daily_drive_hours": 6,
            },
            aliases=["mumbai", "4 friends", "pangong", "leh"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="route:leh_pangong_changla",
            entity_type="MountainCorridor",
            label="Leh (3,500m) -> Chang La (5,360m) -> Pangong Lake (4,350m)",
            domain="travel_logistics",
            attributes={
                "pass_elevation_m": 5360,
                "sleep_elevation_m": 4350,
                "min_vehicle_clearance_mm": 185,
                "monsoon_landslide_risk": "HIGH on Manali-Leh approach, LOW in Sham Valley rain-shadow",
            },
            aliases=["pangong lake", "chang la", "ladakh"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="inv:ams_altitude_safety",
            entity_type="SafetyThreshold",
            label="AMS Acute Mountain Sickness Acclimatization Rule (>3,000m)",
            domain="travel_logistics",
            attributes={
                "rule_type": "ams_altitude_ceiling",
                "max_unacclimatized_meters": 3000,
                "mandatory_rest_hours_at_3500m": 48,
                "remediation": "Require 48h acclimatization at <=3,500m (Leh / Sham Valley 3,100m) before sleeping at Pangong (4,350m).",
            },
            aliases=["ams", "altitude", "acclimatization"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )
    graph.upsert_node(
        KnowledgeGraphNode(
            node_id="inv:group_budget_22k",
            entity_type="BudgetCeiling",
            label="Group Land Budget Ceiling ₹22,000 (4 Pax)",
            domain="travel_logistics",
            attributes={
                "rule_type": "budget_ceiling_inr",
                "max_budget_inr": 22000,
                "estimated_route_min_inr": 32000,
                "remediation": "Private SUV to Pangong + Manali costs ₹32,000 alone; pivot to shared tempo + Sham Valley homestay split inside ₹22,000.",
            },
            aliases=["₹22,000", "22k"],
            created_at=t0,
            last_accessed=t0,
            pinned=True,
        )
    )

    # Link Travel Logistics Edges
    graph.add_edge(
        KnowledgeGraphEdge(
            "traveler:group_mumbai_4pax",
            "route:leh_pangong_changla",
            "REQUESTS_CORRIDOR",
            pinned=True,
        )
    )
    graph.add_edge(
        KnowledgeGraphEdge(
            "route:leh_pangong_changla",
            "inv:ams_altitude_safety",
            "GOVERNED_BY_SAFETY_RULE",
            pinned=True,
        )
    )
    graph.add_edge(
        KnowledgeGraphEdge(
            "traveler:group_mumbai_4pax",
            "inv:group_budget_22k",
            "HAS_BUDGET_CEILING",
            pinned=True,
        )
    )


# ==============================================================================
# 5. EXECUTABLE SELF-TEST SUITE
# ==============================================================================

if __name__ == "__main__":
    print("=" * 78)
    print("CONCODE BRAIN — PILLAR 4: LIFELONG MEMORY GRAPH & GRAPHRAG SELF-TEST")
    print("=" * 78)

    t_start = 1_700_000_000.0
    graph_file = "datasets/concode_memory_graph.json"
    kg = ConCodeKnowledgeGraph(storage_path=graph_file)

    # 1. Seed Entities (DB Schema + Security Invariants + Travel Constraints)
    seed_concode_lifelong_memory(kg, t0=t_start)
    kg.save()
    assert os.path.exists(graph_file), "Memory graph JSON was not persisted!"

    # Reload from disk to verify serialization integrity
    reloaded_kg = ConCodeKnowledgeGraph(storage_path=graph_file)
    assert reloaded_kg.load() is True
    print(
        f"[1] Loaded {len(reloaded_kg.nodes)} nodes and {len(reloaded_kg.edges)} edges from {graph_file}"
    )

    # 2. Verify Temporal Exponential Decay vs. Sticky Invariant Pinning
    t_future = t_start + 120.0  # 120 seconds later
    pinned_weight = reloaded_kg.nodes["inv:cwe_639_tenant_scope"].current_weight(t_future)
    unpinned_weight = reloaded_kg.nodes["ephemeral:staging_log_note_42"].current_weight(
        t_future
    )
    print(
        f"[2] Temporal Decay Check @ +120s -> Pinned Invariant w(t)={pinned_weight:.4f}, "
        f"Unpinned Note w(t)={unpinned_weight:.6f}"
    )
    assert pinned_weight == 1.0, "Pinned security invariant must never decay!"
    assert unpinned_weight < 0.01, "Unpinned episodic note failed exponential decay!"

    evicted_count = reloaded_kg.prune_decayed_memories(
        min_weight_threshold=0.15, now=t_future
    )
    print(f"    Pruned {evicted_count} decayed episodic node(s); all pinned invariants preserved.")
    assert evicted_count == 1
    assert "inv:cwe_639_tenant_scope" in reloaded_kg.nodes

    # 3. Test 2-Hop GraphRAG Retrieval & Conflict Detection on System Architecture Prompt
    rag = GraphRAGEngine(reloaded_kg)
    dev_prompt = (
        "Checking Date.now() < leaseExpiry and running "
        "db.payout.update({ where: { id: body.payoutId } }) in our fintech service"
    )
    sys_result = rag.retrieve_k_hop_subgraph(dev_prompt, k_hops=2, now=t_future)
    print(
        f"\n[3] System Prompt 2-Hop Retrieval -> Found {len(sys_result.subgraph_nodes)} nodes, "
        f"{len(sys_result.conflicts)} critical invariant conflict(s):"
    )
    for conflict in sys_result.conflicts:
        print(f"    * {conflict.cwe_or_hazard_code}: {conflict.description}")

    assert len(sys_result.conflicts) == 2, "Expected both CWE-639 IDOR and Split-Brain conflicts!"

    # 4. Test 2-Hop GraphRAG Retrieval & Conflict Detection on Travel Hazard Prompt
    travel_prompt = (
        "4 friends flying from Mumbai to Leh and driving straight to Pangong Lake (4,350m) "
        "on Day 1 afternoon within ₹22,000 total budget"
    )
    travel_result = rag.retrieve_k_hop_subgraph(travel_prompt, k_hops=2, now=t_future)
    print(
        f"\n[4] Travel Prompt 2-Hop Retrieval -> Found {len(travel_result.subgraph_nodes)} nodes, "
        f"{len(travel_result.conflicts)} critical safety/budget conflict(s):"
    )
    for conflict in travel_result.conflicts:
        print(f"    * {conflict.cwe_or_hazard_code}: {conflict.description}")

    assert (
        len(travel_result.conflicts) == 2
    ), "Expected both AMS Altitude Safety and Budget Overflow conflicts!"

    print("\n[5] Generated <concode_think> GraphRAG Injection Block Preview:\n")
    print(travel_result.formatted_think_context)

    print("\n" + "=" * 78)
    print("PILLAR 4 LIFELONG MEMORY GRAPH & GRAPHRAG SELF-TEST PASSED SUCCESSFULLY.")
    print("=" * 78)
