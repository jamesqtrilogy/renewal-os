import { useState } from "react";

const GATE_DATA = {
  gate1: {
    id: "gate1",
    time: "T-140",
    label: "Customer Engagement",
    accentColor: "#9A6000",
    checks: [
      { id: 1, label: "Contact record completeness", type: "blocker", desc: "Primary contact field populated, email verified (not bounced in 30 days), role = Decision-maker or Influencer.", inputs: ["CRM API read", "Email bounce ledger", "Contact role taxonomy"], pass: "Contact populated, email verified, role classified", fail: "Field empty, email bounced, or role = Unknown" },
      { id: 2, label: "Engagement signal scan", type: "blocker", desc: "Scans all engagement channels across the 40-day outreach window (T-180 to T-140). Any one qualifying signal is sufficient.", inputs: ["Email reply API", "Call log (duration filter)", "Portal login events", "Calendar API", "LinkedIn reply feed"], pass: "Email reply, call >30s, portal session >60s, meeting booked/attended, or LinkedIn reply", fail: "Zero qualifying signals across all channels in the window", exclusions: ["Email opens and link clicks", "Calls under 30 seconds (voicemail proxy)", "Auto-replies (out of office, automatic reply keywords)", "Portal logins from internal IP ranges"] },
      { id: 3, label: "Signal authenticity validation", type: "blocker", desc: "Cross-validates all signals against known false-positive patterns. Signal must originate from a verified customer domain.", inputs: ["Auto-reply keyword filter", "IP allowlist check", "Domain verification service"], pass: "Signal passes domain verification, duration threshold, and keyword exclusion filters", fail: "Signal matches a false-positive pattern or originates from a non-customer domain" },
      { id: 4, label: "Gate verdict write + CRM update", type: "blocker", desc: "Writes the binary outcome to CRM, updates the gate dashboard, and either advances the stage or locks it and fires the escalation chain.", inputs: ["CRM write API", "Audit log", "Dashboard update"], pass: "Stage advances to Engaged, gate timestamp recorded, green status written", fail: "Stage locked, failure reason logged, escalation chain triggered immediately" },
    ],
    escalation: [
      { hour: "0h", owner: "SDR", color: "#4A42CC", title: "Gate fail logged + SDR task created", desc: "Stage locked. Audit record created. SDR receives high-priority task: identify alternate contact and attempt warm outreach within 24 hours." },
      { hour: "8h", owner: "System", color: "#888780", title: "Pre-escalation check", desc: "Agent rescans for new engagement signal. If qualifying signal detected, gate may pass. If no progress, ERM pre-alert sent." },
      { hour: "24h", owner: "ERM", color: "#0B7A50", title: "Ownership transfer to ERM", desc: "SDR task closed. ERM receives deal context packet: ARR, outreach log, contact history, risk score. ERM must attempt direct engagement within 24 hours." },
      { hour: "48h", owner: "VP", color: "#D4537E", title: "VP escalation — executive engagement", desc: "VP notified with auto-generated executive outreach draft. VP must complete outreach or document justification within 24 hours." },
      { hour: "72h", owner: "SVP", color: "#A32D2D", title: "SVP flag + NNR review", desc: "Deal flagged At-Risk on executive dashboard. VP must provide written recovery plan. NNR decision logic initiated for HVO accounts.", special: true },
    ],
    fields: [
      { field: "Primary_Contact__c", type: "Lookup", purpose: "Confirmed primary contact record", role: "pass", roleLabel: "Pass condition" },
      { field: "Contact_Role__c", type: "Picklist", purpose: "Decision-maker / Influencer / Unknown", role: "pass", roleLabel: "Pass condition" },
      { field: "Last_Engagement_Signal__c", type: "DateTime", purpose: "Timestamp of most recent qualifying signal", role: "pass", roleLabel: "Pass condition" },
      { field: "Engagement_Signal_Type__c", type: "Picklist", purpose: "Reply / Call / Portal / Meeting / LinkedIn", role: "pass", roleLabel: "Pass condition" },
      { field: "Gate1_Status__c", type: "Picklist", purpose: "Pending / Pass / Fail / Escalated", role: "gate", roleLabel: "Gate output" },
      { field: "Gate1_Evaluated_At__c", type: "DateTime", purpose: "Timestamp of gate evaluation run", role: "audit", roleLabel: "Audit" },
      { field: "Gate1_Failure_Reason__c", type: "Text", purpose: "Specific failure reason (auto-populated)", role: "audit", roleLabel: "Audit" },
      { field: "Escalation_Owner__c", type: "Lookup", purpose: "Current escalation owner (SDR/ERM/VP/SVP)", role: "esc", roleLabel: "Escalation" },
      { field: "Escalation_Stage__c", type: "Picklist", purpose: "Hour-0 / Hour-24 / Hour-48 / Hour-72", role: "esc", roleLabel: "Escalation" },
      { field: "Outreach_Attempts__c", type: "Number", purpose: "Total outreach attempts logged (all channels)", role: "ctx", roleLabel: "Context" },
      { field: "Health_Score__c", type: "Number", purpose: "0–100 engagement health score (AI-computed)", role: "ctx", roleLabel: "Context" },
      { field: "Stage_Lock__c", type: "Boolean", purpose: "TRUE = stage cannot be manually advanced", role: "enforce", roleLabel: "Enforcement" },
    ],
    exceptions: [
      { i: 1, title: "Active legal dispute", desc: "VP documents a legal hold exemption. Gate 1 status = Exempt — Legal Hold. Renewal clock paused. SVP must co-approve." },
      { i: 2, title: "Confirmed M&A or company closure", desc: "VP sets Gate 1 to Exempt — Structural. NNR logic review initiated immediately." },
      { i: 3, title: "Customer-requested silence period", desc: "ERM applies Hold with reactivation date. VP must approve. Customer's written request must be attached to the CRM record." },
    ],
    noExceptionNote: "Rep unavailability, holiday periods, and CRM data errors are not valid exemptions — they are process failures that trigger remediation, not gate waivers.",
  },
  gate2: {
    id: "gate2",
    time: "T-90",
    label: "Quote Sent",
    accentColor: "#9A6000",
    checks: [
      { id: 1, label: "Quote existence check", type: "blocker", obj: "Opportunity", desc: "Queries CPQ for any quote record linked to the renewal opportunity ID. Status must be Approved or Sent.", inputs: ["CPQ API read", "Quote status taxonomy", "Opp ID linkage check"], pass: "Quote record exists, status = Approved or Sent, created on or before T-90", fail: "No quote record, or status = Draft / Cancelled" },
      { id: 2, label: "Account-level pricing floor check", type: "blocker", obj: "Account", immediateFlag: true, desc: "Aggregates Total_ARR_Quoted__c across ALL open renewal opps on the account. Unquoted opps use prior-year ARR as a conservative proxy. Also validates line-item integrity.", inputs: ["Account.Pricing_Floor__c", "All open opp ARR roll-up", "Prior-year ARR proxy (unquoted opps)", "CPQ line-item API"], pass: "Account.Total_ARR_Quoted__c ≥ Account.Pricing_Floor__c AND line-item sum variance ≤ 0.5%", fail: "Account aggregate below floor OR line-item sum mismatch > 0.5% — IMMEDIATE COMPLIANCE FLAG, no recovery window" },
      { id: 3, label: "Portal publication check", type: "blocker", obj: "Opportunity", desc: "Confirms the quote is published and customer-accessible in the renewal portal. Portal contact must match the Gate 1 confirmed primary contact.", inputs: ["Portal API read", "Contact linkage validation", "CPQ ↔ portal sync check"], pass: "quote_published = TRUE, portal_visible = TRUE, contact matches Gate 1 primary", fail: "Not published, portal_visible = FALSE, or contact mismatch" },
      { id: 4, label: "ARR accuracy validator", type: "warn", obj: "Opportunity", desc: "Cross-validates Opportunity.Total_ARR_Quoted__c against CRM ARR field and billing system. Variance > 2% creates a Sales Ops warning task. Does not block gate passage.", inputs: ["CRM ARR field", "Billing system API", "2% variance threshold"], pass: "Quoted ARR within 2% of CRM opportunity ARR and billing system contracted ARR", fail: "Variance > 2% — warning task created, discrepancy logged (does not block gate)" },
      { id: 5, label: "Explainer asset validator", type: "warn", obj: "Opportunity", desc: "Checks portal asset manifest for PO upload instructions, quote-signing explainer video, and contract expiry reminder.", inputs: ["Portal asset manifest", "Required asset config"], pass: "All three required assets present in portal", fail: "Any asset missing — SDR task created with 24hr SLA (does not block gate)" },
    ],
    floorFormula: true,
    escalation: [
      { hour: "0h", owner: "SDR", color: "#4A42CC", title: "Gate fail + SDR task created", desc: "Stage locked. Specific failure reason written to audit record. 48-hour recovery window opens for process failures." },
      { hour: "0h*", owner: "VP + Sales Ops", color: "#A32D2D", title: "Floor violation — immediate flag", desc: "No recovery window. Account total, floor, and shortfall sent immediately. The only resolution is revising quotes upward. No approval path.", immediateFlag: true },
      { hour: "12h", owner: "Sales Ops", color: "#9A6000", title: "Sales Ops escalation + auto-quote fallback", desc: "Sales Ops escalation task created. Agent auto-generates default quote if none exists and notifies SDR to review within 6 hours." },
      { hour: "24h", owner: "VP / ERM", color: "#D4537E", title: "VP notification + ERM ownership (HVO)", desc: "VP receives deal context packet. HVO formal ownership transfers to ERM. Floor violation second alert sent with updated shortfall figures." },
      { hour: "48h", owner: "SVP", color: "#A32D2D", title: "Compliance flag + SVP notification", desc: "Compliance flag raised on gate dashboard. Deal placed on at-risk register. VP must submit written recovery plan within 24 hours.", special: true },
      { hour: "72h", owner: "SVP + Legal", color: "#A32D2D", title: "NNR decision review initiated", desc: "Legal assesses whether contractual notice period has been triggered. SVP makes Go / No-Go decision within 24 hours.", special: true },
    ],
    fields: [
      { field: "Pricing_Floor__c", obj: "Account", type: "Currency", purpose: "Min acceptable total ARR across all active renewal opps. Set at T-220.", role: "pass", roleLabel: "Pass condition" },
      { field: "Prior_Year_Total_ARR__c", obj: "Account", type: "Currency", purpose: "Sum of all contracted ARR in prior term. Source of truth for floor calculation.", role: "pass", roleLabel: "Pass condition" },
      { field: "Total_ARR_Quoted__c", obj: "Account", type: "Currency", purpose: "Roll-up sum of all open renewal opp quoted ARRs. Updated dynamically.", role: "pass", roleLabel: "Pass condition" },
      { field: "Floor_Shortfall__c", obj: "Account", type: "Currency", purpose: "Auto-computed: Pricing_Floor__c minus Total_ARR_Quoted__c. Positive = shortfall.", role: "compliance", roleLabel: "Compliance" },
      { field: "Pricing_Floor_Violated__c", obj: "Account", type: "Boolean", purpose: "Immutable flag — never reset. Feeds quarterly leakage audit.", role: "compliance", roleLabel: "Compliance" },
      { field: "Quote_ID__c", obj: "Opportunity", type: "Lookup", purpose: "CPQ quote linked to this renewal opp.", role: "pass", roleLabel: "Pass condition" },
      { field: "Quote_Status__c", obj: "Opportunity", type: "Picklist", purpose: "Draft / Pending Approval / Approved / Sent. Must be Approved or Sent.", role: "pass", roleLabel: "Pass condition" },
      { field: "Total_ARR_Quoted__c", obj: "Opportunity", type: "Currency", purpose: "Total quoted ARR for this opp. Rolls up to Account.", role: "pass", roleLabel: "Pass condition" },
      { field: "Portal_Published__c", obj: "Opportunity", type: "Boolean", purpose: "TRUE = quote live and customer-accessible in portal.", role: "pass", roleLabel: "Pass condition" },
      { field: "Gate2_Status__c", obj: "Opportunity", type: "Picklist", purpose: "Pending / Pass / Fail / Escalated / Exempt.", role: "gate", roleLabel: "Gate output" },
      { field: "Gate2_Failure_Reason__c", obj: "Opportunity", type: "Text", purpose: "Specific auto-populated failure reason with shortfall amounts.", role: "gate", roleLabel: "Gate output" },
      { field: "Gate2_Evaluated_At__c", obj: "Opportunity", type: "DateTime", purpose: "Timestamp of gate evaluation run.", role: "audit", roleLabel: "Audit" },
      { field: "Uplift_Pct_Applied__c", obj: "Opportunity", type: "Percent", purpose: "Actual uplift % on this opp vs prior-year. For analytics only.", role: "pricing", roleLabel: "Pricing audit" },
      { field: "Stage_Lock__c", obj: "Opportunity", type: "Boolean", purpose: "TRUE = stage blocked from manual advancement at the API level.", role: "enforce", roleLabel: "Enforcement" },
    ],
    exceptions: [
      { i: 1, title: "ERP / CPQ integration failure", desc: "Technical hold with SVP notification. Gate 2 status = Exempt — System Failure. Maximum 72-hour hold before SVP review." },
      { i: 2, title: "Customer-requested quote delay", desc: "Customer has formally requested delayed delivery in writing. ERM applies Customer Hold with reactivation date. VP must approve. Written request must be attached to CRM." },
      { i: 3, title: "Active legal dispute", desc: "VP and SVP co-approval required. Renewal clock paused. Legal owns the resolution timeline. Gate 2 status = Exempt — Legal Hold." },
    ],
    noExceptionNote: "No pricing exceptions exist. The account-level floor is absolute. There is no VP approval path, no strategic account carve-out, and no exception workflow for quoting below the floor.",
    noPricingNote: true,
  },
};

