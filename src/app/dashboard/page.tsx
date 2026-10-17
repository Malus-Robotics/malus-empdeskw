// src/app/dashboard/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, ChevronDown, Loader2, Play, Search, Square, X } from "lucide-react";
import LeaveCalendar from "@/components/LeaveCalendar";

interface HistoryItem {
  date: string; clockIn: string; clockOut: string;
  duration: string; projectName: string; projectCode: string; timesheet: string;
}
interface Project { id: string; code: string; name: string; client?: string; }
interface Announcement { id: string; title: string; body: string; date: string; type: string; }

const TYPE_CFG: { [k: string]: { color: string; bg: string; border: string; label: string } } = {
  holiday: { color: "var(--green)",  bg: "var(--green-soft)",  border: "var(--green-border)",  label: "Holiday" },
  alert:   { color: "var(--orange)", bg: "var(--orange-soft)", border: "var(--orange-border)", label: "Alert" },
  info:    { color: "var(--accent)", bg: "var(--accent-soft)", border: "var(--accent-border)", label: "Info" },
  urgent:  { color: "var(--red)",    bg: "var(--red-soft)",    border: "var(--red-border)",    label: "Urgent" },
};

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
  const [hour,            setHour]             = useState<number | null>(null);
  const [todayStr,        setTodayStr]         = useState("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const defaultAnnouncements: Announcement[] = [
    { id:"1", title:"Holiday Notice", body:"Office will remain closed on 14th April 2026 on account of Dr. Ambedkar Jayanti.", date:"2026-04-10", type:"holiday" },
    { id:"2", title:"Expense Submission Deadline", body:"All expense claims for Q1 must be submitted by 30th March 2026. Late submissions will not be processed.", date:"2026-03-20", type:"alert" },
    { id:"3", title:"New Project Onboarding", body:"PROJ-005 Hyderabad Logistics Automation has been added. Team assignments will be shared shortly.", date:"2026-03-18", type:"info" },
  ];

  // greeting + date are set after mount so server and client markup match
  useEffect(() => {
    const d = new Date();
    setHour(d.getHours());
    setTodayStr(new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(d));
  }, []);

  // ── Load user, status, projects, history, announcements ──
  useEffect(()=>{
    async function init() {
      const meRes = await fetch("/api/me").catch(()=>null);
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

      // ── Announcements: try API first, fall back to defaults ──
      try {
        const annRes = await fetch("/api/announcements");
        if (annRes.ok) {
          const annData = await annRes.json();
          if (Array.isArray(annData.announcements) && annData.announcements.length > 0) {
            setAnnouncements(annData.announcements);
          } else {
            setAnnouncements(defaultAnnouncements);
          }
        } else {
          setAnnouncements(defaultAnnouncements);
        }
      } catch {
        setAnnouncements(defaultAnnouncements);
      }

      fetchHistory(me.employeeId);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function fetchHistory(id: string) {
    setLoadingHistory(true);
    try {
      const res  = await fetch(`/api/attendance/history?employeeId=${id}`);
      const data = await res.json();
      if(Array.isArray(data)) {
        setHistory(data);
        const today = new Date().toLocaleDateString();
        const todayItems = data.filter((item:HistoryItem)=>item.date===today);
        setTodaySessions(todayItems.length);
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
    try {
      const res = await fetch("/api/attendance",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          employeeId, action, timesheet,
          projectName: selectedProject?.name||"",
          projectCode: selectedProject?.code||"",
        }),
      });
      const data = await res.json();
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
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Filtered project list for dropdown ──
  const filteredProjects = projects.filter(p=>
    p.code.toLowerCase().includes(projSearch.toLowerCase())||
    p.name.toLowerCase().includes(projSearch.toLowerCase())||
    (p.client||"").toLowerCase().includes(projSearch.toLowerCase())
  );

  const isActive  = status==="IN";
  const recentSix = history.slice(0,6);
  const hasMore   = history.length > 6;

  const greeting  = hour === null ? "Welcome" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (employeeName || "").split(" ")[0];

  const fmtAnnDate = (d:string)=>new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short"}).format(new Date(d));

  return(
    <>
      <style>{`
        .ws-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:var(--font-jakarta),system-ui,sans-serif;padding:2.25rem 2rem 4rem;overflow-x:clip;}
        .ws-root *,.ws-root *::before,.ws-root *::after{box-sizing:border-box;}
        .ws-inner{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:1.4rem;}

        /* header */
        .ws-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
        .ws-title{font-size:1.85rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1;}
        .ws-sub{font-size:0.9rem;color:var(--text-muted);margin-top:6px;}
        .ws-head-right{display:flex;align-items:center;gap:0.6rem;}
        .ws-id{font-size:0.78rem;font-weight:600;color:var(--text-secondary);background:var(--surface);border:1px solid var(--border);border-radius:100px;padding:6px 12px;}
        .ws-status{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:100px;font-size:0.78rem;font-weight:700;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);}
        .ws-status.on{background:var(--green-soft);border-color:var(--green-border);color:var(--green);}
        .ws-status-dot{width:7px;height:7px;border-radius:50%;background:currentColor;}
        .ws-status.on .ws-status-dot{animation:ws-pulse 2s infinite;}
        @keyframes ws-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--green) 40%,transparent);}70%{box-shadow:0 0 0 6px transparent;}100%{box-shadow:0 0 0 0 transparent;}}

        /* summary strip */
        .ws-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:0.8rem;}
        .ws-kpi{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1rem 1.15rem;box-shadow:var(--shadow-card);}
        .ws-kpi-l{display:flex;align-items:center;gap:7px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);}
        .ws-kpi-dot{width:8px;height:8px;border-radius:50%;background:var(--kc);}
        .ws-kpi-n{font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;line-height:1;margin:10px 0 6px;color:var(--kc2,var(--text-primary));}
        .ws-kpi small{font-size:0.72rem;color:var(--text-muted);}

        /* layout */
        .ws-main{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:1.4rem;align-items:start;}
        .ws-left,.ws-right{display:flex;flex-direction:column;gap:1.4rem;min-width:0;}

        .ws-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:1.6rem;box-shadow:var(--shadow-card);position:relative;}
        .ws-card-h{display:flex;align-items:center;justify-content:space-between;gap:0.8rem;margin-bottom:1.2rem;}
        .ws-card-t{font-size:1.05rem;font-weight:800;letter-spacing:-0.01em;display:flex;align-items:center;gap:10px;}
        .ws-live{display:inline-flex;align-items:center;gap:6px;background:var(--green-soft);border:1px solid var(--green-border);border-radius:100px;padding:3px 10px;font-size:0.7rem;font-weight:700;color:var(--green);}
        .ws-live i{width:6px;height:6px;background:var(--green);border-radius:50%;animation:ws-pulse 2s infinite;}

        /* clock buttons */
        .ws-btns{display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;}
        .ws-btn{display:flex;align-items:center;justify-content:center;gap:10px;height:54px;border-radius:14px;font-family:inherit;font-size:0.92rem;font-weight:700;cursor:pointer;border:1px solid transparent;transition:background .15s,border-color .15s,color .15s,opacity .15s;}
        .ws-btn-in{background:var(--accent);color:#fff;box-shadow:0 4px 14px var(--accent-glow);}
        .ws-btn-in:hover:not(:disabled){background:var(--accent-hover);}
        .ws-btn-out{background:var(--btn-out-bg);color:var(--btn-out-color);border-color:var(--border);}
        .ws-btn-out:hover:not(:disabled){border-color:var(--orange-border);background:var(--orange-soft);color:var(--orange);}
        .ws-btn:disabled{opacity:0.4;cursor:not-allowed;box-shadow:none;}
        .ws-hint{margin-top:1rem;font-size:0.82rem;color:var(--text-muted);line-height:1.6;}

        .ws-fields{display:flex;flex-direction:column;gap:1rem;margin-top:1.3rem;animation:ws-in .25s ease;}
        @keyframes ws-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        .ws-lab{display:block;font-size:0.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:6px;}
        .ws-ta{width:100%;min-height:104px;resize:vertical;padding:0.8rem 0.95rem;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.88rem;line-height:1.6;outline:none;}
        .ws-ta::placeholder{color:var(--text-muted);}
        .ws-ta:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}

        /* project dropdown */
        .ws-dd{position:relative;z-index:200;}
        .ws-dd-trigger{display:flex;align-items:center;justify-content:space-between;gap:0.6rem;width:100%;min-height:48px;padding:0.55rem 0.95rem;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.88rem;cursor:pointer;text-align:left;}
        .ws-dd-trigger:hover{border-color:var(--border-hover);}
        .ws-dd-trigger.open,.ws-dd-trigger:focus-visible{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);outline:none;}
        .ws-dd-left{display:flex;flex-direction:column;gap:2px;overflow:hidden;}
        .ws-dd-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ws-dd-code{font-size:0.74rem;font-weight:600;color:var(--accent);}
        .ws-dd-ph{color:var(--text-muted);}
        .ws-dd-arrow{flex-shrink:0;color:var(--text-muted);transition:transform .2s;}
        .ws-dd-trigger.open .ws-dd-arrow{transform:rotate(180deg);}
        .ws-dd-menu{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--surface);border:1px solid var(--border-hover);border-radius:14px;box-shadow:var(--shadow-pop);z-index:300;overflow:hidden;animation:ws-in .15s ease;}
        .ws-dd-search{display:flex;align-items:center;gap:8px;padding:0.7rem 0.95rem;border-bottom:1px solid var(--border);color:var(--text-muted);}
        .ws-dd-search input{flex:1;background:transparent;border:none;outline:none;color:var(--text-primary);font-family:inherit;font-size:0.85rem;min-width:0;}
        .ws-dd-search input::placeholder{color:var(--text-muted);}
        .ws-dd-list{max-height:230px;overflow-y:auto;}
        .ws-dd-item{display:flex;align-items:center;gap:10px;padding:0.7rem 0.95rem;cursor:pointer;}
        .ws-dd-item:hover{background:var(--surface-2);}
        .ws-dd-item.sel{background:var(--accent-soft);}
        .ws-dd-icode{font-size:0.74rem;font-weight:700;color:var(--accent);min-width:74px;flex-shrink:0;}
        .ws-dd-iname{font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ws-dd-iclient{font-size:0.74rem;color:var(--text-muted);margin-left:auto;flex-shrink:0;}
        .ws-dd-clear{display:flex;align-items:center;gap:7px;padding:0.7rem 0.95rem;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-muted);cursor:pointer;}
        .ws-dd-clear:hover{color:var(--text-primary);}
        .ws-dd-empty{padding:1.5rem;text-align:center;font-size:0.82rem;color:var(--text-muted);}

        /* timer */
        .ws-timer{background:var(--timer-bg);border:1px solid var(--timer-border);border-radius:22px;padding:1.6rem;position:relative;overflow:hidden;}
        .ws-timer::before{content:'';position:absolute;top:-30%;right:-20%;width:60%;height:60%;background:radial-gradient(ellipse,var(--timer-glow) 0%,transparent 70%);pointer-events:none;}
        .ws-timer-l{font-size:0.82rem;font-weight:700;color:var(--timer-label);margin-bottom:0.6rem;position:relative;}
        .ws-timer-d{font-size:3rem;font-weight:800;letter-spacing:-0.03em;color:var(--text-primary);line-height:1;margin-bottom:1.4rem;font-variant-numeric:tabular-nums;position:relative;}
        .ws-timer-d.off{color:var(--timer-inactive);}
        .ws-timer-meta{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-top:1.1rem;border-top:1px solid var(--timer-divider);position:relative;}
        .ws-timer-ml{font-size:0.74rem;font-weight:600;color:var(--timer-meta-label);margin-bottom:4px;}
        .ws-timer-mv{font-size:0.95rem;font-weight:700;color:var(--timer-meta-val);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

        /* recent activity */
        .ws-view-all{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:0.78rem;font-weight:700;color:var(--accent);background:var(--accent-soft);border:1px solid var(--accent-border);border-radius:10px;padding:6px 12px;cursor:pointer;}
        .ws-view-all:hover{background:var(--accent);color:#fff;}
        .ws-list{display:flex;flex-direction:column;gap:0.4rem;}
        .ws-item{display:flex;align-items:center;gap:1rem;padding:0.8rem 0.9rem;border-radius:14px;border:1px solid transparent;}
        .ws-item:hover{background:var(--surface-2);border-color:var(--border);}
        .ws-date{flex-shrink:0;width:48px;height:48px;background:var(--accent-soft);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .ws-date b{font-size:0.78rem;font-weight:800;color:var(--accent);line-height:1.1;}
        .ws-date span{font-size:0.64rem;font-weight:600;color:var(--text-muted);}
        .ws-info{flex:1;min-width:0;}
        .ws-proj{font-size:0.9rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ws-time{font-size:0.78rem;color:var(--text-muted);margin-top:3px;}
        .ws-right-t{text-align:right;flex-shrink:0;}
        .ws-dur{font-size:0.9rem;font-weight:800;}
        .ws-code{font-size:0.72rem;font-weight:600;color:var(--accent);margin-top:3px;}
        .ws-more{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:0.8rem;padding:0.75rem;border:1px dashed var(--border);border-radius:12px;cursor:pointer;font-size:0.82rem;font-weight:700;color:var(--text-muted);background:none;font-family:inherit;width:100%;}
        .ws-more:hover{border-color:var(--accent-border);background:var(--accent-soft);color:var(--accent);}
        .ws-empty{padding:2.5rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.88rem;line-height:1.6;}
        .ws-spin{animation:ws-rot .8s linear infinite;}
        @keyframes ws-rot{to{transform:rotate(360deg)}}

        /* announcements */
        .ws-ann-list{display:flex;flex-direction:column;gap:0.7rem;}
        .ws-ann{display:grid;grid-template-columns:4px 1fr;border-radius:14px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden;}
        .ws-ann-bar{width:4px;}
        .ws-ann-body{padding:0.85rem 1rem;}
        .ws-ann-top{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap;}
        .ws-ann-title{font-size:0.88rem;font-weight:800;}
        .ws-ann-badge{font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:100px;border:1px solid;}
        .ws-ann-date{font-size:0.74rem;color:var(--text-muted);margin-left:auto;}
        .ws-ann-text{font-size:0.82rem;color:var(--text-secondary);line-height:1.6;}
        .ws-count{font-size:0.78rem;color:var(--text-muted);font-weight:600;}

        /* ───────────── MOBILE ───────────── */
        @media(max-width:1000px){
          .ws-kpis{grid-template-columns:repeat(2,1fr);}
          /* single column; flatten both columns so cards can be re-ordered:
             clock in → timer → recent activity → calendar → announcements */
          .ws-main{display:flex;flex-direction:column;align-items:stretch;gap:1rem;}
          .ws-left,.ws-right{display:contents;}
          .ws-left > .ws-card:nth-child(1){order:0;}
          .ws-timer{order:1;}
          .ws-left > .ws-card:nth-child(2){order:3;}
          .ws-right > .lc-card{order:4;}
          .ws-ann-card{order:5;}
        }
        @media(max-width:640px){
          .ws-root{padding:1.25rem 1rem 3rem;}
          .ws-title{font-size:1.5rem;}
          .ws-card,.ws-timer{padding:1.2rem;border-radius:18px;}
          .ws-kpi{padding:0.85rem 0.95rem;}
          .ws-kpi-n{font-size:1.5rem;}
          .ws-btns{grid-template-columns:1fr;gap:0.7rem;}
          .ws-timer-d{font-size:2.5rem;}
          .ws-item{padding:0.7rem 0.4rem;gap:0.75rem;}
          .ws-dd-iclient{display:none;}
          .ws-ta,.ws-dd-trigger,.ws-dd-search input{font-size:16px;} /* stops iOS zoom on focus */
          .ws-ann-date{margin-left:0;}
        }
        @media(hover:none){
          .ws-btn-in:hover:not(:disabled){background:var(--accent);}
        }
      `}</style>

      <div className="ws-root">
        <div className="ws-inner">

          {/* HEADER */}
          <div className="ws-head">
            <div>
              <h1 className="ws-title">{greeting}{firstName ? `, ${firstName}` : ""}</h1>
              <p className="ws-sub">{todayStr || "Your workspace"}</p>
            </div>
            <div className="ws-head-right">
              {employeeId && <span className="ws-id">#{employeeId}</span>}
              <span className={`ws-status ${isActive ? "on" : ""}`}>
                <span className="ws-status-dot" />
                {isActive ? "Actively working" : "Offline"}
              </span>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="ws-kpis">
            <div className="ws-kpi" style={{ ["--kc" as any]: isActive ? "var(--green)" : "var(--text-muted)", ["--kc2" as any]: isActive ? "var(--green)" : undefined }}>
              <span className="ws-kpi-l"><span className="ws-kpi-dot" />Current status</span>
              <div className="ws-kpi-n">{isActive ? "Active" : "Offline"}</div>
              <small>{isActive && clockInTime ? `Since ${new Date(clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Clock in to start a session"}</small>
            </div>
            <div className="ws-kpi" style={{ ["--kc" as any]: "var(--accent)", ["--kc2" as any]: "var(--accent)" }}>
              <span className="ws-kpi-l"><span className="ws-kpi-dot" />Today&apos;s hours</span>
              <div className="ws-kpi-n">{todayHours}</div>
              <small>Completed sessions today</small>
            </div>
            <div className="ws-kpi" style={{ ["--kc" as any]: "var(--text-primary)" }}>
              <span className="ws-kpi-l"><span className="ws-kpi-dot" />Today&apos;s sessions</span>
              <div className="ws-kpi-n">{todaySessions}</div>
              <small>Clock-ins today</small>
            </div>
            <div className="ws-kpi" style={{ ["--kc" as any]: "var(--text-muted)" }}>
              <span className="ws-kpi-l"><span className="ws-kpi-dot" />Total sessions</span>
              <div className="ws-kpi-n">{history.length}</div>
              <small>All time</small>
            </div>
          </div>

          <div className="ws-main">
            <div className="ws-left">

              {/* TIME TRACKING */}
              <div className="ws-card">
                <div className="ws-card-h">
                  <h2 className="ws-card-t">
                    Time tracking
                    {isActive && <span className="ws-live"><i />Live</span>}
                  </h2>
                </div>

                <div className="ws-btns">
                  <button className="ws-btn ws-btn-in" disabled={loading || isActive} onClick={() => send("CLOCK_IN")}>
                    {loading && !isActive ? <Loader2 size={18} className="ws-spin" /> : <Play size={18} />} Clock in
                  </button>
                  <button className="ws-btn ws-btn-out" disabled={loading || !isActive} onClick={() => send("CLOCK_OUT")}>
                    {loading && isActive ? <Loader2 size={18} className="ws-spin" /> : <Square size={16} />} Clock out
                  </button>
                </div>

                {!isActive && (
                  <p className="ws-hint">Clock in to start your session. Once it is running you can pick a project and note what you are working on.</p>
                )}

                {isActive && (
                  <div className="ws-fields">
                    <div>
                      <span className="ws-lab">Project</span>
                      <div className="ws-dd" ref={projWrapRef}>
                        <button
                          type="button"
                          className={`ws-dd-trigger ${projOpen ? "open" : ""}`}
                          onClick={() => { setProjOpen(o => !o); setProjSearch(""); }}
                        >
                          {selectedProject ? (
                            <div className="ws-dd-left">
                              <span className="ws-dd-name">{selectedProject.name}</span>
                              <span className="ws-dd-code">{selectedProject.code}{selectedProject.client ? ` · ${selectedProject.client}` : ""}</span>
                            </div>
                          ) : (
                            <span className="ws-dd-ph">Select a project</span>
                          )}
                          <ChevronDown size={16} className="ws-dd-arrow" />
                        </button>

                        {projOpen && (
                          <div className="ws-dd-menu">
                            <div className="ws-dd-search">
                              <Search size={15} />
                              <input
                                placeholder="Search by code, name or client"
                                value={projSearch}
                                onChange={e => setProjSearch(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="ws-dd-list">
                              {filteredProjects.length === 0 ? (
                                <div className="ws-dd-empty">{projects.length === 0 ? "No active projects found." : "No project matches your search."}</div>
                              ) : filteredProjects.map(p => (
                                <div
                                  key={p.id}
                                  className={`ws-dd-item ${selectedProject?.id === p.id ? "sel" : ""}`}
                                  onClick={() => { setSelectedProject(p); setProjOpen(false); setProjSearch(""); }}
                                >
                                  <span className="ws-dd-icode">{p.code}</span>
                                  <span className="ws-dd-iname">{p.name}</span>
                                  {p.client && <span className="ws-dd-iclient">{p.client}</span>}
                                </div>
                              ))}
                            </div>
                            {selectedProject && (
                              <div className="ws-dd-clear" onClick={() => { setSelectedProject(null); setProjOpen(false); }}>
                                <X size={14} /> Clear selection
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="ws-lab" htmlFor="ws-timesheet">What are you working on?</label>
                      <textarea
                        id="ws-timesheet"
                        className="ws-ta"
                        placeholder="Describe your current tasks"
                        value={timesheet}
                        onChange={e => setTimesheet(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RECENT ACTIVITY */}
              <div className="ws-card">
                <div className="ws-card-h">
                  <h2 className="ws-card-t">
                    Recent activity
                    {loadingHistory && <Loader2 size={15} className="ws-spin" style={{ color: "var(--text-muted)" }} />}
                  </h2>
                  {history.length > 0 && (
                    <button className="ws-view-all" onClick={() => router.push("/dashboard/history")}>
                      View all <ArrowRight size={14} />
                    </button>
                  )}
                </div>

                <div className="ws-list">
                  {recentSix.length > 0 ? recentSix.map((item, idx) => {
                    const parts = item.date.split("/");
                    return (
                      <div className="ws-item" key={idx}>
                        <div className="ws-date">
                          <b>{parts[0]}/{parts[1]}</b>
                          <span>{parts[2]}</span>
                        </div>
                        <div className="ws-info">
                          <div className="ws-proj">{item.projectName || "Unnamed project"}</div>
                          <div className="ws-time">{item.clockIn} to {item.clockOut}</div>
                        </div>
                        <div className="ws-right-t">
                          <div className="ws-dur">{item.duration}</div>
                          <div className="ws-code">{item.projectCode || "No code"}</div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="ws-empty">No sessions yet. Your first clock-in will show up here.</div>
                  )}
                </div>

                {hasMore && (
                  <button className="ws-more" onClick={() => router.push("/dashboard/history")}>
                    {history.length - 6} more session{history.length - 6 !== 1 ? "s" : ""}. View full history <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="ws-right">

              {/* TIMER */}
              <div className="ws-timer">
                <div className="ws-timer-l">Active session</div>
                <div className={`ws-timer-d ${!isActive ? "off" : ""}`}>
                  {isActive ? formatTime(seconds) : "00:00:00"}
                </div>
                <div className="ws-timer-meta">
                  <div>
                    <div className="ws-timer-ml">Start time</div>
                    <div className="ws-timer-mv">
                      {clockInTime ? new Date(clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="ws-timer-ml">Project</div>
                    <div className="ws-timer-mv">{selectedProject?.code || "Not selected"}</div>
                  </div>
                </div>
              </div>

              {/* CALENDAR: holidays, weekly offs and your leaves */}
              <LeaveCalendar />

              {/* ANNOUNCEMENTS */}
              <div className="ws-card ws-ann-card">
                <div className="ws-card-h">
                  <h2 className="ws-card-t">Announcements</h2>
                  {announcements.length > 0 && (
                    <span className="ws-count">{announcements.length} notice{announcements.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                {announcements.length === 0 ? (
                  <div className="ws-empty">No announcements right now.</div>
                ) : (
                  <div className="ws-ann-list">
                    {announcements.map(a => {
                      const cfg = TYPE_CFG[a.type] || TYPE_CFG.info;
                      return (
                        <div className="ws-ann" key={a.id}>
                          <div className="ws-ann-bar" style={{ background: cfg.color }} />
                          <div className="ws-ann-body">
                            <div className="ws-ann-top">
                              <span className="ws-ann-title">{a.title}</span>
                              <span className="ws-ann-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>{cfg.label}</span>
                              <span className="ws-ann-date">{fmtAnnDate(a.date)}</span>
                            </div>
                            <div className="ws-ann-text">{a.body}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
