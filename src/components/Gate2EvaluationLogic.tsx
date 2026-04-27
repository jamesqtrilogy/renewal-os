import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckStatus = "idle" | "running" | "pass" | "fail" | "warn";

interface Check {
  id: number;
  label: string;
  type: "blocker" | "warn";
  object?: "Account" | "Opportunity" | "Both";
  description: string;
  inputs: string[];
  passCondition: string;
  failCondition: string;
  immediateFlag?: boolean;
}

interface EscalationStep {
  hour: string;
  owner: string;
  ownerColor: string;
  title: string;
  description: string;
  special?: boolean;
  immediateFlag?: boolean;
}

interface ExceptionRule {
  index: number;
  title: string;
  description: string;
  isPricingException?: boolean;
}

interface CRMField {
  field: string;
  object: "Account" | "Opportunity";
  type: string;
  purpose: string;
  role: string;
  roleLabel: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const CHECKS: Check[] = [
  {
    id: 1,
    label: "Quote existence check",
    type: "blocker",
    object: "Opportunity",
    description:
      "Queries CPQ for any quote record linked to the renewal opportunity ID. Status must be Approved or Sent — Draft and Cancelled statuses fail this check.",
    inputs: ["CPQ API read", "Quote status taxonomy", "Opp ID linkage check"],
    passCondition:
      "Quote record exists, status = Approved or Sent, created on or before T-90",
    failCondition:
      "No quote record exists, or status = Draft / Cancelled",
  },
  {
    id: 2,
    label: "Account-level pricing floor check",
    type: "blocker",
    object: "Account",
    description:
      "Retrieves Account.Pricing_Floor__c and aggregates Total_ARR_Quoted__c across ALL open renewal opportunities on the account. Unquoted opps use prior-year ARR as a conservative proxy. Also validates line-item integrity — SKU ARR sum must equal the quote total.",
    inputs: [
      "Account.Pricing_Floor__c",
      "All open opp ARR roll-up",
      "Prior-year ARR proxy (unquoted opps)",
      "CPQ line-item API",
    ],
    passCondition:
      "Account.Total_ARR_Quoted__c ≥ Account.Pricing_Floor__c AND line-item sum variance ≤ 0.5%",
    failCondition:
      "Account aggregate below floor, OR line-item sum mismatch > 0.5% (hidden partial-SKU discount detected)",
    immediateFlag: true,
  },
  {
    id: 3,
    label: "Portal publication check",
    type: "blocker",
    object: "Opportunity",
    description:
      "Queries the renewal portal API to confirm the quote is published and customer-accessible. Portal contact record must match the Gate 1 confirmed primary contact.",
    inputs: [
      "Portal API read",
      "Contact linkage validation",
      "CPQ ↔ portal sync check",
    ],
    passCondition:
      "quote_published = TRUE, portal_visible = TRUE, portal contact matches Gate 1 primary contact",
    failCondition:
      "Not published, portal_visible = FALSE, or contact mismatch between portal and Gate 1 record",
  },
  {
    id: 4,
    label: "ARR accuracy validator",
    type: "warn",
    object: "Opportunity",
    description:
      "Cross-validates Opportunity.Total_ARR_Quoted__c against the CRM opportunity ARR field and the billing system's contracted ARR. Variance > 2% creates a Sales Ops warning task. Does not block gate passage but creates an auditable discrepancy that must be resolved before T-30.",
    inputs: ["CRM ARR field", "Billing system API", "2% variance threshold"],
    passCondition:
      "Quoted ARR within 2% of CRM opportunity ARR and billing system contracted ARR",
    failCondition:
      "Variance > 2% — Sales Ops warning task created, ARR discrepancy logged (does not block gate)",
  },
  {
    id: 5,
    label: "Explainer asset validator",
    type: "warn",
    object: "Opportunity",
    description:
      "Checks portal asset manifest for required customer-facing materials. Missing assets generate an SDR task with 24-hour SLA. Not a gate blocker but missing assets statistically extend PO cycle time.",
    inputs: ["Portal asset manifest", "Required asset config"],
    passCondition:
      "PO upload instructions, quote-signing explainer video, and contract expiry reminder all present",
    failCondition:
      "Any required asset missing — SDR task created with 24hr SLA (does not block gate)",
  },
];

const ESCALATION: EscalationStep[] = [
  {
    hour: "0h",
    owner: "SDR",
    ownerColor: "#4A42CC",
    title: "Gate fail logged + SDR task created",
    description:
      "CRM stage locked. Audit record written with specific failure reason. SDR task specifies the exact failure type. 48-hour recovery window opens for process failures.",
  },
  {
    hour: "0h*",
    owner: "VP + Sales Ops",
    ownerColor: "#D85A30",
    title: "Floor violation — immediate flag, no recovery window",
    description:
      "Account total, floor value, and shortfall amount sent immediately to VP and Sales Ops with per-opp ARR breakdown. The only resolution is to revise one or more quotes upward. No approval path exists.",
    immediateFlag: true,
  },
  {
    hour: "12h",
    owner: "Sales Ops",
    ownerColor: "#9A6000",
    title: "Sales Ops escalation + auto-quote fallback",
    description:
      "If no corrective action by hour 12: Sales Ops escalation task created. For 'no quote' failures, agent auto-generates the default quote and notifies the SDR to review within 6 hours.",
  },
  {
    hour: "24h",
    owner: "VP / ERM",
    ownerColor: "#D4537E",
    title: "VP notification + ERM ownership transfer (HVO)",
    description:
      "VP receives deal context packet. For HVO accounts, formal ownership of gate resolution transfers to ERM. For floor violations still unresolved, VP receives second alert with updated shortfall figures.",
  },
  {
    hour: "48h",
    owner: "SVP",
    ownerColor: "#A32D2D",
    title: "Compliance flag raised + SVP notification",
    description:
      "Compliance flag raised on gate dashboard. SVP receives portfolio-level alert. Deal placed on at-risk register. VP must submit written recovery plan within 24 hours.",
    special: true,
  },
  {
    hour: "72h",
    owner: "SVP + Legal",
    ownerColor: "#A32D2D",
    title: "NNR decision review initiated",
    description:
      "Gate still failing: NNR decision logic reviewed for the account. Legal assesses whether the contractual notice period has been triggered. SVP makes a Go / No-Go decision within 24 hours.",
    special: true,
  },
];

const EXCEPTIONS: ExceptionRule[] = [
  {
    index: 1,
    title: "ERP / CPQ integration failure",
    description:
      "If a documented system failure prevents quote generation, Sales Ops applies a technical hold with SVP notification. Gate 2 status = Exempt — System Failure. Auto-expires when system is restored. Maximum 72-hour hold before SVP review.",
  },
  {
    index: 2,
    title: "Customer-requested quote delay",
    description:
      "Customer has formally requested delayed delivery in writing (e.g. pending board approval). ERM applies a Customer Hold with reactivation date. VP must approve. Customer's written request must be attached to the CRM record. Reactivation is automatic.",
  },
  {
    index: 3,
    title: "Active legal dispute",
    description:
      "VP and SVP co-approval required. Renewal clock paused. Legal owns the resolution timeline. Gate 2 status = Exempt — Legal Hold.",
  },
  {
    index: 0,
    title: "No pricing exceptions exist",
    description:
      "The account-level floor is absolute. There is no VP approval path, no strategic account carve-out, and no exception workflow for quoting below the floor. The only route to a lower individual opportunity ARR is compensating uplift on another open renewal opportunity on the same account.",
    isPricingException: true,
  },
];

const CRM_FIELDS: CRMField[] = [
  { field: "Pricing_Floor__c", object: "Account", type: "Currency", purpose: "Min acceptable total ARR across all active renewal opps. Set at T-220, updated on mid-cycle expansion close.", role: "pass", roleLabel: "Pass condition" },
  { field: "Prior_Year_Total_ARR__c", object: "Account", type: "Currency", purpose: "Sum of all contracted ARR across all renewal opps in the prior term. Source of truth for floor calculation.", role: "pass", roleLabel: "Pass condition" },
  { field: "Total_ARR_Quoted__c", object: "Account", type: "Currency", purpose: "Roll-up sum of all open renewal opp quoted ARRs. Dynamically updated as quotes are revised.", role: "pass", roleLabel: "Pass condition" },
  { field: "Floor_Shortfall__c", object: "Account", type: "Currency", purpose: "Auto-computed: Pricing_Floor__c minus Total_ARR_Quoted__c. Positive = shortfall. Used in violation notifications.", role: "compliance", roleLabel: "Compliance" },
  { field: "Pricing_Floor_Violated__c", object: "Account", type: "Boolean", purpose: "TRUE if account aggregate fell below floor at any point this cycle. Immutable — never reset. Feeds quarterly leakage audit.", role: "compliance", roleLabel: "Compliance" },
  { field: "Quote_ID__c", object: "Opportunity", type: "Lookup", purpose: "CPQ quote linked to this renewal opp.", role: "pass", roleLabel: "Pass condition" },
  { field: "Quote_Status__c", object: "Opportunity", type: "Picklist", purpose: "Draft / Pending Approval / Approved / Sent. Must be Approved or Sent to pass Check 1.", role: "pass", roleLabel: "Pass condition" },
  { field: "Total_ARR_Quoted__c", object: "Opportunity", type: "Currency", purpose: "Total quoted ARR for this opp. Rolls up to Account.Total_ARR_Quoted__c.", role: "pass", roleLabel: "Pass condition" },
  { field: "Portal_Published__c", object: "Opportunity", type: "Boolean", purpose: "TRUE = quote live and customer-accessible in the renewal portal.", role: "pass", roleLabel: "Pass condition" },
  { field: "Portal_Contact_Linked__c", object: "Opportunity", type: "Boolean", purpose: "Portal quote linked to confirmed Gate 1 primary contact.", role: "pass", roleLabel: "Pass condition" },
  { field: "Gate2_Status__c", object: "Opportunity", type: "Picklist", purpose: "Pending / Pass / Fail / Escalated / Exempt.", role: "gate", roleLabel: "Gate output" },
  { field: "Gate2_Failure_Reason__c", object: "Opportunity", type: "Text", purpose: "Specific auto-populated failure reason. E.g. Account total $170k — floor $183.6k — shortfall $13.6k.", role: "gate", roleLabel: "Gate output" },
  { field: "Gate2_Evaluated_At__c", object: "Opportunity", type: "DateTime", purpose: "Timestamp of gate evaluation run.", role: "audit", roleLabel: "Audit" },
  { field: "Uplift_Pct_Applied__c", object: "Opportunity", type: "Percent", purpose: "Actual uplift % on this opp vs prior-year ARR. For pricing analytics only — does not determine floor compliance.", role: "pricing", roleLabel: "Pricing audit" },
  { field: "Multiyear_Option_Tabled__c", object: "Opportunity", type: "Boolean", purpose: "ERM has tabled the multi-year option. Required for HVO accounts before T-90.", role: "hvo", roleLabel: "HVO req." },
  { field: "Stage_Lock__c", object: "Opportunity", type: "Boolean", purpose: "TRUE = stage blocked from manual advancement at the API level.", role: "enforce", roleLabel: "Enforcement" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ObjectBadge({ obj }: { obj: "Account" | "Opportunity" | "Both" }) {
  const colors = {
    Account: { bg: "#EEEDFE", text: "#2810A0", border: "#2810A0" },
    Opportunity: { bg: "#E6F1FB", text: "#0A4080", border: "#1E5080" },
    Both: { bg: "#E8F5EE", text: "#0B6B45", border: "#1D9E75" },
  };
  const c = colors[obj];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.text, border: `1px solid ${c.border}`, letterSpacing: "0.06em" }}>
      {obj.toUpperCase()}
    </span>
  );
}

