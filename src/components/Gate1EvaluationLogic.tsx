import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type CheckStatus = "idle" | "running" | "pass" | "fail" | "warn";

interface Check {
  id: number;
  label: string;
  type: "blocker" | "warn";
  description: string;
  inputs: string[];
  passCondition: string;
  failCondition: string;
  exclusions?: string[];
}

interface EscalationStep {
  hour: string;
  owner: string;
  ownerColor: string;
  title: string;
  description: string;
  special?: boolean;
}

interface ExceptionRule {
  index: number;
  title: string;
  description: string;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CHECKS: Check[] = [
  {
    id: 1,
    label: "Contact record completeness",
    type: "blocker",
    description:
      "Validates primary contact field, email deliverability, and role classification against the contact taxonomy.",
    inputs: ["CRM API read", "Email bounce ledger", "Contact role taxonomy"],
    passCondition:
      "Primary contact populated, email verified (not bounced in 30 days), role = Decision-maker or Influencer",
    failCondition:
      "Contact field empty, email bounced, or role = Unknown / Undefined",
  },
  {
    id: 2,
    label: "Engagement signal scan",
    type: "blocker",
    description:
      "Scans all engagement channels across the 40-day outreach window (T-180 to T-140) for a qualifying customer-side response.",
    inputs: [
      "Email reply API",
      "Call log (duration filter)",
      "Portal login events",
      "Calendar API",
      "LinkedIn reply feed",
    ],
    passCondition:
      "Any one qualifying signal: email reply, call >30s, portal session >60s, meeting booked/attended, LinkedIn reply",
    failCondition: "Zero qualifying signals across all channels in the window",
    exclusions: [
      "Email opens and link clicks",
      "Calls under 30 seconds (voicemail proxy)",
      "Auto-replies (out of office, on leave, automatic reply keywords)",
      "Portal logins from internal IP ranges",
    ],
  },
  {
    id: 3,
    label: "Signal authenticity validation",
    type: "blocker",
    description:
      "Cross-validates all signals against known false-positive patterns. Signal must originate from a verified customer domain.",
    inputs: [
      "Auto-reply keyword filter",
      "IP allowlist check",
      "Domain verification service",
    ],
    passCondition:
      "Signal passes domain verification, duration threshold, and keyword exclusion filters",
    failCondition:
      "Signal matches a false-positive pattern or originates from a non-customer domain",
  },
  {
    id: 4,
    label: "Gate verdict write + CRM update",
    type: "blocker",
    description:
      "Writes the binary outcome to CRM, updates the gate dashboard, and either advances the stage or locks it and fires the escalation chain.",
    inputs: ["CRM write API", "Audit log", "Dashboard update"],
    passCondition:
      "Stage advances to Engaged, gate timestamp recorded, green status written to dashboard",
    failCondition:
      "Stage locked, failure reason logged with specificity, escalation chain triggered immediately",
  },
];

const ESCALATION: EscalationStep[] = [
  {
    hour: "0h",
    owner: "SDR",
    ownerColor: "#4A42CC",
    title: "Gate fail logged + SDR task created",
    description:
      "CRM stage locked. Audit record created with failure reason. SDR receives high-priority task: identify alternate contact and attempt warm outreach within 24 hours.",
  },
  {
    hour: "8h",
    owner: "System",
    ownerColor: "#888780",
    title: "Pre-escalation check — SDR progress scan",
    description:
      "Agent rescans for new engagement signal or contact update. If qualifying signal detected, gate re-evaluates and may pass. If no progress, ERM pre-alert sent.",
  },
  {
    hour: "24h",
    owner: "ERM",
    ownerColor: "#0B7A50",
    title: "Ownership transfer to ERM",
    description:
      "SDR task closed. ERM receives deal context packet: account ARR, prior outreach log, contact history, risk score. ERM must attempt direct engagement within 24 hours.",
  },
  {
    hour: "48h",
    owner: "VP",
    ownerColor: "#D4537E",
    title: "VP escalation — executive engagement required",
    description:
      "VP notified via Slack and email with auto-generated executive outreach draft. VP must complete outreach or document justification (e.g. legal dispute) within 24 hours.",
  },
  {
    hour: "72h",
    owner: "SVP",
    ownerColor: "#A32D2D",
    title: "SVP notification + risk flag",
    description:
      "Deal flagged At-Risk on executive dashboard. VP must provide written recovery plan within 24 hours. NNR decision logic review initiated for HVO accounts.",
    special: true,
  },
];

const EXCEPTIONS: ExceptionRule[] = [
  {
    index: 1,
    title: "Active legal dispute",
    description:
      "VP documents a legal hold exemption. Gate 1 status set to Exempt — Legal Hold. Renewal clock paused pending legal resolution. SVP must co-approve.",
  },
  {
    index: 2,
    title: "Confirmed M&A or company closure",
    description:
      "If intelligence signals indicate the customer entity is under acquisition or closure, VP sets Gate 1 to Exempt — Structural. NNR logic review initiated immediately.",
  },
  {
    index: 3,
    title: "Customer-requested silence period",
    description:
      "Prior written customer request (e.g. board approval pending). ERM applies Hold status with reactivation date. VP must approve. Reactivation is automatic.",
  },
];

const CRM_FIELDS = [
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
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function RolePill({ label, color }: { label: string; color: string }) {
  const bg = color + "22";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        background: bg,
        color,
        border: `1px solid ${color}44`,
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: CheckStatus }) {
  const colors: Record<CheckStatus, string> = {
    idle: "#444",
    running: "#9A6000",
    pass: "#0B7A50",
    fail: "#D85A30",
    warn: "#9A6000",
  };
  const size = status === "running" ? 10 : 10;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors[status],
        boxShadow: status === "running" ? `0 0 6px ${colors.running}` : "none",
        flexShrink: 0,
        transition: "all 0.3s ease",
      }}
    />
  );
}

