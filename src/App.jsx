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
const BIZ_TYPES = ["Lawn & garden care","Cafe / hospitality","Retail / shop","Cleaning","Trade (plumbing/electrical/building)","Hair & beauty","Pet care","Other"];
const STAFF = ["You (Owner)", "Alex", "Jess"];
const PILLARS = [
  { key: "storefront", label: "Storefront & catalog" },
  { key: "bookings", label: "Bookings & staff" },
  { key: "payments", label: "Payments" },
  { key: "customers", label: "Customers & loyalty" },
  { key: "marketing", label: "Marketing & push" },
  { key: "website", label: "Website / app page" },
  { key: "chat", label: "AI front desk" },
];

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
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
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

/* ---------------- SETUP SCREEN (shown if no Supabase config) ---------------- */
function SetupNeeded() {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.charcoal, color: COLORS.paper, fontFamily: FONTS.body, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 620, background: COLORS.paper, color: COLORS.charcoal, borderRadius: 8, padding: 36 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.green, textTransform: "uppercase", marginBottom: 8 }}>Setup needed</div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Connect this app to a database</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, marginBottom: 14 }}>This prototype now saves real data — but it needs a Supabase project to save it to. Five minutes:</p>
        <ol style={{ fontSize: 14, lineHeight: 2, paddingLeft: 20 }}>
          <li>Create a free project at <strong>supabase.com</strong> (pick the Sydney region).</li>
          <li>Open the <strong>SQL Editor</strong> and run the schema script provided alongside this file.</li>
          <li>Go to <strong>Project Settings → API</strong> and copy your <em>Project URL</em> and <em>anon public</em> key.</li>
          <li>In <strong>Authentication → Providers → Email</strong>, turn off "Confirm email" while testing so sign-ups work instantly.</li>
          <li>Paste the URL and key into <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> at the top of this file.</li>
        </ol>
        <p style={{ fontSize: 13, color: COLORS.steel, marginTop: 16 }}>Once those two values are filled in, this screen disappears and the app connects for real.</p>
      </div>
    </div>
  );
}

