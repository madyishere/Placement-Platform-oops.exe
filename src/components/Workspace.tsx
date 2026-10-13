"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { WorkspaceData } from "@/services/workspace";
import { courses, idOf, money, type RecordData } from "@/lib/domain";

type Tab =
  | "overview"
  | "students"
  | "drives"
  | "applications"
  | "offers"
  | "attendance"
  | "reports"
  | "policy"
  | "reviews"
  | "audit"
  | "import";
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  value?: string | number;
  required?: boolean;
  hint?: string;
};
type Modal = {
  title: string;
  subtitle?: string;
  action: string;
  fields: Field[];
  fixed?: Record<string, unknown>;
};
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "students", label: "Student directory", icon: Users },
  { id: "drives", label: "Recruitment drives", icon: BriefcaseBusiness },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "offers", label: "Offers & outcomes", icon: FileCheck2 },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "reports", label: "Reports & insights", icon: SlidersHorizontal },
] as const;
const opts = (values: readonly string[]) =>
  values.map((value) => ({
    value,
    label: value.replaceAll("-", " ").replace("IF", "Internship + FTE/PPO"),
  }));
const label = (value: unknown) => String(value ?? "—");
const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
function Badge({ value }: { value: unknown }) {
  const v = String(value || "pending");
  return (
    <span
      className={`badge ${["eligible", "accepted", "open", "approved", "joined", "ALLOW", "selected", "present", "registered"].includes(v) ? "green" : ["ineligible", "declined", "rejected", "BLOCK", "absent", "expired"].includes(v) ? "red" : ["pending", "review", "MANUAL_REVIEW"].includes(v) ? "amber" : "neutral"}`}
    >
      <i />
      {v.replaceAll("-", " ").replaceAll("_", " ")}
    </span>
  );
}
function Empty({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BriefcaseBusiness size={25} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export default function Workspace({
  initial,
  setup,
}: {
  initial: WorkspaceData | null;
  setup?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial),
    [tab, setTab] = useState<Tab>("overview"),
    [search, setSearch] = useState(""),
    [course, setCourse] = useState(""),
    [mobileNav, setMobileNav] = useState(false),
    [modal, setModal] = useState<Modal | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [noticeTone, setNoticeTone] = useState<"success" | "blocked" | "review">(
      "success",
    ),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [csv, setCsv] = useState(""),
    [importResult, setImportResult] = useState<Record<string, unknown> | null>(
      null,
    );
  const role = data?.user.role || "admin",
    staff = ["admin", "officer", "coordinator"].includes(role),
    manager = ["admin", "officer"].includes(role);
  const studentOptions = useMemo(
    () =>
      data?.students.map((s) => ({
        value: s.id,
        label: `${s.name} · ${s.placementID}`,
      })) || [],
    [data],
  );
  const driveOptions =
    data?.drives.map((d) => ({ value: d.id, label: String(d.title) })) || [];
  const companyOptions =
    data?.companies.map((c) => ({ value: c.id, label: String(c.name) })) || [];
  const sessionField: Field = {
    name: "session",
    label: "Placement session",
    options:
      data?.sessions.map((s) => ({ value: s.id, label: String(s.name) })) || [],
    value: data?.selectedSession,
  };
  const studentField: Field = {
    name: "student",
    label: "Student",
    options: studentOptions,
  };
  const driveField: Field = {
    name: "drive",
    label: "Recruitment drive",
    options: driveOptions,
  };
  const noteField: Field = {
    name: "notes",
    label: "Reason / supporting notes",
    type: "textarea",
  };
  const nameFor = (id: unknown, collection: RecordData[] | undefined) => {
    const found = collection?.find((s) => s.id === idOf(id));
    return String(
      found?.name || found?.title || (idOf(id) ? "Restricted record" : "—"),
    );
  };
  const refresh = useCallback(async (session?: string) => {
    const response = await fetch(
      `/api/placement/workspace${session ? "?session=" + encodeURIComponent(session) : ""}`,
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Unable to refresh the workspace.");
    setData(result);
  }, []);
  function navigate(next: Tab) {
    setTab(next);
    setSearch("");
    setCourse("");
    setPage(1);
    setMobileNav(false);
    setError("");
  }
  function open(m: Modal) {
    setModal(m);
    setError("");
  }
  function showNotice(
    message: string,
    tone: "success" | "blocked" | "review" = "success",
  ) {
    setNoticeTone(tone);
    setNotice(message);
  }
  async function command(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/placement/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save this action.");
      showNotice(
        result.result?.outcome
          ? `${result.result.outcome.replaceAll("_", " ")} · ${result.result.reasons.map((r: { message: string }) => r.message).join(" ") || "All participation checks passed."}`
          : result.message ||
              "Saved successfully. Your workspace is up to date.",
        result.result?.outcome === "BLOCK"
          ? "blocked"
          : result.result?.outcome === "MANUAL_REVIEW"
            ? "review"
            : "success",
      );
      setModal(null);
      await refresh(data?.selectedSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const form = new FormData(e.currentTarget),
      values: Record<string, unknown> = {};
    for (const f of modal.fields) {
      const raw = String(form.get(f.name) || "");
      if (!raw && f.required === false) continue;
      values[f.name] =
        f.type === "number"
          ? Number(raw)
          : f.type === "datetime-local"
            ? new Date(raw).toISOString()
            : f.type === "codes"
              ? raw
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
              : raw;
    }
    await command({ action: modal.action, ...modal.fixed, ...values });
  }
  function newStudent(s?: RecordData) {
    open({
      title: s ? "Edit student profile" : "Add a student",
      subtitle: "Create a verified foundation for their placement journey.",
      action: s ? "edit-student" : "create-student",
      fixed: s ? { student: s.id } : {},
      fields: [
        {
          name: "placementID",
          label: "Placement ID",
          value: label(s?.placementID || ""),
        },
        { name: "name", label: "Full name", value: label(s?.name || "") },
        {
          name: "email",
          label: "Email address",
          type: "email",
          value: label(s?.email || ""),
        },
        {
          name: "mobile",
          label: "Mobile number",
          required: false,
          value: label(s?.mobile || ""),
        },
        {
          name: "course",
          label: "Programme",
          options: opts(courses),
          value: label(s?.course || ""),
        },
        {
          name: "batch",
          label: "Academic batch",
          value: label(s?.batch || "2025–2027"),
        },
        ...(s
          ? [
              {
                name: "reason",
                label: "Reason for correction",
                type: "textarea",
              },
            ]
          : []),
      ],
    });
  }
  function register(s?: RecordData) {
    open({
      title: "Verify registration",
      action: "register",
      fields: [
        { ...studentField, value: s?.id },
        sessionField,
        {
          name: "status",
          label: "Registration",
          options: opts(["registered", "deregistered", "not-registered"]),
        },
        {
          name: "eligibility",
          label: "Eligibility",
          options: opts(["pending", "eligible", "ineligible"]),
        },
        { name: "cgpa", label: "CGPA (0–10)", type: "number", required: false },
        {
          name: "backlogs",
          label: "Active backlogs",
          type: "number",
          required: false,
        },
        noteField,
      ],
    });
  }
  function issueOffer() {
    open({
      title: "Record an offer",
      subtitle: "Annual CTC and internship stipends are recorded separately.",
      action: "issue-offer",
      fields: [
        studentField,
        sessionField,
        { name: "company", label: "Company", options: companyOptions },
        { ...driveField, required: false },
        {
          name: "source",
          label: "Source",
          options: opts(["campus", "off-campus"]),
        },
        { name: "type", label: "Offer type", options: opts(["I", "F", "IF"]) },
        {
          name: "combinedOutcome",
          label: "Combined offer outcome (I+F only)",
          options: [
            { value: "ppo", label: "PPO pending" },
            { value: "fte", label: "Confirmed FTE" },
          ],
          value: "ppo",
        },
        {
          name: "ctc",
          label: "Annual CTC · INR",
          type: "number",
          required: false,
        },
        {
          name: "stipend",
          label: "Internship stipend · INR",
          type: "number",
          required: false,
        },
        {
          name: "stipendPeriod",
          label: "Stipend period",
          options: opts(["monthly", "weekly", "total"]),
        },
        { name: "issuedAt", label: "Issued at", type: "datetime-local" },
        {
          name: "companyDeadline",
          label: "Company deadline (if earlier)",
          type: "datetime-local",
          required: false,
        },
        noteField,
      ],
    });
  }
  function offerAction(o: RecordData) {
    const transitions = manager
      ? [
          "accept",
          "decline",
          "expire",
          "correct",
          "revoke",
          "join",
          "not-joined",
          "ppo-offered",
          "ppo-accepted",
          "ppo-declined",
          "noc-approved",
          "noc-rejected",
        ]
      : ["accept", "decline", "noc-request"];
    open({
      title: "Update offer",
      subtitle: `${nameFor(o.company, data?.companies)} · ${money(o.ctc)}`,
      action: "offer-action",
      fixed: { offer: o.id, revision: Number(o.revision || 0) },
      fields: [
        { name: "transition", label: "Action", options: opts(transitions) },
        ...(manager
          ? [
              {
                name: "ctc",
                label: "Corrected annual CTC · INR (corrections only)",
                type: "number",
                required: false,
              },
              {
                name: "stipend",
                label: "Corrected stipend · INR (corrections only)",
                type: "number",
                required: false,
              },
            ]
          : []),
        { ...noteField, required: false },
      ],
    });
  }
  function requestReview() {
    open({
      title: "Request a review",
      action: "request-review",
      fields: [
        ...(role !== "student"
          ? [
              {
                ...studentField,
                options:
                  role === "recruiter"
                    ? data?.applications.map((a) => ({
                        value: idOf(a.student),
                        label: String(a.candidateName || "Candidate"),
                      })) || []
                    : studentOptions,
              },
            ]
          : []),
        sessionField,
        { ...driveField, required: false },
        {
          name: "kind",
          label: "Review type",
          options: opts(
            role === "recruiter"
              ? ["offer-proposal"]
              : ["exception", "policy-conflict", "contact-correction"],
          ),
        },
        noteField,
      ],
    });
  }
  function resolveReview(r: RecordData) {
    open({
      title: "Resolve review case",
      subtitle: String(r.notes || ""),
      action: "resolve-review",
      fixed: { review: r.id, excludedDrives: [], ruleCodes: [] },
      fields: [
        {
          name: "status",
          label: "Decision",
          options: opts(["approved", "rejected"]),
        },
        {
          name: "ruleCodes",
          label: "Exception rule codes (comma separated)",
          type: "codes",
          required: false,
        },
        ...(r.kind === "absence"
          ? [
              {
                name: "excludedDrives",
                label: "Excluded drive IDs (up to 3, comma separated)",
                type: "codes",
                required: false,
              },
            ]
          : []),
        {
          name: "expiresAt",
          label: "Exception expiry",
          type: "datetime-local",
          required: false,
        },
        noteField,
      ],
    });
  }
  async function importCSV(commit: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/placement/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, commit }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setImportResult(result);
      if (commit) await refresh(data?.selectedSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  async function exportCSV() {
    const purpose = window.prompt(
      "Purpose of this student-directory export (at least 5 characters):",
    );
    if (!purpose) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/placement/export?session=${data?.selectedSession || ""}&kind=${tab === "offers" ? "offers" : "students"}&purpose=${encodeURIComponent(purpose)}`,
      );
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download =
        tab === "offers" ? "placement-offers.csv" : "placement-students.csv";
      a.click();
      URL.revokeObjectURL(url);
      showNotice(
        "Your scoped student export is ready. The export has been audited.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  const titleMap: Record<Tab, [string, string]> = {
    overview: [
      "A little clarity. A lot of possibility.",
      "Your placement session, at a glance.",
    ],
    students: [
      "Student directory",
      "The people at the heart of every placement.",
    ],
    drives: [
      "Recruitment drives",
      "Connect the right students with the right opportunities.",
    ],
    applications: [
      "Applications",
      "Every application. Every decision. One place.",
    ],
    offers: [
      "Offers & outcomes",
      "Follow every opportunity from selection to joining.",
    ],
    attendance: [
      "Recruitment attendance",
      "Track participation. Review exceptions with care.",
    ],
    reports: [
      "Reports & insights",
      "A clear, accountable view of placement outcomes.",
    ],
    policy: [
      "Placement policy",
      "Consistent rules. Clear reasons. Human oversight.",
    ],
    reviews: [
      "Review centre",
      "Resolve policy questions and keep decisions accountable.",
    ],
    audit: [
      "Activity & audit",
      "A traceable record of actions and sensitive access.",
    ],
    import: [
      "Import students",
      "A controlled start for your student directory.",
    ],
  };
  const filtered = (records: RecordData[]) =>
    records.filter(
      (r) =>
        (!search ||
          Object.values(r).some(
            (v) =>
              typeof v === "string" &&
              v.toLowerCase().includes(search.toLowerCase()),
          )) &&
        (!course || r.course === course),
    );
  const pendingReviews =
    data?.reviews.filter((r) => r.status === "pending").length || 0;
  const stats = data?.report;
  const percent = stats?.registered
    ? Math.round((stats.registeredPlaced / stats.registered) * 100)
    : 0;
  const disabled = !data || busy;
  function table(
    headers: string[],
    rows: RecordData[],
    render: (row: RecordData) => React.ReactNode,
    empty: string,
  ) {
    const list = filtered(rows),
      start = (page - 1) * 12;
    return (
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="searchbox">
            <Search size={16} />
            <input
              aria-label="Search records"
              placeholder="Search records…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {tab === "students" && (
            <select
              aria-label="Filter by programme"
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All programmes</option>
              {courses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          <span className="muted small">{list.length} records</span>
        </div>
        {list.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.slice(start, start + 12).map((r) => (
                    <tr key={r.id}>{render(r)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {start + 1}–{Math.min(start + 12, list.length)} of{" "}
                {list.length}
              </span>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{page}</span>
                <button
                  aria-label="Next page"
                  disabled={start + 12 >= list.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={empty}
            message={
              search || course
                ? "Try a different search or programme filter."
                : "Records will appear here as your placement session progresses."
            }
          />
        )}
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <GraduationCap size={25} />
          </span>
          <span>
            Placement Office<small>NFSU · CAMPUS WORKSPACE</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="university-monogram">N</span>
          <div>
            National Forensic Sciences<small>University placement cell</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav
            .filter((n) =>
              role === "recruiter"
                ? ["overview", "drives", "applications"].includes(n.id)
                : role === "student"
                  ? !["attendance", "reports"].includes(n.id)
                  : true,
            )
            .map((n) => (
              <button
                key={n.id}
                className={tab === n.id ? "active" : ""}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={18} />
                {role === "student" && n.id === "students"
                  ? "My profile"
                  : n.label}
                {n.id === "offers" && !!stats?.pendingAcceptance && (
                  <span className="nav-count">{stats.pendingAcceptance}</span>
                )}
              </button>
            ))}
        </nav>
        <span className="nav-label">GOVERNANCE</span>
        <nav>
          <button
            className={tab === "policy" ? "active" : ""}
            onClick={() => navigate("policy")}
          >
            <ShieldCheck size={18} />
            Placement policy
          </button>
          <button
            className={tab === "reviews" ? "active" : ""}
            onClick={() => navigate("reviews")}
          >
            <ClipboardCheck size={18} />
            Review centre
            {!!pendingReviews && (
              <span className="nav-count">{pendingReviews}</span>
            )}
          </button>
          {role === "admin" && (
            <button
              className={tab === "audit" ? "active" : ""}
              onClick={() => navigate("audit")}
            >
              <BookOpen size={18} />
              Activity & audit
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-card">
            <ShieldCheck size={20} />
            <strong>Built on trust.</strong>
            <p>
              Role-based access.
              <br />
              Every decision accounted for.
            </p>
          </div>
          {staff && (
            <Link className="admin-link" href="/admin">
              <Settings2 size={17} /> Administration <ArrowUpRight size={14} />
            </Link>
          )}
          <button
            className="help-link"
            onClick={() => {
              showNotice(
                "For account access, policy interpretation or corrections, contact your Placement Cell administrator.",
              );
              setMobileNav(false);
            }}
          >
            <CircleHelp size={17} />
            Help & support
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {tab === "overview" ? "Overview" : titleMap[tab][0]}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="session-label">
              <span className="green-dot" />
              {String(
                data?.sessions.find((s) => s.id === data.selectedSession)
                  ?.name || "2026–27",
              )}{" "}
              session
            </span>
            <button
              className="icon-button notification"
              aria-label="Open pending reviews"
              onClick={() => navigate("reviews")}
            >
              <Bell size={19} />
              {!!pendingReviews && <i />}
            </button>
            <div className="user-avatar">
              {(data?.user.name || "Placement Office")
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </div>
            {data ? (
              <button
                className="icon-button"
                aria-label="Sign out"
                onClick={async () => {
                  await fetch("/api/users/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                  });
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut size={17} />
              </button>
            ) : (
              <Link className="small text-link" href="/login">
                Sign in
              </Link>
            )}
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {tab === "overview"
                  ? "YOUR PLACEMENT PULSE"
                  : "PLACEMENT WORKSPACE"}
              </span>
              <h1>{titleMap[tab][0]}</h1>
              <p>{titleMap[tab][1]}</p>
            </div>
            <div className="heading-actions">
              {data && (
                <select
                  aria-label="Placement session"
                  value={data.selectedSession}
                  onChange={(e) => {
                    setPage(1);
                    refresh(e.target.value).catch((e) => setError(e.message));
                  }}
                >
                  {data.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {String(s.name)}
                    </option>
                  ))}
                </select>
              )}
              {staff && (
                <button
                  className="button secondary"
                  disabled={disabled}
                  onClick={exportCSV}
                >
                  <ArrowDownToLine size={16} />
                  Export
                </button>
              )}
              {tab === "students" && staff ? (
                <button
                  className="button primary"
                  disabled={disabled}
                  onClick={() => newStudent()}
                >
                  <Plus size={16} />
                  Add student
                </button>
              ) : tab === "offers" && manager ? (
                <button
                  className="button primary"
                  disabled={disabled}
                  onClick={issueOffer}
                >
                  <Plus size={16} />
                  Record offer
                </button>
              ) : tab === "drives" && manager ? (
                <Link
                  href="/admin/collections/drives/create"
                  className="button primary"
                >
                  <Plus size={16} />
                  Create drive
                </Link>
              ) : tab === "reviews" ? (
                <button
                  className="button primary"
                  disabled={disabled}
                  onClick={requestReview}
                >
                  <Plus size={16} />
                  Request review
                </button>
              ) : null}
            </div>
          </div>
          {setup && (
            <div className="setup-banner">
              <span className="setup-symbol">
                <Settings2 size={21} />
              </span>
              <div>
                <strong>Your workspace is ready to connect.</strong>
                <p>{setup}</p>
                <details>
                  <summary>View setup steps</summary>
                  <ol>
                    <li>
                      Copy <code>.env.example</code> to <code>.env.local</code>.
                    </li>
                    <li>
                      Set <code>DATABASE_URI</code> to your Atlas connection and
                      add two separate secrets of at least 32 characters.
                    </li>
                    <li>
                      Set initial administrator credentials and run{" "}
                      <code>npm run bootstrap</code>.
                    </li>
                    <li>
                      Restart the app and sign in. Remove the bootstrap password
                      after setup.
                    </li>
                  </ol>
                </details>
              </div>
              <span className="badge neutral">SETUP REQUIRED</span>
            </div>
          )}
          {notice && (
            <div
              className={`notice notice-${noticeTone}`}
              role={noticeTone === "success" ? "status" : "alert"}
              aria-atomic="true"
            >
              {noticeTone === "success" ? (
                <Check size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <span>
                <strong>
                  {noticeTone === "blocked"
                    ? "Action blocked by placement policy"
                    : noticeTone === "review"
                      ? "Placement review required"
                      : "Workspace notification"}
                </strong>
                {notice}
              </span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && !modal && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    title: "Registered students",
                    value: stats?.registered || 0,
                    icon: Users,
                    sub: `${stats?.eligible || 0} verified eligible`,
                    accent: "mint",
                  },
                  {
                    title: "Students placed",
                    value: stats?.placed || 0,
                    icon: GraduationCap,
                    sub: "Unique students · accepted offers",
                    accent: "blue",
                  },
                  {
                    title: "Active drives",
                    value:
                      data?.drives.filter(
                        (d) =>
                          d.status === "open" &&
                          Date.parse(String(d.deadline)) > Date.now(),
                      ).length || 0,
                    icon: BriefcaseBusiness,
                    sub: "Open recruitment opportunities",
                    accent: "peach",
                  },
                  {
                    title: "Offers received",
                    value: stats?.totalOffers || 0,
                    icon: FileCheck2,
                    sub: `${stats?.pendingAcceptance || 0} awaiting a response`,
                    accent: "lilac",
                  },
                ].map((s) => (
                  <div className="stat-card" key={s.title}>
                    <div>
                      <span>{s.title}</span>
                      <span className={`stat-icon ${s.accent}`}>
                        <s.icon size={19} />
                      </span>
                    </div>
                    <strong>{s.value.toLocaleString("en-IN")}</strong>
                    <small>{s.sub}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel outcomes-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Placement progress</h2>
                      <p>A shared view of where we stand.</p>
                    </div>
                    <span className="tag">THIS SESSION</span>
                  </div>
                  <div className="progress-body">
                    <div
                      className="donut"
                      style={{
                        background: `conic-gradient(#147d68 ${Math.min(percent, 100)}%, #edf1ee 0)`,
                      }}
                    >
                      <div>
                        <strong>
                          {percent}
                          <span>%</span>
                        </strong>
                        <small>placement rate</small>
                      </div>
                    </div>
                    <div className="progress-legend">
                      <div>
                        <span>
                          <i className="legend-dot" />
                          Placed students
                        </span>
                        <strong>{stats?.placed || 0}</strong>
                      </div>
                      <div>
                        <span>
                          <i className="legend-dot pale" />
                          Yet to be placed
                        </span>
                        <strong>{stats?.unplaced || 0}</strong>
                      </div>
                      <hr />
                      <small>
                        Based on registered students with accepted, non-revoked
                        offers.
                      </small>
                    </div>
                  </div>
                  <div className="outcome-breakdown">
                    <div>
                      <span className="tiny-dot peach" />
                      Internship only<strong>{stats?.internships || 0}</strong>
                    </div>
                    <div>
                      <span className="tiny-dot blue" />
                      FTE only<strong>{stats?.fte || 0}</strong>
                    </div>
                    <div>
                      <span className="tiny-dot mint" />
                      Internship + FTE<strong>{stats?.combined || 0}</strong>
                    </div>
                  </div>
                </section>
                <section className="panel attention-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>A little attention needed</h2>
                      <p>Keep the next steps moving.</p>
                    </div>
                    <span className="attention-dot" />
                  </div>
                  {[
                    {
                      title: "Offer responses",
                      sub: "Awaiting student acceptance",
                      count: stats?.pendingAcceptance || 0,
                      tab: "offers" as Tab,
                      icon: FileCheck2,
                    },
                    {
                      title: "Policy reviews",
                      sub: "Waiting for an authorized decision",
                      count: pendingReviews,
                      tab: "reviews" as Tab,
                      icon: ShieldCheck,
                    },
                    {
                      title: "Eligibility verification",
                      sub: "Profiles ready for a closer look",
                      count: stats?.pendingVerification || 0,
                      tab: "students" as Tab,
                      icon: ClipboardCheck,
                    },
                  ].map((a) => (
                    <button
                      className="attention-row"
                      key={a.title}
                      onClick={() => navigate(a.tab)}
                    >
                      <span className="attention-icon">
                        <a.icon size={19} />
                      </span>
                      <span>
                        <strong>{a.title}</strong>
                        <small>{a.sub}</small>
                      </span>
                      <b>{a.count}</b>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </section>
              </div>
              <div className="overview-grid lower">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Upcoming opportunities</h2>
                      <p>The next chapter starts here.</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate("drives")}
                    >
                      View all drives <ArrowRight size={15} />
                    </button>
                  </div>
                  {data?.drives.some((d) => d.status === "open") ? (
                    <div className="drive-list">
                      {data.drives
                        .filter((d) => d.status === "open")
                        .slice(0, 3)
                        .map((d) => (
                          <button
                            className="drive-row"
                            key={d.id}
                            onClick={() => navigate("drives")}
                          >
                            <span className="company-monogram">
                              {nameFor(d.company, data.companies).slice(0, 1)}
                            </span>
                            <span>
                              <strong>{String(d.title)}</strong>
                              <small>
                                {nameFor(d.company, data.companies)} ·{" "}
                                {d.type === "IF"
                                  ? "Internship + FTE/PPO"
                                  : String(d.type)}
                              </small>
                            </span>
                            <span className="drive-date">
                              {date(d.deadline)}
                              <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <Empty
                      title="Room for the next opportunity"
                      message="New recruitment drives will appear here when your Placement Cell publishes them."
                      action={
                        manager && data ? (
                          <Link
                            className="text-link"
                            href="/admin/collections/drives/create"
                          >
                            Create your first drive <ArrowRight size={15} />
                          </Link>
                        ) : undefined
                      }
                    />
                  )}
                </section>
                <section className="policy-card">
                  <span className="policy-shield">
                    <ShieldCheck size={25} />
                  </span>
                  <span className="eyebrow">POLICY, WITH PURPOSE</span>
                  <h2>
                    Fair opportunities.
                    <br />
                    Clear decisions.
                  </h2>
                  <p>
                    Every application is checked against placement guidelines,
                    with an explanation at every step.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => navigate("policy")}
                  >
                    Explore placement policy <ArrowRight size={16} />
                  </button>
                  <div className="policy-status">
                    <span className="tiny-dot mint" />
                    {data?.policy?.approved
                      ? "Approved policy active"
                      : "Policy approval pending"}
                  </div>
                </section>
              </div>
              <div className="bottom-note">
                <ShieldCheck size={14} />
                Your view is limited to your assigned role and scope.
                <span>All times displayed in IST</span>
              </div>
            </>
          )}
          {tab === "students" && (
            <>
              {staff && (
                <div className="section-actions">
                  <button
                    className="button secondary"
                    disabled={disabled}
                    onClick={() => navigate("import")}
                  >
                    <Upload size={15} />
                    Import CSV
                  </button>
                  <button
                    className="button secondary"
                    disabled={disabled}
                    onClick={() => register()}
                  >
                    <ClipboardCheck size={15} />
                    Verify registration
                  </button>
                </div>
              )}
              {table(
                [
                  "Student",
                  "Programme & batch",
                  "Registration",
                  "Eligibility",
                  "Actions",
                ],
                data?.students || [],
                (s) => {
                  const r = data?.registrations.find(
                    (r) => idOf(r.student) === s.id,
                  );
                  return (
                    <>
                      <td>
                        <div className="person-cell">
                          <span className="person-avatar">
                            {String(s.name)
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <strong>{String(s.name)}</strong>
                            <small>
                              {String(s.placementID)}
                              {s.archived ? " · Archived" : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {String(s.course)}
                        <small className="cell-sub">{String(s.batch)}</small>
                      </td>
                      <td>
                        <Badge value={r?.status || "not-registered"} />
                      </td>
                      <td>
                        <Badge value={r?.eligibility || "pending"} />
                      </td>
                      <td>
                        {staff ? (
                          <div className="row-actions">
                            <button onClick={() => register(s)}>Verify</button>
                            <button onClick={() => newStudent(s)}>Edit</button>
                            <button
                              onClick={() =>
                                open({
                                  title: s.archived
                                    ? "Restore student"
                                    : "Archive student",
                                  action: "archive-student",
                                  fixed: {
                                    student: s.id,
                                    archived: !s.archived,
                                  },
                                  fields: [
                                    {
                                      name: "reason",
                                      label: "Reason",
                                      type: "textarea",
                                    },
                                  ],
                                })
                              }
                            >
                              {s.archived ? "Restore" : "Archive"}
                            </button>
                          </div>
                        ) : (
                          <button className="text-link" onClick={requestReview}>
                            Request correction
                          </button>
                        )}
                      </td>
                    </>
                  );
                },
                "Your directory starts here",
              )}
            </>
          )}
          {tab === "drives" && (
            <div className="drive-grid">
              {data?.drives.length ? (
                data.drives.map((d) => (
                  <article className="panel opportunity" key={d.id}>
                    <div className="opportunity-top">
                      <span className="company-monogram">
                        {nameFor(d.company, data.companies)[0]}
                      </span>
                      <Badge
                        value={
                          Date.parse(String(d.deadline)) <= Date.now()
                            ? "closed"
                            : d.status
                        }
                      />
                    </div>
                    <small className="muted">
                      {nameFor(d.company, data.companies)}
                    </small>
                    <h2>{String(d.title)}</h2>
                    <p>
                      {d.type === "IF"
                        ? "Internship + FTE/PPO"
                        : d.type === "I"
                          ? "Internship"
                          : "Full-time employment"}
                    </p>
                    <strong className="opportunity-ctc">
                      {d.type === "I"
                        ? typeof d.stipend === "number"
                          ? `₹${d.stipend.toLocaleString("en-IN")} / ${d.stipendPeriod}`
                          : "Stipend to be confirmed"
                        : money(d.ctc)}
                    </strong>
                    <div className="course-tags">
                      {Array.isArray(d.courses) &&
                        d.courses.map((c) => (
                          <span key={String(c)}>{String(c)}</span>
                        ))}
                    </div>
                    <div className="opportunity-bottom">
                      <span>
                        <CalendarDays size={14} />
                        {date(d.deadline)}
                      </span>
                      {(manager || role === "student") && (
                        <button
                          className="text-link"
                          disabled={disabled || d.status !== "open"}
                          onClick={() =>
                            open({
                              title: "Check eligibility & apply",
                              subtitle:
                                "Participation is confirmed only when all policy checks pass.",
                              action: "apply",
                              fixed: { drive: d.id },
                              fields: role === "student" ? [] : [studentField],
                            })
                          }
                        >
                          Apply <ArrowUpRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="panel full">
                  <Empty
                    title="No recruitment drives yet"
                    message="Create a company and publish a drive from Administration to get started."
                  />
                </div>
              )}
            </div>
          )}
          {tab === "applications" &&
            table(
              ["Candidate", "Drive", "Status", "Policy explanation", "Actions"],
              data?.applications || [],
              (a) => (
                <>
                  <td>
                    <strong>
                      {String(
                        a.candidateName || nameFor(a.student, data?.students),
                      )}
                    </strong>
                    <small className="cell-sub">
                      {String(a.candidateCourse || "")}
                    </small>
                  </td>
                  <td>{nameFor(a.drive, data?.drives)}</td>
                  <td>
                    <Badge value={a.status} />
                  </td>
                  <td className="explanation">
                    {a.decision &&
                    typeof a.decision === "object" &&
                    "reasons" in a.decision &&
                    Array.isArray(a.decision.reasons)
                      ? a.decision.reasons
                          .map((r: { message: string }) => r.message)
                          .join(" ") || "All checks passed at submission."
                      : "—"}
                  </td>
                  <td>
                    {(manager || role === "student") && (
                      <button
                        className="text-link"
                        onClick={() =>
                          open({
                            title: "Update application",
                            action: "application-status",
                            fixed: { application: a.id },
                            fields: [
                              {
                                name: "status",
                                label: "Next stage",
                                options: opts(
                                  manager
                                    ? [
                                        "shortlisted",
                                        "selected",
                                        "rejected",
                                        "withdrawn",
                                      ]
                                    : ["withdrawn"],
                                ),
                              },
                              noteField,
                            ],
                          })
                        }
                      >
                        Update <ArrowRight size={13} />
                      </button>
                    )}
                  </td>
                </>
              ),
              "No applications yet",
            )}
          {tab === "offers" &&
            table(
              [
                "Student / company",
                "Offer",
                "Annual CTC / stipend",
                "Response",
                "PPO / joining / NOC",
                "Actions",
              ],
              data?.offers || [],
              (o) => (
                <>
                  <td>
                    <strong>{nameFor(o.student, data?.students)}</strong>
                    <small className="cell-sub">
                      {nameFor(o.company, data?.companies)}
                    </small>
                  </td>
                  <td>
                    {o.type === "IF" ? "I + F / PPO" : String(o.type)}
                    <small className="cell-sub">
                      {String(o.source)}
                      {o.revoked ? " · Revoked" : ""}
                    </small>
                  </td>
                  <td>
                    {money(o.ctc)}
                    <small className="cell-sub">
                      {typeof o.stipend === "number"
                        ? `₹${o.stipend.toLocaleString("en-IN")} / ${o.stipendPeriod}`
                        : "No stipend recorded"}
                    </small>
                  </td>
                  <td>
                    <Badge
                      value={
                        o.acceptance === "pending" &&
                        Date.parse(String(o.deadline)) <= Date.now()
                          ? "expired"
                          : o.acceptance
                      }
                    />
                    <small className="cell-sub">Due {date(o.deadline)}</small>
                  </td>
                  <td>
                    <small>
                      PPO: {String(o.ppo)}
                      <br />
                      Joining: {String(o.joining)}
                      <br />
                      NOC: {String(o.noc)}
                    </small>
                  </td>
                  <td>
                    {(manager || role === "student") && (
                      <button
                        className="text-link"
                        disabled={!!o.revoked}
                        onClick={() => offerAction(o)}
                      >
                        Update <ArrowRight size={13} />
                      </button>
                    )}
                  </td>
                </>
              ),
              "A place for every outcome",
            )}
          {tab === "attendance" && (
            <>
              <div className="section-actions">
                <Link
                  href="/admin/collections/activities"
                  className="button secondary"
                >
                  Manage activities <ArrowUpRight size={15} />
                </Link>
                <button
                  className="button primary"
                  disabled={disabled}
                  onClick={() =>
                    open({
                      title: "Record attendance",
                      action: "attendance",
                      fields: [
                        studentField,
                        {
                          name: "activity",
                          label: "Recruitment activity",
                          options:
                            data?.activities.map((a) => ({
                              value: a.id,
                              label: String(a.title),
                            })) || [],
                        },
                        {
                          name: "status",
                          label: "Attendance",
                          options: opts(["present", "absent", "excused"]),
                        },
                        noteField,
                      ],
                    })
                  }
                >
                  <Plus size={15} />
                  Record attendance
                </button>
              </div>
              {table(
                ["Student", "Activity", "Attendance", "Notes"],
                data?.attendance || [],
                (a) => (
                  <>
                    <td>{nameFor(a.student, data?.students)}</td>
                    <td>{nameFor(a.activity, data?.activities)}</td>
                    <td>
                      <Badge value={a.status} />
                    </td>
                    <td>{String(a.notes || "—")}</td>
                  </>
                ),
                "Participation will appear here",
              )}
              <p className="muted small">
                Absences are referred for review. Exclusions are applied only
                after an authorized decision.
              </p>
            </>
          )}
          {tab === "reviews" &&
            table(
              ["Student", "Review type", "Details", "Status", "Decision"],
              data?.reviews || [],
              (r) => (
                <>
                  <td>{nameFor(r.student, data?.students)}</td>
                  <td>{String(r.kind).replaceAll("-", " ")}</td>
                  <td className="explanation">{String(r.notes || "")}</td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                  <td>
                    {role === "admin" && r.status === "pending" ? (
                      <button
                        className="text-link"
                        onClick={() => resolveReview(r)}
                      >
                        Review <ArrowRight size={14} />
                      </button>
                    ) : r.decidedAt ? (
                      date(r.decidedAt)
                    ) : (
                      "Awaiting authority"
                    )}
                  </td>
                </>
              ),
              role === "recruiter"
                ? "Submit a proposal for officer review"
                : "No review cases",
            )}
          {tab === "reports" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    title: "Highest FTE package",
                    value: money(stats?.highest),
                    sub: "Highest accepted FTE per student",
                  },
                  {
                    title: "Average FTE package",
                    value: money(stats?.average),
                    sub: `${stats?.salarySample ?? "—"} qualifying students`,
                  },
                  {
                    title: "Median FTE package",
                    value: money(stats?.median),
                    sub: "Stipends excluded from CTC",
                  },
                  {
                    title: "Awaiting confirmation",
                    value: String(stats?.unknownCTC ?? "—"),
                    sub: "Qualifying offers without known CTC",
                  },
                ].map((s) => (
                  <div className="stat-card salary-stat" key={s.title}>
                    <span>{s.title}</span>
                    <strong>{s.value}</strong>
                    <small>{s.sub}</small>
                  </div>
                ))}
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Programme-wise outcomes</h2>
                    <p>
                      Unique students with accepted offers in the selected
                      session.
                    </p>
                  </div>
                </div>
                {stats?.courseOutcomes.length ? (
                  <div className="course-report">
                    {stats.courseOutcomes.map((c) => (
                      <div key={c.course}>
                        <span>{c.course}</span>
                        <div className="bar-track">
                          <i
                            style={{
                              width: `${c.registered ? Math.min((c.placed / c.registered) * 100, 100) : 0}%`,
                            }}
                          />
                        </div>
                        <strong>
                          {c.placed} / {c.registered}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Insights start with records"
                    message="Register students and record verified outcomes to populate this report."
                  />
                )}
              </div>
              <div className="overview-grid report-extra">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Batch-wise outcomes</h2>
                      <p>Placed / currently registered students</p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Batch</th>
                          <th>Placed</th>
                          <th>Registered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.batchOutcomes.map((b) => (
                          <tr key={b.batch}>
                            <td>{b.batch}</td>
                            <td>{b.placed}</td>
                            <td>{b.registered}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!stats?.batchOutcomes.length && (
                      <Empty
                        title="No batch records yet"
                        message="Batch outcomes appear after registration."
                      />
                    )}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Company-wise offers</h2>
                      <p>Offer counts, separate from unique students</p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Issued</th>
                          <th>Accepted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.companyOutcomes.map((c) => (
                          <tr key={c.company}>
                            <td>{nameFor(c.company, data?.companies)}</td>
                            <td>{c.offers}</td>
                            <td>{c.accepted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!stats?.companyOutcomes.length && (
                      <Empty
                        title="No company outcomes yet"
                        message="Verified offers populate this report."
                      />
                    )}
                  </div>
                </section>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Internship stipends</h2>
                    <p>Average INR per payment period · accepted offers only</p>
                  </div>
                  <span className="tag">SEPARATE FROM CTC</span>
                </div>
                <div className="outcome-breakdown">
                  {stats?.stipendSummary.map((s) => (
                    <div key={s.period}>
                      {s.period}
                      <strong>
                        {s.average == null
                          ? "No data"
                          : `₹${Math.round(s.average).toLocaleString("en-IN")}`}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
              <p className="report-definition">
                Placed = at least one accepted, non-revoked offer. FTE salary
                statistics use each student’s highest accepted confirmed FTE
                CTC. Pending PPOs and internship stipends are excluded. Salary
                aggregates for coordinators require at least five qualifying
                students. As of {date(stats?.asOf)}.
              </p>
            </>
          )}
          {tab === "policy" && (
            <>
              <div className="policy-intro panel">
                <ShieldCheck size={32} />
                <div>
                  <h2>
                    {String(
                      data?.policy?.name || "2026–27 placement guidelines",
                    )}
                  </h2>
                  <p>
                    The rule engine explains whether participation is allowed,
                    blocked, or needs an authorized review.
                  </p>
                </div>
                <Badge
                  value={data?.policy?.approved ? "approved" : "pending"}
                />
                {role === "admin" && (
                  <Link
                    className="button secondary"
                    href="/admin/collections/policy-versions"
                  >
                    Manage policies <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>
              <div className="policy-bands">
                {[
                  {
                    c: "A+",
                    salary: `${money(Number(data?.policy?.plusMin || 1600000))} and above`,
                    rule: "Selection ends further placement participation.",
                  },
                  {
                    c: "A",
                    salary: `₹${Number(data?.policy?.aMin || 1000000) / 100000}–<${Number(data?.policy?.plusMin || 1600000) / 100000} LPA`,
                    rule: "Switching is considered only for A+ opportunities.",
                  },
                  {
                    c: "B",
                    salary: `₹${Number(data?.policy?.bMin || 600000) / 100000}–<${Number(data?.policy?.aMin || 1000000) / 100000} LPA`,
                    rule: "New CTC must be at least 1.5× the existing package.",
                  },
                  {
                    c: "C",
                    salary: `Below ${money(Number(data?.policy?.bMin || 600000))}`,
                    rule: "Higher-category opportunities follow approved progression rules.",
                  },
                ].map((p) => (
                  <div className="panel policy-band" key={p.c}>
                    <span>{p.c}</span>
                    <h3>{p.salary}</h3>
                    <p>{p.rule}</p>
                  </div>
                ))}
              </div>
              <div className="panel policy-explainer">
                <h2>Offer types work together with category rules.</h2>
                <div>
                  <article>
                    <strong>Internship only · I</strong>
                    <p>
                      A second internship-only selection is restricted. FTE and
                      combined opportunities remain subject to all other rules.
                    </p>
                  </article>
                  <article>
                    <strong>Full-time only · F</strong>
                    <p>
                      FTE-repeat and salary-switching rules can conflict.
                      Unresolved interpretations are sent for review.
                    </p>
                  </article>
                  <article>
                    <strong>Internship + FTE/PPO · I+F</strong>
                    <p>
                      Further participation at another organization is
                      restricted after a qualifying selection.
                    </p>
                  </article>
                </div>
                <p className="policy-disclaimer">
                  These bands summarize the supplied problem statement. The
                  active policy’s configured thresholds and approved
                  interpretations govern decisions. Until the full institutional
                  guidelines are reviewed, unresolved rules remain manual-review
                  cases.
                </p>
              </div>
            </>
          )}
          {tab === "audit" &&
            table(
              ["Time", "Action", "Actor", "Target", "Integrity"],
              (data?.audits || []) as RecordData[],
              (a) => (
                <>
                  <td>{date(a.at)}</td>
                  <td>
                    <code>{String(a.action)}</code>
                  </td>
                  <td>
                    <code>{String(a.actor).slice(0, 12)}…</code>
                  </td>
                  <td>
                    <code>{String(a.target).slice(0, 22)}</code>
                  </td>
                  <td>
                    <span className="integrity">
                      <ShieldCheck size={14} />
                      Signed record
                    </span>
                  </td>
                </>
              ),
              "Your audit trail starts here",
            )}
          {tab === "import" && (
            <div className="panel import-panel">
              <span className="empty-icon">
                <Upload size={27} />
              </span>
              <h2>A clean start for your student records.</h2>
              <p>
                Upload up to 1,000 rows in a CSV file (2 MB maximum). Preview
                validates every row before you commit. Existing Placement IDs
                are never overwritten.
              </p>
              <div className="csv-template">
                <strong>Required column template</strong>
                <code>placementID,name,email,mobile,course,batch</code>
                <small>
                  Programme names must match the five configured programmes
                  exactly.
                </small>
              </div>
              <label className="file-label">
                Choose CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={disabled}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setImportResult(null);
                    if (file) {
                      if (file.size > 2000000) {
                        setError("Choose a CSV smaller than 2 MB.");
                        return;
                      }
                      setCsv(await file.text());
                    }
                  }}
                />
              </label>
              <div className="section-actions">
                <button
                  className="button secondary"
                  disabled={disabled || !csv}
                  onClick={() => importCSV(false)}
                >
                  Preview validation
                </button>
                <button
                  className="button primary"
                  disabled={
                    disabled ||
                    !csv ||
                    !importResult ||
                    importResult.committed === true ||
                    Number(importResult.valid) !==
                      (Array.isArray(importResult.rows)
                        ? importResult.rows.length
                        : -1)
                  }
                  onClick={() => importCSV(true)}
                >
                  Commit import <ArrowRight size={15} />
                </button>
              </div>
              {importResult && (
                <div className="import-results">
                  <strong>
                    {importResult.committed
                      ? `${importResult.created} student records created`
                      : `${importResult.valid} valid rows`}
                  </strong>
                  <pre>{JSON.stringify(importResult.rows, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </main>
        <footer className="footer">
          <span>
            Placement Office <i> / </i> National Forensic Sciences University
          </span>
          <span>
            <ShieldCheck size={13} />
            Policy-driven. People-focused.
          </span>
        </footer>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">PLACEMENT WORKFLOW</span>
                <h2 id="modal-title">{modal.title}</h2>
                {modal.subtitle && <p>{modal.subtitle}</p>}
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X size={21} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-fields">
                {modal.fields.map((f) => (
                  <label key={f.name}>
                    {f.label}
                    {f.required === false && <small> optional</small>}
                    {f.options ? (
                      <select
                        name={f.name}
                        defaultValue={f.value || ""}
                        required={f.required !== false}
                      >
                        <option value="">Select…</option>
                        {f.options.map((o, i) => (
                          <option key={o.value + i} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        defaultValue={f.value}
                        required={f.required !== false}
                        maxLength={3000}
                        rows={3}
                      />
                    ) : (
                      <input
                        name={f.name}
                        type={f.type === "codes" ? "text" : f.type || "text"}
                        defaultValue={f.value}
                        required={f.required !== false}
                        min={f.type === "number" ? 0 : undefined}
                        step={
                          f.name === "cgpa"
                            ? "0.01"
                            : f.type === "number"
                              ? "1"
                              : undefined
                        }
                        maxLength={300}
                      />
                    )}
                    {f.hint && <small>{f.hint}</small>}
                  </label>
                ))}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-footer">
                <span>
                  <ShieldCheck size={14} />
                  This action is authorized and audited.
                </span>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModal(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <>
                      Confirm <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
