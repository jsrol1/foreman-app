import React, { useState, useRef, useEffect } from "react";

/* ============================================================
   SUPABASE SETUP — paste your own project's values here.
   Get these from: Supabase Dashboard > Project Settings > API
   ============================================================ */
const SUPABASE_URL = "https://omvybdbjkytfozlduzyi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IjZhfID8rfKqGe0ifHmKMA_uKMFFlTA";
const CONFIGURED = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("YOUR_");

const COLORS = {
  charcoal: "#1E211C", charcoal2: "#262A23", paper: "#F1EEE2",
  ochre: "#E1962D", green: "#3A5744", rust: "#B5502E", steel: "#8B978F",
  line: "rgba(30,33,28,0.14)",
};
const FONTS = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};
const TRADE_TYPES = ["Lawn & garden care","Plumbing","Electrical","Carpentry / building","Cleaning","Hair & beauty","Pet care","Cafe / hospitality","Retail / shop","Other"];
const PAYMENT_TERMS = ["On completion", "7 days", "14 days", "30 days"];
const BAS_PERIODS = ["Monthly", "Quarterly", "Annually"];
const JOB_STATUSES = ["Enquiry", "Quoted", "Scheduled", "Done", "Paid"];

/* ---------------- SUPABASE HELPERS ---------------- */
async function supaAuth(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function supaRest(path, { method = "GET", token, body } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "POST" || method === "PATCH") headers["Prefer"] = "return=representation";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Supabase request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

async function callClaude(systemPrompt, userMessage) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ system: systemPrompt, message: userMessage }),
    });
    const data = await res.json();
    return data.text || "Sorry, couldn't generate that just then.";
  } catch (e) { return "Sorry, something went wrong generating that."; }
}

const labelStyle = { display: "block", fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.green, marginBottom: 8 };
const inputStyle = { width: "100%", fontFamily: FONTS.body, fontSize: 15, padding: "11px 12px", border: `1.5px solid ${COLORS.line}`, borderRadius: 4, outline: "none", background: "#fff", color: COLORS.charcoal };
const statLabel = { fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", color: COLORS.steel, marginBottom: 8 };
const statNum = { fontFamily: FONTS.display, fontSize: 34, fontWeight: 600, color: COLORS.charcoal };

function Chip({ active, onClick, children }) {
  return <button onClick={onClick} style={{ fontFamily: FONTS.mono, fontSize: 12.5, padding: "8px 14px", borderRadius: 20, border: `1.5px solid ${active ? COLORS.charcoal : COLORS.line}`, background: active ? COLORS.charcoal : "transparent", color: active ? COLORS.paper : COLORS.charcoal, cursor: "pointer" }}>{children}</button>;
}
function Card({ children, style }) {
  return <div style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: 22, ...style }}>{children}</div>;
}
function SectionTitle({ children, sub }) {
  return <div style={{ marginBottom: 22 }}><h2 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, color: COLORS.charcoal }}>{children}</h2>{sub && <p style={{ color: COLORS.steel, fontSize: 14, marginTop: 6 }}>{sub}</p>}</div>;
}
function Btn({ children, onClick, disabled, variant = "primary", style }) {
  const bg = variant === "primary" ? COLORS.green : variant === "accent" ? COLORS.ochre : "transparent";
  const color = variant === "ghost" ? COLORS.charcoal : "#fff";
  return <button onClick={onClick} disabled={disabled} style={{ background: disabled ? COLORS.steel : bg, color: variant === "accent" ? COLORS.charcoal : color, border: variant === "ghost" ? `1.5px solid ${COLORS.charcoal}` : "none", borderRadius: 4, padding: "11px 20px", fontFamily: FONTS.mono, fontWeight: 600, fontSize: 12.5, cursor: disabled ? "not-allowed" : "pointer", ...style }}>{children}</button>;
}
function ErrorBanner({ msg }) {
  if (!msg) return null;
  return <div style={{ background: "#FBEAE4", border: `1px solid ${COLORS.rust}`, color: COLORS.rust, padding: "10px 14px", borderRadius: 4, fontSize: 13, marginBottom: 14 }}>{msg}</div>;
}