function RoleBadgeField({ role, label }: { role: string; label: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pass: { bg: "#EAF7F1", text: "#0B7A50", border: "#1D9E7530" },
    gate: { bg: "#FDF0EC", text: "#D85A30", border: "#D85A3030" },
    audit: { bg: "#FDF0EC", text: "#D85A30", border: "#D85A3030" },
    compliance: { bg: "#FDECEA", text: "#A32D2D", border: "#A32D2D40" },
    pricing: { bg: "#FEF6E8", text: "#9A6000", border: "#EF9F2730" },
    hvo: { bg: "#F1F0FE", text: "#4A42CC", border: "#6C63FF30" },
    enforce: { bg: "#F1F0FE", text: "#2810A0", border: "#6C63FF30" },
  };
  const c = colors[role] || colors.audit;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: CheckStatus }) {
  const colors: Record<CheckStatus, string> = { idle: "#8090A8", running: "#9A6000", pass: "#0B7A50", fail: "#D85A30", warn: "#9A6000" };
  return (
    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: colors[status], boxShadow: status === "running" ? `0 0 6px ${colors.running}` : "none", flexShrink: 0, transition: "all 0.3s ease" }} />
  );
}

// ─── Formula Display ─────────────────────────────────────────────────────────

function FloorFormula() {
  return (
    <div style={{ background: "#EEF0F5", border: "1px solid #1E2A3A", borderRadius: 6, padding: "14px 18px", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.1em", marginBottom: 12 }}>ACCOUNT-LEVEL FLOOR FORMULA</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, color: "#3A4E65" }}>// Account floor (Account object, set at T-220)</div>
        <div style={{ fontSize: 12, color: "#0D4A8A" }}>
          <span style={{ color: "#2810A0" }}>Account</span>
          <span style={{ color: "#1A2A42" }}>.Pricing_Floor__c</span>
          <span style={{ color: "#3A4E65" }}> = </span>
          <span style={{ color: "#2810A0" }}>Account</span>
          <span style={{ color: "#1A2A42" }}>.Prior_Year_Total_ARR__c</span>
          <span style={{ color: "#9A6000" }}> × </span>
          <span style={{ color: "#0B7A50" }}>Segment_Uplift_Multiplier</span>
        </div>
        <div style={{ height: 8 }} />
        <div style={{ fontSize: 11, color: "#3A4E65" }}>// Account total quoted (roll-up from ALL open renewal opps)</div>
        <div style={{ fontSize: 12, color: "#0D4A8A", lineHeight: 1.7 }}>
          <span style={{ color: "#2810A0" }}>Account</span>
          <span style={{ color: "#1A2A42" }}>.Total_ARR_Quoted__c</span>
          <span style={{ color: "#3A4E65" }}> = </span>
          <span style={{ color: "#0B7A50" }}>SUM</span>
          <span style={{ color: "#1A2A42" }}>(Opportunity.Total_ARR_Quoted__c)</span>
          <br />
          <span style={{ color: "#3A4E65" }}>{"  "}WHERE Type = </span>
          <span style={{ color: "#9A6000" }}>'Renewal'</span>
          <span style={{ color: "#3A4E65" }}> AND Stage NOT IN (</span>
          <span style={{ color: "#9A6000" }}>'Closed Won', 'Closed Lost'</span>
          <span style={{ color: "#3A4E65" }}>)</span>
        </div>
        <div style={{ height: 8 }} />
        <div style={{ fontSize: 11, color: "#3A4E65" }}>// Gate 2 pricing check</div>
        <div style={{ fontSize: 12, lineHeight: 1.7 }}>
          <span style={{ color: "#0B7A50" }}>PASS if </span>
          <span style={{ color: "#1A2A42" }}>Account.Total_ARR_Quoted__c</span>
          <span style={{ color: "#9A6000" }}> ≥ </span>
          <span style={{ color: "#1A2A42" }}>Account.Pricing_Floor__c</span>
          <br />
          <span style={{ color: "#D85A30" }}>FAIL if </span>
          <span style={{ color: "#1A2A42" }}>Account.Total_ARR_Quoted__c</span>
          <span style={{ color: "#9A6000" }}> &lt; </span>
          <span style={{ color: "#1A2A42" }}>Account.Pricing_Floor__c</span>
        </div>
      </div>
    </div>
  );
}

function FloorExamples() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
      <div style={{ padding: "14px 16px", borderRadius: 6, background: "#EAF7F1", border: "1px solid #1D9E7533" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0B7A50", letterSpacing: "0.08em", marginBottom: 10 }}>EXAMPLE A — GATE PASSES</div>
        {[["Opp 1 quoted", "$75k (was $80k)"], ["Opp 2 quoted", "$65k (was $60k)"], ["Opp 3 quoted", "$45k (was $40k)"]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2C3A54", padding: "3px 0", borderBottom: "1px solid #1D9E7511" }}>
            <span>{k}</span><span>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A2A42", padding: "6px 0 3px", borderBottom: "1px solid #1D9E7511", fontWeight: 600 }}>
          <span>Account total</span><span>$185k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2C3A54", padding: "3px 0" }}>
          <span>Floor (prior $180k + 2%)</span><span>$183.6k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#0B7A50", padding: "6px 0 0", fontWeight: 700 }}>
          <span>Result</span><span>PASS ✓</span>
        </div>
      </div>
      <div style={{ padding: "14px 16px", borderRadius: 6, background: "#FDF0EC", border: "1px solid #D85A3033" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#D85A30", letterSpacing: "0.08em", marginBottom: 10 }}>EXAMPLE B — GATE FAILS</div>
        {[["Opp 1 quoted", "$72k (was $80k)"], ["Opp 2 quoted", "$58k (was $60k)"], ["Opp 3 quoted", "$40k (was $40k)"]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2C3A54", padding: "3px 0", borderBottom: "1px solid #D85A3011" }}>
            <span>{k}</span><span>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A2A42", padding: "6px 0 3px", borderBottom: "1px solid #D85A3011", fontWeight: 600 }}>
          <span>Account total</span><span>$170k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2C3A54", padding: "3px 0" }}>
          <span>Floor (prior $180k + 2%)</span><span>$183.6k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D85A30", padding: "6px 0 0", fontWeight: 700 }}>
          <span>Shortfall</span><span>$13.6k — FAIL ✗</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Gate2EvaluationLogic() {
  const [activeCheck, setActiveCheck] = useState<number | null>(null);
  const [runStatus, setRunStatus] = useState<Record<number, CheckStatus>>({ 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" });
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<"pass" | "fail" | "floor" | null>(null);
  const [activeTab, setActiveTab] = useState<"checks" | "floor" | "escalation" | "fields" | "exceptions">("checks");
  const [activeFieldObj, setActiveFieldObj] = useState<"all" | "Account" | "Opportunity">("all");

  const runSimulation = async (outcome: "pass" | "fail" | "floor") => {
    setSimRunning(true);
    setSimResult(null);
    setRunStatus({ 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" });
    const failAt = outcome === "fail" ? 3 : outcome === "floor" ? 2 : 99;
    for (let i = 1; i <= 5; i++) {
      setRunStatus((p) => ({ ...p, [i]: "running" }));
      await new Promise((r) => setTimeout(r, 600));
      if (i === failAt) {
        setRunStatus((p) => ({ ...p, [i]: "fail" }));
        for (let j = i + 1; j <= 5; j++) setRunStatus((p) => ({ ...p, [j]: "idle" }));
        setSimResult(outcome === "pass" ? "fail" : outcome);
        setSimRunning(false);
        return;
      }
      setRunStatus((p) => ({ ...p, [i]: i >= 4 ? "warn" : "pass" }));
    }
    setSimResult("pass");
    setSimRunning(false);
  };

  const reset = () => { setRunStatus({ 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" }); setSimResult(null); setActiveCheck(null); };

  const filteredFields = activeFieldObj === "all" ? CRM_FIELDS : CRM_FIELDS.filter((f) => f.object === activeFieldObj);

  const TAB_LABELS = [
    { key: "checks", label: "Evaluation checks" },
    { key: "floor", label: "Floor model" },
    { key: "escalation", label: "Escalation chain" },
    { key: "fields", label: "CRM field model" },
    { key: "exceptions", label: "Exceptions" },
  ] as const;

  const resultConfig = {
    pass: { color: "#0B7A50", icon: "✓", msg: "GATE 2 PASSED — Stage advancing to Quote Follow-Up. Audit record written." },
    fail: { color: "#D85A30", icon: "✗", msg: "GATE 2 FAILED — Portal publication missing. Stage locked. 48-hour recovery window open." },
    floor: { color: "#A32D2D", icon: "✗", msg: "PRICING FLOOR VIOLATION — Account aggregate below floor. Immediate compliance flag. No recovery window. VP and Sales Ops notified." },
  };

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#F2F4F8", color: "#1A2A42", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E2A3A", padding: "28px 32px 20px", background: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#9A6000", textTransform: "uppercase" }}>Gate 2 · T-90</span>
              <span style={{ width: 1, height: 12, background: "#BDD0E0" }} />
              <span style={{ fontSize: 10, color: "#3A4E65", letterSpacing: "0.08em" }}>AI ENFORCEMENT ENGINE</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F1A2E", letterSpacing: "-0.02em", margin: 0 }}>Quote Sent</h1>
            <p style={{ fontSize: 12, color: "#3A4E65", marginTop: 6, letterSpacing: "0.02em" }}>
              Hard gate · Account-level pricing floor · No pricing exceptions · Stage lock on failure
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => runSimulation("pass")} disabled={simRunning} style={{ fontSize: 11, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "1px solid #1D9E75", background: "#D6F0E6", color: "#0B7A50", cursor: simRunning ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit" }}>
              Simulate PASS
            </button>
            <button onClick={() => runSimulation("floor")} disabled={simRunning} style={{ fontSize: 11, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "1px solid #A32D2D", background: "#FDECEA", color: "#A32D2D", cursor: simRunning ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit" }}>
              Simulate FLOOR FAIL
            </button>
            <button onClick={() => runSimulation("fail")} disabled={simRunning} style={{ fontSize: 11, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "1px solid #D85A30", background: "#FCE4DA", color: "#D85A30", cursor: simRunning ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit" }}>
              Simulate FAIL
            </button>
            <button onClick={reset} style={{ fontSize: 11, padding: "8px 12px", borderRadius: 6, border: "1px solid #1E2A3A", background: "transparent", color: "#3A4E65", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit" }}>
              Reset
            </button>
          </div>
        </div>
        {simResult && (() => {
          const cfg = resultConfig[simResult];
          return (
            <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 6, border: `1px solid ${cfg.color}`, background: cfg.color + "28", color: cfg.color, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{cfg.icon}</span>{cfg.msg}
            </div>
          );
        })()}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #1E2A3A", padding: "0 32px", background: "#FFFFFF" }}>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TAB_LABELS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ fontSize: 11, fontWeight: 600, padding: "12px 16px", border: "none", borderBottom: activeTab === t.key ? "2px solid #EF9F27" : "2px solid transparent", background: "transparent", color: activeTab === t.key ? "#9A6000" : "#3A4E65", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* CHECKS */}
        {activeTab === "checks" && (
          <div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 20, letterSpacing: "0.04em" }}>Five sequential checks. Checks 1–3 are binary blockers. Checks 4–5 generate warnings without blocking. Check 2 (floor) triggers an immediate compliance flag with no recovery window on failure.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {CHECKS.map((check) => {
                const st = runStatus[check.id];
                const isActive = activeCheck === check.id;
                const statusColor = st === "pass" ? "#0B7A50" : st === "fail" ? "#D85A30" : st === "running" ? "#9A6000" : st === "warn" ? "#9A6000" : "#8090A8";
                return (
                  <div key={check.id}>
                    <div onClick={() => setActiveCheck(isActive ? null : check.id)} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 6, border: `1px solid ${isActive ? "#EF9F2766" : statusColor + "44"}`, background: isActive ? "#E8EEF8" : st !== "idle" ? statusColor + "18" : "#F4F6FA", cursor: "pointer", transition: "all 0.2s ease", marginBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot status={st} />
                        <span style={{ fontSize: 11, color: "#3A4E65", fontWeight: 700 }}>{String(check.id).padStart(2, "0")}</span>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2A42" }}>{check.label}</span>
                          {check.object && <ObjectBadge obj={check.object} />}
                          {check.immediateFlag && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FDECEA", color: "#A32D2D", border: "1px solid #A32D2D44", letterSpacing: "0.06em" }}>IMMEDIATE FLAG</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#3A4E65", marginTop: 2 }}>{check.type === "blocker" ? "Binary blocker" : "Warning validator"} · {check.inputs.length} data sources</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {st !== "idle" && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: statusColor + "30", color: statusColor, border: `1px solid ${statusColor}44`, letterSpacing: "0.08em", textTransform: "uppercase" }}>{st.toUpperCase()}</span>}
                        <span style={{ color: "#3A4E65", fontSize: 12 }}>{isActive ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ margin: "2px 0 4px", padding: "16px 20px", borderRadius: 6, border: "1px solid #1E2A3A", background: "#FFFFFF" }}>
                        <p style={{ fontSize: 12, color: "#2C3A54", lineHeight: 1.6, marginBottom: 16 }}>{check.description}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                          <div style={{ padding: "12px 14px", borderRadius: 6, background: "#EAF7F1", border: "1px solid #1D9E7533" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#0B7A50", letterSpacing: "0.08em", marginBottom: 6 }}>PASS</div>
                            <p style={{ fontSize: 11, color: "#075030", lineHeight: 1.5 }}>{check.passCondition}</p>
                          </div>
                          <div style={{ padding: "12px 14px", borderRadius: 6, background: check.immediateFlag ? "#FDECEA" : "#FDF0EC", border: `1px solid ${check.immediateFlag ? "#A32D2D40" : "#D85A3030"}` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: check.immediateFlag ? "#A32D2D" : "#D85A30", letterSpacing: "0.08em", marginBottom: 6 }}>FAIL{check.immediateFlag ? " — IMMEDIATE FLAG" : ""}</div>
                            <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.5 }}>{check.failCondition}</p>
                          </div>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", marginBottom: 8 }}>DATA SOURCES</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {check.inputs.map((inp) => (<span key={inp} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "#E8EEF8", border: "1px solid #2A3A4A", color: "#2C3A54" }}>{inp}</span>))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FLOOR MODEL */}
        {activeTab === "floor" && (
          <div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 20, letterSpacing: "0.04em" }}>
              The pricing floor is evaluated at the account level — not per opportunity. The agent aggregates all open renewal opp quoted ARRs before evaluating this check.
            </p>
            <FloorFormula />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", marginBottom: 12 }}>WORKED EXAMPLES</div>
            <FloorExamples />
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 6, background: "#F3F1FE", border: "1px solid #6C63FF22" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#2810A0", letterSpacing: "0.08em", marginBottom: 8 }}>MULTI-OPPORTUNITY PROXY RULE</div>
              <p style={{ fontSize: 11, color: "#2C3A54", lineHeight: 1.6 }}>
                If a sibling renewal opp on the same account has not yet reached T-90 and has no quote, the agent uses that opp's prior-year ARR as its contribution to the account aggregate. This ensures the floor check is conservative — the aggregate is never artificially inflated by an unquoted opp.
              </p>
            </div>
            <div style={{ marginTop: 10, padding: "12px 16px", borderRadius: 6, background: "#FDECEA", border: "1px solid #A32D2D33" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#A32D2D", letterSpacing: "0.08em", marginBottom: 8 }}>NO PRICING EXCEPTIONS</div>
              <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.6 }}>
                There is no VP approval path, no strategic account carve-out, and no exception workflow for quoting below the floor. The only route to a lower individual opportunity ARR is compensating uplift on another open renewal opportunity on the same account that brings the aggregate back above the floor.
              </p>
            </div>
          </div>
        )}

        {/* ESCALATION */}
        {activeTab === "escalation" && (
          <div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 20, letterSpacing: "0.04em" }}>
              48-hour recovery window for process failures. Pricing floor violations bypass the window entirely — immediate compliance flag with no path to approval.
            </p>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 62, top: 20, bottom: 20, width: 1, background: "#BDD0E0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {ESCALATION.map((step) => (
                  <div key={step.hour + step.owner} style={{ display: "grid", gridTemplateColumns: "60px 24px 1fr", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ textAlign: "right", paddingTop: 14, fontSize: 11, fontWeight: 700, color: step.immediateFlag ? "#A32D2D" : "#3A4E65", letterSpacing: "0.06em" }}>
                      {step.hour}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: step.ownerColor, border: `2px solid ${step.ownerColor}33`, flexShrink: 0, zIndex: 1 }} />
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: 6, border: `1px solid ${step.immediateFlag ? "#A32D2D40" : step.special ? "#A32D2D20" : "#BDD0E0"}`, background: step.immediateFlag ? "#FDECEA" : step.special ? "#FDECEA" : "#F4F6FA", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2A42" }}>{step.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: step.ownerColor + "22", color: step.ownerColor, border: `1px solid ${step.ownerColor}44`, letterSpacing: "0.04em", textTransform: "uppercase" }}>{step.owner}</span>
                        {step.immediateFlag && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FDECEA", color: "#A32D2D", border: "1px solid #A32D2D44", letterSpacing: "0.06em" }}>NO RECOVERY WINDOW</span>}
                      </div>
                      <p style={{ fontSize: 11, color: "#2C3A54", lineHeight: 1.6 }}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FIELDS */}
        {activeTab === "fields" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["all", "Account", "Opportunity"] as const).map((f) => (
                <button key={f} onClick={() => setActiveFieldObj(f)} style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 20, border: `1px solid ${activeFieldObj === f ? "#9A6000" : "#BDD0E0"}`, background: activeFieldObj === f ? "#EF9F2725" : "transparent", color: activeFieldObj === f ? "#9A6000" : "#3A4E65", cursor: "pointer", letterSpacing: "0.06em", fontFamily: "inherit", textTransform: "uppercase" }}>
                  {f === "all" ? "All objects" : f}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 16, letterSpacing: "0.04em" }}>
              Pricing floor fields live on the <span style={{ color: "#2810A0" }}>Account</span> object. Quote and gate fields live on the <span style={{ color: "#0A4080" }}>Opportunity</span> object.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E2A3A" }}>
                    {["Field", "Object", "Type", "Purpose", "Role"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.map((f, i) => (
                    <tr key={f.field + f.object} style={{ borderBottom: "1px solid #1E2A3A11", background: i % 2 === 0 ? "transparent" : "#F4F6FA" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#0D4A8A", fontWeight: 600 }}>{f.field}</td>
                      <td style={{ padding: "9px 12px" }}><ObjectBadge obj={f.object} /></td>
                      <td style={{ padding: "9px 12px", color: "#3A4E65", fontSize: 11 }}>{f.type}</td>
                      <td style={{ padding: "9px 12px", color: "#2C3A54", lineHeight: 1.4, fontSize: 11 }}>{f.purpose}</td>
                      <td style={{ padding: "9px 12px" }}><RoleBadgeField role={f.role} label={f.roleLabel} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EXCEPTIONS */}
        {activeTab === "exceptions" && (
          <div>
            <div style={{ padding: "12px 16px", borderRadius: 6, background: "#FDECEA", border: "1px solid #A32D2D33", marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.6 }}>
                <strong style={{ color: "#A32D2D" }}>Process failures only.</strong> The three permitted exceptions cover system failures, customer-requested delays, and legal disputes. There are no pricing exceptions of any kind.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {EXCEPTIONS.filter((e) => !e.isPricingException).map((ex) => (
                <div key={ex.index} style={{ padding: "16px 18px", borderRadius: 6, background: "#EAF7F1", border: "1px solid #1D9E7522" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1D9E7525", border: "1px solid #1D9E7544", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0B7A50", flexShrink: 0 }}>{ex.index}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2A42" }}>{ex.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#2C3A54", lineHeight: 1.6, paddingLeft: 32 }}>{ex.description}</p>
                </div>
              ))}
              {EXCEPTIONS.filter((e) => e.isPricingException).map((ex) => (
                <div key="pricing" style={{ padding: "16px 18px", borderRadius: 6, background: "#FDECEA", border: "1px solid #A32D2D33" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#A32D2D20", border: "1px solid #A32D2D44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#A32D2D", flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2A42" }}>{ex.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#7A2808", lineHeight: 1.6, paddingLeft: 32 }}>{ex.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1E2A3A", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF" }}>
        <span style={{ fontSize: 10, color: "#8090A8", letterSpacing: "0.06em" }}>B2B RENEWAL OPERATING MODEL · GATE 2 OF 4</span>
        <span style={{ fontSize: 10, color: "#8090A8", letterSpacing: "0.06em" }}>ACCOUNT-LEVEL PRICING · V2 · 27 APR 2026</span>
      </div>
    </div>
  );
}