function RoleBadgeField({ role, label }: { role: string; label: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pass: { bg: "#E1F5EE", text: "#085041", border: "#0B7A50" },
    gate: { bg: "#FAECE7", text: "#4A1B0C", border: "#D85A30" },
    audit: { bg: "#FAECE7", text: "#4A1B0C", border: "#D85A30" },
    esc: { bg: "#FAEEDA", text: "#633806", border: "#9A6000" },
    ctx: { bg: "#F1EFE8", text: "#444441", border: "#888780" },
    enforce: { bg: "#EEEDFE", text: "#3C3489", border: "#7F77DD" },
  };
  const c = colors[role] || colors.ctx;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        background: c.bg,
        color: c.text,
        border: `0.5px solid ${c.border}`,
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Gate1EvaluationLogic() {
  const [activeCheck, setActiveCheck] = useState<number | null>(null);
  const [runStatus, setRunStatus] = useState<Record<number, CheckStatus>>({
    1: "idle", 2: "idle", 3: "idle", 4: "idle",
  });
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<"pass" | "fail" | null>(null);
  const [activeTab, setActiveTab] = useState<"checks" | "escalation" | "fields" | "exceptions">("checks");

  const runSimulation = async (outcome: "pass" | "fail") => {
    setSimRunning(true);
    setSimResult(null);
    setRunStatus({ 1: "idle", 2: "idle", 3: "idle", 4: "idle" });
    const failAt = outcome === "fail" ? 2 : 99;
    for (let i = 1; i <= 4; i++) {
      setRunStatus((p) => ({ ...p, [i]: "running" }));
      await new Promise((r) => setTimeout(r, 700));
      if (i === failAt) {
        setRunStatus((p) => ({ ...p, [i]: "fail" }));
        for (let j = i + 1; j <= 4; j++) {
          setRunStatus((p) => ({ ...p, [j]: "idle" }));
        }
        setSimResult("fail");
        setSimRunning(false);
        return;
      }
      setRunStatus((p) => ({ ...p, [i]: "pass" }));
    }
    setSimResult("pass");
    setSimRunning(false);
  };

  const reset = () => {
    setRunStatus({ 1: "idle", 2: "idle", 3: "idle", 4: "idle" });
    setSimResult(null);
    setActiveCheck(null);
  };

  const TAB_LABELS = [
    { key: "checks", label: "Evaluation checks" },
    { key: "escalation", label: "Escalation chain" },
    { key: "fields", label: "CRM field model" },
    { key: "exceptions", label: "Exception rules" },
  ] as const;

  return (
    <div
      style={{
        fontFamily: "'DM Mono', 'Courier New', monospace",
        background: "#F2F4F8",
        color: "#1A2A42",
        minHeight: "100vh",
        padding: "0",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1E2A3A",
          padding: "28px 32px 20px",
          background: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#9A6000", textTransform: "uppercase" }}>
                Gate 1 · T-140
              </span>
              <span style={{ width: 1, height: 12, background: "#BDD0E0" }} />
              <span style={{ fontSize: 10, color: "#3A4E65", letterSpacing: "0.08em" }}>AI ENFORCEMENT ENGINE</span>
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#0F1A2E",
                letterSpacing: "-0.02em",
                margin: 0,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Customer Engagement
            </h1>
            <p style={{ fontSize: 12, color: "#3A4E65", marginTop: 6, letterSpacing: "0.02em" }}>
              Hard gate · Binary pass/fail · Stage lock on failure · Escalation chain auto-fires
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => runSimulation("pass")}
              disabled={simRunning}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #1D9E75",
                background: simRunning ? "transparent" : "#D6F0E6",
                color: "#0B7A50",
                cursor: simRunning ? "not-allowed" : "pointer",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "inherit",
              }}
            >
              Simulate PASS
            </button>
            <button
              onClick={() => runSimulation("fail")}
              disabled={simRunning}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #D85A30",
                background: simRunning ? "transparent" : "#FCE4DA",
                color: "#D85A30",
                cursor: simRunning ? "not-allowed" : "pointer",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "inherit",
              }}
            >
              Simulate FAIL
            </button>
            <button
              onClick={reset}
              style={{
                fontSize: 11,
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid #1E2A3A",
                background: "transparent",
                color: "#3A4E65",
                cursor: "pointer",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "inherit",
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Gate result banner */}
        {simResult && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 6,
              border: `1px solid ${simResult === "pass" ? "#0B7A50" : "#D85A30"}`,
              background: simResult === "pass" ? "#EAF7F1" : "#FDF0EC",
              color: simResult === "pass" ? "#0B7A50" : "#D85A30",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>{simResult === "pass" ? "✓" : "✗"}</span>
            {simResult === "pass"
              ? "GATE 1 PASSED — Stage advancing to Engaged. Audit record written."
              : "GATE 1 FAILED — Stage locked. Escalation chain triggered. Audit record written with failure reason."}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #1E2A3A", padding: "0 32px", background: "#FFFFFF" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {TAB_LABELS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "12px 18px",
                border: "none",
                borderBottom: activeTab === t.key ? "2px solid #EF9F27" : "2px solid transparent",
                background: "transparent",
                color: activeTab === t.key ? "#9A6000" : "#3A4E65",
                cursor: "pointer",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "inherit",
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* ── CHECKS TAB ── */}
        {activeTab === "checks" && (
          <div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 20, letterSpacing: "0.04em" }}>
              Four sequential checks. Checks 1–3 are binary blockers. Check 4 writes the verdict. Click any check for full detail.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {CHECKS.map((check, idx) => {
                const st = runStatus[check.id];
                const isActive = activeCheck === check.id;
                const statusColor = st === "pass" ? "#0B7A50" : st === "fail" ? "#D85A30" : st === "running" ? "#9A6000" : "#8090A8";
                return (
                  <div key={check.id}>
                    <div
                      onClick={() => setActiveCheck(isActive ? null : check.id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px 1fr auto",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 16px",
                        borderRadius: 6,
                        border: `1px solid ${isActive ? "#EF9F2766" : statusColor + "44"}`,
                        background: isActive ? "#E8EEF8" : st !== "idle" ? statusColor + "18" : "#F4F6FA",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        marginBottom: 2,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot status={st} />
                        <span style={{ fontSize: 11, color: "#3A4E65", fontWeight: 700 }}>
                          {String(check.id).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2A42", letterSpacing: "0.01em" }}>
                          {check.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#3A4E65", marginTop: 2 }}>
                          {check.type === "blocker" ? "Binary blocker" : "Warning validator"} · {check.inputs.length} data sources
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {st !== "idle" && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            background: statusColor + "30", color: statusColor, border: `1px solid ${statusColor}44`,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                          }}>
                            {st.toUpperCase()}
                          </span>
                        )}
                        <span style={{ color: "#3A4E65", fontSize: 12 }}>{isActive ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isActive && (
                      <div
                        style={{
                          margin: "2px 0 4px",
                          padding: "16px 20px",
                          borderRadius: 6,
                          border: "1px solid #1E2A3A",
                          background: "#FFFFFF",
                        }}
                      >
                        <p style={{ fontSize: 12, color: "#2C3A54", lineHeight: 1.6, marginBottom: 16 }}>
                          {check.description}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                          <div style={{ padding: "12px 14px", borderRadius: 6, background: "#EAF7F1", border: "1px solid #1D9E7533" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#0B7A50", letterSpacing: "0.08em", marginBottom: 6 }}>PASS CONDITION</div>
                            <p style={{ fontSize: 11, color: "#075030", lineHeight: 1.5 }}>{check.passCondition}</p>
                          </div>
                          <div style={{ padding: "12px 14px", borderRadius: 6, background: "#FDF0EC", border: "1px solid #D85A3033" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#D85A30", letterSpacing: "0.08em", marginBottom: 6 }}>FAIL CONDITION</div>
                            <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.5 }}>{check.failCondition}</p>
                          </div>
                        </div>
                        <div style={{ marginBottom: check.exclusions ? 12 : 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", marginBottom: 8 }}>DATA SOURCES</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {check.inputs.map((inp) => (
                              <span key={inp} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "#E8EEF8", border: "1px solid #2A3A4A", color: "#2C3A54" }}>
                                {inp}
                              </span>
                            ))}
                          </div>
                        </div>
                        {check.exclusions && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", marginBottom: 8 }}>EXCLUDED SIGNALS</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {check.exclusions.map((ex) => (
                                <div key={ex} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#455060" }}>
                                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#D85A3066", flexShrink: 0 }} />
                                  {ex}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ESCALATION TAB ── */}
        {activeTab === "escalation" && (
          <div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 20, letterSpacing: "0.04em" }}>
              Time-gated escalation ladder. Triggers automatically on gate failure — no manual initiation required.
            </p>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 54, top: 20, bottom: 20, width: 1, background: "#BDD0E0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {ESCALATION.map((step) => (
                  <div key={step.hour} style={{ display: "grid", gridTemplateColumns: "52px 24px 1fr", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ textAlign: "right", paddingTop: 14, fontSize: 11, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.06em" }}>
                      {step.hour}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: step.special ? "#A32D2D" : step.ownerColor,
                        border: `2px solid ${step.special ? "#A32D2D" : step.ownerColor}33`,
                        flexShrink: 0, zIndex: 1,
                      }} />
                    </div>
                    <div style={{
                      padding: "12px 14px",
                      borderRadius: 6,
                      border: `1px solid ${step.special ? "#A32D2D30" : "#BDD0E0"}`,
                      background: step.special ? "#FDECEA" : "#F4F6FA",
                      marginBottom: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2A42" }}>{step.title}</span>
                        <RolePill label={step.owner} color={step.ownerColor} />
                      </div>
                      <p style={{ fontSize: 11, color: "#2C3A54", lineHeight: 1.6 }}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FIELDS TAB ── */}
        {activeTab === "fields" && (
          <div>
            <p style={{ fontSize: 11, color: "#3A4E65", marginBottom: 20, letterSpacing: "0.04em" }}>
              Salesforce Opportunity object fields required for gate evaluation, audit trail, and stage lock enforcement.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E2A3A" }}>
                    {["Field", "Type", "Purpose", "Role"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#3A4E65", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CRM_FIELDS.map((f, i) => (
                    <tr key={f.field} style={{ borderBottom: "1px solid #1E2A3A11", background: i % 2 === 0 ? "transparent" : "#F4F6FA" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#0D4A8A", fontWeight: 600 }}>
                        {f.field}
                      </td>
                      <td style={{ padding: "9px 12px", color: "#3A4E65", fontSize: 11 }}>{f.type}</td>
                      <td style={{ padding: "9px 12px", color: "#2C3A54", lineHeight: 1.4 }}>{f.purpose}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <RoleBadgeField role={f.role} label={f.roleLabel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EXCEPTIONS TAB ── */}
        {activeTab === "exceptions" && (
          <div>
            <div style={{ padding: "12px 16px", borderRadius: 6, background: "#FDF0EC", border: "1px solid #D85A3033", marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "#7A2808", lineHeight: 1.6 }}>
                <strong style={{ color: "#D85A30" }}>No uncontrolled deviations permitted.</strong> All exceptions require VP approval and written documentation attached to the CRM record. Exceptions are reviewed quarterly for compliance patterns.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {EXCEPTIONS.map((ex) => (
                <div key={ex.index} style={{ padding: "16px 18px", borderRadius: 6, background: "#EAF7F1", border: "1px solid #1D9E7522" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1D9E7525", border: "1px solid #1D9E7544", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0B7A50", flexShrink: 0 }}>
                      {ex.index}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2A42" }}>{ex.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#2C3A54", lineHeight: 1.6, paddingLeft: 32 }}>{ex.description}</p>
                </div>
              ))}
              <div style={{ padding: "14px 18px", borderRadius: 6, background: "#FFFFFF", border: "1px solid #1E2A3A", marginTop: 4 }}>
                <p style={{ fontSize: 11, color: "#3A4E65", lineHeight: 1.6 }}>
                  Rep unavailability, holiday periods, and CRM data errors are <strong style={{ color: "#2C3A54" }}>not valid exemptions</strong> — they are process failures that trigger remediation, not gate waivers.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1E2A3A", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF" }}>
        <span style={{ fontSize: 10, color: "#8090A8", letterSpacing: "0.06em" }}>B2B RENEWAL OPERATING MODEL · GATE 1 OF 4</span>
        <span style={{ fontSize: 10, color: "#8090A8", letterSpacing: "0.06em" }}>DESIGN VERSION 1.0 · 27 APR 2026</span>
      </div>
    </div>
  );
}
