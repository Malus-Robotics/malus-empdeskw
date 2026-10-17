"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, Loader2, RefreshCw, Search, X } from "lucide-react";

interface Task {
  _id: string;
  projectId: string;
  projectName: string;
  stage: string;
  priority: string;
  status: string;
  remarks: string;
  actionTaken: string;
  pendingPoints: string;
  date: string;
  lastUpdated: string;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "On Hold"] as const;
type StatusKey = (typeof STATUS_OPTIONS)[number];

const STATUS_CFG: Record<StatusKey, { color: string; bg: string; border: string }> = {
  "Not Started": { color: "var(--text-muted)", bg: "var(--surface-2)", border: "var(--border)" },
  "In Progress": { color: "var(--accent)", bg: "var(--accent-soft)", border: "var(--accent-border)" },
  "Completed":   { color: "var(--green)", bg: "var(--green-soft)", border: "var(--green-border)" },
  "On Hold":     { color: "var(--orange)", bg: "var(--orange-soft)", border: "var(--orange-border)" },
};

// map whatever string the PM tool stored onto one of the four known statuses
function statusKey(s: string): StatusKey {
  const l = (s || "").toLowerCase();
  if (l.includes("complet") || l.includes("closed") || l.includes("done")) return "Completed";
  if (l.includes("progress") || l.includes("process")) return "In Progress";
  if (l.includes("hold")) return "On Hold";
  return "Not Started";
}

function priorityColor(p: string) {
  const l = (p || "").toLowerCase();
  if (l.includes("urgent") || l.includes("critical")) return "var(--red)";
  if (l.includes("high")) return "var(--orange)";
  if (l.includes("med")) return "var(--accent)";
  return "var(--text-muted)";
}