/* ---------------- AUTH SCREEN ---------------- */
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
        if (data.access_token) {
          onSignedIn({ token: data.access_token, user: data.user });
        } else {
          setNotice("Account created. Check your email to confirm, then log in.");
          setMode("login");
        }
      } else {
        const { ok, data } = await supaAuth("token?grant_type=password", { email, password });
        if (!ok) throw new Error(data.error_description || data.msg || "Log in failed.");
        onSignedIn({ token: data.access_token, user: data.user });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
        <Btn onClick={submit} disabled={loading || !email || !password} style={{ width: "100%", marginTop: 22 }}>
          {loading ? "PLEASE WAIT…" : mode === "signup" ? "CREATE ACCOUNT" : "LOG IN"}
        </Btn>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: COLORS.steel }}>
          {mode === "signup" ? (
            <>Already have an account? <a onClick={() => setMode("login")} style={{ color: COLORS.green, cursor: "pointer", fontWeight: 600 }}>Log in</a></>
          ) : (
            <>New here? <a onClick={() => setMode("signup")} style={{ color: COLORS.green, cursor: "pointer", fontWeight: 600 }}>Create an account</a></>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ONBOARDING (creates the business row) ---------------- */
function Onboarding({ session, onComplete }) {
  const [name, setName] = useState("");
  const [type, setType] = useState(BIZ_TYPES[0]);
  const [area, setArea] = useState("");
  const [modules, setModules] = useState(["storefront", "bookings", "payments", "website"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggleModule = (k) => setModules((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));

  const build = async () => {
    setLoading(true); setError("");
    try {
      const [row] = await supaRest("businesses", {
        method: "POST", token: session.token,
        body: { owner_id: session.user.id, name, type, area, modules },
      });
      onComplete(row);
    } catch (e) {
      setError("Couldn't save your business — check the SQL schema was run and matches the field names.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.charcoal, color: COLORS.paper, fontFamily: FONTS.body, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: COLORS.paper, color: COLORS.charcoal, borderRadius: 8, maxWidth: 560, width: "100%", padding: "36px 36px 32px" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, textTransform: "uppercase", color: COLORS.green, marginBottom: 6 }}>Job ticket · New build</div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Let's build your app</h1>
        <p style={{ fontSize: 13, color: COLORS.steel, marginBottom: 20 }}>This saves to your account — it'll be here next time you log in.</p>
        <ErrorBanner msg={error} />
        <label style={labelStyle}>Business name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lyon Garden & Maintenance" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 20 }}>What kind of business?</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>{BIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <label style={{ ...labelStyle, marginTop: 20 }}>Service area</label>
        <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bellarine Peninsula & Geelong" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 20 }}>What should the app include?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{PILLARS.map((m) => <Chip key={m.key} active={modules.includes(m.key)} onClick={() => toggleModule(m.key)}>{m.label}</Chip>)}</div>
        <Btn onClick={build} disabled={!name || loading} style={{ width: "100%", marginTop: 28 }}>{loading ? "BUILDING…" : "BUILD THE APP →"}</Btn>
      </div>
    </div>
  );
}

/* ---------------- SIDEBAR ---------------- */
function Sidebar({ biz, tab, setTab, onSignOut }) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "chat", label: "AI Front Desk" },
    { key: "bookings", label: "Bookings & Staff" },
    { key: "payments", label: "Payments" },
    { key: "storefront", label: "Storefront (demo)" },
    { key: "customers", label: "Customers (demo)" },
    { key: "marketing", label: "Marketing (demo)" },
    { key: "website", label: "Website / App Page" },
    { key: "analytics", label: "Analytics" },
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
  const upcoming = jobs.filter((j) => j.status !== "Done");
  return (
    <div>
      <SectionTitle sub={`${biz.type} · ${biz.area || "Service area not set"}`}>Overview</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Card><div style={statLabel}>Upcoming bookings</div><div style={statNum}>{upcoming.length}</div></Card>
        <Card><div style={statLabel}>Unpaid invoices</div><div style={statNum}>{unpaid.length}</div></Card>
        <Card><div style={statLabel}>Modules active</div><div style={statNum}>{biz.modules?.length || 0}</div></Card>
      </div>
      <div style={{ marginTop: 18, fontSize: 12.5, color: COLORS.steel, fontFamily: FONTS.mono }}>
        Bookings, payments and this business profile are now saved to your database — refresh the page and they'll still be here.
      </div>
    </div>
  );
}

/* ---------------- AI FRONT DESK (unchanged — no DB needed) ---------------- */
function ChatTab({ biz }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: `G'day! I'm the AI front desk for ${biz.name}. Try asking me something a customer might ask.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput(""); setLoading(true);
    const system = `You are the friendly AI front-desk assistant for "${biz.name}", a ${biz.type} business${biz.area ? ` serving ${biz.area}` : ""}. Keep replies short (2-4 sentences), warm and practical.`;
    const reply = await callClaude(system, userMsg);
    setMessages((m) => [...m, { role: "assistant", content: reply }]);
    setLoading(false);
  };
  return (
    <div>
      <SectionTitle sub="What customers talk to inside your app.">AI Front Desk</SectionTitle>
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: 480 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div style={{ maxWidth: "75%", background: m.role === "user" ? COLORS.green : "#F1EEE2", color: m.role === "user" ? "#fff" : COLORS.charcoal, padding: "10px 14px", borderRadius: 10, fontSize: 14.5, lineHeight: 1.5 }}>{m.content}</div>
            </div>
          ))}
          {loading && <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.steel }}>Typing…</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${COLORS.line}`, padding: 12, gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask something a customer might ask…" style={{ ...inputStyle, border: "none", background: "#F7F5EE" }} />
          <Btn onClick={send} disabled={loading} variant="accent">SEND</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- BOOKINGS & STAFF (wired to Supabase) ---------------- */
function BookingsTab({ session, biz, jobs, setJobs }) {
  const [form, setForm] = useState({ client: "", service: "", date: "", staff: STAFF[0] });
  const [error, setError] = useState("");

  const addJob = async () => {
    if (!form.client || !form.service) return;
    setError("");
    try {
      const [row] = await supaRest("jobs", { method: "POST", token: session.token, body: { business_id: biz.id, client: form.client, service: form.service, date: form.date || null, staff: form.staff, status: "Scheduled" } });
      setJobs((j) => [...j, row]);
      setForm({ client: "", service: "", date: "", staff: STAFF[0] });
    } catch (e) { setError("Couldn't save that booking."); }
  };

  const cycleStatus = async (job) => {
    const order = ["Scheduled", "In progress", "Done"];
    const next = order[(order.indexOf(job.status) + 1) % order.length];
    try {
      await supaRest(`jobs?id=eq.${job.id}`, { method: "PATCH", token: session.token, body: { status: next } });
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
    } catch (e) { setError("Couldn't update that booking."); }
  };

  return (
    <div>
      <SectionTitle sub="Your day sheet — saved to your database as you go.">Bookings & Staff</SectionTitle>
      <ErrorBanner msg={error} />
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Client name" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 150 }} />
          <input placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 150 }} />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ ...inputStyle, width: 150 }} />
          <select value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} style={{ ...inputStyle, width: 150 }}>{STAFF.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <Btn onClick={addJob}>ADD BOOKING</Btn>
        </div>
      </Card>
      {jobs.length === 0 && <div style={{ color: COLORS.steel, fontSize: 14 }}>No bookings yet.</div>}
      {jobs.map((j) => (
        <Card key={j.id} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{j.client}</div>
            <div style={{ color: COLORS.steel, fontSize: 13 }}>{j.service}{j.date ? ` · ${j.date}` : ""} · {j.staff || STAFF[0]}</div>
          </div>
          <button onClick={() => cycleStatus(j)} style={{ fontFamily: FONTS.mono, fontSize: 11.5, padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: j.status === "Done" ? COLORS.green : j.status === "In progress" ? COLORS.ochre : COLORS.line, color: j.status === "Scheduled" ? COLORS.charcoal : "#fff" }}>{j.status}</button>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- PAYMENTS (wired to Supabase) ---------------- */
function PaymentsTab({ session, biz, jobs, invoices, setInvoices }) {
  const [error, setError] = useState("");
  const doneJobs = jobs.filter((j) => j.status === "Done" && !invoices.some((i) => i.job_id === j.id));

  const createInvoice = async (job) => {
    const amount = Math.floor(Math.random() * 250) + 80;
    try {
      const [row] = await supaRest("invoices", { method: "POST", token: session.token, body: { business_id: biz.id, job_id: job.id, client: job.client, service: job.service, amount, status: "Unpaid" } });
      setInvoices((inv) => [...inv, row]);
    } catch (e) { setError("Couldn't create that invoice."); }
  };

  const markPaid = async (invoice, method) => {
    try {
      await supaRest(`invoices?id=eq.${invoice.id}`, { method: "PATCH", token: session.token, body: { status: "Paid", method } });
      setInvoices((inv) => inv.map((i) => (i.id === invoice.id ? { ...i, status: "Paid", method } : i)));
    } catch (e) { setError("Couldn't mark that as paid."); }
  };

  return (
    <div>
      <SectionTitle sub="Real invoice records — checkout buttons are a visual mock until Stripe Connect is wired in.">Payments</SectionTitle>
      <ErrorBanner msg={error} />
      {doneJobs.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.green, marginBottom: 12 }}>READY TO INVOICE</div>
          {doneJobs.map((j) => (
            <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 14 }}>{j.client} — {j.service}</div>
              <Btn variant="ghost" onClick={() => createInvoice(j)} style={{ fontSize: 11 }}>CREATE INVOICE</Btn>
            </div>
          ))}
        </Card>
      )}
      {invoices.length === 0 && <div style={{ color: COLORS.steel, fontSize: 14 }}>No invoices yet.</div>}
      {invoices.map((i) => (
        <Card key={i.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600, fontSize: 15 }}>{i.client}</div><div style={{ color: COLORS.steel, fontSize: 13 }}>{i.service}</div></div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 600 }}>${i.amount}</div>
          </div>
          {i.status === "Unpaid" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => markPaid(i, "Card")} style={payBtnStyle}>💳 Card</button>
              <button onClick={() => markPaid(i, "Apple Pay")} style={payBtnStyle}>🍎 Apple Pay</button>
              <button onClick={() => markPaid(i, "Google Pay")} style={payBtnStyle}>G Pay</button>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.green }}>PAID via {i.method}</div>
          )}
        </Card>
      ))}
    </div>
  );
}
const payBtnStyle = { fontFamily: FONTS.mono, fontSize: 12, padding: "8px 14px", borderRadius: 4, border: `1px solid ${COLORS.line}`, background: "#fff", cursor: "pointer" };

