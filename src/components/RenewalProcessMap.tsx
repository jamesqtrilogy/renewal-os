import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentType = "orchestration" | "execution" | "intelligence" | "compliance" | "escalation";
type Role = "All roles" | "SDR" | "ERM" | "ISR" | "Sales Ops" | "Legal" | "VP / SVP" | "System";
type ViewMode = "agents" | "roles";

interface Agent {
  title: string;
  type: AgentType;
  milestone: string;
  owner: string;
}

interface Task {
  text: string;
  milestone: string;
  primary: boolean;
}

interface RoleRow {
  role: Role;
  roleFullName: string;
  motionTag?: string;
  tasks: Task[];
}

interface Phase {
  label: string;
  shortLabel: string;
  range: string;
  agents: Agent[];
  rows: RoleRow[];
}

interface Gate {
  time: string;
  label: string;
}

type GateDetailView = "gate1" | "gate2";

// ─── Design tokens ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<AgentType, { dot: string; bg: string; border: string; text: string; label: string }> = {
  orchestration: { dot: "#6B5CE7", bg: "#F0EFFE", border: "#C5BFF7", text: "#3D2FB3", label: "Orchestration" },
  execution:     { dot: "#16A05A", bg: "#E8F8EF", border: "#A8DFBC", text: "#0D6B3A", label: "Execution"     },
  intelligence:  { dot: "#D07400", bg: "#FEF5E6", border: "#F5CC80", text: "#8A4C00", label: "Intelligence"  },
  compliance:    { dot: "#E03A2A", bg: "#FEF0EE", border: "#F5B8B2", text: "#9A1A0F", label: "Compliance"    },
  escalation:    { dot: "#C0306A", bg: "#FEF0F5", border: "#F2B3CC", text: "#8A1848", label: "Escalation"    },
};