const EDIT_FIELDS = ["status", "remarks", "actionTaken", "pendingPoints"] as const;

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedName, setMatchedName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Task>>>({});
  const [filter, setFilter] = useState<"All" | StatusKey>("All");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/my-tasks", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok || json.error) { console.error(json.error); toast.error("Could not load your tasks."); return; }
      setTasks(json.tasks || []);
      setMatchedName(json.matchedName || "");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  /* ---------- drafts ---------- */
  function draftFor(t: Task) {
    return { status: t.status, remarks: t.remarks, actionTaken: t.actionTaken, pendingPoints: t.pendingPoints, ...drafts[t._id] };
  }
  function updateDraft(id: string, field: keyof Task, value: string) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }
  function isDirty(t: Task) {
    const d = drafts[t._id];
    if (!d) return false;
    return EDIT_FIELDS.some(k => d[k] !== undefined && (d[k] ?? "") !== (t[k] ?? ""));
  }
  function discardDraft(id: string) {
    setDrafts(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  async function handleSave(task: Task) {
    setSavingId(task._id);
    const draft = draftFor(task);
    try {
      const res = await fetch(`/api/my-tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => (t._id === task._id ? { ...t, ...draft } as Task : t)));
        discardDraft(task._id);
        setOpenId(null);
        toast.success("Saved and sent to the PM tool.");
      } else {
        toast.error(data.error || "Could not save this task.");
      }
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { "Not Started": 0, "In Progress": 0, "Completed": 0, "On Hold": 0 };
    tasks.forEach(t => { c[statusKey(t.status)]++; });
    return c;
  }, [tasks]);

  const total = tasks.length;
  const pctDone = total ? Math.round((counts["Completed"] / total) * 100) : 0;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (filter !== "All" && statusKey(t.status) !== filter) return false;
      if (!q) return true;
      return [t.stage, t.projectName, t.projectId, t.status, t.priority, t.remarks, t.actionTaken, t.pendingPoints]
        .some(f => (f || "").toLowerCase().includes(q));
    });
  }, [tasks, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    visible.forEach(t => {
      const key = t.projectName || t.projectId || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [visible]);

  const kpis: { key: "All" | StatusKey; label: string; value: number; color: string; note: string }[] = [
    { key: "All", label: "Total tasks", value: total, color: "var(--text-primary)", note: `${pctDone}% completed` },
    { key: "Not Started", label: "Not started", value: counts["Not Started"], color: "var(--text-muted)", note: pctOf(counts["Not Started"]) },
    { key: "In Progress", label: "In progress", value: counts["In Progress"], color: "var(--accent)", note: pctOf(counts["In Progress"]) },
    { key: "On Hold", label: "On hold", value: counts["On Hold"], color: "var(--orange)", note: pctOf(counts["On Hold"]) },
    { key: "Completed", label: "Completed", value: counts["Completed"], color: "var(--green)", note: pctOf(counts["Completed"]) },
  ];
  function pctOf(n: number) { return `${total ? Math.round((n / total) * 100) : 0}% of all`; }

  return (
    <>
      <style>{`
        .tk-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:var(--font-jakarta),system-ui,sans-serif;padding:2.25rem 2rem 4rem;}
        .tk-root *,.tk-root *::before,.tk-root *::after{box-sizing:border-box;}
        .tk-inner{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:1.4rem;}

        /* header */
        .tk-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
        .tk-title{font-size:1.85rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1;}
        .tk-sub{font-size:0.9rem;color:var(--text-muted);margin-top:6px;}
        .tk-btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 1rem;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.82rem;font-weight:700;cursor:pointer;box-shadow:var(--shadow-card);transition:border-color .15s,background .15s;}
        .tk-btn:hover{border-color:var(--border-hover);background:var(--surface-2);}
        .tk-spin{animation:tkspin .8s linear infinite;}
        @keyframes tkspin{to{transform:rotate(360deg)}}

        /* KPI strip */
        .tk-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:0.8rem;}
        .tk-kpi{text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1rem 1.1rem;cursor:pointer;font-family:inherit;color:inherit;box-shadow:var(--shadow-card);transition:border-color .15s,box-shadow .15s,transform .15s;}
        .tk-kpi:hover{border-color:var(--border-hover);}
        .tk-kpi.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
        .tk-kpi-l{display:flex;align-items:center;gap:7px;font-size:0.76rem;font-weight:600;color:var(--text-secondary);}
        .tk-kpi-dot{width:8px;height:8px;border-radius:50%;background:var(--kc);}
        .tk-kpi-n{font-size:1.9rem;font-weight:800;letter-spacing:-0.03em;line-height:1;margin:10px 0 6px;}
        .tk-kpi small{font-size:0.7rem;color:var(--text-muted);}

        /* toolbar */
        .tk-bar{display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;}
        .tk-search{position:relative;flex:1;min-width:220px;max-width:380px;}
        .tk-search svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-muted);}
        .tk-search input{width:100%;height:42px;padding:0 36px 0 38px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.85rem;outline:none;}
        .tk-search input::placeholder{color:var(--text-muted);}
        .tk-search input:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .tk-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:none;color:var(--text-muted);cursor:pointer;display:flex;padding:4px;}
        .tk-result{font-size:0.78rem;color:var(--text-muted);margin-left:auto;}

        /* project group */
        .tk-group{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:1.2rem 1.2rem 0.7rem;box-shadow:var(--shadow-card);}
        .tk-group-h{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:0.9rem;padding:0 0.3rem;}
        .tk-group-name{font-size:1rem;font-weight:800;letter-spacing:-0.01em;}
        .tk-group-meta{font-size:0.74rem;color:var(--text-muted);margin-top:2px;}
        .tk-prog{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .tk-prog-track{width:110px;height:6px;border-radius:100px;background:var(--surface-3);overflow:hidden;}
        .tk-prog-fill{height:100%;border-radius:100px;background:var(--green);transition:width .3s ease;}
        .tk-prog-txt{font-size:0.74rem;font-weight:700;color:var(--text-secondary);min-width:34px;text-align:right;}

        /* task card */
        .tk-card{position:relative;border:1px solid var(--border);border-radius:16px;margin-bottom:0.65rem;background:var(--surface);overflow:hidden;transition:border-color .15s,box-shadow .15s;}
        .tk-card:hover{border-color:var(--border-hover);}
        .tk-card.open{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .tk-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--pc);}
        .tk-top{width:100%;display:flex;align-items:center;gap:1rem;padding:0.95rem 1.1rem 0.95rem 1.3rem;background:none;border:0;cursor:pointer;text-align:left;font-family:inherit;color:inherit;}
        .tk-main{flex:1;min-width:0;}
        .tk-stage{font-size:0.92rem;font-weight:700;line-height:1.4;}
        .tk-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:5px;font-size:0.74rem;color:var(--text-muted);}
        .tk-prio{display:inline-flex;align-items:center;gap:5px;font-weight:700;color:var(--pc);}
        .tk-prio::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;}
        .tk-unsaved{font-weight:700;color:var(--orange);}
        .tk-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:100px;border:1px solid;font-size:0.72rem;font-weight:700;white-space:nowrap;flex-shrink:0;}
        .tk-pill::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;}
        .tk-chev{color:var(--text-muted);flex-shrink:0;transition:transform .2s;}
        .tk-card.open .tk-chev{transform:rotate(180deg);}

        /* edit panel */
        .tk-edit{padding:0.4rem 1.3rem 1.2rem 1.4rem;border-top:1px solid var(--border);background:var(--surface-2);animation:tkfade .2s ease;}
        @keyframes tkfade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .tk-lab{display:block;margin:1rem 0 0.45rem;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-muted);}
        .tk-seg{display:flex;gap:6px;flex-wrap:wrap;}
        .tk-seg button{padding:0.5rem 0.95rem;border-radius:100px;border:1px solid var(--border);background:var(--surface);color:var(--text-secondary);font-family:inherit;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all .15s;}
        .tk-seg button:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .tk-seg button.on{background:var(--c-bg);border-color:var(--c-bd);color:var(--c);}
        .tk-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;}
        .tk-ta{width:100%;min-height:84px;resize:vertical;padding:0.7rem 0.85rem;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.85rem;line-height:1.55;outline:none;}
        .tk-ta::placeholder{color:var(--text-muted);}
        .tk-ta:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .tk-foot{display:flex;align-items:center;justify-content:flex-end;gap:0.7rem;margin-top:1.1rem;flex-wrap:wrap;}
        .tk-foot-note{margin-right:auto;font-size:0.76rem;color:var(--text-muted);}
        .tk-ghost{height:40px;padding:0 1.1rem;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-secondary);font-family:inherit;font-size:0.82rem;font-weight:700;cursor:pointer;}
        .tk-ghost:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .tk-save{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 1.4rem;border-radius:12px;border:0;background:var(--accent);color:#fff;font-family:inherit;font-size:0.82rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px var(--accent-glow);transition:background .15s,opacity .15s;}
        .tk-save:hover:not(:disabled){background:var(--accent-hover);}
        .tk-save:disabled{opacity:0.5;cursor:not-allowed;box-shadow:none;}

        /* states */
        .tk-empty{padding:3rem 1.5rem;text-align:center;color:var(--text-muted);font-size:0.88rem;background:var(--surface);border:1px dashed var(--border);border-radius:20px;line-height:1.7;}
        .tk-empty b{display:block;color:var(--text-primary);font-size:1rem;margin-bottom:4px;}
        .tk-skel{background:linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%);background-size:200% 100%;animation:tksh 1.3s infinite;border-radius:18px;}
        @keyframes tksh{0%{background-position:200% 0}100%{background-position:-200% 0}}

        @media (max-width:900px){
          .tk-kpis{grid-template-columns:repeat(3,1fr);}
        }
        @media (max-width:640px){
          .tk-root{padding:1.25rem 1rem 3rem;}
          .tk-title{font-size:1.5rem;}
          .tk-kpis{grid-template-columns:repeat(2,1fr);gap:0.6rem;}
          .tk-kpi{padding:0.85rem 0.95rem;}
          .tk-kpi-n{font-size:1.6rem;}
          .tk-group{padding:1rem 0.8rem 0.5rem;border-radius:18px;}
          .tk-group-h{flex-direction:column;align-items:flex-start;gap:0.6rem;}
          .tk-prog-track{width:140px;}
          .tk-top{flex-wrap:wrap;gap:0.6rem;padding-right:0.9rem;}
          .tk-main{flex-basis:100%;order:2;}
          .tk-pill{order:1;}
          .tk-chev{order:1;margin-left:auto;}
          .tk-grid{grid-template-columns:1fr;}
          .tk-ta,.tk-search input{font-size:16px;} /* stops iOS zoom on focus */
          .tk-result{margin-left:0;width:100%;}
        }
      `}</style>

      <div className="tk-root">
        <div className="tk-inner">

          {/* Header */}
          <div className="tk-head">
            <div>
              <h1 className="tk-title">My Tasks</h1>
              <p className="tk-sub">
                {matchedName ? `Showing tasks assigned to ${matchedName}.` : "Progress entries assigned to you."} Update a status and it syncs to the PM tool.
              </p>
            </div>
            <button className="tk-btn" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? "tk-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Summary / filter */}
          {!loading && total > 0 && (
            <div className="tk-kpis">
              {kpis.map(k => (
                <button
                  key={k.key}
                  className={`tk-kpi ${filter === k.key ? "on" : ""}`}
                  style={{ ["--kc" as any]: k.color }}
                  aria-pressed={filter === k.key}
                  onClick={() => setFilter(filter === k.key || k.key === "All" ? "All" : k.key)}
                >
                  <span className="tk-kpi-l"><span className="tk-kpi-dot" />{k.label}</span>
                  <div className="tk-kpi-n">{k.value}</div>
                  <small>{k.note}</small>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          {!loading && total > 0 && (
            <div className="tk-bar">
              <div className="tk-search">
                <Search size={15} />
                <input
                  placeholder="Search task, project, priority…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search tasks"
                />
                {search && (
                  <button className="tk-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>
                )}
              </div>
              <span className="tk-result">{visible.length} of {total} task{total !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <>
              <div className="tk-skel" style={{ height: 104 }} />
              <div className="tk-skel" style={{ height: 210 }} />
              <div className="tk-skel" style={{ height: 160 }} />
            </>
          ) : total === 0 ? (
            <div className="tk-empty">
              <b>No tasks found under your name yet</b>
              If you expect entries here, your name in the project tool may not exactly match your Employee Portal profile. Ask your admin to check.
            </div>
          ) : visible.length === 0 ? (
            <div className="tk-empty">
              <b>No tasks match</b>
              Try a different search or clear the status filter.
              <div style={{ marginTop: 14 }}>
                <button className="tk-btn" onClick={() => { setFilter("All"); setSearch(""); }}>Clear filters</button>
              </div>
            </div>
          ) : (
            grouped.map(([projectName, projectTasks]) => {
              const done = projectTasks.filter(t => statusKey(t.status) === "Completed").length;
              const pct = Math.round((done / projectTasks.length) * 100);
              return (
                <section className="tk-group" key={projectName} aria-label={projectName}>
                  <div className="tk-group-h">
                    <div>
                      <div className="tk-group-name">{projectName}</div>
                      <div className="tk-group-meta">{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""} · {done} completed</div>
                    </div>
                    <div className="tk-prog">
                      <div className="tk-prog-track"><div className="tk-prog-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="tk-prog-txt">{pct}%</span>
                    </div>
                  </div>

                  {projectTasks.map(task => {
                    const isOpen = openId === task._id;
                    const draft = draftFor(task);
                    const dirty = isDirty(task);
                    const shownStatus = draft.status || task.status || "Not Started";
                    const cfg = STATUS_CFG[statusKey(shownStatus)];
                    const customStatus = !!draft.status && !(STATUS_OPTIONS as readonly string[]).includes(draft.status);

                    return (
                      <div
                        className={`tk-card ${isOpen ? "open" : ""}`}
                        key={task._id}
                        style={{ ["--pc" as any]: priorityColor(task.priority) }}
                      >
                        <button className="tk-top" onClick={() => setOpenId(isOpen ? null : task._id)} aria-expanded={isOpen}>
                          <div className="tk-main">
                            <div className="tk-stage">{task.stage || "—"}</div>
                            <div className="tk-meta">
                              {task.priority && <span className="tk-prio">{task.priority} priority</span>}
                              {task.priority && <span>·</span>}
                              <span>Updated {task.lastUpdated || "—"}</span>
                              {dirty && <><span>·</span><span className="tk-unsaved">Unsaved changes</span></>}
                            </div>
                          </div>
                          <span className="tk-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                            {shownStatus}
                          </span>
                          <ChevronDown size={18} className="tk-chev" />
                        </button>

                        {isOpen && (
                          <div className="tk-edit">
                            <span className="tk-lab">Status</span>
                            <div className="tk-seg">
                              {STATUS_OPTIONS.map(s => {
                                const c = STATUS_CFG[s];
                                const on = statusKey(draft.status || "") === s && !customStatus;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    className={on ? "on" : ""}
                                    style={{ ["--c" as any]: c.color, ["--c-bg" as any]: c.bg, ["--c-bd" as any]: c.border }}
                                    onClick={() => updateDraft(task._id, "status", s)}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                              {customStatus && (
                                <button type="button" className="on" style={{ ["--c" as any]: "var(--text-secondary)", ["--c-bg" as any]: "var(--surface-3)", ["--c-bd" as any]: "var(--border)" }}>
                                  {draft.status} (current)
                                </button>
                              )}
                            </div>

                            <div className="tk-grid">
                              <div>
                                <label className="tk-lab" htmlFor={`a-${task._id}`}>Action taken</label>
                                <textarea
                                  id={`a-${task._id}`}
                                  className="tk-ta"
                                  placeholder="What have you done on this so far?"
                                  value={draft.actionTaken || ""}
                                  onChange={e => updateDraft(task._id, "actionTaken", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="tk-lab" htmlFor={`p-${task._id}`}>Pending points</label>
                                <textarea
                                  id={`p-${task._id}`}
                                  className="tk-ta"
                                  placeholder="What is still left to do?"
                                  value={draft.pendingPoints || ""}
                                  onChange={e => updateDraft(task._id, "pendingPoints", e.target.value)}
                                />
                              </div>
                            </div>

                            <label className="tk-lab" htmlFor={`r-${task._id}`}>Remarks</label>
                            <textarea
                              id={`r-${task._id}`}
                              className="tk-ta"
                              placeholder="Anything the project team should know"
                              value={draft.remarks || ""}
                              onChange={e => updateDraft(task._id, "remarks", e.target.value)}
                            />

                            <div className="tk-foot">
                              <span className="tk-foot-note">{dirty ? "You have unsaved changes." : "No changes yet."}</span>
                              {dirty && (
                                <button className="tk-ghost" onClick={() => discardDraft(task._id)} disabled={savingId === task._id}>Discard</button>
                              )}
                              <button className="tk-save" disabled={savingId === task._id || !dirty} onClick={() => handleSave(task)}>
                                {savingId === task._id ? <><Loader2 size={15} className="tk-spin" /> Saving…</> : "Save & send to PM tool"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