/* ---------------- SETUP NEEDED / AUTH (unchanged) ---------------- */
function SetupNeeded() {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.charcoal, color: COLORS.paper, fontFamily: FONTS.body, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 620, background: COLORS.paper, color: COLORS.charcoal, borderRadius: 8, padding: 36 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.green, textTransform: "uppercase", marginBottom: 8 }}>Setup needed</div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Connect this app to a database</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>Add your Supabase URL and anon key at the top of this file, then run the schema + setup migration SQL files provided.</p>
      </div>
    </div>
  );
}

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async () => {
    setError(""); setNotice(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { ok, data } = await supaAuth("signup", { email, password });
        if (!ok) throw new Error(data.msg || data.error_description || "Sign up failed.");
        if (data.access_token) { onSignedIn({ token: data.access_token, user: data.user }); }
        else { setNotice("Account created. Check your email to confirm, then log in."); setMode("login"); }
      } else {
        const { ok, data } = await supaAuth("token?grant_type=password", { email, password });
        if (!ok) throw new Error(data.error_description || data.msg || "Log in failed.");
        onSignedIn({ token: data.access_token, user: data.user });
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.charcoal, color: COLORS.paper, fontFamily: FONTS.body, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: COLORS.paper, color: COLORS.charcoal, borderRadius: 8, maxWidth: 420, width: "100%", padding: "36px" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.green, textTransform: "uppercase", marginBottom: 6 }}>{mode === "signup" ? "Create your account" : "Welcome back"}</div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, marginBottom: 22 }}>Foreman</h1>
        <ErrorBanner msg={error} />
        {notice && <div style={{ background: "#EEF3EE", border: `1px solid ${COLORS.green}`, color: COLORS.green, padding: "10px 14px", borderRadius: 4, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="you@business.com.au" />
        <label style={{ ...labelStyle, marginTop: 16 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="At least 6 characters" />
        <Btn onClick={submit} disabled={loading || !email || !password} style={{ width: "100%", marginTop: 22 }}>{loading ? "PLEASE WAIT…" : mode === "signup" ? "CREATE ACCOUNT" : "LOG IN"}</Btn>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: COLORS.steel }}>
          {mode === "signup" ? (<>Already have an account? <a onClick={() => setMode("login")} style={{ color: COLORS.green, cursor: "pointer", fontWeight: 600 }}>Log in</a></>) : (<>New here? <a onClick={() => setMode("signup")} style={{ color: COLORS.green, cursor: "pointer", fontWeight: 600 }}>Create an account</a></>)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ONBOARDING WIZARD ---------------- */
function OnboardingWizard({ session, onComplete }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [biz, setBiz] = useState({ name: "", type: TRADE_TYPES[0], area: "", phone: "", abn: "", gst_registered: false });
  const [services, setServices] = useState([{ name: "", price: "", quote_required: false, description: "" }]);
  const [terms, setTerms] = useState({ payment_terms: PAYMENT_TERMS[0], bas_period: BAS_PERIODS[1], accounting_basis: "Cash" });

  const addServiceRow = () => setServices((s) => [...s, { name: "", price: "", quote_required: false, description: "" }]);
  const updateService = (i, field, val) => setServices((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  const removeService = (i) => setServices((s) => s.filter((_, idx) => idx !== i));

  const finish = async () => {
    setLoading(true); setError("");
    try {
      const [row] = await supaRest("businesses", {
        method: "POST", token: session.token,
        body: { owner_id: session.user.id, ...biz, ...terms },
      });
      const validServices = services.filter((s) => s.name.trim());
      if (validServices.length) {
        await supaRest("services", {
          method: "POST", token: session.token,
          body: validServices.map((s) => ({
            business_id: row.id, name: s.name, price: s.quote_required ? null : (Number(s.price) || null),
            quote_required: s.quote_required, description: s.description,
          })),
        });
      }
      onComplete(row);
    } catch (e) { setError("Something didn't save — check the setup migration SQL was run."); }
    finally { setLoading(false); }
  };

  const wrap = { minHeight: "100vh", background: COLORS.charcoal, color: COLORS.paper, fontFamily: FONTS.body, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  const card = { background: COLORS.paper, color: COLORS.charcoal, borderRadius: 8, maxWidth: 620, width: "100%", padding: "36px" };
  const stepLabel = { fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", color: COLORS.green, marginBottom: 6 };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={stepLabel}>Step {step} of 3</div>
        <ErrorBanner msg={error} />

        {step === 1 && (
          <>
            <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Tell us about the business</h1>
            <label style={labelStyle}>Business name</label>
            <input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} placeholder="e.g. Lyon Garden & Maintenance" style={inputStyle} />
            <label style={{ ...labelStyle, marginTop: 16 }}>Trade / service type</label>
            <select value={biz.type} onChange={(e) => setBiz({ ...biz, type: e.target.value })} style={inputStyle}>{TRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone</label>
                <input value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} placeholder="04xx xxx xxx" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Service area</label>
                <input value={biz.area} onChange={(e) => setBiz({ ...biz, area: e.target.value })} placeholder="e.g. Geelong & Bellarine" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>ABN</label>
                <input value={biz.abn} onChange={(e) => setBiz({ ...biz, abn: e.target.value })} placeholder="11 222 333 444" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Registered for GST?</label>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch", height: 44 }}>
                  <button onClick={() => setBiz({ ...biz, gst_registered: true })} style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 13, borderRadius: 4, border: `1.5px solid ${biz.gst_registered ? COLORS.charcoal : "rgba(30,33,28,0.45)"}`, background: biz.gst_registered ? COLORS.charcoal : "#fff", color: biz.gst_registered ? COLORS.paper : COLORS.charcoal, cursor: "pointer" }}>Yes</button>
                  <button onClick={() => setBiz({ ...biz, gst_registered: false })} style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 13, borderRadius: 4, border: `1.5px solid ${!biz.gst_registered ? COLORS.charcoal : "rgba(30,33,28,0.45)"}`, background: !biz.gst_registered ? COLORS.charcoal : "#fff", color: !biz.gst_registered ? COLORS.paper : COLORS.charcoal, cursor: "pointer" }}>No</button>
                </div>
              </div>
            </div>
            <Btn onClick={() => setStep(2)} disabled={!biz.name} style={{ width: "100%", marginTop: 26 }}>NEXT: SERVICES →</Btn>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, marginBottom: 6 }}>What do you offer?</h1>
            <p style={{ fontSize: 13.5, color: COLORS.steel, marginBottom: 20 }}>These become your price list — jobs and invoices pull from here. Add a couple now, more anytime later.</p>
            {services.map((s, i) => (
              <div key={i} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={s.name} onChange={(e) => updateService(i, "name", e.target.value)} placeholder="Service name" style={{ ...inputStyle, flex: 2 }} />
                  <input value={s.price} onChange={(e) => updateService(i, "price", e.target.value)} placeholder="Price $" disabled={s.quote_required} style={{ ...inputStyle, flex: 1, opacity: s.quote_required ? 0.5 : 1 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <Chip active={s.quote_required} onClick={() => updateService(i, "quote_required", !s.quote_required)}>Quote required instead of fixed price</Chip>
                  {services.length > 1 && <button onClick={() => removeService(i)} style={{ background: "none", border: "none", color: COLORS.rust, fontSize: 12, cursor: "pointer" }}>Remove</button>}
                </div>
              </div>
            ))}
            <Btn variant="ghost" onClick={addServiceRow} style={{ marginBottom: 20 }}>+ ADD ANOTHER SERVICE</Btn>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setStep(1)}>← BACK</Btn>
              <Btn onClick={() => setStep(3)} style={{ flex: 1 }}>NEXT: PAYMENT & TAX →</Btn>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Payment & tax settings</h1>
            <label style={labelStyle}>Default payment terms</label>
            <select value={terms.payment_terms} onChange={(e) => setTerms({ ...terms, payment_terms: e.target.value })} style={inputStyle}>{PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>BAS period</label>
                <select value={terms.bas_period} onChange={(e) => setTerms({ ...terms, bas_period: e.target.value })} style={inputStyle}>{BAS_PERIODS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Accounting basis</label>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Chip active={terms.accounting_basis === "Cash"} onClick={() => setTerms({ ...terms, accounting_basis: "Cash" })}>Cash</Chip>
                  <Chip active={terms.accounting_basis === "Accrual"} onClick={() => setTerms({ ...terms, accounting_basis: "Accrual" })}>Accrual</Chip>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, padding: 14, border: `1px dashed ${COLORS.line}`, borderRadius: 6, fontSize: 12.5, color: COLORS.steel }}>
              Payment processing (Stripe) connects after setup, from Setup → Payments.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <Btn variant="ghost" onClick={() => setStep(2)}>← BACK</Btn>
              <Btn onClick={finish} disabled={loading} style={{ flex: 1 }}>{loading ? "BUILDING…" : "BUILD THE APP →"}</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- SIDEBAR ---------------- */
function Sidebar({ biz, tab, setTab, onSignOut }) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "bookings", label: "Jobs" },
    { key: "payments", label: "Invoicing" },
    { key: "marketing", label: "Marketing (demo)" },
    { key: "website", label: "Website / App Page" },
    { key: "setup", label: "Setup" },
  ];
  return (
    <div style={{ width: 230, flexShrink: 0, background: COLORS.charcoal, color: COLORS.paper, padding: "28px 18px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, padding: "0 8px" }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${COLORS.ochre}`, borderRadius: 3, color: COLORS.ochre, fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-4deg)" }}>F</div>
        <span style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 17 }}>Foreman</span>
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.steel, padding: "0 8px", marginBottom: 24 }}>{biz.name}</div>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => setTab(t.key)} style={{ textAlign: "left", background: tab === t.key ? COLORS.charcoal2 : "transparent", color: tab === t.key ? COLORS.ochre : COLORS.paper, border: "none", borderRadius: 4, padding: "10px 12px", fontSize: 13.5, fontFamily: FONTS.body, fontWeight: tab === t.key ? 600 : 400, cursor: "pointer", marginBottom: 2 }}>{t.label}</button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onSignOut} style={{ textAlign: "left", background: "transparent", color: COLORS.steel, border: "none", fontSize: 12.5, cursor: "pointer", padding: "0 8px", marginBottom: 10 }}>Sign out</button>
      <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.steel, padding: "0 8px", lineHeight: 1.6 }}>Connected to Supabase</div>
    </div>
  );
}

