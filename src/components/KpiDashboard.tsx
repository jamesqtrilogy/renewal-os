import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "core" | "gate" | "commercial" | "governance" | "health";

interface KpiRow {
  name: string;
  target: string;
  formula: string;
  owner: string;
  escalationAt: string;
}

interface GateKpiRow {
  gate: string;
  passKpi: string;
  failKpi: string;
  recoveryKpi: string;
  reviewTrigger: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CORE_STATS = [
  { label: "GRR target",         value: "≥95%",    sub: "Gross revenue retention",    color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "NRR target",         value: "≥108%",   sub: "Net revenue retention",      color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "On-time renewal",    value: "100%",    sub: "Gate 4 compliance rate",     color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Forecast accuracy",  value: "±3%",     sub: "vs rolling 90-day actuals",  color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Discount leakage",   value: "<1%",     sub: "Below-floor quote rate",     color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Avg cycle time",     value: "≤220d",   sub: "First outreach to close",    color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
];

const GATE_STATS = [
  { label: "Gate 1 pass rate", value: "≥90%",  sub: "Contact confirmed by T-140", color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Gate 2 pass rate", value: "≥95%",  sub: "Quote sent + floor by T-90", color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Gate 3 pass rate", value: "≥95%",  sub: "Signed / e-sign by T-30",   color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Gate 4 violations", value: "0",    sub: "Target zero — any miss is a violation", color: "#9A1A0F", bg: "#FEF0EE", border: "#F5B8B2" },
];

const COMMERCIAL_STATS = [
  { label: "Pricing floor compliance", value: "100%",  sub: "Account-level floor enforced",    color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Multi-year attach",        value: "≥25%",  sub: "HVO accounts renewing 2+ yrs",   color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Expansion at renewal",     value: "≥20%",  sub: "Accounts with upsell / cross-sell", color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC" },
  { label: "Exception approval rate",  value: "<5%",   sub: "Deals requiring VP approval",    color: "#8A4C00", bg: "#FEF5E6", border: "#F5CC80" },
];

const CORE_KPI_TABLE: KpiRow[] = [
  { name: "GRR",                  target: "≥95%",     formula: "Retained ARR / Prior-period ARR",                                owner: "VP / SVP",   escalationAt: "<93% triggers SVP review" },
  { name: "NRR",                  target: "≥108%",    formula: "(Retained + Expansion ARR) / Prior-period ARR",                 owner: "VP / SVP",   escalationAt: "<104% triggers ERM review" },
  { name: "On-time renewal rate", target: "100%",     formula: "Gate 4 passes on T-0 / total renewals due",                    owner: "Sales Ops",  escalationAt: "Any Gate 4 miss — immediate SVP flag" },
  { name: "Forecast accuracy",    target: "±3%",      formula: "| Forecast - Actual | / Actual",                               owner: "Sales Ops",  escalationAt: ">5% variance triggers forecast audit" },
  { name: "Discount leakage",     target: "<1%",      formula: "Below-floor quotes issued / total quotes",                     owner: "Sales Ops",  escalationAt: "Any below-floor quote — immediate VP flag" },
  { name: "Avg cycle time",       target: "≤220 days",formula: "Mean days from T-220 assignment to Closed Won",                owner: "Sales Ops",  escalationAt: ">240 day average triggers process review" },
  { name: "Expansion attach rate",target: "≥20%",     formula: "Accounts with ARR increase >0% at close / total closures",    owner: "ERM / ISR",  escalationAt: "<12% triggers ERM playbook review" },
  { name: "Churn rate (logo)",    target: "<5%",      formula: "Churned accounts / total accounts at period start",            owner: "VP",         escalationAt: ">8% triggers SVP intervention" },
  { name: "Win-back rate (90d)",  target: "≥15%",     formula: "Churned accounts re-won within 90 days / total churned",      owner: "ERM / ISR",  escalationAt: "<8% triggers win-back playbook review" },
];

const GATE_KPI_TABLE: GateKpiRow[] = [
  { gate: "Gate 1", passKpi: "Pass rate ≥90%",    failKpi: "Escalation rate to ERM",              recoveryKpi: "Hours-to-resolution after fail",        reviewTrigger: "<85% pass rate in any month" },
  { gate: "Gate 2", passKpi: "Pass rate ≥95%",    failKpi: "Floor violation rate (target zero)",   recoveryKpi: "Recovery within 48h window",            reviewTrigger: "<90% pass rate or any floor violation" },
  { gate: "Gate 3", passKpi: "Pass rate ≥95%",    failKpi: "Systemic flag count",                  recoveryKpi: "VP deal review completion rate",        reviewTrigger: "2+ systemic flags in a quarter" },
  { gate: "Gate 4", passKpi: "Zero violations",   failKpi: "Violation count (per rep, per segment)",recoveryKpi: "RCA completion within 5 days",         reviewTrigger: "Any violation — immediate SVP flag" },
];

const GATE_BARS = [
  { label: "Gate 1 — contact confirmed", pct: 90, color: "#16A05A" },
  { label: "Gate 2 — quote sent + floor", pct: 95, color: "#16A05A" },
  { label: "Gate 3 — signed / e-sign",   pct: 95, color: "#16A05A" },
  { label: "Gate 4 — zero violations",   pct: 100, color: "#16A05A" },
];

const COMMERCIAL_KPI_TABLE: KpiRow[] = [
  { name: "Account-level floor compliance", target: "100%",        formula: "Quotes where acct total ≥ floor / total quotes",         owner: "Sales Ops", escalationAt: "Any breach — immediate VP flag" },
  { name: "Average uplift % applied",       target: "≥ seg. floor",formula: "Mean of Uplift_Pct_Applied__c by segment",               owner: "Sales Ops", escalationAt: "Average falls below segment minimum" },
  { name: "Multi-year conversion",          target: "≥25% HVO",    formula: "Closed Won with term ≥24 months / total HVO closures",   owner: "ERM",       escalationAt: "<15% in any quarter" },
  { name: "Expansion ARR at renewal",       target: "≥20%",        formula: "Accounts with ARR increase >0% / total closures",        owner: "ERM / ISR", escalationAt: "<12% triggers playbook review" },
  { name: "NNR notice compliance",          target: "100%",        formula: "Notices sent within notice period / total NNR events",   owner: "Legal",     escalationAt: "Any miss = immediate Legal review" },
  { name: "PO receipt cycle time",          target: "≤14 days",    formula: "Mean days from portal-publish to PO received",           owner: "SDR / ISR", escalationAt: ">21 day average" },
  { name: "Invoice-to-payment cycle",       target: "≤30 days",    formula: "Mean days from invoice send to payment confirmed",       owner: "Sales Ops", escalationAt: ">45 day average" },
];

const GOVERNANCE_TIERS = [
  {
    freq: "Daily", color: "#3D2FB3", bg: "#F0EFFE", border: "#C5BFF7",
    owner: "System / Sales Ops",
    items: [
      "Gate compliance status scan — all open opportunities",
      "Escalation task queue — overdue items flagged to owner",
      "Silence detection — no-response triggers fired",
      "Pricing floor check on every new quote generated",
    ],
  },
  {
    freq: "Weekly", color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC",
    owner: "Sales Ops + VP",
    items: [
      "Forecast call — pipeline vs actuals vs target",
      "Gate pass rate report — all four gates",
      "At-risk register review — amber / red accounts",
      "Engagement health digest — ERM / ISR distribution",
    ],
  },
  {
    freq: "Monthly", color: "#8A4C00", bg: "#FEF5E6", border: "#F5CC80",
    owner: "VP + SVP",
    items: [
      "GRR / NRR actuals vs target",
      "Expansion attach rate by segment and rep",
      "Churn analysis — reason codes and patterns",
      "Cycle time trend — is the process improving?",
      "Gate violation log — any Gate 4 RCA reviews",
    ],
  },
  {
    freq: "Quarterly", color: "#4A1B0C", bg: "#FAECE7", border: "#F5B8B2",
    owner: "SVP + Exec",
    items: [
      "Operating model audit — systemic flag patterns",
      "Gate adherence rates — trend vs prior quarter",
      "Win-back rate — 90-day cohort analysis",
      "Pricing discipline review — uplift distribution",
      "Exception approval audit — leakage patterns",
      "Process change mandates from RCA findings",
    ],
  },
];

const HEALTH_SIGNALS = [
  { signal: "Email engagement rate",    weight: "20%", red: "<10% open rate",         amber: "<25% open rate",         source: "Outbound sequence agent" },
  { signal: "Portal login frequency",   weight: "15%", red: "Zero logins in 30 days", amber: "<2 logins in 30 days",   source: "Portal API" },
  { signal: "Support ticket sentiment", weight: "20%", red: ">50% negative tickets",  amber: ">30% negative tickets",  source: "Ticket sentiment agent" },
  { signal: "Product usage trend",      weight: "20%", red: ">20% MoM decline",       amber: ">10% MoM decline",       source: "Usage telemetry API" },
  { signal: "Meeting attendance rate",  weight: "10%", red: "2+ no-shows",            amber: "1 no-show",              source: "Calendar API" },
  { signal: "Response time to outreach",weight: "15%", red: ">14 days silence",       amber: ">7 days silence",        source: "Silence escalation agent" },
];

const RISK_TIERS = [
  { score: "70–100", label: "Green", color: "#0D6B3A", bg: "#E8F8EF", border: "#A8DFBC",
    action: "Standard renewal motion. SDR-led or ISR-led. Automated sequence active. No manual intervention required. Monitor weekly." },
  { score: "40–69", label: "Amber", color: "#8A4C00", bg: "#FEF5E6", border: "#F5CC80",
    action: "ERM warm outreach triggered. Engagement health digest escalated. ISR escalates to ERM for review. Renewal plan updated. Executive sponsor identified." },
  { score: "<40", label: "Red", color: "#9A1A0F", bg: "#FEF0EE", border: "#F5B8B2",
    action: "Three-alarm escalation. ERM owns directly — no ISR delegation. VP notified within 24 hours. Executive call scheduled within 72 hours. NNR decision logic reviewed." },
  { score: "<20", label: "Critical", color: "#4A1B0C", bg: "#FAECE7", border: "#F5B8B2",
    action: "Immediate SVP involvement. Legal NNR review initiated. Win-back strategy pre-built. Deal classified as probable churn in forecast model." },
];

// ─── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  page: {
    background: "#F7F8FA", minHeight: "100vh", padding: "24px 20px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  } as React.CSSProperties,
  secLabel: {
    fontSize: 11, fontWeight: 700, color: "#64748B",
    letterSpacing: "0.07em", textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  card: {
    background: "#FFFFFF", border: "0.5px solid #E2E8F0",
    borderRadius: 10, padding: "14px 16px", marginBottom: 8,
  } as React.CSSProperties,
  th: {
    fontSize: 10, fontWeight: 700, color: "#94A3B8",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    padding: "6px 10px", borderBottom: "1px solid #E2E8F0",
    textAlign: "left" as const, whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "8px 10px", fontSize: 12, color: "#4A5568",
    borderBottom: "0.5px solid #F0F4F8", verticalAlign: "top" as const,
    lineHeight: 1.5,
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatGrid({ stats }: { stats: typeof CORE_STATS }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: s.color, marginBottom: 5, opacity: 0.8 }}>{s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 11, color: s.color, marginTop: 4, opacity: 0.7 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.card}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: open ? 12 : 0 }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A202C" }}>{title}</span>
        <span style={{ fontSize: 10, color: "#94A3B8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </div>
      {open && children}
    </div>
  );
}

function KpiTable({ rows }: { rows: KpiRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8F9FB" }}>
            <th style={S.th}>KPI</th>
            <th style={S.th}>Target</th>
            <th style={S.th}>Formula</th>
            <th style={S.th}>Owner</th>
            <th style={S.th}>Review if</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFBFC" }}>
              <td style={{ ...S.td, fontWeight: 600, color: "#1A202C", whiteSpace: "nowrap" }}>{r.name}</td>
              <td style={{ ...S.td, whiteSpace: "nowrap" }}>{r.target}</td>
              <td style={S.td}>{r.formula}</td>
              <td style={{ ...S.td, whiteSpace: "nowrap" }}>{r.owner}</td>
              <td style={S.td}>{r.escalationAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GateKpiTable({ rows }: { rows: GateKpiRow[] }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    "Gate 1": { bg: "#F0EFFE", text: "#3D2FB3", border: "#C5BFF7" },
    "Gate 2": { bg: "#FEF5E6", text: "#8A4C00", border: "#F5CC80" },
    "Gate 3": { bg: "#FEF0EE", text: "#9A1A0F", border: "#F5B8B2" },
    "Gate 4": { bg: "#FAECE7", text: "#4A1B0C", border: "#F5B8B2" },
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8F9FB" }}>
            <th style={S.th}>Gate</th>
            <th style={S.th}>Pass KPI</th>
            <th style={S.th}>Fail KPI</th>
            <th style={S.th}>Recovery KPI</th>
            <th style={S.th}>Review trigger</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const c = colors[r.gate];
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFBFC" }}>
                <td style={{ ...S.td }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, whiteSpace: "nowrap" }}>
                    {r.gate}
                  </span>
                </td>
                <td style={S.td}>{r.passKpi}</td>
                <td style={S.td}>{r.failKpi}</td>
                <td style={S.td}>{r.recoveryKpi}</td>
                <td style={S.td}>{r.reviewTrigger}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab content components ────────────────────────────────────────────────────

function CoreTab() {
  return (
    <div>
      <StatGrid stats={CORE_STATS} />
      <div style={S.secLabel}>KPI ownership matrix</div>
      <SectionCard title="All core KPIs — targets, formulas, and escalation thresholds">
        <KpiTable rows={CORE_KPI_TABLE} />
      </SectionCard>
    </div>
  );
}

function GateTab() {
  return (
    <div>
      <StatGrid stats={GATE_STATS} />
      <div style={S.secLabel}>Gate pass rate targets</div>
      <div style={{ ...S.card, marginBottom: 16 }}>
        {GATE_BARS.map(b => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#4A5568", width: 200, flexShrink: 0 }}>{b.label}</div>
            <div style={{ flex: 1, height: 7, background: "#F0F4F8", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, background: b.color, width: `${b.pct}%`, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", width: 40, textAlign: "right" }}>{b.pct}%+</div>
          </div>
        ))}
      </div>
      <div style={S.secLabel}>Gate compliance measurement model</div>
      <SectionCard title="Pass / fail / recovery KPIs per gate">
        <GateKpiTable rows={GATE_KPI_TABLE} />
      </SectionCard>
    </div>
  );
}

function CommercialTab() {
  return (
    <div>
      <StatGrid stats={COMMERCIAL_STATS} />
      <div style={S.secLabel}>Pricing discipline and expansion metrics</div>
      <SectionCard title="Commercial KPIs — targets, formulas, and escalation thresholds">
        <KpiTable rows={COMMERCIAL_KPI_TABLE} />
      </SectionCard>
      <SectionCard title="Pricing floor rule" defaultOpen={false}>
        <div style={{ fontSize: 13, color: "#4A5568", lineHeight: 1.7 }}>
          The pricing floor is enforced at the <strong style={{ color: "#1A202C" }}>account level</strong>, not the opportunity level.
          {" "}<code style={{ fontSize: 11, background: "#F0F4F8", padding: "1px 5px", borderRadius: 3 }}>Account.Total_ARR_Quoted__c</code>
          {" "}is compared against{" "}
          <code style={{ fontSize: 11, background: "#F0F4F8", padding: "1px 5px", borderRadius: 3 }}>Account.Pricing_Floor__c</code>.
          An individual opportunity may quote below its own prior-year ARR if compensating uplift on another open
          renewal opportunity on the same account brings the aggregate above the floor.
          <strong style={{ color: "#9A1A0F", display: "block", marginTop: 10 }}>
            No pricing exceptions exist. There is no VP approval path.
          </strong>
        </div>
      </SectionCard>
    </div>
  );
}

function GovernanceTab() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 20 }}>
        {GOVERNANCE_TIERS.map(t => (
          <div key={t.freq} style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.color, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2 }}>{t.freq}</div>
            <div style={{ fontSize: 11, color: t.color, opacity: 0.7, marginBottom: 10 }}>{t.owner}</div>
            {t.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 7, marginBottom: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.color, flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: 12, color: t.color, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={S.secLabel}>Weekly forecast call agenda</div>
      <SectionCard title="Required data, discussion points, and action protocol">
        {[
          { title: "Pipeline snapshot", body: "Total open ARR by gate stage. Expected close ARR this period vs target. Deals advanced or regressed since last call." },
          { title: "Gate compliance summary", body: "Pass rates for all four gates this week. Any new failures or systemic flags raised. Overdue escalations still open." },
          { title: "At-risk register", body: "All Red-flagged accounts with health score below threshold. ERM / ISR to provide status on each. Escalations to VP tabled for decisions." },
          { title: "Forecast accuracy check", body: "Prior week predicted close vs actual close. Variance explained. Probability adjustments applied by the AI forecast agent." },
          { title: "Actions", body: "All open actions from the prior call reviewed. New actions assigned with named owner and deadline. No unowned actions leave the call." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < 4 ? "0.5px solid #F0F4F8" : "none" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6B5CE7", flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A202C", marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#4A5568", lineHeight: 1.55 }}>{item.body}</div>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function HealthTab() {
  return (
    <div>
      <div style={S.secLabel}>Account health score — signal model</div>
      <SectionCard title="Six signals, weights, and thresholds">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FB" }}>
                <th style={S.th}>Signal</th>
                <th style={S.th}>Weight</th>
                <th style={S.th}>Red threshold</th>
                <th style={S.th}>Amber threshold</th>
                <th style={S.th}>Source</th>
              </tr>
            </thead>
            <tbody>
              {HEALTH_SIGNALS.map((s, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFBFC" }}>
                  <td style={{ ...S.td, fontWeight: 600, color: "#1A202C" }}>{s.signal}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: "#6B5CE7" }}>{s.weight}</td>
                  <td style={{ ...S.td, color: "#9A1A0F" }}>{s.red}</td>
                  <td style={{ ...S.td, color: "#8A4C00" }}>{s.amber}</td>
                  <td style={{ ...S.td, color: "#64748B" }}>{s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div style={S.secLabel}>Risk classification and intervention playbook</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RISK_TIERS.map(t => (
          <div key={t.label} style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: "13px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.color }}>Score {t.score}</div>
            </div>
            <div style={{ width: "0.5px", background: t.border, alignSelf: "stretch", flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: t.color, lineHeight: 1.6 }}>{t.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: "core",       label: "Core KPIs",         sub: "GRR · NRR · cycle time"         },
  { key: "gate",       label: "Gate metrics",       sub: "Pass rates · violations"        },
  { key: "commercial", label: "Commercial",         sub: "Pricing · expansion · PO"       },
  { key: "governance", label: "Governance cadence", sub: "Daily → quarterly rhythm"       },
  { key: "health",     label: "Health indicators",  sub: "Signal model · risk tiers"      },
];

export default function KpiDashboard() {
  const [tab, setTab] = useState<TabKey>("core");

  return (
    <div style={S.page}>
      {/* Header */}
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A202C", marginBottom: 4 }}>
        KPI and governance dashboard
      </h1>
      <p style={{ fontSize: 13, color: "#718096", marginBottom: 20 }}>
        Renewal operating model performance targets, measurement model, and inspection cadence.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E2E8F0", marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: "10px 16px", border: "none", background: "transparent",
              borderBottom: `2px solid ${tab === t.key ? "#6B5CE7" : "transparent"}`,
              cursor: "pointer", transition: "border-color 0.15s", whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? "#3D2FB3" : "#64748B" }}>
              {t.label}
            </span>
            <span style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "core"       && <CoreTab />}
      {tab === "gate"       && <GateTab />}
      {tab === "commercial" && <CommercialTab />}
      {tab === "governance" && <GovernanceTab />}
      {tab === "health"     && <HealthTab />}
    </div>
  );
}