/* ---------------- DEMO-ONLY TABS (unchanged, local state) ---------------- */
function StorefrontTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", qty: "", bullets: "" });
  const [genLoading, setGenLoading] = useState(null);
  const addProduct = () => { if (!form.name || !form.price) return; setProducts((p) => [...p, { id: Date.now(), name: form.name, price: form.price, qty: Number(form.qty) || 0, bullets: form.bullets, description: "" }]); setForm({ name: "", price: "", qty: "", bullets: "" }); };
  const generateDescription = async (product) => {
    setGenLoading(product.id);
    const desc = await callClaude("You write short, appealing product/service descriptions for a small local business storefront. One to two sentences, plain and persuasive, no emojis.", `Product/service: ${product.name}. Key points: ${product.bullets || product.name}`);
    setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, description: desc } : p)));
    setGenLoading(null);
  };
  const adjustQty = (id, delta) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p)));
  return (
    <div>
      <SectionTitle sub="Demo data — not yet saved to your database.">Storefront & Catalog</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <input placeholder="Product or service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input placeholder="Price ($)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <input placeholder="Stock qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} style={{ ...inputStyle, width: 110 }} />
        </div>
        <input placeholder="Bullet points for AI description" value={form.bullets} onChange={(e) => setForm({ ...form, bullets: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }} />
        <Btn onClick={addProduct}>ADD TO CATALOG</Btn>
      </Card>
      {products.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.green }}>${p.price}</span>
                {p.qty <= 3 && <span style={{ fontFamily: FONTS.mono, fontSize: 10.5, background: COLORS.rust, color: "#fff", padding: "2px 8px", borderRadius: 10 }}>LOW STOCK</span>}
              </div>
              <div style={{ fontSize: 13.5, color: COLORS.steel, marginTop: 6 }}>{p.description || "No description yet — generate one with AI."}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => adjustQty(p.id, -1)} style={{ width: 24, height: 24, border: `1px solid ${COLORS.line}`, borderRadius: 4, background: "#fff", cursor: "pointer" }}>–</button>
                <span style={{ fontFamily: FONTS.mono, fontSize: 13, width: 24, textAlign: "center" }}>{p.qty}</span>
                <button onClick={() => adjustQty(p.id, 1)} style={{ width: 24, height: 24, border: `1px solid ${COLORS.line}`, borderRadius: 4, background: "#fff", cursor: "pointer" }}>+</button>
              </div>
              <Btn variant="ghost" onClick={() => generateDescription(p)} disabled={genLoading === p.id} style={{ fontSize: 11 }}>{genLoading === p.id ? "WRITING…" : "AI DESCRIPTION"}</Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CustomersTab({ jobs }) {
  const [points, setPoints] = useState({});
  const customers = React.useMemo(() => {
    const map = {};
    jobs.forEach((j) => { if (!map[j.client]) map[j.client] = { name: j.client, visits: 0 }; map[j.client].visits += 1; });
    return Object.values(map);
  }, [jobs]);
  return (
    <div>
      <SectionTitle sub="Built from your bookings. Loyalty points are demo-only for now.">Customers & Loyalty</SectionTitle>
      {customers.map((c) => (
        <Card key={c.name} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div><div style={{ color: COLORS.steel, fontSize: 13 }}>{c.visits} visit{c.visits === 1 ? "" : "s"}</div></div>
          <Btn variant="ghost" onClick={() => setPoints((p) => ({ ...p, [c.name]: (p[c.name] || 0) + 1 }))} style={{ fontSize: 11 }}>+ POINT ({points[c.name] || 0})</Btn>
        </Card>
      ))}
    </div>
  );
}

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
      <SectionTitle sub="Demo data — real push notifications need the backend wired next.">Marketing & Push</SectionTitle>
      <Btn onClick={generate} disabled={loading} style={{ marginBottom: 16 }}>{loading ? "WRITING…" : "GENERATE 3 SOCIAL POST DRAFTS"}</Btn>
      {posts.map((p, i) => <Card key={i} style={{ marginBottom: 12 }}><div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{p}</div></Card>)}
    </div>
  );
}