/* ---------------- OVERVIEW ---------------- */
function Overview({ biz, jobs, invoices }) {
  const unpaid = invoices.filter((i) => i.status === "Unpaid");
  const upcoming = jobs.filter((j) => j.status !== "Done" && j.status !== "Paid");
  return (
    <div>
      <SectionTitle sub={`${biz.type} · ${biz.area || "Service area not set"}`}>Overview</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Card><div style={statLabel}>Open jobs</div><div style={statNum}>{upcoming.length}</div></Card>
        <Card><div style={statLabel}>Unpaid invoices</div><div style={statNum}>{unpaid.length}</div></Card>
        <Card><div style={statLabel}>GST status</div><div style={{ ...statNum, fontSize: 20 }}>{biz.gst_registered ? "Registered" : "Not registered"}</div></Card>
      </div>
    </div>
  );
}

/* ---------------- QUOTE / INVOICE DOCUMENT ---------------- */
function DocumentModal({ biz, doc, kind, onClose }) {
  // doc: a job (for kind="quote") or an invoice (for kind="invoice")
  const amount = Number(doc.amount) || 0;
  const gstAmount = biz.gst_registered ? amount - amount / 1.1 : 0;
  const docNumber = (doc.id || "").toString().slice(0, 8).toUpperCase();
  const today = new Date().toLocaleDateString("en-AU");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,33,28,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} className="doc-overlay">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .doc-print, .doc-print * { visibility: visible; }
          .doc-print { position: absolute; top: 0; left: 0; width: 100%; }
          .doc-overlay { position: absolute; background: none !important; }
          .doc-no-print { display: none !important; }
        }
      `}</style>
      <div style={{ background: "#fff", borderRadius: 8, maxWidth: 560, width: "100%", maxHeight: "88vh", overflowY: "auto", padding: 40 }} className="doc-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: COLORS.charcoal }}>{biz.name}</div>
            <div style={{ fontSize: 12.5, color: COLORS.steel, marginTop: 4, lineHeight: 1.6 }}>
              {biz.area || ""}{biz.phone ? ` · ${biz.phone}` : ""}<br />
              {biz.abn ? `ABN ${biz.abn}` : ""} {biz.gst_registered ? "· GST registered" : "· Not registered for GST"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", color: COLORS.ochre, fontWeight: 700 }}>{kind === "quote" ? "Quote" : "Tax Invoice"}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.steel, marginTop: 4 }}>#{docNumber}<br />{today}</div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}`, padding: "16px 0", marginBottom: 20 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", color: COLORS.green, marginBottom: 6 }}>{kind === "quote" ? "Quote for" : "Bill to"}</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{doc.client}</div>
          <div style={{ fontSize: 13, color: COLORS.steel, marginTop: 2 }}>{doc.phone || ""}{doc.address ? ` · ${doc.address}` : ""}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: `1.5px solid ${COLORS.charcoal}` }}>
              <th style={{ textAlign: "left", fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", padding: "0 0 8px", color: COLORS.steel }}>Description</th>
              <th style={{ textAlign: "right", fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", padding: "0 0 8px", color: COLORS.steel }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px 0", fontSize: 14 }}>{doc.service}</td>
              <td style={{ padding: "10px 0", fontSize: 14, textAlign: "right" }}>${amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 14, marginBottom: 24 }}>
          {biz.gst_registered && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.steel, marginBottom: 6 }}>
              <span>Includes GST</span><span>${gstAmount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.display, fontSize: 20, fontWeight: 700 }}>
            <span>Total</span><span>${amount.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ fontSize: 12, color: COLORS.steel }}>
          {kind === "quote" ? "This quote is an estimate and may be subject to change." : `Payment terms: ${biz.payment_terms || "On completion"}.`}
        </div>

        <div className="doc-no-print" style={{ display: "flex", gap: 10, marginTop: 30 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>CLOSE</Btn>
          <Btn onClick={() => window.print()} style={{ flex: 1 }}>PRINT / SAVE AS PDF</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- JOBS (customer + job combined, phone/address included) ---------------- */
function JobsTab({ session, biz, jobs, setJobs, services }) {
  const [form, setForm] = useState({ client: "", phone: "", address: "", service_name: "", amount: "", date: "", notes: "" });
  const [error, setError] = useState("");
  const [docJob, setDocJob] = useState(null);

  const selectService = (name) => {
    const svc = services.find((s) => s.name === name);
    setForm({ ...form, service_name: name, amount: svc && !svc.quote_required && svc.price ? String(svc.price) : form.amount });
  };

  const addJob = async () => {
    if (!form.client || !form.service_name) return;
    setError("");
    try {
      const [row] = await supaRest("jobs", { method: "POST", token: session.token, body: { business_id: biz.id, client: form.client, phone: form.phone, address: form.address, service: form.service_name, amount: form.amount ? Number(form.amount) : null, date: form.date || null, status: "Enquiry" } });
      setJobs((j) => [...j, row]);
      setForm({ client: "", phone: "", address: "", service_name: "", amount: "", date: "", notes: "" });
    } catch (e) { setError("Couldn't save that job."); }
  };

  const cycleStatus = async (job) => {
    const next = JOB_STATUSES[(JOB_STATUSES.indexOf(job.status) + 1) % JOB_STATUSES.length];
    try {
      await supaRest(`jobs?id=eq.${job.id}`, { method: "PATCH", token: session.token, body: { status: next } });
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
    } catch (e) { setError("Couldn't update that job."); }
  };

  const statusColor = (s) => s === "Paid" ? COLORS.green : s === "Done" ? COLORS.ochre : s === "Scheduled" ? COLORS.steel : COLORS.line;

  return (
    <div>
      <SectionTitle sub="Client, contact, and job — the one record that carries through to invoicing.">Jobs</SectionTitle>
      <ErrorBanner msg={error} />
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <input placeholder="Client name" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
          <input placeholder="Job address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {services && services.length > 0 ? (
            <select value={form.service_name} onChange={(e) => selectService(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }}>
              <option value="">Select a service…</option>
              {services.map((s) => <option key={s.id} value={s.name}>{s.name}{s.quote_required ? " (quote)" : s.price ? ` — $${s.price}` : ""}</option>)}
            </select>
          ) : (
            <input placeholder="What's the job?" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          )}
          <input placeholder="Amount $" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ ...inputStyle, width: 150 }} />
          <Btn onClick={addJob}>ADD JOB</Btn>
        </div>
      </Card>
      {jobs.length === 0 && <div style={{ color: COLORS.steel, fontSize: 14 }}>No jobs yet.</div>}
      {jobs.map((j) => (
        <Card key={j.id} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{j.client}{j.phone ? ` · ${j.phone}` : ""}</div>
            <div style={{ color: COLORS.steel, fontSize: 13 }}>{j.service}{j.amount ? ` · $${j.amount}` : ""}{j.date ? ` · ${j.date}` : ""}{j.address ? ` · ${j.address}` : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setDocJob(j)} style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.green, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>View quote</button>
            <button onClick={() => cycleStatus(j)} style={{ fontFamily: FONTS.mono, fontSize: 11.5, padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: statusColor(j.status), color: (j.status === "Enquiry" || j.status === "Quoted") ? COLORS.charcoal : "#fff" }}>{j.status}</button>
          </div>
        </Card>
      ))}
      {docJob && <DocumentModal biz={biz} doc={docJob} kind="quote" onClose={() => setDocJob(null)} />}
    </div>
  );
}

