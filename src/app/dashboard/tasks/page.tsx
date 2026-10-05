"use client";

import { useEffect, useMemo, useState } from "react";

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

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "On Hold"];

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedName, setMatchedName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Task>>>({});

  useEffect(() => {
    fetch("/api/my-tasks").then(async r => {
      const json = await r.json();
      if (!r.ok || json.error) { console.error(json.error); setLoading(false); return; }
      setTasks(json.tasks || []);
      setMatchedName(json.matchedName || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const key = t.projectName || t.projectId || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [tasks]);

  function draftFor(t: Task) {
    return { status: t.status, remarks: t.remarks, actionTaken: t.actionTaken, pendingPoints: t.pendingPoints, ...drafts[t._id] };
  }
  function updateDraft(id: string, field: keyof Task, value: string) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave(task: Task) {
    setSavingId(task._id);
    const draft = draftFor(task);
    const res = await fetch(`/api/my-tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    setSavingId(null);
    if (data.success) {
      setTasks(prev => prev.map(t => (t._id === task._id ? { ...t, ...draft } as Task : t)));
      setDrafts(prev => { const next = { ...prev }; delete next[task._id]; return next; });
      setOpenId(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root,[data-theme="dark"]{
          --bg:#0a0a0f;--surface:#111118;--surface-2:#16161f;--surface-3:#1c1c28;
          --border:rgba(255,255,255,0.06);--border-hover:rgba(255,255,255,0.12);
          --accent:#7c6af7;--accent-soft:rgba(124,106,247,0.12);--accent-border:rgba(124,106,247,0.2);--accent-glow:rgba(124,106,247,0.25);
          --green:#22d3a2;--green-bg:rgba(34,211,162,0.1);--green-border:rgba(34,211,162,0.2);
          --orange:#f97316;--red:#f87171;--purple:#a78bfa;
          --text-primary:#f0f0f8;--text-secondary:#8888aa;--text-muted:#44445a;
        }
        [data-theme="light"]{
          --bg:#f4f5f9;--surface:#ffffff;--surface-2:#f0f1f6;--surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.08);--border-hover:rgba(0,0,0,0.15);
          --accent:#6355e8;--accent-soft:rgba(99,85,232,0.08);--accent-border:rgba(99,85,232,0.2);--accent-glow:rgba(99,85,232,0.15);
          --green:#0fa87a;--green-bg:rgba(15,168,122,0.08);--green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a;--red:#dc2626;--purple:#7c3aed;
          --text-primary:#0f0f1a;--text-secondary:#555570;--text-muted:#9999b5;
        }
        *{transition:background-color 0.25s ease,border-color 0.25s ease,color 0.25s ease;}

        .tk-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:'Syne',sans-serif;padding:2.5rem 2rem 4rem;}
        .tk-inner{max-width:860px;margin:0 auto;}
        .tk-title{font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;}
        .tk-sub{font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:2rem;}

        .tk-project{margin-bottom:1.5rem;}
        .tk-project-label{font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:0.75rem;padding:0 0.2rem;}

        .tk-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;margin-bottom:0.7rem;overflow:hidden;transition:border-color 0.2s;}
        .tk-card:hover{border-color:var(--border-hover);}
        .tk-card-top{padding:1rem 1.2rem;cursor:pointer;}
        .tk-card-row{display:flex;justify-content:space-between;align-items:flex-start;gap:0.9rem;}
        .tk-stage{font-size:0.88rem;font-weight:700;line-height:1.4;flex:1;color:var(--text-primary);}
        .tk-badge{font-family:'JetBrains Mono',monospace;font-size:0.6rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid;white-space:nowrap;flex-shrink:0;}
        .tk-meta{font-size:0.7rem;color:var(--text-muted);margin-top:6px;font-family:'JetBrains Mono',monospace;}

        .tk-edit{padding:0 1.2rem 1.2rem;border-top:1px solid var(--border);animation:fadeIn 0.2s ease;}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .tk-field{margin-top:0.9rem;}
        .tk-label{display:block;font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:0.4rem;}
        .tk-select,.tk-textarea{width:100%;padding:0.7rem 0.85rem;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:0.85rem;font-family:'Syne',sans-serif;outline:none;}
        .tk-textarea{resize:vertical;min-height:64px;line-height:1.5;}
        .tk-select:focus,.tk-textarea:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}

        .tk-save-btn{margin-top:1rem;width:100%;background:var(--accent);color:#fff;border:none;border-radius:11px;padding:0.8rem;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:'Syne',sans-serif;box-shadow:0 0 24px var(--accent-glow);}
        .tk-save-btn:hover:not(:disabled){filter:brightness(1.08);}
        .tk-save-btn:disabled{opacity:0.5;cursor:not-allowed;}

        .tk-empty{padding:3rem 1.5rem;text-align:center;color:var(--text-muted);font-size:0.82rem;background:var(--surface);border:1px dashed var(--border);border-radius:16px;line-height:1.6;}
        .tk-skel{background:linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%);background-size:200% 100%;animation:tksh 1.3s infinite;border-radius:14px;height:74px;margin-bottom:0.7rem;}
        @keyframes tksh{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <div className="tk-root">
        <div className="tk-inner">
          <h1 className="tk-title">My Tasks</h1>
          <p className="tk-sub">{matchedName ? `MATCHED AS ${matchedName.toUpperCase()}` : "PROGRESS ENTRIES ASSIGNED TO YOU"}</p>

          {loading ? (
            <>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="tk-skel" />)}</>
          ) : !tasks.length ? (
            <div className="tk-empty">
              No tasks found under your name yet.<br />
              If you expect entries here, your name in the project tool may not exactly match your Employee Portal profile — ask your admin to check.
            </div>
          ) : (
            grouped.map(([projectName, projectTasks]) => (
              <div className="tk-project" key={projectName}>
                <div className="tk-project-label">{projectName}</div>
                {projectTasks.map(task => {
                  const isOpen = openId === task._id;
                  const draft = draftFor(task);
                  const currentStatus = draft.status || task.status || "Not Started";
                  const sLower = currentStatus.toLowerCase();
                  const badgeVars = sLower.includes("complet")
                    ? { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" }
                    : sLower.includes("progress")
                    ? { color: "var(--accent)", bg: "var(--accent-soft)", border: "var(--accent-border)" }
                    : sLower.includes("hold")
                    ? { color: "var(--red)", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" }
                    : { color: "var(--text-muted)", bg: "var(--surface-2)", border: "var(--border)" };

                  return (
                    <div className="tk-card" key={task._id}>
                      <div className="tk-card-top" onClick={() => setOpenId(isOpen ? null : task._id)}>
                        <div className="tk-card-row">
                          <div className="tk-stage">{task.stage || "—"}</div>
                          <span className="tk-badge" style={{ color: badgeVars.color, background: badgeVars.bg, borderColor: badgeVars.border }}>
                            {currentStatus}
                          </span>
                        </div>
                        <div className="tk-meta">{task.priority ? `${task.priority} priority · ` : ""}Updated {task.lastUpdated || "—"}</div>
                      </div>

                      {isOpen && (
                        <div className="tk-edit">
                          <div className="tk-field">
                            <label className="tk-label">Status</label>
                            <select
                              className="tk-select"
                              value={draft.status || ""}
                              onChange={e => updateDraft(task._id, "status", e.target.value)}
                            >
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              {draft.status && !STATUS_OPTIONS.includes(draft.status) && (
                                <option value={draft.status}>{draft.status} (current)</option>
                              )}
                            </select>
                          </div>
                          <div className="tk-field">
                            <label className="tk-label">Action taken</label>
                            <textarea
                              className="tk-textarea"
                              value={draft.actionTaken || ""}
                              onChange={e => updateDraft(task._id, "actionTaken", e.target.value)}
                            />
                          </div>
                          <div className="tk-field">
                            <label className="tk-label">Pending points</label>
                            <textarea
                              className="tk-textarea"
                              value={draft.pendingPoints || ""}
                              onChange={e => updateDraft(task._id, "pendingPoints", e.target.value)}
                            />
                          </div>
                          <div className="tk-field">
                            <label className="tk-label">Remarks</label>
                            <textarea
                              className="tk-textarea"
                              value={draft.remarks || ""}
                              onChange={e => updateDraft(task._id, "remarks", e.target.value)}
                            />
                          </div>
                          <button className="tk-save-btn" disabled={savingId === task._id} onClick={() => handleSave(task)}>
                            {savingId === task._id ? "Saving…" : "Save & Send to PM Tool"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}