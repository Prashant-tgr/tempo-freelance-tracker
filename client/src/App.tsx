import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
  Wallet,
  Play,
  Square,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
const api = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("tempo_token");
  const res = await fetch("/api" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message || "Request failed");
  return body.data;
};
const money = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(n);
const hours = (s: number) => `${(s / 3600).toFixed(1)}h`;
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" });
function App() {
  const [user, setUser] = useState<any>(null);
  const [timer, setTimer] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const nav = useNavigate();
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 3200);
  };
  const refresh = async () => {
    if (localStorage.getItem("tempo_token"))
      try {
        setUser(await api("/auth/me"));
        setTimer(await api("/timer"));
      } catch {
        localStorage.removeItem("tempo_token");
        setUser(null);
      }
  };
  useEffect(() => {
    refresh();
  }, []);
  const logout = () => {
    localStorage.removeItem("tempo_token");
    setUser(null);
    nav("/login");
  };
  if (!user)
    return (
      <Routes>
        <Route path="*" element={<Auth onLogin={refresh} />} />
      </Routes>
    );
  return (
    <div className="shell">
      <aside className={collapsed ? "sidebar slim" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">t</span>
          {!collapsed && (
            <>
              <b>tempo</b>
              <span className="brand-dot">●</span>
            </>
          )}
        </div>
        <div className="workspace">
          <div className="avatar">{user.email?.[0]?.toUpperCase()}</div>
          {!collapsed && (
            <div>
              <strong>My workspace</strong>
              <small>Freelancer plan</small>
            </div>
          )}
          <button
            className="icon-btn push"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle navigation"
          >
            {collapsed ? <Menu size={17} /> : <X size={16} />}
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            [LayoutDashboard, "Overview", "/"],
            [Clock3, "Time tracker", "/tracker"],
            [CalendarDays, "Timesheet", "/timesheet"],
            [Activity, "Time entries", "/entries"],
          ].map(([Icon, label, path]: any) => (
            <NavLink key={path} to={path} title={collapsed ? label : ""}>
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-label nav-gap">MANAGE</div>
        <nav>
          {[
            [Users, "Clients", "/clients"],
            [BriefcaseBusiness, "Projects", "/projects"],
            [FileText, "Invoices", "/invoices"],
          ].map(([Icon, label, path]: any) => (
            <NavLink key={path} to={path} title={collapsed ? label : ""}>
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help">
            <div className="help-icon">✳</div>
            {!collapsed && (
              <>
                <b>Need a hand?</b>
                <span>Visit our help center</span>
              </>
            )}
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={17} />
            {!collapsed && "Log out"}
          </button>
        </div>
      </aside>
      <main className="main">
        <header>
          <div>
            <span className="crumb">Workspace</span>
            <span className="crumb-sep">/</span>
            <b>
              {" "}
              {location.pathname === "/"
                ? "Overview"
                : location.pathname
                    .slice(1)
                    .replace(/\b\w/g, (x) => x.toUpperCase())}
            </b>
          </div>
          <div className="header-right">
            <button className="icon-btn" onClick={refresh} aria-label="Refresh">
              <RefreshCw size={16} />
            </button>
            <span className="today">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="avatar dark">{user.email?.[0]?.toUpperCase()}</div>
          </div>
        </header>
        <div className="content">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  user={user}
                  timer={timer}
                  notify={notify}
                  refresh={refresh}
                />
              }
            />
            <Route
              path="/tracker"
              element={
                <Tracker timer={timer} setTimer={setTimer} notify={notify} />
              }
            />
            <Route path="/clients" element={<Clients notify={notify} />} />
            <Route path="/projects" element={<Projects notify={notify} />} />
            <Route path="/entries" element={<Entries notify={notify} />} />
            <Route path="/timesheet" element={<Timesheet />} />
            <Route path="/invoices" element={<Invoices notify={notify} />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
          </Routes>
        </div>
      </main>
      {toast && <div className="toast">✓ &nbsp;{toast}</div>}
    </div>
  );
}
function Auth({ onLogin }: any) {
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState("demo@tracker.local"),
    [password, setPassword] = useState("ChangeMe123!"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api("/auth/" + mode, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("tempo_token", d.token);
      await onLogin();
      nav("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <div className="auth-brand">
        <span className="brand-mark">t</span>
        <b>tempo</b>
      </div>
      <div className="auth-card">
        <div className="eyebrow">YOUR WORK, IN RHYTHM</div>
        <h1>{mode === "login" ? "Welcome back." : "Create your account."}</h1>
        <p>Track your hours, manage clients, and get paid.</p>
        <form onSubmit={submit}>
          <label>Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Password</label>
          <input
            type="password"
            required
            minLength={mode === "register" ? 10 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="switch-auth">
          {mode === "login" ? "New to Tempo? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </div>
        <div className="demo-hint">Demo workspace · demo@tracker.local</div>
      </div>
      <div className="auth-foot">
        A little more focus. A lot more flow. <span>✳</span>
      </div>
    </div>
  );
}
function PageTitle({ eyebrow, title, sub, action }: any) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}
function Dashboard({ user, timer, notify, refresh }: any) {
  const [entries, setEntries] = useState<any[]>([]),
    [projects, setProjects] = useState<any[]>([]),
    [invoices, setInvoices] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([api("/entries"), api("/projects"), api("/invoices")])
      .then(([e, p, i]) => {
        setEntries(e);
        setProjects(p);
        setInvoices(i);
      })
      .catch((e) => notify(e.message));
  }, []);
  const now = new Date(),
    today = entries.filter(
      (e) => new Date(e.startTime).toDateString() === now.toDateString(),
    ),
    week = entries.filter(
      (e) => new Date(e.startTime) >= new Date(now.getTime() - 7 * 86400000),
    );
  const total = today.reduce((s, e) => s + e.durationSeconds, 0),
    weekTotal = week.reduce((s, e) => s + e.durationSeconds, 0);
  return (
    <>
      <PageTitle
        eyebrow={now
          .toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
          .toUpperCase()}
        title={`Good morning, ${(user?.email || "freelancer").split("@")[0]}`}
        sub="Here’s what’s happening with your work today."
        action={
          <NavLink className="primary" to="/entries">
            <Plus size={17} /> Add time
          </NavLink>
        }
      />
      <div className="stats">
        <Stat
          icon={Clock3}
          title="Tracked today"
          value={hours(total)}
          note="Across all projects"
          trend="Today"
        />
        <Stat
          icon={CalendarDays}
          title="This week"
          value={hours(weekTotal)}
          note="Since Monday"
          trend="This week"
        />
        <Stat
          icon={Wallet}
          title="Billable hours"
          value={hours(
            entries
              .filter((e) => e.billable)
              .reduce((s, e) => s + e.durationSeconds, 0),
          )}
          note="Ready to invoice"
          trend="↗"
        />
        <Stat
          icon={FileText}
          title="Invoices created"
          value={invoices.length.toString().padStart(2, "0")}
          note="Billing history"
          trend="View"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel focus">
          <div className="panel-head">
            <div>
              <div className="eyebrow">FOCUS MODE</div>
              <h2>{timer ? "You’re in the zone" : "Ready when you are"}</h2>
            </div>
            <span className="live-pill">
              <i /> {timer ? "TIMER RUNNING" : "NO ACTIVE TIMER"}
            </span>
          </div>
          {timer ? (
            <div className="running-card">
              <div className="running-project">
                {timer.project?.client?.name || "Current project"}
                <span>{timer.project?.name}</span>
              </div>
              <TimerClock startedAt={timer.startedAt} />
              <button
                className="stop-btn"
                onClick={async () => {
                  try {
                    await api("/timer/stop", { method: "POST", body: "{}" });
                    await refresh();
                    notify("Time entry saved");
                  } catch (e: any) {
                    notify(e.message);
                  }
                }}
              >
                <Square size={15} fill="currentColor" /> Stop timer
              </button>
            </div>
          ) : (
            <div className="start-card">
              <div className="big-clock">
                00<span>:</span>00<span>:</span>00
              </div>
              <p>Choose a project and start tracking your time.</p>
              <NavLink to="/tracker" className="primary">
                <Play size={16} fill="currentColor" /> Start a timer
              </NavLink>
            </div>
          )}
        </section>
        <section className="panel week-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">AT A GLANCE</div>
              <h2>Your week</h2>
            </div>
            <NavLink className="text-link" to="/timesheet">
              Full timesheet <ArrowRight size={15} />
            </NavLink>
          </div>
          <div className="week-bars">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div className="bar-day" key={i}>
                <div className="bar-track">
                  <div
                    className={"bar-fill " + (i === 1 ? "current" : "")}
                    style={{ height: `${[35, 70, 45, 85, 25, 0, 0][i]}%` }}
                  />
                </div>
                <span>{d}</span>
              </div>
            ))}
          </div>
          <div className="week-summary">
            <b>{hours(weekTotal)}</b>
            <span>tracked this week</span>
            <span className="week-target">of 40h goal</span>
          </div>
        </section>
      </div>
      <section className="panel recent">
        <div className="panel-head">
          <div>
            <div className="eyebrow">LATEST ACTIVITY</div>
            <h2>Recent time entries</h2>
          </div>
          <NavLink className="text-link" to="/entries">
            See all <ArrowRight size={15} />
          </NavLink>
        </div>
        <EntryTable rows={entries.slice(0, 5)} />
      </section>
      <div className="quick-actions">
        <Quick
          to="/tracker"
          icon={Play}
          title="Start tracking"
          desc="Pick up where you left off"
        />
        <Quick
          to="/clients"
          icon={Users}
          title="Add a client"
          desc="Keep your contacts organized"
        />
        <Quick
          to="/invoices"
          icon={FileText}
          title="Create an invoice"
          desc="Turn tracked time into income"
        />
      </div>
    </>
  );
}
function Stat({ icon: Icon, title, value, note, trend }: any) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={17} />
        </span>
        <span className="stat-trend">{trend}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{title}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}
function Quick({ to, icon: Icon, title, desc }: any) {
  return (
    <NavLink to={to} className="quick">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <b>{title}</b>
        <small>{desc}</small>
      </div>
      <ArrowRight size={16} />
    </NavLink>
  );
}
function TimerClock({ startedAt }: any) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const sec = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  return (
    <div className="timer-clock">
      {[Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60]
        .map((n) => String(n).padStart(2, "0"))
        .join(":")}
    </div>
  );
}
function Tracker({ timer, setTimer, notify }: any) {
  const [projects, setProjects] = useState<any[]>([]),
    [projectId, setProject] = useState(""),
    [description, setDescription] = useState("");
  useEffect(() => {
    api("/projects")
      .then(setProjects)
      .catch((e) => notify(e.message));
    if (!timer)
      api("/timer")
        .then(setTimer)
        .catch(() => {});
  }, []);
  async function start() {
    try {
      const t = await api("/timer/start", {
        method: "POST",
        body: JSON.stringify({ projectId, description }),
      });
      setTimer(t);
      notify("Timer started");
    } catch (e: any) {
      notify(e.message);
    }
  }
  async function stop() {
    try {
      await api("/timer/stop", { method: "POST", body: "{}" });
      setTimer(null);
      notify("Time entry saved");
    } catch (e: any) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="TIME TRACKER"
        title="Make time count."
        sub="Keep your focus on the work. We’ll take care of the hours."
      />
      <div className="tracker-layout">
        <div className="panel tracker-card">
          <div className="tracker-overline">
            <i /> {timer ? "TRACKING IN PROGRESS" : "READY TO TRACK"}
          </div>
          {timer ? (
            <TimerClock startedAt={timer.startedAt} />
          ) : (
            <div className="big-clock">
              00<span>:</span>00<span>:</span>00
            </div>
          )}
          <div className="tracker-divider" />
          <label>Project</label>
          <select
            value={timer?.projectId || projectId}
            disabled={!!timer}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.client?.name} · {p.name}
              </option>
            ))}
          </select>
          <label>What are you working on?</label>
          <input
            disabled={!!timer}
            placeholder="e.g. Designing the landing page"
            value={timer?.description || description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {timer ? (
            <button className="stop-btn large" onClick={stop}>
              <Square size={16} fill="currentColor" /> Stop and save
            </button>
          ) : (
            <button
              className="primary large"
              disabled={!projectId}
              onClick={start}
            >
              <Play size={16} fill="currentColor" /> Start timer
            </button>
          )}
          <p className="server-note">
            ✳ &nbsp;Your timer is saved securely and keeps running if you leave
            this page.
          </p>
        </div>
        <aside className="panel tracker-side">
          <div className="eyebrow">TODAY AT A GLANCE</div>
          <h2>Keep your momentum.</h2>
          <p>
            Every minute you track adds up. Your timesheet updates
            automatically.
          </p>
          <div className="side-icon">
            <Clock3 size={27} />
          </div>
          <div className="side-tips">
            <b>A small tip</b>
            <p>
              Add a short note to each session so your future self remembers
              what you shipped.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function Entries({ notify }: any) {
  const [rows, setRows] = useState<any[]>([]),
    [projects, setProjects] = useState<any[]>([]),
    [show, setShow] = useState(false),
    [editing, setEditing] = useState<any>(null);
  const load = () =>
    api("/entries")
      .then(setRows)
      .catch((e) => notify(e.message));
  useEffect(() => {
    load();
    api("/projects").then(setProjects);
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="TIME ENTRIES"
        title="Your time, accounted for."
        sub="Review and manage all your tracked work."
        action={
          <button
            className="primary"
            onClick={() => {
              setEditing(null);
              setShow(true);
            }}
          >
            <Plus size={17} /> Add entry
          </button>
        }
      />
      <div className="panel table-panel">
        <div className="filters">
          <span>
            All entries <b>{rows.length}</b>
          </span>
          <span className="filter-right">Latest first</span>
        </div>
        <EntryTable
          rows={rows}
          onEdit={(e: any) => {
            setEditing(e);
            setShow(true);
          }}
          onDelete={async (e: any) => {
            if (confirm("Delete this time entry?")) {
              try {
                await api("/entries/" + e.id, { method: "DELETE" });
                load();
                notify("Entry deleted");
              } catch (err: any) {
                notify(err.message);
              }
            }
          }}
        />
      </div>
      {show && (
        <EntryModal
          entry={editing}
          projects={projects}
          close={() => setShow(false)}
          done={() => {
            setShow(false);
            setEditing(null);
            load();
            notify(editing ? "Entry updated" : "Entry added");
          }}
        />
      )}
    </>
  );
}
function EntryTable({ rows, onDelete, onEdit }: any) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>PROJECT</th>
            <th>DESCRIPTION</th>
            <th>DATE</th>
            <th>DURATION</th>
            <th>TYPE</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((e: any) => (
              <tr key={e.id}>
                <td>
                  <div className="project-cell">
                    <span className="project-dot" />
                    {e.project?.name || "Project"}
                    <small>{e.project?.client?.name || ""}</small>
                  </div>
                </td>
                <td>{e.description || "—"}</td>
                <td>{date(e.startTime)}</td>
                <td className="duration-cell">{hours(e.durationSeconds)}</td>
                <td>
                  <span className={e.billable ? "badge green" : "badge gray"}>
                    {e.billable ? "Billable" : "Non-billable"}
                  </span>
                </td>
                <td>
                  {!e.invoiceLine && (
                    <>
                      {onEdit && (
                        <button
                          className="mini-action"
                          onClick={() => onEdit(e)}
                        >
                          Edit
                        </button>
                      )}{" "}
                      {onDelete && (
                        <button
                          className="mini-action"
                          onClick={() => onDelete(e)}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>
                <div className="empty">
                  No time entries yet. Start a timer or add your first entry.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function EntryModal({ projects, close, done, entry }: any) {
  const localTime = (v: string) => {
    const d = new Date(v);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const [projectId, setProject] = useState(
      entry?.projectId || projects[0]?.id || "",
    ),
    [description, setDescription] = useState(entry?.description || ""),
    [dateVal, setDate] = useState(
      entry?.startTime
        ? new Date(entry.startTime).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    ),
    [start, setStart] = useState(entry ? localTime(entry.startTime) : "09:00"),
    [end, setEnd] = useState(entry ? localTime(entry.endTime) : "10:00"),
    [billable, setBillable] = useState(entry?.billable ?? true),
    [error, setError] = useState("");
  return (
    <div className="overlay">
      <form
        className="modal"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(entry ? "/entries/" + entry.id : "/entries", {
              method: entry ? "PATCH" : "POST",
              body: JSON.stringify({
                projectId,
                description,
                startTime: new Date(`${dateVal}T${start}:00`).toISOString(),
                endTime: new Date(`${dateVal}T${end}:00`).toISOString(),
                billable,
              }),
            });
            done();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">MANUAL ENTRY</div>
            <h2>{entry ? "Edit time" : "Add time"}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <label>Project</label>
        <select
          required
          value={projectId}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="">Choose project</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.client?.name} · {p.name}
            </option>
          ))}
        </select>
        <label>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
        />
        <label>Date</label>
        <input
          type="date"
          value={dateVal}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="time-fields">
          <div>
            <label>Start</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label>End</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />{" "}
          Billable time
        </label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary">
            {entry ? "Save changes" : "Save entry"} <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
function Clients({ notify }: any) {
  const [rows, setRows] = useState<any[]>([]),
    [show, setShow] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [company, setCompany] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    api("/clients")
      .then(setRows)
      .catch((e) => notify(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="CLIENTS"
        title="Good work starts here."
        sub="All the people and teams you work with."
        action={
          <button className="primary" onClick={() => setShow(true)}>
            <Plus size={17} /> Add client
          </button>
        }
      />
      <div className="client-grid">
        {rows.map((c) => (
          <div className="panel client-card" key={c.id}>
            <div className="client-initial">{c.name[0]}</div>
            <h2>{c.name}</h2>
            <span>{c.companyName || "Independent"}</span>
            <p>{c.email || "No email added"}</p>
            <div className="client-meta">
              <span>
                <BriefcaseBusiness size={15} /> {c._count?.projects || 0}{" "}
                projects
              </span>
              <button
                className="mini-action"
                onClick={async () => {
                  try {
                    await api("/clients/" + c.id, { method: "DELETE" });
                    load();
                    notify("Client deleted");
                  } catch (e: any) {
                    notify(e.message);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="empty panel">
            Your client list is looking a little quiet. Add a client to get
            started.
          </div>
        )}
      </div>
      {show && (
        <div className="overlay">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/clients", {
                  method: "POST",
                  body: JSON.stringify({ name, email, companyName: company }),
                });
                setShow(false);
                setName("");
                load();
                notify("Client added");
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">NEW CONTACT</div>
                <h2>Add a client</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShow(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label>Client name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Studio"
            />
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@company.com"
            />
            <label>Company name</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Optional"
            />
            {error && <div className="error">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button className="primary">
                Save client <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function Projects({ notify }: any) {
  const [rows, setRows] = useState<any[]>([]),
    [clients, setClients] = useState<any[]>([]),
    [show, setShow] = useState(false);
  const [form, S] = useState<any>({
    name: "",
    clientId: "",
    hourlyRate: "85",
    currency: "USD",
  });
  const load = () =>
    api("/projects")
      .then(setRows)
      .catch((e) => notify(e.message));
  useEffect(() => {
    load();
    api("/clients").then(setClients);
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="PROJECTS"
        title="A home for every project."
        sub="Set your scope, rate, and keep your work organized."
        action={
          <button className="primary" onClick={() => setShow(true)}>
            <Plus size={17} /> New project
          </button>
        }
      />
      <div className="project-grid">
        {rows.map((p) => (
          <div className="panel project-card" key={p.id}>
            <div className="project-top">
              <span className="project-square">
                <BriefcaseBusiness size={18} />
              </span>
              <span className="badge green">ACTIVE</span>
            </div>
            <h2>{p.name}</h2>
            <p>{p.client?.name}</p>
            <div className="project-bottom">
              <div>
                <small>HOURLY RATE</small>
                <b>
                  {money(Number(p.hourlyRate), p.currency)}
                  <small>/hr</small>
                </b>
              </div>
              <button
                className="mini-action"
                onClick={async () => {
                  try {
                    await api("/projects/" + p.id, { method: "DELETE" });
                    load();
                    notify("Project deleted");
                  } catch (e: any) {
                    notify(e.message);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="empty panel">
            Create a project to start tracking work.
          </div>
        )}
      </div>
      {show && (
        <div className="overlay">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/projects", {
                  method: "POST",
                  body: JSON.stringify({
                    ...form,
                    hourlyRate: Number(form.hourlyRate),
                  }),
                });
                setShow(false);
                load();
                notify("Project created");
              } catch (e: any) {
                notify(e.message);
              }
            }}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">PROJECT SETUP</div>
                <h2>New project</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShow(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label>Project name</label>
            <input
              required
              value={form.name}
              onChange={(e) => S({ ...form, name: e.target.value })}
              placeholder="Website redesign"
            />
            <label>Client</label>
            <select
              required
              value={form.clientId}
              onChange={(e) => S({ ...form, clientId: e.target.value })}
            >
              <option value="">Choose client</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label>Hourly rate</label>
            <div className="rate-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyRate}
                onChange={(e) => S({ ...form, hourlyRate: e.target.value })}
              />
              <select
                value={form.currency}
                onChange={(e) => S({ ...form, currency: e.target.value })}
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>INR</option>
                <option>CAD</option>
              </select>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button className="primary">
                Create project <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function Timesheet() {
  const [week, setWeek] = useState(new Date()),
    [data, setData] = useState<any>({ days: [], entries: [] });
  const monday = (d: Date) => {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
  };
  const start = monday(week);
  useEffect(() => {
    api("/timesheet?weekStart=" + start.toISOString().slice(0, 10)).then(
      setData,
    );
  }, [week]);
  const move = (delta: number) => {
    const x = new Date(week);
    x.setDate(x.getDate() + delta * 7);
    setWeek(x);
  };
  const projects = [
    ...new Map(data.entries.map((e: any) => [e.projectId, e.project])).values(),
  ] as any[];
  return (
    <>
      <PageTitle
        eyebrow="WEEKLY TIMESHEET"
        title="Your week, in focus."
        sub="A clear view of where your time is going."
        action={
          <div className="week-nav">
            <button onClick={() => move(-1)}>
              <ChevronLeft size={18} />
            </button>
            <b>
              {start.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              —{" "}
              {new Date(start.getTime() + 6 * 86400000).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              )}
            </b>
            <button onClick={() => move(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />
      <div className="panel table-panel timesheet">
        <table>
          <thead>
            <tr>
              <th>PROJECT</th>
              {(data.days || []).map((d: string) => (
                <th key={d}>
                  {new Date(d + "T00:00:00Z")
                    .toLocaleDateString("en-US", { weekday: "short" })
                    .toUpperCase()}
                  <small>{new Date(d + "T00:00:00Z").getUTCDate()}</small>
                </th>
              ))}
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="project-cell">
                    {p.name}
                    <small>{p.clientId}</small>
                  </div>
                </td>
                {data.days.map((d: string) => {
                  const secs = data.entries
                    .filter(
                      (e: any) =>
                        e.projectId === p.id && e.startTime.slice(0, 10) === d,
                    )
                    .reduce((s: number, e: any) => s + e.durationSeconds, 0);
                  return (
                    <td key={d} className={secs ? "sheet-hours" : ""}>
                      {secs ? hours(secs) : "—"}
                    </td>
                  );
                })}
                <td className="duration-cell">
                  {hours(
                    data.entries
                      .filter((e: any) => e.projectId === p.id)
                      .reduce((s: number, e: any) => s + e.durationSeconds, 0),
                  )}
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Daily total</td>
              {data.days.map((d: string) => (
                <td key={d}>
                  {hours(
                    data.entries
                      .filter((e: any) => e.startTime.slice(0, 10) === d)
                      .reduce((s: number, e: any) => s + e.durationSeconds, 0),
                  )}
                </td>
              ))}
              <td>{hours(data.totals?.seconds || 0)}</td>
            </tr>
          </tbody>
        </table>
        <div className="sheet-legend">
          <span>
            <i className="legend-green" /> Billable
          </span>
          <span>
            <i className="legend-gray" /> Non-billable
          </span>
          <b>
            {hours(data.totals?.billableSeconds || 0)} billable ·{" "}
            {hours(
              (data.totals?.seconds || 0) - (data.totals?.billableSeconds || 0),
            )}{" "}
            non-billable
          </b>
        </div>
      </div>
    </>
  );
}
function Invoices({ notify }: any) {
  const [rows, setRows] = useState<any[]>([]),
    [clients, setClients] = useState<any[]>([]),
    [form, setForm] = useState<any>({
      clientId: "",
      from: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    }),
    [preview, setPreview] = useState<any>(null);
  const nav = useNavigate();
  const load = () =>
    api("/invoices")
      .then(setRows)
      .catch((e) => notify(e.message));
  useEffect(() => {
    load();
    api("/clients").then(setClients);
  }, []);
  async function getPreview() {
    try {
      setPreview(
        await api(
          `/invoices/preview?clientId=${form.clientId}&from=${form.from}&to=${form.to}`,
        ),
      );
    } catch (e: any) {
      notify(e.message);
    }
  }
  async function create() {
    try {
      const d = await api("/invoices", {
        method: "POST",
        body: JSON.stringify(form),
      });
      notify("Invoice created");
      setPreview(null);
      load();
      nav("/invoices/" + d.id);
    } catch (e: any) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="INVOICES"
        title="Get paid for your good work."
        sub="Turn your billable hours into clear, professional invoices."
        action={
          <button
            className="primary"
            onClick={() =>
              document
                .getElementById("invoice-builder")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Plus size={17} /> Create invoice
          </button>
        }
      />
      <div id="invoice-builder" className="panel invoice-builder">
        <div className="builder-title">
          <span className="invoice-icon">
            <FileText size={19} />
          </span>
          <div>
            <h2>Build an invoice</h2>
            <p>We’ll find all billable, uninvoiced time in this period.</p>
          </div>
        </div>
        <div className="builder-fields">
          <div>
            <label>CLIENT</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>FROM</label>
            <input
              type="date"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
          </div>
          <div>
            <label>TO</label>
            <input
              type="date"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </div>
          <button className="secondary" onClick={getPreview}>
            Preview entries
          </button>
        </div>
        {preview && (
          <div className="preview-box">
            <div>
              <b>{preview.entries.length} eligible entries</b>
              <span> · {money(preview.total)}</span>
            </div>
            <button
              className="primary"
              disabled={!preview.entries.length}
              onClick={create}
            >
              Create invoice <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <section className="panel table-panel">
        <div className="panel-head invoice-list-head">
          <div>
            <div className="eyebrow">BILLING HISTORY</div>
            <h2>Past invoices</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>INVOICE</th>
                <th>CLIENT</th>
                <th>ISSUED</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => nav("/invoices/" + i.id)}
                  className="click-row"
                >
                  <td className="duration-cell">{i.invoiceNumber}</td>
                  <td>{i.client.name}</td>
                  <td>{date(i.issueDate)}</td>
                  <td>{i._count.lines} entries</td>
                  <td className="duration-cell">
                    {money(Number(i.total), i.currency)}
                  </td>
                  <td>
                    <span className="badge green">Created</span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      Invoices you create will appear here.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function InvoiceDetail() {
  const { id } = useParams();
  const [inv, setInv] = useState<any>(null);
  useEffect(() => {
    api("/invoices/" + id).then(setInv);
  }, [id]);
  if (!inv) return <div className="loading">Loading invoice…</div>;
  return (
    <>
      <PageTitle
        eyebrow="INVOICE DETAIL"
        title={inv.invoiceNumber}
        sub={`${inv.client.name} · ${date(inv.periodStart)} — ${date(inv.periodEnd)}`}
        action={
          <button className="primary" onClick={() => window.print()}>
            <FileText size={16} /> Print invoice
          </button>
        }
      />
      <div className="panel invoice-paper">
        <div className="paper-head">
          <div>
            <span className="brand-mark">t</span>
            <b>tempo</b>
            <p>Freelance services</p>
          </div>
          <div className="paper-number">
            <span>INVOICE</span>
            <strong>{inv.invoiceNumber}</strong>
            <small>Issued {date(inv.issueDate)}</small>
          </div>
        </div>
        <div className="bill-to">
          <div>
            <span>BILL TO</span>
            <b>{inv.client.companyName || inv.client.name}</b>
            <small>{inv.client.email}</small>
          </div>
          <div>
            <span>BILLING PERIOD</span>
            <b>
              {date(inv.periodStart)} – {date(inv.periodEnd)}
            </b>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th>DATE</th>
              <th>HOURS</th>
              <th>RATE</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l: any) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td>{date(l.dateWorked)}</td>
                <td>{Number(l.hours).toFixed(2)}</td>
                <td>{money(Number(l.hourlyRate), inv.currency)}</td>
                <td>{money(Number(l.amount), inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="invoice-total">
          <span>Total due</span>
          <b>{money(Number(inv.total), inv.currency)}</b>
        </div>
      </div>
    </>
  );
}
import { useParams } from "react-router-dom";
export default App;