/* ---------------- INVOICING (with ABN/GST) ---------------- */
function computeDueDate(terms) {
  const days = terms === "7 days" ? 7 : terms === "14 days" ? 14 : terms === "30 days" ? 30 : 0;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function InvoicingTab({ session, biz, jobs, invoices, setInvoices }) {
  const [error, setError] = useState("");
  const [docInvoice, setDocInvoice] = useState(null);
  const [chaseFor, setChaseFor] = useState(null);
  const [chaseText, setChaseText] = useState("");
  const [chaseLoading, setChaseLoading] = useState(false);
  const readyJobs = jobs.filter((j) => j.status !== "Enquiry" && !invoices.some((i) => i.job_id === j.id));

  const createInvoice = async (job) => {
    try {
      const due_date = computeDueDate(biz.payment_terms);
      const [row] = await supaRest("invoices", { method: "POST", token: session.token, body: { business_id: biz.id, job_id: job.id, client: job.client, service: job.service, amount: job.amount || 0, phone: job.phone, address: job.address, status: "Unpaid", due_date } });
      setInvoices((inv) => [...inv, row]);
    } catch (e) { setError("Couldn't create that invoice."); }
  };
  const markPaid = async (invoice, method) => {
    try {
      await supaRest(`invoices?id=eq.${invoice.id}`, { method: "PATCH", token: session.token, body: { status: "Paid", method } });
      setInvoices((inv) => inv.map((i) => (i.id === invoice.id ? { ...i, status: "Paid", method } : i)));
    } catch (e) { setError("Couldn't mark that as paid."); }
  };

  const isOverdue = (i) => i.status === "Unpaid" && i.due_date && new Date(i.due_date) < new Date(new Date().toDateString());
  const daysOverdue = (i) => Math.max(0, Math.floor((new Date(new Date().toDateString()) - new Date(i.due_date)) / 86400000));

  const draftChase = async (invoice) => {
    setChaseFor(invoice.id); setChaseText(""); setChaseLoading(true);
    const overdueBy = daysOverdue(invoice);
    const system = `You write short, polite but firm payment reminder messages for a small Australian trade business called "${biz.name}". Keep it to 2-3 sentences, friendly but clear, suitable for SMS or email. Never sound aggressive.`;
    const msg = await callClaude(system, `Write a payment reminder for ${invoice.client}, for "${invoice.service}", amount $${invoice.amount}, ${overdueBy > 0 ? `overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"}` : "due today"}.`);
    setChaseText(msg);
    setChaseLoading(false);
  };

  const copyChase = () => { navigator.clipboard?.writeText(chaseText); };

  const gstLabel = biz.gst_registered ? "incl. GST" : "no GST";
  const sorted = [...invoices].sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0));

  return (
    <div>
      <SectionTitle sub={`Terms: ${biz.payment_terms || "On completion"} · ABN ${biz.abn || "not set"} · ${gstLabel}`}>Invoicing</SectionTitle>
      <ErrorBanner msg={error} />
      {readyJobs.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.green, marginBottom: 12 }}>READY TO INVOICE — from Quoted onward</div>
          {readyJobs.map((j) => (
            <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 14 }}>{j.client} — {j.service}{j.amount ? ` · $${j.amount}` : " · no amount set"} · <span style={{ color: COLORS.steel }}>{j.status}</span></div>
              <Btn variant="ghost" onClick={() => createInvoice(j)} style={{ fontSize: 11 }}>CREATE INVOICE</Btn>
            </div>
          ))}
        </Card>
      )}
      {invoices.length === 0 && <div style={{ color: COLORS.steel, fontSize: 14 }}>No invoices yet.</div>}
      {sorted.map((i) => (
        <Card key={i.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                {i.client}
                {isOverdue(i) && <span style={{ fontFamily: FONTS.mono, fontSize: 10, background: COLORS.rust, color: "#fff", padding: "2px 8px", borderRadius: 10 }}>OVERDUE {daysOverdue(i)}d</span>}
              </div>
              <div style={{ color: COLORS.steel, fontSize: 13 }}>{i.service}{i.due_date ? ` · due ${i.due_date}` : ""}</div>
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 600 }}>${i.amount}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setDocInvoice(i)} style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.green, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>View invoice</button>
            {i.status === "Unpaid" ? (
              <>
                <button onClick={() => markPaid(i, "Card")} style={payBtnStyle}>💳 Card</button>
                <button onClick={() => markPaid(i, "Bank transfer")} style={payBtnStyle}>Bank transfer</button>
                <button onClick={() => draftChase(i)} style={{ ...payBtnStyle, background: isOverdue(i) ? COLORS.rust : "#fff", color: isOverdue(i) ? "#fff" : COLORS.charcoal }}>Chase payment</button>
              </>
            ) : (<span style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.green }}>PAID via {i.method}</span>)}
          </div>
          {chaseFor === i.id && (
            <div style={{ marginTop: 12, padding: 14, background: "#F7F5EE", borderRadius: 6 }}>
              {chaseLoading ? (
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.steel }}>Writing…</div>
              ) : (
                <>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>{chaseText}</div>
                  <Btn variant="ghost" onClick={copyChase} style={{ fontSize: 11 }}>COPY TO SEND</Btn>
                </>
              )}
            </div>
          )}
        </Card>
      ))}
      {docInvoice && <DocumentModal biz={biz} doc={docInvoice} kind="invoice" onClose={() => setDocInvoice(null)} />}
    </div>
  );
}
const payBtnStyle = { fontFamily: FONTS.mono, fontSize: 12, padding: "8px 14px", borderRadius: 4, border: `1px solid ${COLORS.line}`, background: "#fff", cursor: "pointer" };