const ROLE_COLORS = {
  pass: { bg: "#EAF7F1", text: "#0B7A50", border: "#1D9E7530" },
  gate: { bg: "#FDF0EC", text: "#D85A30", border: "#D85A3030" },
  audit: { bg: "#FDF0EC", text: "#D85A30", border: "#D85A3030" },
  esc: { bg: "#FEF6E8", text: "#9A6000", border: "#EF9F2730" },
  ctx: { bg: "#F0F0F0", text: "#888780", border: "#88878033" },
  enforce: { bg: "#F1F0FE", text: "#2810A0", border: "#6C63FF30" },
  compliance: { bg: "#FDECEA", text: "#A32D2D", border: "#A32D2D30" },
  pricing: { bg: "#FEF6E8", text: "#9A6000", border: "#EF9F2730" },
  hvo: { bg: "#F1F0FE", text: "#4A42CC", border: "#6C63FF30" },
};

function RoleBadge({ role, label }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.ctx;
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, whiteSpace: "nowrap" }}>{label}</span>;
}

function ObjBadge({ obj }) {
  const c = obj === "Account" ? { bg: "#EEEDFE", text: "#2810A0", border: "#2810A0" } : { bg: "#E6F1FB", text: "#0A4080", border: "#1E5080" };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: c.bg, color: c.text, border: `1px solid ${c.border}`, letterSpacing: "0.05em" }}>{obj.toUpperCase()}</span>;
}

