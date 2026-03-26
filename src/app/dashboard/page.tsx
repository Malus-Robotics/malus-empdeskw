"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface HistoryItem {
  date: string; clockIn: string; clockOut: string;
  duration: string; projectName: string; projectCode: string; timesheet: string;
}
interface Project { id: string; code: string; name: string; client?: string; }

export default function Dashboard() {
  const router = useRouter();

  const [employeeId,      setEmployeeId]      = useState("");
  const [employeeName,    setEmployeeName]     = useState("");
  const [timesheet,       setTimesheet]        = useState("");
  const [selectedProject, setSelectedProject]  = useState<Project | null>(null);
  const [projects,        setProjects]         = useState<Project[]>([]);
  const [projOpen,        setProjOpen]         = useState(false);
  const [projSearch,      setProjSearch]       = useState("");
  const projWrapRef = useRef<HTMLDivElement>(null);
  const [loading,         setLoading]          = useState(false);
  const [status,          setStatus]           = useState<"IN"|"OUT"|"">("");
  const [seconds,         setSeconds]          = useState(0);
  const [clockInTime,     setClockInTime]      = useState<string|null>(null);
  const [history,         setHistory]          = useState<HistoryItem[]>([]);
  const [loadingHistory,  setLoadingHistory]   = useState(false);
  const [todaySessions,   setTodaySessions]    = useState(0);
  const [todayHours,      setTodayHours]       = useState("0h 0m");

  // ── Load user, status, projects, history ──
  useEffect(()=>{
    async function init() {
      const meRes  = await fetch("/api/me").catch(()=>null);
      if(!meRes) return;
      const me = await meRes.json();
      if(!me.employeeId) return;
      setEmployeeId(me.employeeId);
      if(me.name) setEmployeeName(me.name);

      const [statusRes, projRes] = await Promise.all([
        fetch("/api/attendance/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employeeId:me.employeeId})}),
        fetch("/api/projects"),
      ]);

      const statusData = await statusRes.json();
      setStatus(statusData.status);
      setClockInTime(statusData.clockInTime);

      const projData = await projRes.json();
      setProjects(projData.projects||[]);

      fetchHistory(me.employeeId);
    }
    init();
  },[]);

  async function fetchHistory(id: string) {
    setLoadingHistory(true);
    try {
      const res  = await fetch(`/api/attendance/history?employeeId=${id}`);
      const data = await res.json();
      if(Array.isArray(data)) {
        setHistory(data);
        // Compute today's stats
        const today = new Date().toLocaleDateString();
        const todayItems = data.filter((item:HistoryItem)=>item.date===today);
        setTodaySessions(todayItems.length);
        // Sum durations e.g. "2h 30m"
        let totalMins = 0;
        todayItems.forEach((item:HistoryItem)=>{
          const hm = item.duration.match(/(\d+)h\s*(\d+)m/);
          if(hm) totalMins += parseInt(hm[1])*60+parseInt(hm[2]);
        });
        setTodayHours(`${Math.floor(totalMins/60)}h ${totalMins%60}m`);
      }
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }

  // ── Live timer ──
  useEffect(()=>{
    if(status!=="IN"||!clockInTime) return;
    const tick = ()=> setSeconds(Math.floor((Date.now()-new Date(clockInTime).getTime())/1000));
    tick();
    const iv = setInterval(tick,1000);
    return ()=>clearInterval(iv);
  },[status,clockInTime]);

  // ── Close dropdown on outside click ──
  useEffect(()=>{
    function handleMouseDown(e: MouseEvent) {
      if(projWrapRef.current && !projWrapRef.current.contains(e.target as Node)){
        setProjOpen(false);
      }
    }
    if(projOpen) document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  },[projOpen]);

  function formatTime(sec:number) {
    const h = String(Math.floor(sec/3600)).padStart(2,"0");
    const m = String(Math.floor((sec%3600)/60)).padStart(2,"0");
    const s = String(sec%60).padStart(2,"0");
    return `${h}:${m}:${s}`;
  }

  // ── Clock in / out ──
  async function send(action:string) {
    setLoading(true);
    const res  = await fetch("/api/attendance",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        employeeId, action, timesheet,
        projectName: selectedProject?.name||"",
        projectCode: selectedProject?.code||"",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if(!data.success){ toast.error(data.error||"Something went wrong"); return; }
    setStatus(data.status);
    if(data.clockInTime) setClockInTime(data.clockInTime);
    if(action==="CLOCK_IN") toast.success("Session started");
    if(action==="CLOCK_OUT"){
      toast.success("Session completed");
      setTimesheet(""); setSelectedProject(null);
      setSeconds(0); setClockInTime(null);
      fetchHistory(employeeId);
    }
  }

  // ── Filtered project list for dropdown ──
  const filteredProjects = projects.filter(p=>
    p.code.toLowerCase().includes(projSearch.toLowerCase())||
    p.name.toLowerCase().includes(projSearch.toLowerCase())||
    (p.client||"").toLowerCase().includes(projSearch.toLowerCase())
  );

  const isActive   = status==="IN";
  const recentSix  = history.slice(0,6);
  const hasMore    = history.length > 6;

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root,[data-theme="dark"]{
          --bg:#0a0a0f;--surface:#111118;--surface-2:#16161f;--surface-3:#1c1c28;
          --border:rgba(255,255,255,0.06);--border-hover:rgba(255,255,255,0.12);
          --accent:#7c6af7;--accent-soft:rgba(124,106,247,0.12);--accent-border:rgba(124,106,247,0.2);--accent-glow:rgba(124,106,247,0.25);
          --green:#22d3a2;--green-bg:rgba(34,211,162,0.1);--green-border:rgba(34,211,162,0.2);
          --orange:#f97316;
          --text-primary:#f0f0f8;--text-secondary:#8888aa;--text-muted:#44445a;
          --topbar-bg:rgba(10,10,15,0.85);
          --timer-bg:linear-gradient(135deg,#16133a 0%,#0f1428 100%);
          --timer-border:rgba(124,106,247,0.2);--timer-glow:rgba(124,106,247,0.2);
          --timer-label:rgba(255,255,255,0.25);--timer-meta-label:rgba(255,255,255,0.3);
          --timer-meta-val:rgba(255,255,255,0.75);--timer-inactive:rgba(255,255,255,0.18);
          --timer-divider:rgba(255,255,255,0.07);
          --btn-out-bg:#1c1c28;--btn-out-color:#8888aa;
        }
        [data-theme="light"]{
          --bg:#f4f5f9;--surface:#ffffff;--surface-2:#f0f1f6;--surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.08);--border-hover:rgba(0,0,0,0.15);
          --accent:#6355e8;--accent-soft:rgba(99,85,232,0.08);--accent-border:rgba(99,85,232,0.2);--accent-glow:rgba(99,85,232,0.2);
          --green:#0fa87a;--green-bg:rgba(15,168,122,0.08);--green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a;
          --text-primary:#0f0f1a;--text-secondary:#555570;--text-muted:#9999b5;
          --topbar-bg:rgba(244,245,249,0.92);
          --timer-bg:linear-gradient(135deg,#ede9fe 0%,#ddd6fe 100%);
          --timer-border:rgba(99,85,232,0.25);--timer-glow:rgba(99,85,232,0.1);
          --timer-label:rgba(99,85,232,0.5);--timer-meta-label:rgba(99,85,232,0.45);
          --timer-meta-val:#3730a3;--timer-inactive:rgba(99,85,232,0.2);
          --timer-divider:rgba(99,85,232,0.12);
          --btn-out-bg:#f0f1f6;--btn-out-color:#555570;
        }
        *{transition:background-color 0.25s ease,border-color 0.25s ease,color 0.25s ease,box-shadow 0.25s ease;}

        .ws-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:'Syne',sans-serif;position:relative;overflow-x:hidden;}
        .ws-root::before{content:'';position:fixed;top:-20%;left:-10%;width:60%;height:60%;background:radial-gradient(ellipse,rgba(124,106,247,0.06) 0%,transparent 70%);pointer-events:none;z-index:0;}

        /* TOPBAR */
        .topbar{position:sticky;top:0;z-index:100;background:var(--topbar-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;}
        .topbar-logo{font-size:1.1rem;font-weight:800;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px;}
        .topbar-logo-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent-glow);}
        .topbar-right{display:flex;align-items:center;gap:1rem;}
        .status-badge{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:100px;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;border:1px solid var(--border);}
        .status-badge.active{background:var(--green-bg);border-color:var(--green-border);color:var(--green);}
        .status-badge.inactive{background:var(--surface-2);color:var(--text-muted);}
        .status-dot{width:6px;height:6px;border-radius:50%;background:currentColor;}
        .status-badge.active .status-dot{animation:pulse-dot 2s infinite;}
        @keyframes pulse-dot{0%{box-shadow:0 0 0 0 rgba(34,211,162,0.4);}70%{box-shadow:0 0 0 6px transparent;}100%{box-shadow:0 0 0 0 transparent;}}
        .emp-chip{display:flex;align-items:center;gap:7px;padding:5px 12px;background:var(--surface);border:1px solid var(--border);border-radius:100px;}
        .emp-name{font-size:0.75rem;font-weight:700;color:var(--text-primary);}
        .emp-id{font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--text-muted);letter-spacing:0.06em;}

        /* LAYOUT */
        .main-layout{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:2.5rem 2rem;display:grid;grid-template-columns:1fr 380px;gap:1.5rem;align-items:start;}
        @media(max-width:900px){.main-layout{grid-template-columns:1fr;}}
        .left-col{display:flex;flex-direction:column;gap:1.5rem;}
        .right-col{display:flex;flex-direction:column;gap:1.5rem;}

        .section-label{font-size:0.65rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:1.25rem;}

        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:1.75rem;position:relative;overflow:hidden;transition:border-color 0.2s;}
        .card:hover{border-color:var(--border-hover);}

        /* CLOCK BUTTONS */
        .clock-btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;}
        .btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:1.1rem 1.5rem;border-radius:14px;font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;border:none;outline:none;transition:all 0.2s;}
        .btn-in{background:var(--accent);color:#fff;box-shadow:0 0 30px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,0.15);}
        .btn-in:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 0 40px var(--accent-glow);}
        .btn-in:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none;}
        .btn-out{background:var(--btn-out-bg);color:var(--btn-out-color);border:1px solid var(--border);}
        .btn-out:hover:not(:disabled){background:rgba(249,115,22,0.08);border-color:rgba(249,115,22,0.3);color:var(--orange);transform:translateY(-1px);}
        .btn-out:disabled{opacity:0.25;cursor:not-allowed;transform:none;}
        .btn-icon{width:18px;height:18px;border-radius:50%;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .btn-icon-inner-in{width:7px;height:7px;background:currentColor;border-radius:2px;}
        .btn-icon-inner-out{width:7px;height:7px;border:2px solid currentColor;border-radius:50%;}

        .live-chip{display:inline-flex;align-items:center;gap:6px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:100px;padding:3px 10px;font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--green);font-family:'JetBrains Mono',monospace;}
        .live-dot{width:5px;height:5px;background:var(--green);border-radius:50%;animation:pulse-dot 2s infinite;}

        /* INPUT SECTION */
        .input-section{display:flex;flex-direction:column;gap:0.75rem;animation:fadeSlideIn 0.4s ease;}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        .ws-input{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.82rem;padding:0.8rem 1rem;border-radius:12px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;width:100%;}
        .ws-input::placeholder{color:var(--text-muted);}
        .ws-input:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        textarea.ws-input{resize:none;height:110px;line-height:1.6;}

        /* PROJECT DROPDOWN */
        .proj-dropdown-wrap{position:relative;}
        .proj-trigger{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.82rem;padding:0.8rem 1rem;border-radius:12px;cursor:pointer;width:100%;transition:border-color 0.2s,box-shadow 0.2s;text-align:left;}
        .proj-trigger.open,.proj-trigger:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);outline:none;}
        .proj-trigger-left{display:flex;flex-direction:column;gap:2px;overflow:hidden;}
        .proj-trigger-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .proj-trigger-code{font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--accent);}
        .proj-trigger-placeholder{color:var(--text-muted);}
        .proj-trigger-arrow{width:14px;height:14px;flex-shrink:0;color:var(--text-muted);transition:transform 0.2s;}
        .proj-trigger.open .proj-trigger-arrow{transform:rotate(180deg);}
        .proj-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--surface);border:1px solid var(--border-hover);border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,0.3);z-index:50;overflow:hidden;animation:dropIn 0.15s ease;}
        @keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .proj-search{display:flex;align-items:center;gap:8px;padding:0.7rem 1rem;border-bottom:1px solid var(--border);}
        .proj-search-icon{color:var(--text-muted);flex-shrink:0;}
        .proj-search-input{flex:1;background:transparent;border:none;outline:none;color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.8rem;}
        .proj-search-input::placeholder{color:var(--text-muted);}
        .proj-list{max-height:220px;overflow-y:auto;}
        .proj-item{display:flex;align-items:center;gap:10px;padding:0.7rem 1rem;cursor:pointer;transition:background 0.15s;}
        .proj-item:hover,.proj-item.focused{background:var(--surface-2);}
        .proj-item.selected{background:var(--accent-soft);}
        .proj-item-code{font-family:'JetBrains Mono',monospace;font-size:0.65rem;font-weight:700;color:var(--accent);min-width:70px;flex-shrink:0;}
        .proj-item-name{font-size:0.8rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .proj-item-client{font-size:0.65rem;color:var(--text-muted);margin-left:auto;flex-shrink:0;}
        .proj-clear{display:flex;align-items:center;gap:7px;padding:0.65rem 1rem;border-top:1px solid var(--border);font-size:0.72rem;color:var(--text-muted);cursor:pointer;transition:color 0.15s;}
        .proj-clear:hover{color:var(--text-secondary);}
        .proj-empty{padding:1.5rem;text-align:center;font-size:0.75rem;color:var(--text-muted);}

        /* TIMER */
        .timer-card{background:var(--timer-bg);border:1px solid var(--timer-border);border-radius:20px;padding:1.75rem;position:relative;overflow:hidden;}
        .timer-card::before{content:'';position:absolute;top:-30%;right:-20%;width:60%;height:60%;background:radial-gradient(ellipse,var(--timer-glow) 0%,transparent 70%);pointer-events:none;}
        .timer-section-label{font-size:0.65rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;color:var(--timer-label);margin-bottom:0.75rem;}
        .timer-display{font-family:'JetBrains Mono',monospace;font-size:3rem;font-weight:700;letter-spacing:-0.02em;color:var(--text-primary);line-height:1;margin-bottom:1.5rem;}
        .timer-display.inactive{color:var(--timer-inactive);}
        .timer-meta{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-top:1.25rem;border-top:1px solid var(--timer-divider);}
        .timer-meta-label{font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;color:var(--timer-meta-label);margin-bottom:4px;}
        .timer-meta-value{font-size:0.82rem;font-weight:600;color:var(--timer-meta-val);font-family:'JetBrains Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

        /* HISTORY */
        .history-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
        .view-all-btn{display:flex;align-items:center;gap:6px;font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:700;color:var(--accent);background:var(--accent-soft);border:1px solid var(--accent-border);border-radius:8px;padding:5px 12px;cursor:pointer;transition:all 0.18s;}
        .view-all-btn:hover{filter:brightness(1.1);}
        .history-list{display:flex;flex-direction:column;gap:0.6rem;}
        .history-item{display:flex;align-items:center;gap:1rem;padding:0.9rem 1rem;border-radius:14px;border:1px solid transparent;transition:all 0.2s;cursor:default;}
        .history-item:hover{background:var(--surface-2);border-color:var(--border);}
        .history-date-badge{flex-shrink:0;width:46px;height:46px;background:var(--surface-3);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;}
        .history-date-top{font-family:'JetBrains Mono',monospace;font-size:0.6rem;font-weight:700;color:var(--accent);}
        .history-date-bot{font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-muted);}
        .history-info{flex:1;min-width:0;}
        .history-project{font-size:0.82rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;}
        .history-time{font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--text-muted);}
        .history-right{text-align:right;flex-shrink:0;}
        .history-duration{font-family:'JetBrains Mono',monospace;font-size:0.82rem;font-weight:700;color:var(--text-primary);margin-bottom:3px;}
        .history-code{font-family:'JetBrains Mono',monospace;font-size:0.6rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;}

        /* MORE SESSIONS STRIP */
        .more-strip{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:0.75rem;padding:0.7rem;border:1px dashed var(--border);border-radius:12px;cursor:pointer;transition:all 0.2s;}
        .more-strip:hover{border-color:var(--accent-border);background:var(--accent-soft);}
        .more-strip-text{font-size:0.75rem;font-weight:700;color:var(--text-muted);transition:color 0.2s;}
        .more-strip:hover .more-strip-text{color:var(--accent);}

        /* STATS */
        .stats-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:1.75rem;}
        .stats-row{display:flex;justify-content:space-between;align-items:center;padding:0.8rem 0;}
        .stats-row+.stats-row{border-top:1px solid var(--border);}
        .stats-key{font-size:0.78rem;color:var(--text-secondary);font-weight:500;}
        .stats-val{font-size:0.82rem;font-weight:700;color:var(--text-primary);font-family:'JetBrains Mono',monospace;}
        .stats-val.green{color:var(--green);}

        .empty-state{padding:3rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.8rem;}
        .spinner{width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;vertical-align:middle;margin-left:8px;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ws-root">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-logo">
            <div className="topbar-logo-dot"/>
            Workspace
          </div>
          <div className="topbar-right">
            <div className="emp-chip">
              {employeeName&&<span className="emp-name">{employeeName}</span>}
              <span className="emp-id">{employeeId?`#${employeeId}`:"Loading…"}</span>
            </div>
            <div className={`status-badge ${isActive?"active":"inactive"}`}>
              <div className="status-dot"/>
              {isActive?"Actively Working":"Offline"}
            </div>
          </div>
        </header>

        <div className="main-layout">
          <div className="left-col">

            {/* TRACK TIME */}
            <div className="card">
              <div className="section-label" style={{marginBottom:"1.5rem"}}>
                Time Tracking
                {isActive&&<span className="live-chip" style={{marginLeft:"10px",verticalAlign:"middle"}}><span className="live-dot"/>Live</span>}
              </div>
              <div className="clock-btn-grid">
                <button className="btn btn-in" disabled={loading||isActive} onClick={()=>send("CLOCK_IN")}>
                  <span className="btn-icon"><span className="btn-icon-inner-in"/></span>
                  Clock In
                </button>
                <button className="btn btn-out" disabled={loading||!isActive} onClick={()=>send("CLOCK_OUT")}>
                  <span className="btn-icon"><span className="btn-icon-inner-out"/></span>
                  Clock Out
                </button>
              </div>

              {isActive&&(
                <div className="input-section">

                  {/* Project dropdown */}
                  <div className="proj-dropdown-wrap" ref={projWrapRef}>
                    <button
                      className={`proj-trigger ${projOpen?"open":""}`}
                      onClick={()=>{setProjOpen(o=>!o); setProjSearch("");}}
                    >
                      {selectedProject?(
                        <div className="proj-trigger-left">
                          <span className="proj-trigger-name">{selectedProject.name}</span>
                          <span className="proj-trigger-code">{selectedProject.code}{selectedProject.client?` · ${selectedProject.client}`:""}</span>
                        </div>
                      ):(
                        <span className="proj-trigger-placeholder">Select project…</span>
                      )}
                      <svg className="proj-trigger-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {projOpen&&(
                      <div className="proj-dropdown">
                        <div className="proj-search">
                          <svg className="proj-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            className="proj-search-input"
                            placeholder="Search by code, name or client…"
                            value={projSearch}
                            onChange={e=>setProjSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="proj-list">
                          {filteredProjects.length===0?(
                            <div className="proj-empty">{projects.length===0?"No active projects found.":"No results match your search."}</div>
                          ):filteredProjects.map(p=>(
                            <div
                              key={p.id}
                              className={`proj-item ${selectedProject?.id===p.id?"selected":""}`}
                              onClick={()=>{setSelectedProject(p); setProjOpen(false); setProjSearch("");}}
                            >
                              <span className="proj-item-code">{p.code}</span>
                              <span className="proj-item-name">{p.name}</span>
                              {p.client&&<span className="proj-item-client">{p.client}</span>}
                            </div>
                          ))}
                        </div>
                        {selectedProject&&(
                          <div className="proj-clear" onClick={()=>{setSelectedProject(null); setProjOpen(false);}}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>
                            Clear selection
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timesheet */}
                  <textarea
                    className="ws-input"
                    placeholder="Describe your current tasks…"
                    value={timesheet}
                    onChange={e=>setTimesheet(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* RECENT ACTIVITY */}
            <div className="card">
              <div className="history-header">
                <div className="section-label" style={{marginBottom:0}}>
                  Recent Activity
                  {loadingHistory&&<span className="spinner"/>}
                </div>
                {history.length>0&&(
                  <button className="view-all-btn" onClick={()=>router.push("/dashboard/history")}>
                    View All
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7"/><polyline points="8 4 11 7 8 10"/></svg>
                  </button>
                )}
              </div>

              <div className="history-list" style={{marginTop:"1.25rem"}}>
                {recentSix.length>0 ? recentSix.map((item,idx)=>{
                  const parts = item.date.split("/");
                  return(
                    <div className="history-item" key={idx}>
                      <div className="history-date-badge">
                        <span className="history-date-top">{parts[0]}/{parts[1]}</span>
                        <span className="history-date-bot">{parts[2]}</span>
                      </div>
                      <div className="history-info">
                        <div className="history-project">{item.projectName||"Unnamed Project"}</div>
                        <div className="history-time">{item.clockIn} — {item.clockOut}</div>
                      </div>
                      <div className="history-right">
                        <div className="history-duration">{item.duration}</div>
                        <div className="history-code">{item.projectCode||"—"}</div>
                      </div>
                    </div>
                  );
                }):(
                  <div className="empty-state">No recorded sessions yet</div>
                )}
              </div>

              {/* More sessions strip */}
              {hasMore&&(
                <div className="more-strip" onClick={()=>router.push("/dashboard/history")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <span className="more-strip-text">{history.length - 6} more session{history.length-6!==1?"s":""} — View full history</span>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7"/><polyline points="8 4 11 7 8 10"/></svg>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-col">

            {/* TIMER */}
            <div className="timer-card">
              <div className="timer-section-label">Active Session</div>
              <div className={`timer-display ${!isActive?"inactive":""}`}>
                {isActive?formatTime(seconds):"00:00:00"}
              </div>
              <div className="timer-meta">
                <div>
                  <div className="timer-meta-label">Start Time</div>
                  <div className="timer-meta-value">
                    {clockInTime?new Date(clockInTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"--:--"}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="timer-meta-label">Project</div>
                  <div className="timer-meta-value">{selectedProject?.code||"—"}</div>
                </div>
              </div>
            </div>

            {/* OVERVIEW */}
            <div className="stats-card">
              <div className="section-label">Overview</div>
              <div className="stats-row">
                <span className="stats-key">Current Status</span>
                <span className={`stats-val ${isActive?"green":""}`}>{isActive?"ACTIVE":status||"OFFLINE"}</span>
              </div>
              <div className="stats-row">
                <span className="stats-key">Today's Sessions</span>
                <span className="stats-val">{todaySessions}</span>
              </div>
              <div className="stats-row">
                <span className="stats-key">Today's Hours</span>
                <span className="stats-val" style={{color:"var(--accent)"}}>{todayHours}</span>
              </div>
              <div className="stats-row">
                <span className="stats-key">Total Sessions</span>
                <span className="stats-val">{history.length}</span>
              </div>
              {selectedProject&&(
                <div className="stats-row">
                  <span className="stats-key">Active Project</span>
                  <span className="stats-val" style={{color:"var(--accent)",fontSize:"0.72rem"}}>{selectedProject.code}</span>
                </div>
              )}
            </div>

          </div>
        </div>



      </div>
    </>
  );
}