/* ---------------- MARKETING (demo, unchanged) ---------------- */
function MarketingTab({ biz, jobs }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    const recentWork = jobs.slice(-3).map((j) => `${j.service} for ${j.client}`).join("; ") || "general services";
    const result = await callClaude(`Write exactly 3 short social posts (1-2 sentences, max 2 hashtags) for a ${biz.type} business called "${biz.name}" in ${biz.area || "their area"}. Base on: ${recentWork}. Separate with "---" only.`, "Write the 3 posts now.");
    setPosts(result.split("---").map((p) => p.trim()).filter(Boolean));
    setLoading(false);
  };
  return (
    <div>
      <SectionTitle sub="Demo data — drafts from your recent jobs.">Marketing</SectionTitle>
      <Btn onClick={generate} disabled={loading} style={{ marginBottom: 16 }}>{loading ? "WRITING…" : "GENERATE 3 POST DRAFTS"}</Btn>
      {posts.map((p, i) => <Card key={i} style={{ marginBottom: 12 }}><div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{p}</div></Card>)}
    </div>
  );
}

function WebsiteTab({ biz }) {
  return (
    <div>
      <SectionTitle sub="Where customers install your app to their home screen.">Website / App Page</SectionTitle>

      <Card style={{ marginBottom: 20, background: "#F7F5EE" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", color: COLORS.green, marginBottom: 10 }}>How to explain this to a client</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>
          This page is the business's front door. A customer visits it in any browser, taps <strong>"Add to Home Screen,"</strong> and it behaves like a real installed app — its own icon, opens full-screen, no App Store required.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>
          There's no separate app to build or submit for approval per business, which is what keeps this affordable at scale — the same approach costs a fraction of native App Store development, with none of the review delays.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>
          Everything below the fold is generated automatically from the business's Setup details — name, trade, area, and phone — so there's nothing extra to design or maintain per customer.
        </p>
      </Card>

      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ background: COLORS.charcoal, color: COLORS.paper, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.ochre, marginBottom: 12 }}>{biz.area || "Your service area"}</div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 40, fontWeight: 600 }}>{biz.name}</h1>
          <p style={{ color: COLORS.steel, marginTop: 12, fontSize: 15 }}>{biz.type}{biz.phone ? ` · ${biz.phone}` : ""}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <Btn variant="accent">Book now</Btn>
            <Btn variant="ghost" style={{ color: COLORS.paper, borderColor: COLORS.paper }}>+ Add to Home Screen</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SETUP (business profile + services + payment/tax, all editable) ---------------- */