function GateView({ data }) {
  const [activeCheck, setActiveCheck] = useState(null);
  const [runStatus, setRunStatus] = useState({});
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [tab, setTab] = useState("checks");
  const [fieldFilter, setFieldFilter] = useState("all");

  const simulate = async (outcome) => {
    setSimRunning(true); setSimResult(null);
    const init = {};
    data.checks.forEach(c => { init[c.id] = "idle"; });
    setRunStatus(init);
    const failAt = outcome === "pass" ? 99 : outcome === "floor" ? 2 : 3;
    for (let i = 1; i <= data.checks.length; i++) {
      setRunStatus(p => ({ ...p, [i]: "running" }));
      await new Promise(r => setTimeout(r, 600));
      if (i === failAt) {
        setRunStatus(p => ({ ...p, [i]: "fail" }));
        for (let j = i + 1; j <= data.checks.length; j++) setRunStatus(p => ({ ...p, [j]: "idle" }));
        setSimResult(outcome); setSimRunning(false); return;
      }
      setRunStatus(p => ({ ...p, [i]: i >= (data.checks.length - 1) ? "warn" : "pass" }));
    }
    setSimResult("pass"); setSimRunning(false);
  };

  const reset = () => { const r = {}; data.checks.forEach(c => { r[c.id] = "idle"; }); setRunStatus(r); setSimResult(null); setActiveCheck(null); };

  const dotColor = { idle: "#8090A8", running: "#9A6000", pass: "#0B7A50", fail: "#D85A30", warn: "#9A6000" };
  const tabs = data.floorFormula
    ? [{ k: "checks", l: "Evaluation checks" }, { k: "floor", l: "Floor model" }, { k: "escalation", l: "Escalation chain" }, { k: "fields", l: "CRM fields" }, { k: "exceptions", l: "Exceptions" }]
    : [{ k: "checks", l: "Evaluation checks" }, { k: "escalation", l: "Escalation chain" }, { k: "fields", l: "CRM fields" }, { k: "exceptions", l: "Exceptions" }];

  const filteredFields = fieldFilter === "all" ? data.fields : data.fields.filter(f => (f.obj || "Opportunity") === fieldFilter);

  const resultMessages = {
    pass: { color: "#0B7A50", icon: "✓", msg: `GATE PASSED — Stage advancing. Audit record written.` },
    fail: { color: "#D85A30", icon: "✗", msg: `GATE FAILED — Stage locked. 48-hour recovery window open.` },
    floor: { color: "#A32D2D", icon: "✗", msg: `PRICING FLOOR VIOLATION — Immediate compliance flag. No recovery window. VP and Sales Ops notified.` },
  };

  return (
    <div style={{ background: "#F2F4F8", color: "#1A2A42", fontFamily: "'DM Mono','Courier New',monospace", borderRadius: 12, overflow: "hidden", border: "1px solid #DDE4EE" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "20px 24px 16px", borderBottom: "1px solid #1E2A3A" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9A6000", letterSpacing: "0.1em", textTransform: "uppercase" }}>Gate {data.id === "gate1" ? "1" : "2"} · {data.time}</span>
              <span style={{ width: 1, height: 10, background: "#8090A8" }} />
              <span style={{ fontSize: 10, color: "#3A4E65", letterSpacing: "0.06em" }}>AI ENFORCEMENT ENGINE</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F1A2E", letterSpacing: "-0.02em", margin: 0 }}>{data.label}</h2>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => simulate("pass")} disabled={simRunning} style={{ fontSize: 10, fontWeight: 700, padding: "6px 12px", borderRadius: 5, border: "1px solid #1D9E75", background: "#D6F0E6", color: "#0B7A50", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pass</button>
            {data.floorFormula && <button onClick={() => simulate("floor")} disabled={simRunning} style={{ fontSize: 10, fontWeight: 700, padding: "6px 12px", borderRadius: 5, border: "1px solid #A32D2D", background: "#FDECEA", color: "#A32D2D", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Floor fail</button>}
            <button onClick={() => simulate("fail")} disabled={simRunning} style={{ fontSize: 10, fontWeight: 700, padding: "6px 12px", borderRadius: 5, border: "1px solid #D85A30", background: "#FCE4DA", color: "#D85A30", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Fail</button>
            <button onClick={reset} style={{ fontSize: 10, padding: "6px 10px", borderRadius: 5, border: "1px solid #DDE4EE", background: "transparent", color: "#3A4E65", cursor: "pointer", fontFamily: "inherit" }}>Reset</button>
          </div>
        </div>
        {simResult && (() => { const cfg = resultMessages[simResult]; return (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 5, border: `1px solid ${cfg.color}`, background: cfg.color + "28", color: cfg.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
            {cfg.icon} {cfg.msg}
          </div>
        ); })()}
      </div>

      {/* Tabs */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #1E2A3A", padding: "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ fontSize: 10, fontWeight: 600, padding: "10px 14px", border: "none", borderBottom: tab === t.k ? "2px solid #EF9F27" : "2px solid transparent", background: "transparent", color: tab === t.k ? "#9A6000" : "#3A4E65", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>

        {tab === "checks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.checks.map(check => {
              const st = runStatus[check.id] || "idle";
              const isOpen = activeCheck === check.id;
              const sc = dotColor[st];
              return (
                <div key={check.id}>
                  <div onClick={() => setActiveCheck(isOpen ? null : check.id)} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 12, padding: "12px 14px", borderRadius: 5, border: `1px solid ${isOpen ? "#EF9F2755" : sc + "33"}`, background: isOpen ? "#E8EEF8" : st !== "idle" ? sc + "20" : "#F4F6FA", cursor: "pointer", marginBottom: 2, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: sc, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ fontSize: 10, color: "#3A4E65", fontWeight: 700 }}>{String(check.id).padStart(2, "0")}</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2A42" }}>{check.label}</span>
                        {check.obj && <ObjBadge obj={check.obj} />}
                        {check.immediateFlag && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "#FDECEA", color: "#A32D2D", border: "1px solid #A32D2D44" }}>IMMEDIATE FLAG</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#3A4E65", marginTop: 2 }}>{check.type === "blocker" ? "Binary blocker" : "Warning validator"} · {check.inputs.length} data sources</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {st !== "idle" && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: sc + "30", color: sc, border: `1px solid ${sc}44`, letterSpacing: "0.08em" }}>{st.toUpperCase()}</span>}
                      <span style={{ color: "#3A4E65", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ margin: "2px 0 4px", padding: "14px 18px", borderRadius: 5, border: "1px solid #DDE4EE", background: "#FFFFFF" }}>
                      <p style={{ fontSize: 11, color: "#2C3A54", lineHeight: 1.6, marginBottom: 14 }}>{check.desc}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                        <div style={{ padding: "10px 12px", borderRadius: 5, background: "#EAF7F1", border: "1px solid #1D9E7533" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#0B7A50", letterSpacing: "0.08em", marginBottom: 5 }}>PASS</div>
                          <p style={{ fontSize: 11, color: "#075030", lineHeight: 1.5 }}>{check.pass}</p>
                        </div>
                        <div style={{ padding: "10px 12px", borderRadius: 5, background: check.immediateFlag ? "#FDECEA" : "#FDF0EC", border: `1px solid ${check.immediateFlag ? "#A32D2D40" : "#D85A3030"}` }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: check.immediateFlag ? "#A32D2D" : "#D85A30", letterSpacing: "0.08em", marginBottom: 5 }}>FAIL</div>
                          <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.5 }}>{check.fail}</p>
                        </div>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", marginBottom: 6 }}>DATA SOURCES</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {check.inputs.map(inp => <span key={inp} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#E8EEF8", border: "1px solid #2A3A4A", color: "#2C3A54" }}>{inp}</span>)}
                      </div>
                      {check.exclusions && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", marginBottom: 6 }}>EXCLUDED SIGNALS</div>
                          {check.exclusions.map(ex => <div key={ex} style={{ fontSize: 11, color: "#455060", padding: "2px 0" }}>· {ex}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "floor" && data.floorFormula && (
          <div>
            <div style={{ background: "#EEF0F5", border: "1px solid #DDE4EE", borderRadius: 6, padding: "14px 18px", marginBottom: 14, fontSize: 12, lineHeight: 2 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.1em", marginBottom: 10 }}>ACCOUNT-LEVEL FLOOR FORMULA</div>
              <div style={{ color: "#3A4E65", fontSize: 11 }}>// Account floor (Account object, set at T-220)</div>
              <div><span style={{ color: "#2810A0" }}>Account</span><span style={{ color: "#1A2A42" }}>.Pricing_Floor__c</span><span style={{ color: "#3A4E65" }}> = </span><span style={{ color: "#2810A0" }}>Account</span><span style={{ color: "#1A2A42" }}>.Prior_Year_Total_ARR__c</span><span style={{ color: "#9A6000" }}> × </span><span style={{ color: "#0B7A50" }}>Segment_Uplift_Multiplier</span></div>
              <div style={{ color: "#3A4E65", fontSize: 11, marginTop: 8 }}>// Gate 2 pricing check</div>
              <div><span style={{ color: "#0B7A50" }}>PASS if </span><span style={{ color: "#1A2A42" }}>Account.Total_ARR_Quoted__c ≥ Account.Pricing_Floor__c</span></div>
              <div><span style={{ color: "#D85A30" }}>FAIL if </span><span style={{ color: "#1A2A42" }}>Account.Total_ARR_Quoted__c &lt; Account.Pricing_Floor__c</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "14px 16px", borderRadius: 6, background: "#EAF7F1", border: "1px solid #1D9E7533" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#0B7A50", letterSpacing: "0.08em", marginBottom: 10 }}>EXAMPLE A — GATE PASSES</div>
                {[["Opp 1 quoted", "$75k (was $80k)"], ["Opp 2 quoted", "$65k (was $60k)"], ["Opp 3 quoted", "$45k (was $40k)"], ["Account total", "$185k"], ["Floor ($180k + 2%)", "$183.6k"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2C3A54", padding: "3px 0", borderBottom: "1px solid #1D9E7511" }}><span>{k}</span><span>{v}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#0B7A50", padding: "6px 0 0", fontWeight: 700 }}><span>Result</span><span>PASS ✓</span></div>
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 6, background: "#FDF0EC", border: "1px solid #D85A3033" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#D85A30", letterSpacing: "0.08em", marginBottom: 10 }}>EXAMPLE B — GATE FAILS</div>
                {[["Opp 1 quoted", "$72k (was $80k)"], ["Opp 2 quoted", "$58k (was $60k)"], ["Opp 3 quoted", "$40k (was $40k)"], ["Account total", "$170k"], ["Floor ($180k + 2%)", "$183.6k"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2C3A54", padding: "3px 0", borderBottom: "1px solid #D85A3011" }}><span>{k}</span><span>{v}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D85A30", padding: "6px 0 0", fontWeight: 700 }}><span>Shortfall</span><span>$13.6k — FAIL ✗</span></div>
              </div>
            </div>
          </div>
        )}

        {tab === "escalation" && (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 56, top: 18, bottom: 18, width: 1, background: "#BDD0E0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.escalation.map((step, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "54px 20px 1fr", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ textAlign: "right", paddingTop: 13, fontSize: 10, fontWeight: 700, color: step.immediateFlag ? "#A32D2D" : "#3A4E65" }}>{step.hour}</div>
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 16 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: step.color, zIndex: 1 }} />
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: 5, border: `1px solid ${step.immediateFlag ? "#A32D2D40" : step.special ? "#A32D2D20" : "#BDD0E0"}`, background: step.immediateFlag ? "#FDECEA" : step.special ? "#FDECEA" : "#F4F6FA", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2A42" }}>{step.title}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: step.color + "22", color: step.color, border: `1px solid ${step.color}44`, letterSpacing: "0.04em", textTransform: "uppercase" }}>{step.owner}</span>
                      {step.immediateFlag && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "#FDECEA", color: "#A32D2D", border: "1px solid #A32D2D44" }}>NO RECOVERY WINDOW</span>}
                    </div>
                    <p style={{ fontSize: 11, color: "#2C3A54", lineHeight: 1.5 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "fields" && (
          <div>
            {data.floorFormula && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["all", "Account", "Opportunity"].map(f => (
                  <button key={f} onClick={() => setFieldFilter(f)} style={{ fontSize: 10, fontWeight: 600, padding: "5px 12px", borderRadius: 20, border: `1px solid ${fieldFilter === f ? "#9A6000" : "#BDD0E0"}`, background: fieldFilter === f ? "#EF9F2725" : "transparent", color: fieldFilter === f ? "#9A6000" : "#3A4E65", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E2A3A" }}>
                    {["Field", ...(data.floorFormula ? ["Object"] : []), "Type", "Purpose", "Role"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.map((f, i) => (
                    <tr key={f.field + (f.obj || "")} style={{ borderBottom: "1px solid #1E2A3A11", background: i % 2 === 0 ? "transparent" : "#F4F6FA" }}>
                      <td style={{ padding: "8px 10px", fontFamily: "inherit", fontSize: 10, color: "#0D4A8A", fontWeight: 600 }}>{f.field}</td>
                      {data.floorFormula && <td style={{ padding: "8px 10px" }}>{f.obj && <ObjBadge obj={f.obj} />}</td>}
                      <td style={{ padding: "8px 10px", color: "#3A4E65", fontSize: 10 }}>{f.type}</td>
                      <td style={{ padding: "8px 10px", color: "#2C3A54", lineHeight: 1.4, fontSize: 10 }}>{f.purpose}</td>
                      <td style={{ padding: "8px 10px" }}><RoleBadge role={f.role} label={f.roleLabel} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "exceptions" && (
          <div>
            <div style={{ padding: "10px 14px", borderRadius: 5, background: "#FDECEA", border: "1px solid #A32D2D33", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.6 }}>
                {data.noPricingNote ? "Process failures only. No pricing exceptions exist." : "All exceptions require VP approval and written documentation in the CRM record. Reviewed quarterly."}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.exceptions.map(ex => (
                <div key={ex.i} style={{ padding: "14px 16px", borderRadius: 5, background: "#EAF7F1", border: "1px solid #1D9E7522" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1D9E7525", border: "1px solid #1D9E7544", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#0B7A50", flexShrink: 0 }}>{ex.i}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2A42" }}>{ex.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#2C3A54", lineHeight: 1.6, paddingLeft: 28 }}>{ex.desc}</p>
                </div>
              ))}
              {data.noPricingNote && (
                <div style={{ padding: "14px 16px", borderRadius: 5, background: "#FDECEA", border: "1px solid #A32D2D33" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#A32D2D20", border: "1px solid #A32D2D44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#A32D2D", flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2A42" }}>No pricing exceptions exist</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.6, paddingLeft: 28 }}>{data.noExceptionNote}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #1E2A3A", padding: "10px 24px", display: "flex", justifyContent: "space-between", background: "#FFFFFF" }}>
        <span style={{ fontSize: 9, color: "#8090A8", letterSpacing: "0.06em" }}>B2B RENEWAL OPERATING MODEL · {data.id === "gate1" ? "GATE 1 OF 4" : "GATE 2 OF 4"}</span>
        <span style={{ fontSize: 9, color: "#8090A8", letterSpacing: "0.06em" }}>27 APR 2026</span>
      </div>
    </div>
  );
}

export default function GatePreview() {
  const [activeGate, setActiveGate] = useState("gate1");
  const gate = GATE_DATA[activeGate];

  return (
    <div style={{ background: "#ECEEF4", minHeight: "100vh", padding: "24px 20px", fontFamily: "'DM Mono','Courier New',monospace" }}>
      {/* Top switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>B2B Renewal Operating Model</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0F1A2E" }}>AI Gate Enforcement Logic</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["gate1", "Gate 1 — T-140"], ["gate2", "Gate 2 — T-90"]].map(([k, l]) => (
            <button key={k} onClick={() => setActiveGate(k)} style={{ fontSize: 11, fontWeight: 700, padding: "8px 16px", borderRadius: 6, border: `1px solid ${activeGate === k ? "#9A6000" : "#BDD0E0"}`, background: activeGate === k ? "#EF9F2725" : "#FFFFFF", color: activeGate === k ? "#9A6000" : "#3A4E65", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.15s" }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <GateView data={gate} key={activeGate} />
    </div>
  );
}