const ROLE_CONFIG: Record<string, { bg: string; border: string; text: string; dotBg: string }> = {
  "SDR":       { bg: "#F0EFFE", border: "#C5BFF7", text: "#3D2FB3", dotBg: "#6B5CE7" },
  "ERM":       { bg: "#E8F8EF", border: "#A8DFBC", text: "#0D6B3A", dotBg: "#16A05A" },
  "ISR":       { bg: "#E0F7FA", border: "#80DEEA", text: "#006064", dotBg: "#00838F" },
  "Sales Ops": { bg: "#FEF5E6", border: "#F5CC80", text: "#8A4C00", dotBg: "#D07400" },
  "Legal":     { bg: "#FEF0EE", border: "#F5B8B2", text: "#9A1A0F", dotBg: "#E03A2A" },
  "VP / SVP":  { bg: "#FEF0F5", border: "#F2B3CC", text: "#8A1848", dotBg: "#C0306A" },
  "System":    { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155", dotBg: "#64748B" },
};

const ROLES: Role[] = ["All roles", "SDR", "ERM", "ISR", "Sales Ops", "Legal", "VP / SVP", "System"];


// ─── Gate → phase index mapping ──────────────────────────────────────────────
const GATE_PHASE: Record<string, number> = {
  "Gate 1": 1,
  "Gate 2": 2,
  "Gate 3": 3,
  "Gate 4": 3,
};

const GATE_BANNER: Record<string, { color: string; bg: string; border: string; text: string }> = {
  "Gate 1": { color: "#3D2FB3", bg: "#F0EFFE", border: "#C5BFF7", text: "T-140 · Customer engagement — primary contact confirmed + qualifying signal required." },
  "Gate 2": { color: "#8A4C00", bg: "#FEF5E6", border: "#F5CC80", text: "T-90 · Quote sent — quote generated, account-level pricing floor met, portal published." },
  "Gate 3": { color: "#9A1A0F", bg: "#FEF0EE", border: "#F5B8B2", text: "T-30 · Finalizing — signed agreement or active e-sign in process. Negotiation window hard-closes." },
  "Gate 4": { color: "#4A1B0C", bg: "#FAECE7", border: "#F5B8B2", text: "T-0 · Closed — countersigned contract, invoice sent, Closed Won in CRM. Any failure = compliance violation." },
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
    shortLabel: "PHASE 1 — PREPARATION",
    range: "T-220 → T-180",
    agents: [
      { title: "Renewal intake orchestrator",  type: "orchestration", milestone: "T-220", owner: "System"    },
      { title: "Contract risk scanner",        type: "intelligence",  milestone: "T-200", owner: "Sales Ops" },
      { title: "Contact verification agent",   type: "execution",     milestone: "T-180", owner: "SDR"       },
    ],
    rows: [
      {
        role: "SDR", roleFullName: "Sales Dev Rep",
        tasks: [
          { text: "Own the renewal opportunity from T-220 assignment", milestone: "T-220", primary: true  },
          { text: "Confirm prior subscription documents and locate missing data", milestone: "T-200", primary: false },
          { text: "Verify and clean all renewal contact records in CRM", milestone: "T-180", primary: false },
          { text: "Flag HVO accounts for ERM warm handover; non-HVO accounts route to ISR", milestone: "T-180", primary: false },
        ],
      },
      {
        role: "ISR", roleFullName: "Inside Sales Rep", motionTag: "Non-HVO",
        tasks: [
          { text: "Accept non-HVO renewal assignments routed by SDR at T-180", milestone: "T-180", primary: true  },
          { text: "Review contract risk scanner output for assigned non-HVO accounts", milestone: "T-180", primary: false },
          { text: "Verify contact records and confirm portal access for non-HVO accounts", milestone: "T-180", primary: false },
        ],
      },
      {
        role: "Sales Ops", roleFullName: "Sales Operations",
        tasks: [
          { text: "Configure renewal automation rules and stage triggers in CRM", milestone: "T-220", primary: true  },
          { text: "Validate contract data against billing system", milestone: "T-200", primary: false },
          { text: "Review AI contract risk scanner output and brief ERM", milestone: "T-200", primary: false },
        ],
      },
      {
        role: "Legal", roleFullName: "Legal / Compliance",
        tasks: [
          { text: "Complete HVO legal review of auto-renewal clause and notice terms", milestone: "T-200", primary: true },
          { text: "Flag non-standard contract terms requiring escalation", milestone: "T-180", primary: false },
        ],
      },
    ],
  },
  {
    label: "Phase 2 — Engagement",
    shortLabel: "PHASE 2 — ENGAGEMENT",
    range: "T-140 → T-100",
    agents: [
      { title: "Outbound sequence agent",    type: "execution",  milestone: "T-140", owner: "SDR"    },
      { title: "Gate 1 enforcement agent",   type: "compliance", milestone: "T-140", owner: "System" },
      { title: "Engagement health monitor",  type: "intelligence", milestone: "T-110", owner: "ERM"  },
    ],
    rows: [
      {
        role: "SDR", roleFullName: "Sales Dev Rep",
        tasks: [
          { text: "Launch 8-email BU-branded outbound sequence", milestone: "T-140", primary: true  },
          { text: "Confirm primary contact via email, call or portal — required for Gate 1", milestone: "T-140", primary: true  },
          { text: "Execute escalation sequences on non-response at day 7 and day 14", milestone: "T-126", primary: false },
          { text: "Log all outreach attempts with timestamps in CRM", milestone: "Ongoing", primary: false },
        ],
      },
      {
        role: "ERM", roleFullName: "Enterprise Renewal Mgr", motionTag: "HVO",
        tasks: [
          { text: "Conduct warm intro call for all HVO accounts before T-140", milestone: "T-145", primary: true  },
          { text: "Review weekly engagement health digest from monitoring agent", milestone: "Ongoing", primary: false },
          { text: "Take ownership of escalated HVO accounts where SDR has failed to engage", milestone: "T-126", primary: false },
          { text: "Begin building HVO renewal plan and expansion opportunity assessment", milestone: "T-110", primary: false },
        ],
      },
      {
        role: "ISR", roleFullName: "Inside Sales Rep", motionTag: "Non-HVO",
        tasks: [
          { text: "Own Gate 1 engagement for all non-HVO accounts — primary contact confirmation", milestone: "T-140", primary: true  },
          { text: "Execute outbound sequence for non-HVO accounts with personalised follow-up", milestone: "T-140", primary: false },
          { text: "Escalate non-HVO accounts with zero engagement at day 14 to ERM for review", milestone: "T-126", primary: false },
          { text: "Begin non-HVO renewal plan and flag upsell signals to Sales Ops", milestone: "T-110", primary: false },
        ],
      },
      {
        role: "VP / SVP", roleFullName: "VP / SVP",
        tasks: [
          { text: "Receive Gate 1 failure escalation at hour 48 — take executive action", milestone: "T-138", primary: true  },
          { text: "Review weekly pipeline health report with forecast risk flags", milestone: "Ongoing", primary: false },
        ],
      },
      {
        role: "System", roleFullName: "AI / Automation",
        tasks: [
          { text: "Gate 1 enforcement: block stage advance until contact confirmed", milestone: "T-140", primary: true  },
          { text: "Continuous engagement health scoring across all signals", milestone: "Ongoing", primary: false },
          { text: "Auto-escalate at day 7 silence — create owner-specific tasks", milestone: "T-133", primary: false },
        ],
      },
    ],
  },
  {
    label: "Phase 3 — Commercial",
    shortLabel: "PHASE 3 — COMMERCIAL",
    range: "T-90 → T-60",
    agents: [
      { title: "Auto-quote generation agent",    type: "execution",    milestone: "T-90",  owner: "SDR / Sales Ops" },
      { title: "Gate 2 enforcement agent",       type: "compliance",   milestone: "T-90",  owner: "System"          },
      { title: "Negotiation intelligence agent", type: "intelligence", milestone: "T-75",  owner: "ERM / ISR"       },
      { title: "Silence escalation agent",       type: "escalation",   milestone: "T-60",  owner: "System"          },
    ],
    rows: [
      {
        role: "SDR", roleFullName: "Sales Dev Rep",
        tasks: [
          { text: "Trigger auto-quote generation or validate customer self-generated quote", milestone: "T-90", primary: true  },
          { text: "Ensure quote is published to customer portal — required for Gate 2", milestone: "T-90", primary: true  },
          { text: "Execute PO follow-up sequence if no PO received within 7 days", milestone: "T-83", primary: false },
          { text: "Log all quote-related customer communications in CRM", milestone: "Ongoing", primary: false },
        ],
      },
      {
        role: "ERM", roleFullName: "Enterprise Renewal Mgr", motionTag: "HVO",
        tasks: [
          { text: "Lead all HVO commercial negotiation within T-90 to T-30 window", milestone: "T-90", primary: true  },
          { text: "Apply negotiation intelligence agent recommendations to objection handling", milestone: "T-75", primary: false },
          { text: "Propose multi-year and expansion options alongside HVO base renewal", milestone: "T-75", primary: false },
          { text: "Obtain internal approval for any non-standard commercial terms", milestone: "T-60", primary: false },
        ],
      },
      {
        role: "ISR", roleFullName: "Inside Sales Rep", motionTag: "Non-HVO",
        tasks: [
          { text: "Manage non-HVO quote review and portal publication by T-90", milestone: "T-90", primary: true  },
          { text: "Handle non-HVO commercial objections using pre-approved concession levers only", milestone: "T-75", primary: false },
          { text: "Execute PO follow-up sequence for non-HVO accounts — no silent deals", milestone: "T-83", primary: false },
          { text: "Escalate any non-HVO pricing or scope exception to ERM for approval", milestone: "T-60", primary: false },
        ],
      },
      {
        role: "Sales Ops", roleFullName: "Sales Operations",
        tasks: [
          { text: "Validate account-level pricing floor compliance at quote generation", milestone: "T-90", primary: true  },
          { text: "Process exception approval requests within 24-hour SLA", milestone: "T-75", primary: false },
          { text: "Generate multi-year TCO comparison for ERM use", milestone: "T-85", primary: false },
          { text: "Update forecast model with quote-stage probability adjustments", milestone: "T-90", primary: false },
        ],
      },
      {
        role: "VP / SVP", roleFullName: "VP / SVP",
        tasks: [
          { text: "Receive Gate 2 failure escalation and take action within 24 hours", milestone: "T-88", primary: true  },
          { text: "Conduct executive-level customer call for strategic at-risk accounts", milestone: "T-70", primary: false },
        ],
      },
      {
        role: "System", roleFullName: "AI / Automation",
        tasks: [
          { text: "Gate 2 enforcement: validate quote exists, priced, portal-published", milestone: "T-90", primary: true  },
          { text: "Silence escalation trigger at 7-day non-response post-quote", milestone: "T-83", primary: false },
          { text: "Detect NNR language in customer comms — trigger Legal review", milestone: "Ongoing", primary: false },
        ],
      },
    ],
  },
  {
    label: "Phase 4 — Finalization",
    shortLabel: "PHASE 4 — FINALIZATION",
    range: "T-30 → T-0",
    agents: [
      { title: "Contract execution agent",          type: "execution",    milestone: "T-30",      owner: "Legal / Sales Ops" },
      { title: "Gate 3 & 4 compliance agent",       type: "compliance",   milestone: "T-30 / T-0",owner: "System / VP"       },
      { title: "Forecast accuracy agent",           type: "intelligence", milestone: "T-10",      owner: "Sales Ops"         },
      { title: "Post-close expansion orchestrator", type: "orchestration",milestone: "T+1",       owner: "ERM / ISR"         },
    ],
    rows: [
      {
        role: "SDR", roleFullName: "Sales Dev Rep",
        tasks: [
          { text: "Execute PO receipt follow-up sequence — 1 email every 3 days until received", milestone: "T-30", primary: true  },
          { text: "Confirm all documents complete before contract execution begins", milestone: "T-25", primary: false },
          { text: "Send invoice immediately upon countersignature", milestone: "T-0", primary: false },
        ],
      },
      {
        role: "ERM", roleFullName: "Enterprise Renewal Mgr", motionTag: "HVO",
        tasks: [
          { text: "Confirm all HVO commercial terms agreed — negotiation window hard-closes T-30", milestone: "T-30", primary: true  },
          { text: "Route HVO final agreement to Legal for contract execution", milestone: "T-28", primary: false },
          { text: "Manage HVO customer signature process — follow up every 48 hours", milestone: "T-20", primary: false },
          { text: "Brief post-close expansion play immediately after HVO Closed Won", milestone: "T+1", primary: false },
        ],
      },
      {
        role: "ISR", roleFullName: "Inside Sales Rep", motionTag: "Non-HVO",
        tasks: [
          { text: "Drive non-HVO contract to signature by T-30 — no open negotiation past this point", milestone: "T-30", primary: true  },
          { text: "Manage non-HVO e-sign workflow and chase countersignature within 48 hours", milestone: "T-25", primary: false },
          { text: "Confirm PO received and invoice sent for non-HVO accounts at close", milestone: "T-0", primary: false },
          { text: "Log non-HVO Closed Won in CRM and handoff expansion signals to Sales Ops", milestone: "T+1", primary: false },
        ],
      },
      {
        role: "Legal", roleFullName: "Legal / Compliance",
        tasks: [
          { text: "Execute contract review and countersignature within 48-hour SLA", milestone: "T-28", primary: true  },
          { text: "Verify AR clause and legal notice compliance before execution", milestone: "T-28", primary: false },
          { text: "Process NNR notice if account is being lost (Closed Lost path)", milestone: "T-30", primary: false },
          { text: "Archive executed contract in CRM and document management system", milestone: "T-0", primary: false },
        ],
      },
      {
        role: "Sales Ops", roleFullName: "Sales Operations",
        tasks: [
          { text: "Process Closed Won — update CRM, trigger billing system, confirm ARR recognition", milestone: "T-0", primary: true  },
          { text: "Update forecast model with final actuals vs projection", milestone: "T-0", primary: false },
          { text: "Seed next renewal cycle at T-220 from new contract end date", milestone: "T+1", primary: false },
        ],
      },
      {
        role: "VP / SVP", roleFullName: "VP / SVP",
        tasks: [
          { text: "Gate 3 failure: issue systemic flag and schedule deal review within 24 hours", milestone: "T-30", primary: true  },
          { text: "Gate 4 failure: compliance violation — SVP notification and RCA required", milestone: "T-0", primary: true  },
          { text: "Approve any extension request — written sign-off required", milestone: "T-10", primary: false },
        ],
      },
      {
        role: "System", roleFullName: "AI / Automation",
        tasks: [
          { text: "Gate 3 enforcement: block Closed Won entry without signed agreement", milestone: "T-30", primary: true  },
          { text: "Gate 4 enforcement: compliance violation record created at T-0 miss", milestone: "T-0", primary: true  },
          { text: "Auto-send invoice upon countersignature confirmation", milestone: "T-0", primary: false },
          { text: "Seed next renewal cycle from executed contract data", milestone: "T+1", primary: false },
        ],
      },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MilestoneTag({ label, role }: { label: string; role?: string }) {
  const rc = role && role !== "All roles" ? ROLE_CONFIG[role] : null;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 7px",
        borderRadius: 20,
        background: rc ? rc.bg : "#EEF2FF",
        border: `1px solid ${rc ? rc.border : "#C7D2FE"}`,
        color: rc ? rc.text : "#3730A3",
        marginLeft: 6,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: AgentType }) {
  const c = TYPE_CONFIG[type];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 20,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

function AgentCard({ agent, selected, onClick }: { agent: Agent; selected: boolean; onClick: () => void }) {
  const c = TYPE_CONFIG[agent.type];
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${selected ? c.border : "#E2E8F0"}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
        boxShadow: selected ? `0 0 0 2px ${c.dot}22` : "0 1px 3px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column" as const,
        gap: 8,
        minWidth: 0,
      }}
    >
      <TypeBadge type={agent.type} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1A202C", lineHeight: 1.35 }}>
        {agent.title}
      </div>
      <div style={{ fontSize: 12, color: "#718096" }}>
        {agent.milestone} · {agent.owner}
      </div>
    </div>
  );
}