function WebsiteTab({ biz }) {
  return (
    <div>
      <SectionTitle sub="Where customers install your app to their home screen.">Website / App Page</SectionTitle>
      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ background: COLORS.charcoal, color: COLORS.paper, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.ochre, marginBottom: 12 }}>{biz.area || "Your service area"}</div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 40, fontWeight: 600 }}>{biz.name}</h1>
          <p style={{ color: COLORS.steel, marginTop: 12, fontSize: 15 }}>{biz.type}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <Btn variant="accent">Book now</Btn>
            <Btn variant="ghost" style={{ color: COLORS.paper, borderColor: COLORS.paper }}>+ Add to Home Screen</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ jobs, invoices }) {
  const revenue = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + Number(i.amount), 0);
  const unpaid = invoices.filter((i) => i.status === "Unpaid").reduce((s, i) => s + Number(i.amount), 0);
  return (
    <div>
      <SectionTitle sub="Pulled from your real bookings and invoices.">Analytics</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        <Card><div style={statLabel}>Revenue collected</div><div style={statNum}>${revenue}</div></Card>
        <Card><div style={statLabel}>Outstanding</div><div style={{ ...statNum, color: unpaid ? COLORS.rust : COLORS.charcoal }}>${unpaid}</div></Card>
        <Card><div style={statLabel}>Total bookings</div><div style={statNum}>{jobs.length}</div></Card>
      </div>
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
          const [jobRows, invRows] = await Promise.all([
            supaRest(`jobs?business_id=eq.${rows[0].id}&order=created_at.desc`, { token: session.token }),
            supaRest(`invoices?business_id=eq.${rows[0].id}&order=created_at.desc`, { token: session.token }),
          ]);
          setJobs(jobRows || []);
          setInvoices(invRows || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBiz(false);
      }
    })();
  }, [session]);

  if (!CONFIGURED) return <><>{fontLink}</><SetupNeeded /></>;
  if (!session) return <>{fontLink}<AuthScreen onSignedIn={setSession} /></>;
  if (loadingBiz) return <>{fontLink}<div style={{ minHeight: "100vh", background: COLORS.charcoal }} /></>;
  if (!biz) return <>{fontLink}<Onboarding session={session} onComplete={setBiz} /></>;

  return (
    <>
      {fontLink}
      <div style={{ display: "flex", fontFamily: FONTS.body, background: "#FAF9F5" }}>
        <Sidebar biz={biz} tab={tab} setTab={setTab} onSignOut={() => { setSession(null); setBiz(null); setJobs([]); setInvoices([]); }} />
        <div style={{ flex: 1, padding: "36px 44px" }}>
          {tab === "overview" && <Overview biz={biz} jobs={jobs} invoices={invoices} />}
          {tab === "chat" && <ChatTab biz={biz} />}
          {tab === "bookings" && <BookingsTab session={session} biz={biz} jobs={jobs} setJobs={setJobs} />}
          {tab === "payments" && <PaymentsTab session={session} biz={biz} jobs={jobs} invoices={invoices} setInvoices={setInvoices} />}
          {tab === "storefront" && <StorefrontTab />}
          {tab === "customers" && <CustomersTab jobs={jobs} />}
          {tab === "marketing" && <MarketingTab biz={biz} jobs={jobs} />}
          {tab === "website" && <WebsiteTab biz={biz} />}
          {tab === "analytics" && <AnalyticsTab jobs={jobs} invoices={invoices} />}
        </div>
      </div>
    </>
  );
}
