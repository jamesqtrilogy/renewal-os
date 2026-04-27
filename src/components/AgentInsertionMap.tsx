import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentType = "orchestration" | "execution" | "intelligence" | "compliance" | "escalation";

interface Agent {
  title: string;
  type: AgentType;
  milestone: string;
  owner: string;
  what: string;
  capabilities: string[];
  impact: string[];
}

interface Phase {
  label: string;
  range: string;
  agents: Agent[];
}

interface Gate {
  time: string;
  label: string;
}

type GateDetailView = "gate1" | "gate2";

// ─── Design tokens ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<AgentType, {
  dot: string; bg: string; border: string; text: string; label: string;
}> = {
  orchestration: { dot: "#6B5CE7", bg: "#F0EFFE", border: "#C5BFF7", text: "#3D2FB3", label: "Orchestration" },
  execution:     { dot: "#16A05A", bg: "#E8F8EF", border: "#A8DFBC", text: "#0D6B3A", label: "Execution"     },
  intelligence:  { dot: "#D07400", bg: "#FEF5E6", border: "#F5CC80", text: "#8A4C00", label: "Intelligence"  },
  compliance:    { dot: "#E03A2A", bg: "#FEF0EE", border: "#F5B8B2", text: "#9A1A0F", label: "Compliance"    },
  escalation:    { dot: "#C0306A", bg: "#FEF0F5", border: "#F2B3CC", text: "#8A1848", label: "Escalation"    },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const GATES: Gate[] = [
  { time: "T-140", label: "Gate 1" },
  { time: "T-90",  label: "Gate 2" },
  { time: "T-30",  label: "Gate 3" },
  { time: "T-0",   label: "Gate 4" },
];

const PHASES: Phase[] = [
  {
    label: "Phase 1 — Preparation",
    range: "T-220 → T-180",
    agents: [
      {
        title: "Renewal intake orchestrator",
        type: "orchestration",
        milestone: "T-220",
        owner: "System",
        what: "Monitors the CRM pipeline daily. When a subscription enters the T-220 window it auto-creates the renewal opportunity, validates contract data, flags missing fields, and assigns the SDR owner.",
        capabilities: [
          "CRM read/write — create opp, populate fields, set stage to Pending",
          "Contract data validation — cross-check subscription end date, ARR, product SKUs",
          "Missing-data alerts pushed to Slack/email with a task link",
          "HVO flag logic — compares ARR threshold, segment, and strategic tag",
        ],
        impact: ["GRR", "Forecast accuracy", "Zero missed starts"],
      },
      {
        title: "Contract risk scanner",
        type: "intelligence",
        milestone: "T-200",
        owner: "Sales Ops",
        what: "Reads the prior contract, order form, and billing history. Detects auto-renewal clause presence, notice-period deadlines, short-term co-term risk, and pricing anomalies. Outputs a risk brief for the ERM before first outreach.",
        capabilities: [
          "PDF/contract parsing — extract AR clause, notice date, pricing terms",
          "Billing ledger analysis — flag inconsistencies vs contracted ARR",
          "Risk classification: Green / Amber / Red based on signals",
          "Brief auto-generated and attached to the Salesforce opp",
        ],
        impact: ["NNR decision quality", "Pricing discipline", "Early churn detection"],
      },
      {
        title: "Contact verification agent",
        type: "execution",
        milestone: "T-180",
        owner: "SDR",
        what: "Validates all renewal contacts against LinkedIn, CRM activity, and email bounce records. Identifies primary contact, economic buyer, and legal signer. Flags stale contacts and finds alternates using enrichment APIs.",
        capabilities: [
          "Contact enrichment via LinkedIn / ZoomInfo API integration",
          "Bounce and open-rate analysis from prior email sequences",
          "Alternate contact suggestion with confidence scoring",
          "SDR task auto-created for each unverified contact",
        ],
        impact: ["Gate 1 pass rate", "Engagement quality", "On-time renewal rate"],
      },
    ],
  },
  {
    label: "Phase 2 — Engagement",
    range: "T-140 → T-100",
    agents: [
      {
        title: "Outbound sequence agent",
        type: "execution",
        milestone: "T-140",
        owner: "SDR",
        what: "Launches the BU-branded 8-email outbound sequence over 40 days. Personalises each email using account usage data, prior engagement signals, and renewal risk profile. Manages send cadence, open tracking, and reply detection.",
        capabilities: [
          "Dynamic email personalisation using usage telemetry and CRM history",
          "Sequence branching — reply stops sequence, silence escalates at day 7 and 14",
          "Open/click signal ingestion — surfaces warm signals to SDR in real time",
          "Multi-contact threading — CC economic buyer after 2 non-replies",
        ],
        impact: ["Gate 1 pass rate", "Customer experience", "Pipeline visibility"],
      },
      {
        title: "Gate 1 enforcement agent",
        type: "compliance",
        milestone: "T-140",
        owner: "System",
        what: "Binary gate check at T-140. Evaluates whether primary contact is confirmed in the CRM portal. On failure, immediately triggers the escalation sequence (SDR → ERM → VP) with a time-stamped audit record. Blocks stage advancement until gate passes.",
        capabilities: [
          "CRM stage lock — prevents manual stage move without gate pass",
          "Escalation chain auto-notification with deal context packet",
          "Audit log entry with timestamp, failure reason, and owner chain",
          "Recovery task created with 48-hour SLA on the escalated owner",
        ],
        impact: ["Gate compliance", "Forecast accuracy", "Process integrity"],
      },
      {
        title: "Engagement health monitor",
        type: "intelligence",
        milestone: "T-110",
        owner: "ERM",
        what: "Continuously scores account engagement across email opens, portal logins, meeting attendance, and support ticket sentiment. Surfaces declining health signals 30 days before Gate 2 so the ERM can intervene.",
        capabilities: [
          "Multi-signal health scoring: email, portal, product usage, support",
          "Sentiment analysis on recent support tickets and call transcripts",
          "Trend detection — declining engagement triggers amber/red flag",
          "Weekly digest pushed to ERM with recommended intervention play",
        ],
        impact: ["Churn prevention", "NRR", "ERM decision quality"],
      },
    ],
  },
  {
    label: "Phase 3 — Commercial",
    range: "T-90 → T-60",
    agents: [
      {
        title: "Auto-quote generation agent",
        type: "execution",
        milestone: "T-90",
        owner: "SDR / Sales Ops",
        what: "At T-90, generates the renewal quote automatically from the contracted SKUs, applies the mandatory uplift structure, and publishes it to the customer portal. Validates against account-level pricing floor before any quote is sent.",
        capabilities: [
          "CPQ integration — auto-populate quote from CRM opp fields",
          "Account-level pricing floor enforcement — blocks sub-floor quotes",
          "Multi-year option generation with TCO comparison for ERM use",
          "Portal publish with explainer video link and PO instructions embedded",
        ],
        impact: ["Pricing discipline", "Gate 2 pass rate", "Discount leakage prevention"],
      },
      {
        title: "Gate 2 enforcement agent",
        type: "compliance",
        milestone: "T-90",
        owner: "System",
        what: "Binary gate check at T-90. Confirms quote is generated, published to portal, and customer-visible. Validates account-level pricing floor compliance. On failure, escalates to VP and triggers a 48-hour recovery window before compliance flag.",
        capabilities: [
          "Quote status verification via CPQ and portal API",
          "Account-level pricing floor validation — rejects any sub-floor quote configuration",
          "VP notification with deal packet and recommended action",
          "Compliance flag issued if gate unresolved after 48 hours",
        ],
        impact: ["On-time renewal rate", "Pricing integrity", "Forecast accuracy"],
      },
      {
        title: "Negotiation intelligence agent",
        type: "intelligence",
        milestone: "T-75",
        owner: "ERM",
        what: "During the negotiation window (T-90 to T-30), analyses customer objections, benchmarks discount requests against policy, and surfaces comparable deal outcomes. Feeds the ERM with talking points and pre-approved concession levers.",
        capabilities: [
          "Objection pattern classification from email/call transcript analysis",
          "Discount request benchmarking against policy floor and peer deals",
          "Suggested concession levers — multi-year, feature add, payment terms",
          "Legal escalation trigger if NNR-related language detected in customer comms",
        ],
        impact: ["NRR", "Pricing discipline", "ERM effectiveness"],
      },
      {
        title: "Silence escalation agent",
        type: "escalation",
        milestone: "T-60",
        owner: "System",
        what: "Enforces the no-silent-deals principle. At 7 days of no customer response post-quote, triggers a structured escalation: ISR follow-up, then ERM warm call, then VP executive outreach within a defined SLA.",
        capabilities: [
          "Response silence detection across email, portal, and phone channels",
          "Time-gated escalation ladder with owner-specific task creation",
          "Executive outreach template generation with deal context pre-filled",
          "Audit trail of all escalation steps for compliance review",
        ],
        impact: ["Gate 3 pass rate", "Churn prevention", "Forecast accuracy"],
      },
    ],
  },
  {
    label: "Phase 4 — Finalization",
    range: "T-30 → T-0",
    agents: [
      {
        title: "Contract execution agent",
        type: "execution",
        milestone: "T-30",
        owner: "Legal / Sales Ops",
        what: "At T-30 the negotiation window closes. Manages the final contract execution workflow: routes the signed quote for countersignature, initiates e-sign via DocuSign/Adobe Sign, tracks signature status, and triggers invoicing upon completion.",
        capabilities: [
          "E-sign workflow initiation with all required parties auto-populated",
          "Signature status polling — alerts owner if not signed within 48 hours",
          "AR clause and legal notice compliance verification before send",
          "Invoice trigger upon countersignature — zero manual handoff",
        ],
        impact: ["On-time renewal rate", "Gate 4 compliance", "Cash collection speed"],
      },
      {
        title: "Gate 3 & 4 compliance agent",
        type: "compliance",
        milestone: "T-30 / T-0",
        owner: "System / VP",
        what: "Dual-gate enforcement at T-30 (Finalizing) and T-0 (Closed). Gate 3 failure triggers systemic process review flag. Gate 4 failure is a compliance violation — triggers SVP review, root cause analysis requirement, and deal placed on watch list.",
        capabilities: [
          "Binary gate evaluation with zero manual override without VP approval",
          "Gate 3 failure: systemic flag, deal review scheduled within 24 hours",
          "Gate 4 failure: compliance violation record, SVP notification, RCA template auto-sent",
          "Dashboard metric update in real time — gate adherence KPI tracked",
        ],
        impact: ["Zero compliance violations", "Process integrity", "Executive visibility"],
      },
      {
        title: "Forecast accuracy agent",
        type: "intelligence",
        milestone: "T-10",
        owner: "Sales Ops",
        what: "Maintains the rolling renewal forecast with AI-adjusted confidence scores. Compares predicted vs actual close rates by segment, rep, and gate compliance history. Flags deals whose probability has diverged from their stage-based expected value.",
        capabilities: [
          "Stage-weighted probability scoring with gate compliance as a modifier",
          "Historical close rate comparison by segment and rep",
          "Divergence alert when deal behavior contradicts stage probability",
          "Weekly forecast call briefing auto-generated with variance analysis",
        ],
        impact: ["Forecast accuracy", "GRR/NRR visibility", "Exec decision quality"],
      },
      {
        title: "Post-close expansion orchestrator",
        type: "orchestration",
        milestone: "T+1",
        owner: "ERM",
        what: "Immediately after close, evaluates expansion signals (usage headroom, upsell SKU fit, multi-year conversion opportunity) and creates a structured expansion play for the ERM. Seeds the next renewal cycle at T-220 for the new contract term.",
        capabilities: [
          "Usage telemetry analysis for upsell and cross-sell fit scoring",
          "Expansion play template generated with evidence-backed talking points",
          "Next renewal cycle auto-seeded in CRM from new contract end date",
          "Win/loss and NPS data ingestion to inform next-cycle strategy",
        ],
        impact: ["NRR via expansion", "Cycle continuity", "Customer lifetime value"],
      },
    ],
  },
];


// ─── Gate → phase mapping ────────────────────────────────────────────────────
// Each gate is anchored to the phase it controls
const GATE_PHASE: Record<string, number> = {
  "Gate 1": 1,  // T-140 → Phase 2 Engagement
  "Gate 2": 2,  // T-90  → Phase 3 Commercial
  "Gate 3": 3,  // T-30  → Phase 4 Finalization
  "Gate 4": 3,  // T-0   → Phase 4 Finalization
};

const GATE_BANNER: Record<string, { color: string; bg: string; border: string; text: string }> = {
  "Gate 1": { color: "#3D2FB3", bg: "#F0EFFE", border: "#C5BFF7", text: "T-140 · Customer engagement gate — primary contact must be confirmed with a qualifying signal." },
  "Gate 2": { color: "#8A4C00", bg: "#FEF5E6", border: "#F5CC80", text: "T-90 · Quote sent gate — quote generated, account-level pricing floor met, portal published." },
  "Gate 3": { color: "#9A1A0F", bg: "#FEF0EE", border: "#F5B8B2", text: "T-30 · Finalizing gate — signed agreement or active e-sign required. Negotiation window hard-closes." },
  "Gate 4": { color: "#4A1B0C", bg: "#FAECE7", border: "#F5B8B2", text: "T-0 · Closed gate — countersigned contract, invoice sent, Closed Won in CRM. Failure = compliance violation." },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: AgentType }) {
  const c = TYPE_CONFIG[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      lineHeight: 1, whiteSpace: "nowrap" as const,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

function GateChip({ gate, active, onClick }: { gate: Gate; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} title={`Click to highlight ${gate.label} phase`} style={{
      flex: 1, borderRadius: 8, padding: "10px 12px", textAlign: "center" as const,
      cursor: "pointer", transition: "all 0.15s",
      background: active ? "#F0EFFE" : "#FFFFFF",
      border: `1px solid ${active ? "#C5BFF7" : "#E2E8F0"}`,
      boxShadow: active ? "0 0 0 2px #6B5CE722" : "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: active ? "#4A3CC7" : "#94A3B8", marginBottom: 2 }}>
        {gate.time}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: active ? "#3D2FB3" : "#334155" }}>
        {gate.label}
      </div>
      {active && (
        <div style={{ fontSize: 10, color: "#6B5CE7", marginTop: 3 }}>▼ see phase below</div>
      )}
    </div>
  );
}

function DetailPanel({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const c = TYPE_CONFIG[agent.type];
  return (
    <div style={{
      background: "#FFFFFF",
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: "18px 20px",
      marginTop: 6,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      animation: "fadeSlide 0.15s ease",
    }}>
      <style>{`@keyframes fadeSlide{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
          <TypeBadge type={agent.type} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A202C", lineHeight: 1.3 }}>{agent.title}</div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 16, color: "#94A3B8", padding: "0 2px", lineHeight: 1, flexShrink: 0,
        }}>✕</button>
      </div>

      <div style={{ borderTop: "1px solid #F0F4F8", paddingTop: 12, marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#94A3B8",
          letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6,
        }}>What this agent does</div>
        <p style={{ fontSize: 13, color: "#4A5568", lineHeight: 1.65, margin: 0 }}>{agent.what}</p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#94A3B8",
          letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8,
        }}>Capability stack</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
          {agent.capabilities.map((cap, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: c.dot, flexShrink: 0, marginTop: 5,
              }} />
              <span style={{ fontSize: 13, color: "#4A5568", lineHeight: 1.55 }}>{cap}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#94A3B8",
          letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8,
        }}>KPI impact</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          {agent.impact.map((kpi) => (
            <span key={kpi} style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            }}>{kpi}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentInsertionMap({ onNavigate }: { onNavigate?: (view: GateDetailView) => void } = {}) {
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleAgentClick = (key: string) => {
    setSelectedKey(selectedKey === key ? null : key);
  };

  const handleGateClick = (label: string) => {
    const next = selectedGate === label ? null : label;
    setSelectedGate(next);
    setSelectedKey(null);
    if (next) {
      const targetPhase = GATE_PHASE[next];
      setTimeout(() => {
        const el = document.getElementById(`phase-${targetPhase}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <div style={{
      background: "#F7F8FA", minHeight: "100vh", padding: "24px 20px",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* Header */}
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A202C", marginBottom: 4 }}>
        AI agent insertion map — renewal lifecycle
      </h1>
      <p style={{ fontSize: 13, color: "#718096", marginBottom: 20 }}>
        Select any node to see the agent design, capability stack, and expected impact. Gates are hard control points.
      </p>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px 20px", marginBottom: 20 }}>
        {(Object.entries(TYPE_CONFIG) as [AgentType, typeof TYPE_CONFIG[AgentType]][]).map(([type, cfg]) => (
          <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
            {cfg.label} agent
          </span>
        ))}
      </div>

      {/* Gate chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {GATES.map((gate) => (
          <GateChip
            key={gate.label}
            gate={gate}
            active={selectedGate === gate.label}
            onClick={() => handleGateClick(gate.label)}
          />
        ))}
      </div>

      {/* Gate banner */}
      {selectedGate && GATE_BANNER[selectedGate] && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: GATE_BANNER[selectedGate].bg,
          border: `1px solid ${GATE_BANNER[selectedGate].border}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: GATE_BANNER[selectedGate].border,
            color: GATE_BANNER[selectedGate].color,
            whiteSpace: "nowrap" as const,
          }}>{selectedGate}</span>
          <span style={{ fontSize: 12, color: GATE_BANNER[selectedGate].color, lineHeight: 1.5 }}>
            {GATE_BANNER[selectedGate].text}
          </span>
          {onNavigate && (selectedGate === "Gate 1" || selectedGate === "Gate 2") && (
            <button onClick={() => onNavigate(selectedGate === "Gate 1" ? "gate1" : "gate2")} style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "4px 12px",
              borderRadius: 20, border: `1px solid ${GATE_BANNER[selectedGate].border}`,
              background: "white", color: GATE_BANNER[selectedGate].color,
              cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0,
              fontFamily: "inherit",
            }}>
              View enforcement logic →
            </button>
          )}
        </div>
      )}

      {/* Phase blocks */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
        {PHASES.map((phase, phaseIdx) => {
          const isGatePhase = selectedGate ? GATE_PHASE[selectedGate] === phaseIdx : false;
          const isDimmed = selectedGate ? !isGatePhase : false;
          return (
            <div
              key={phase.label}
              id={`phase-${phaseIdx}`}
              style={{ opacity: isDimmed ? 0.25 : 1, transition: "opacity 0.2s" }}
            >
              {/* Phase label */}
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: isGatePhase ? "#3D2FB3" : "#64748B",
                letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 10,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {phase.label}{" "}
                <span style={{ fontWeight: 500, color: isGatePhase ? "#6B5CE7" : "#94A3B8" }}>
                  ({phase.range})
                </span>
                {isGatePhase && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                    background: "#F0EFFE", border: "1px solid #C5BFF7", color: "#3D2FB3",
                  }}>{selectedGate} phase</span>
                )}
              </div>

              {/* Cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${phase.agents.length}, 1fr)`,
                gap: 8,
              }}>
                {phase.agents.map((agent, agentIdx) => {
                  const key = `${phaseIdx}-${agentIdx}`;
                  const isSelected = selectedKey === key;
                  const c = TYPE_CONFIG[agent.type];
                  return (
                    <div key={key} style={{ display: "flex", flexDirection: "column" as const }}>
                      <div
                        onClick={() => handleAgentClick(key)}
                        style={{
                          background: "#FFFFFF",
                          border: `1px solid ${isSelected ? c.border : "#E2E8F0"}`,
                          borderRadius: isSelected ? "10px 10px 0 0" : 10,
                          padding: "14px 16px",
                          cursor: "pointer",
                          transition: "box-shadow 0.15s, border-color 0.15s",
                          boxShadow: isSelected ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                          display: "flex",
                          flexDirection: "column" as const,
                          gap: 8,
                        }}
                      >
                        <TypeBadge type={agent.type} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1A202C", lineHeight: 1.35 }}>
                          {agent.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#718096" }}>
                          {agent.milestone} · {agent.owner}
                        </div>
                      </div>
                      {isSelected && (
                        <DetailPanel agent={agent} onClose={() => setSelectedKey(null)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