function RoleFilterButton({
  role,
  active,
  onClick,
}: {
  role: Role;
  active: boolean;
  onClick: () => void;
}) {
  const rc = role === "All roles" ? null : ROLE_CONFIG[role];
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        padding: "6px 16px",
        borderRadius: 20,
        border: `1.5px solid ${active ? (rc ? rc.border : "#334155") : "#E2E8F0"}`,
        background: active ? (rc ? rc.bg : "#F1F5F9") : "#FFFFFF",
        color: active ? (rc ? rc.text : "#334155") : "#64748B",
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
        whiteSpace: "nowrap" as const,
        boxShadow: active ? `0 0 0 3px ${rc ? rc.dotBg + "18" : "#33415518"}` : "none",
      }}
    >
      {role}
    </button>
  );
}

function PhaseChip({ label, range }: { label: string; range: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          padding: "4px 11px",
          borderRadius: 20,
          background: "#EEF2FF",
          border: "1px solid #C7D2FE",
          color: "#3730A3",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#64748B" }}>{range}</span>
    </div>
  );
}

function GateChip({ gate, active, onClick }: { gate: Gate; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? "#F0EFFE" : "#FFFFFF",
        border: `1px solid ${active ? "#C5BFF7" : "#E2E8F0"}`,
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "center" as const,
        cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: active ? `0 0 0 2px #6B5CE722` : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: active ? "#4A3CC7" : "#94A3B8", marginBottom: 2 }}>
        {gate.time}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: active ? "#3D2FB3" : "#334155" }}>
        {gate.label}
      </div>
    </div>
  );
}