function SetupTab({ session, biz, setBiz, services, setServices }) {
  const [profile, setProfile] = useState(biz);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "", quote_required: false, description: "" });

  const saveProfile = async () => {
    setError(""); setSaved(false);
    try {
      await supaRest(`businesses?id=eq.${biz.id}`, { method: "PATCH", token: session.token, body: profile });
      setBiz({ ...biz, ...profile });
      setSaved(true);
    } catch (e) { setError("Couldn't save business settings."); }
  };

  const addService = async () => {
    if (!newService.name) return;
    try {
      const [row] = await supaRest("services", { method: "POST", token: session.token, body: { business_id: biz.id, name: newService.name, price: newService.quote_required ? null : (Number(newService.price) || null), quote_required: newService.quote_required, description: newService.description } });
      setServices((s) => [...s, row]);
      setNewService({ name: "", price: "", quote_required: false, description: "" });
    } catch (e) { setError("Couldn't add that service."); }
  };

  const removeService = async (id) => {
    try { await supaRest(`services?id=eq.${id}`, { method: "DELETE", token: session.token }); setServices((s) => s.filter((x) => x.id !== id)); }
    catch (e) { setError("Couldn't remove that service."); }
  };

  return (
    <div>
      <SectionTitle sub="Business profile, services, and payment & tax settings — set once, edit anytime.">Setup</SectionTitle>
      <ErrorBanner msg={error} />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.green, marginBottom: 14 }}>BUSINESS PROFILE</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Business name" style={{ ...inputStyle, flex: 1 }} />
          <select value={profile.type} onChange={(e) => setProfile({ ...profile, type: e.target.value })} style={{ ...inputStyle, flex: 1 }}>{TRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" style={{ ...inputStyle, flex: 1 }} />
          <input value={profile.area || ""} onChange={(e) => setProfile({ ...profile, area: e.target.value })} placeholder="Service area" style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={profile.abn || ""} onChange={(e) => setProfile({ ...profile, abn: e.target.value })} placeholder="ABN" style={{ ...inputStyle, flex: 1 }} />
          <Chip active={profile.gst_registered} onClick={() => setProfile({ ...profile, gst_registered: !profile.gst_registered })}>{profile.gst_registered ? "GST registered" : "Not GST registered"}</Chip>
        </div>
        <Btn onClick={saveProfile} style={{ marginTop: 16 }}>SAVE PROFILE</Btn>
        {saved && <span style={{ marginLeft: 12, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.green }}>Saved</span>}
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.green, marginBottom: 14 }}>SERVICES OFFERED</div>
        {services.map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${COLORS.line}` }}>
            <div style={{ fontSize: 14 }}>{s.name} — {s.quote_required ? "Quote required" : s.price ? `$${s.price}` : "No price set"}</div>
            <button onClick={() => removeService(s.id)} style={{ background: "none", border: "none", color: COLORS.rust, fontSize: 12, cursor: "pointer" }}>Remove</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <input value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="Service name" style={{ ...inputStyle, flex: 2, minWidth: 160 }} />
          <input value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} placeholder="Price $" disabled={newService.quote_required} style={{ ...inputStyle, flex: 1, minWidth: 100, opacity: newService.quote_required ? 0.5 : 1 }} />
          <Chip active={newService.quote_required} onClick={() => setNewService({ ...newService, quote_required: !newService.quote_required })}>Quote required</Chip>
          <Btn onClick={addService}>ADD SERVICE</Btn>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.green, marginBottom: 14 }}>PAYMENT & TAX</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Payment terms</label>
            <select value={profile.payment_terms || PAYMENT_TERMS[0]} onChange={(e) => setProfile({ ...profile, payment_terms: e.target.value })} style={inputStyle}>{PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>BAS period</label>
            <select value={profile.bas_period || BAS_PERIODS[1]} onChange={(e) => setProfile({ ...profile, bas_period: e.target.value })} style={inputStyle}>{BAS_PERIODS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
        </div>
        <div style={{ padding: 14, border: `1px dashed ${COLORS.line}`, borderRadius: 6, fontSize: 12.5, color: COLORS.steel, marginBottom: 12 }}>
          Stripe payment processing — not connected yet.
        </div>
        <Btn onClick={saveProfile}>SAVE</Btn>
      </Card>
    </div>
  );
}

/* ---------------- ROOT APP ---------------- */
export default function ForemanApp() {
  const [session, setSession] = useState(null);
  const [biz, setBiz] = useState(null);
  const [tab, setTab] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingBiz, setLoadingBiz] = useState(false);

  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />;

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoadingBiz(true);
      try {
        const rows = await supaRest(`businesses?owner_id=eq.${session.user.id}&select=*`, { token: session.token });
        if (rows && rows.length) {
          setBiz(rows[0]);
          const [jobRows, invRows, svcRows] = await Promise.all([
            supaRest(`jobs?business_id=eq.${rows[0].id}&order=created_at.desc`, { token: session.token }),
            supaRest(`invoices?business_id=eq.${rows[0].id}&order=created_at.desc`, { token: session.token }),
            supaRest(`services?business_id=eq.${rows[0].id}&order=created_at.desc`, { token: session.token }),
          ]);
          setJobs(jobRows || []); setInvoices(invRows || []); setServices(svcRows || []);
        }
      } catch (e) { console.error(e); } finally { setLoadingBiz(false); }
    })();
  }, [session]);

  const handleOnboardingComplete = async (row) => {
    setBiz(row);
    try {
      const svcRows = await supaRest(`services?business_id=eq.${row.id}`, { token: session.token });
      setServices(svcRows || []);
    } catch (e) {}
  };

  if (!CONFIGURED) return <>{fontLink}<SetupNeeded /></>;
  if (!session) return <>{fontLink}<AuthScreen onSignedIn={setSession} /></>;
  if (loadingBiz) return <>{fontLink}<div style={{ minHeight: "100vh", background: COLORS.charcoal }} /></>;
  if (!biz) return <>{fontLink}<OnboardingWizard session={session} onComplete={handleOnboardingComplete} /></>;

  return (
    <>
      {fontLink}
      <div style={{ display: "flex", fontFamily: FONTS.body, background: "#FAF9F5" }}>
        <Sidebar biz={biz} tab={tab} setTab={setTab} onSignOut={() => { setSession(null); setBiz(null); setJobs([]); setInvoices([]); setServices([]); }} />
        <div style={{ flex: 1, padding: "36px 44px" }}>
          {tab === "overview" && <Overview biz={biz} jobs={jobs} invoices={invoices} />}
          {tab === "bookings" && <JobsTab session={session} biz={biz} jobs={jobs} setJobs={setJobs} services={services} />}
          {tab === "payments" && <InvoicingTab session={session} biz={biz} jobs={jobs} invoices={invoices} setInvoices={setInvoices} />}
          {tab === "marketing" && <MarketingTab biz={biz} jobs={jobs} />}
          {tab === "website" && <WebsiteTab biz={biz} />}
          {tab === "setup" && <SetupTab session={session} biz={biz} setBiz={setBiz} services={services} setServices={setServices} />}
        </div>
      </div>
    </>
  );
}