function SwimLaneRow({ row, activeRole }: { row: RoleRow; activeRole: Role }) {
  const rc = ROLE_CONFIG[row.role];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        borderRadius: 8,
        border: "1px solid #E2E8F0",
        overflow: "hidden",
        marginBottom: 6,
      }}
    >
      {/* Role label */}
      <div
        style={{
          background: rc.bg,
          borderRight: `1px solid ${rc.border}`,
          padding: "14px 14px",
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "center",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: rc.text }}>{row.role}</div>
        <div style={{ fontSize: 11, color: rc.text, opacity: 0.7 }}>{row.roleFullName}</div>
        {row.motionTag && (
          <span
            style={{
              display: "inline-block",
              marginTop: 4,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 20,
              background: row.motionTag === "HVO" ? "#DCFCE7" : "#DBEAFE",
              border: `1px solid ${row.motionTag === "HVO" ? "#86EFAC" : "#93C5FD"}`,
              color: row.motionTag === "HVO" ? "#166534" : "#1D4ED8",
              letterSpacing: "0.04em",
              alignSelf: "flex-start",
            }}
          >
            {row.motionTag}
          </span>
        )}
      </div>

      {/* Tasks */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column" as const,
          gap: 6,
        }}
      >
        {row.tasks.map((task, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: task.primary ? rc.dotBg : "#CBD5E1",
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            <span style={{ color: task.primary ? "#1A202C" : "#4A5568", fontWeight: task.primary ? 600 : 400 }}>
              {task.text}
              <MilestoneTag label={task.milestone} role={activeRole !== "All roles" ? activeRole : row.role} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RenewalProcessMap({ onNavigate }: { onNavigate?: (view: GateDetailView) => void } = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>("agents");
  const [activeRole, setActiveRole] = useState<Role>("All roles");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);

  const handleGateClick = (label: string) => {
    const next = selectedGate === label ? null : label;
    setSelectedGate(next);
    setSelectedAgent(null);
    if (next) {
      const phaseIdx = GATE_PHASE[next];
      setTimeout(() => {
        const el = document.getElementById(`rmap-phase-${phaseIdx}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  // Filter role rows
  const filteredPhases = PHASES.map((phase) => ({
    ...phase,
    rows: activeRole === "All roles"
      ? phase.rows
      : phase.rows.filter((r) => r.role === activeRole),
  })).filter((phase) => viewMode === "agents" || phase.rows.length > 0);

  return (
    <div
      style={{
        background: "#F7F8FA",
        minHeight: "100vh",
        padding: "24px 20px",
        fontFamily: "system-ui, -apple-system, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["agents", "roles"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 18px",
              borderRadius: 8,
              border: `1.5px solid ${viewMode === mode ? "#6B5CE7" : "#E2E8F0"}`,
              background: viewMode === mode ? "#F0EFFE" : "#FFFFFF",
              color: viewMode === mode ? "#3D2FB3" : "#64748B",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {mode === "agents" ? "Agent map" : "Role responsibilities"}
          </button>
        ))}
      </div>

      {/* ── AGENT MAP VIEW ── */}
      {viewMode === "agents" && (
        <>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", marginBottom: 20, alignItems: "center" }}>
            {(Object.entries(TYPE_CONFIG) as [AgentType, typeof TYPE_CONFIG[AgentType]][]).map(([type, cfg]) => (
              <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
                {cfg.label} agent
              </span>
            ))}
          </div>

          {/* Gate chips */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
                color: GATE_BANNER[selectedGate].color, whiteSpace: "nowrap",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PHASES.map((phase, phaseIdx) => {
              const isGatePhase = selectedGate ? GATE_PHASE[selectedGate] === phaseIdx : false;
              const isDimmed = selectedGate ? !isGatePhase : false;
              return (
              <div key={phase.label} id={`rmap-phase-${phaseIdx}`} style={{ opacity: isDimmed ? 0.25 : 1, transition: "opacity 0.2s" }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: isGatePhase ? "#3D2FB3" : "#64748B",
                  letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {phase.label}{" "}
                  <span style={{ fontWeight: 500, color: isGatePhase ? "#6B5CE7" : "#94A3B8" }}>({phase.range})</span>
                  {isGatePhase && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                      background: "#F0EFFE", border: "1px solid #C5BFF7", color: "#3D2FB3",
                    }}>{selectedGate}</span>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${phase.agents.length}, 1fr)`,
                    gap: 8,
                  }}
                >
                  {phase.agents.map((agent) => {
                    const key = `${phase.label}-${agent.title}`;
                    return (
                      <AgentCard
                        key={key}
                        agent={agent}
                        selected={selectedAgent === key}
                        onClick={() => setSelectedAgent(selectedAgent === key ? null : key)}
                      />
                    );
                  })}
                </div>
              </div>
            );
            })}
          </div>
        </>
      )}

      {/* ── ROLE RESPONSIBILITIES VIEW ── */}
      {viewMode === "roles" && (
        <>
          {/* Gate chips */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: GATE_BANNER[selectedGate].bg,
              border: `1px solid ${GATE_BANNER[selectedGate].border}`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: GATE_BANNER[selectedGate].border,
                color: GATE_BANNER[selectedGate].color, whiteSpace: "nowrap",
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

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500, marginRight: 4, whiteSpace: "nowrap" }}>
              Filter by role:
            </span>
            {ROLES.map((role) => (
              <RoleFilterButton
                key={role}
                role={role}
                active={activeRole === role}
                onClick={() => setActiveRole(role)}
              />
            ))}
          </div>

          {/* Phase swim lanes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {filteredPhases.map((phase) => {
              const phaseIdx = PHASES.indexOf(PHASES.find(p => p.label === phase.label)!);
              const isGatePhase = selectedGate ? GATE_PHASE[selectedGate] === phaseIdx : false;
              const isDimmed = selectedGate ? !isGatePhase : false;
              return (
              <div key={phase.label} id={`rmap-phase-${phaseIdx}`} style={{ opacity: isDimmed ? 0.25 : 1, transition: "opacity 0.2s" }}>
                <PhaseChip label={phase.shortLabel} range={phase.range} />
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
                  {phase.rows.map((row) => (
                    <SwimLaneRow key={row.role} row={row} activeRole={activeRole} />
                  ))}
                  {phase.rows.length === 0 && (
                    <div
                      style={{
                        padding: "20px 16px",
                        borderRadius: 8,
                        border: "1px dashed #E2E8F0",
                        background: "#FFFFFF",
                        color: "#94A3B8",
                        fontSize: 13,
                        textAlign: "center" as const,
                      }}
                    >
                      No tasks for selected role in this phase
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        </>
      )}
    </div>
  );
}
