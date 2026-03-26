"use client";

import { useEffect, useState } from "react";

type LeaveType   = "Casual"|"Sick"|"Earned"|"Unpaid"|"Maternity"|"Paternity"|"Compensatory";
type LeaveStatus = "Pending"|"Approved"|"Rejected";

interface LeaveApplication {
  id: string; type: LeaveType; from: string; to: string;
  days: number; reason: string; status: LeaveStatus;
  appliedOn: string; remarks?: string; contactNo?: string;
}

const LEAVE_TYPES: LeaveType[] = ["Casual","Sick","Earned","Unpaid","Maternity","Paternity","Compensatory"];

const LEAVE_COLORS: Record<LeaveType,string> = {
  Casual:"#7c6af7",Sick:"#f87171",Earned:"#22d3a2",
  Unpaid:"#9999b5",Maternity:"#f97316",Paternity:"#38bdf8",Compensatory:"#fbbf24",
};

const STATUS_CFG: Record<LeaveStatus,{color:string;bg:string;border:string}> = {
  Pending:  {color:"#fbbf24",bg:"rgba(251,191,36,0.1)", border:"rgba(251,191,36,0.2)"},
  Approved: {color:"#22d3a2",bg:"rgba(34,211,162,0.1)", border:"rgba(34,211,162,0.2)"},
  Rejected: {color:"#f87171",bg:"rgba(248,113,113,0.1)",border:"rgba(248,113,113,0.2)"},
};

function daysBetween(from:string,to:string):number {
  if(!from||!to) return 0;
  const d1=new Date(from),d2=new Date(to);
  if(d2<d1) return 0;
  return Math.floor((d2.getTime()-d1.getTime())/86400000)+1;
}

function fmt(d:string) {
  if(!d) return "—";
  return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d));
}

// Derive balance from real leave history
function deriveBalances(history:LeaveApplication[]) {
  const TOTALS: Partial<Record<LeaveType,number>> = {
    Casual:12,Sick:10,Earned:15,Unpaid:99,Compensatory:4,
  };
  const result = LEAVE_TYPES.map(type=>{
    const total   = TOTALS[type] ?? 0;
    const used    = history.filter(l=>l.type===type&&l.status==="Approved").reduce((a,l)=>a+l.days,0);
    const pending = history.filter(l=>l.type===type&&l.status==="Pending").reduce((a,l)=>a+l.days,0);
    return { type, total, used, pending };
  });
  return result;
}

export default function LeavePage() {
  const [employeeId,   setEmployeeId]   = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [history,      setHistory]      = useState<LeaveApplication[]>([]);
  const [loadingHist,  setLoadingHist]  = useState(true);
  const [activeTab,    setActiveTab]    = useState<"apply"|"history"|"balance">("apply");

  // Form
  const [leaveType,  setLeaveType]  = useState<LeaveType>("Casual");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const [reason,     setReason]     = useState("");
  const [contactNo,  setContactNo]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError,setSubmitError]= useState("");
  const [successId,  setSuccessId]  = useState<string|null>(null);

  // Cancel state
  const [cancelling, setCancelling] = useState<string|null>(null);

  // Filter
  const [filterStatus,setFilterStatus] = useState<"All"|LeaveStatus>("All");

  // ── Load user + history ──
  useEffect(()=>{
    fetch("/api/me").then(r=>r.json()).then(d=>{
      if(d.employeeId) setEmployeeId(d.employeeId);
      if(d.name)       setEmployeeName(d.name);
    }).catch(()=>{});
    loadHistory();
  },[]);

  async function loadHistory() {
    setLoadingHist(true);
    const r = await fetch("/api/leaves").catch(()=>null);
    if(r) {
      const d = await r.json();
      setHistory((d.leaves||[]).map((l:any)=>({
        ...l,
        // DB stores type as CASUAL — normalize to Casual
        type:   l.type.charAt(0)+l.type.slice(1).toLowerCase() as LeaveType,
        status: l.status.charAt(0)+l.status.slice(1).toLowerCase() as LeaveStatus,
      })));
    }
    setLoadingHist(false);
  }

  const balances = deriveBalances(history);
  const days     = daysBetween(fromDate,toDate);
  const selBal   = balances.find(b=>b.type===leaveType);
  const available = selBal ? selBal.total-selBal.used-selBal.pending : 0;

  // ── Submit ──
  async function handleApply() {
    setSubmitError("");
    if(!fromDate||!toDate||!reason.trim()||days===0) return;
    setSubmitting(true);
    try {
      const res  = await fetch("/api/leaves",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          type:      leaveType.toUpperCase(),
          from:      fromDate,
          to:        toDate,
          days,
          reason:    reason.trim(),
          contactNo: contactNo.trim()||null,
        }),
      });
      const data = await res.json();
      if(data.success) {
        setSuccessId(data.leave.id);
        setFromDate(""); setToDate(""); setReason(""); setContactNo("");
        await loadHistory();
        setActiveTab("history");
      } else {
        setSubmitError(data.error||"Failed to submit. Please try again.");
      }
    } catch {
      setSubmitError("Connection error. Please try again.");
    }
    setSubmitting(false);
  }

  // ── Cancel ──
  async function handleCancel(id:string) {
    setCancelling(id);
    try {
      const res  = await fetch(`/api/leaves?id=${id}`,{method:"DELETE"});
      const data = await res.json();
      if(data.success) {
        await loadHistory();
      }
    } catch {}
    setCancelling(null);
  }

  const filteredHistory = filterStatus==="All" ? history : history.filter(h=>h.status===filterStatus);
  const totalPending  = history.filter(h=>h.status==="Pending").length;
  const totalApproved = history.filter(h=>h.status==="Approved").length;
  const totalDaysUsed = history.filter(h=>h.status==="Approved").reduce((a,h)=>a+h.days,0);

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
          --orange:#f97316;--red:#f87171;--yellow:#fbbf24;
          --text-primary:#f0f0f8;--text-secondary:#8888aa;--text-muted:#44445a;
        }
        [data-theme="light"]{
          --bg:#f4f5f9;--surface:#ffffff;--surface-2:#f0f1f6;--surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.08);--border-hover:rgba(0,0,0,0.15);
          --accent:#6355e8;--accent-soft:rgba(99,85,232,0.08);--accent-border:rgba(99,85,232,0.2);--accent-glow:rgba(99,85,232,0.2);
          --green:#0fa87a;--green-bg:rgba(15,168,122,0.08);--green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a;--red:#dc2626;--yellow:#d97706;
          --text-primary:#0f0f1a;--text-secondary:#555570;--text-muted:#9999b5;
        }
        *{transition:background-color 0.25s ease,border-color 0.25s ease,color 0.25s ease;}

        .lp-root{min-height:100vh;background:var(--bg);font-family:'Syne',sans-serif;color:var(--text-primary);padding:2.5rem 2rem 4rem;position:relative;overflow-x:hidden;}
        .lp-root::before{content:'';position:fixed;top:-15%;right:-5%;width:45%;height:45%;background:radial-gradient(ellipse,rgba(124,106,247,0.06) 0%,transparent 70%);pointer-events:none;z-index:0;}
        .lp-inner{position:relative;z-index:1;max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:1.75rem;}

        .lp-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:1.5rem;border-bottom:1px solid var(--border);}
        .lp-title{font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:5px;}
        .lp-subtitle{font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;}
        .lp-user-name{font-size:0.88rem;font-weight:700;text-align:right;margin-bottom:3px;}
        .lp-user-id{font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--text-muted);text-align:right;}

        .sum-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;}
        .sum-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1.1rem 1.3rem;display:flex;align-items:center;gap:1rem;}
        .sum-icon{width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .sum-label{font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;color:var(--text-muted);margin-bottom:4px;}
        .sum-val{font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:800;line-height:1;}

        .tabs-row{display:flex;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:5px;}
        .tab-btn{flex:1;padding:0.6rem 1rem;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.78rem;font-weight:700;border:none;cursor:pointer;transition:all 0.18s;color:var(--text-muted);background:transparent;}
        .tab-btn:hover{color:var(--text-secondary);background:var(--surface-2);}
        .tab-btn.active{background:var(--accent);color:#fff;box-shadow:0 0 16px var(--accent-glow);}
        .tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:rgba(255,255,255,0.2);font-size:0.6rem;font-weight:800;margin-left:6px;vertical-align:middle;padding:0 4px;}
        .tab-btn:not(.active) .tab-badge{background:var(--surface-3);color:var(--text-muted);}

        .lp-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:1.75rem;}
        .section-label{font-size:0.6rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:1.25rem;}

        .leave-type-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.5rem;}
        .leave-type-btn{display:flex;align-items:center;gap:7px;padding:0.5rem 0.9rem;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;border:1px solid var(--border);background:var(--surface-2);color:var(--text-secondary);cursor:pointer;transition:all 0.18s;}
        .leave-type-btn:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .leave-type-btn.active{color:#fff;border-color:transparent;}
        .leave-type-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}

        .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
        @media(max-width:640px){.form-grid-2{grid-template-columns:1fr;}}
        .form-field{display:flex;flex-direction:column;gap:6px;}
        .form-label{font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .form-input,.form-textarea{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.82rem;padding:0.75rem 1rem;border-radius:11px;outline:none;width:100%;}
        .form-input::placeholder,.form-textarea::placeholder{color:var(--text-muted);}
        .form-input:focus,.form-textarea:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .form-textarea{resize:vertical;min-height:90px;line-height:1.6;}

        .day-counter-row{display:flex;align-items:center;justify-content:space-between;padding:0.85rem 1.1rem;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;margin:1rem 0;}
        .day-counter-left{font-size:0.78rem;color:var(--text-secondary);}
        .day-counter-right{display:flex;align-items:baseline;gap:6px;}
        .day-count{font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;}
        .day-count-label{font-size:0.72rem;color:var(--text-muted);font-weight:600;}
        .day-warning{font-size:0.7rem;color:var(--red);margin-top:4px;font-weight:600;}

        .form-submit-row{display:flex;justify-content:flex-end;gap:0.75rem;padding-top:0.5rem;}
        .btn-primary{display:flex;align-items:center;gap:8px;background:var(--accent);color:#fff;font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:0.8rem 2rem;border-radius:12px;border:none;cursor:pointer;box-shadow:0 0 24px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,0.15);transition:all 0.2s;}
        .btn-primary:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
        .btn-primary:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none;}
        .btn-ghost{background:var(--surface-3);border:1px solid var(--border);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:600;padding:0.8rem 1.5rem;border-radius:12px;cursor:pointer;transition:all 0.18s;}
        .btn-ghost:hover{border-color:var(--border-hover);color:var(--text-secondary);}
        .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .error-box{background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:0.65rem 1rem;font-size:0.75rem;color:var(--red);font-weight:600;margin-top:0.5rem;}

        .filter-row{display:flex;gap:6px;margin-bottom:1.25rem;flex-wrap:wrap;}
        .fp{padding:0.38rem 0.9rem;border-radius:100px;border:1px solid var(--border);font-size:0.72rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all 0.18s;background:var(--surface-2);color:var(--text-muted);}
        .fp:hover{border-color:var(--border-hover);color:var(--text-secondary);}
        .fp.active{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent);}

        .leave-card-list{display:flex;flex-direction:column;gap:0.75rem;}
        .leave-card{display:grid;grid-template-columns:4px 1fr auto;background:var(--surface-2);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color 0.2s;}
        .leave-card:hover{border-color:var(--border-hover);}
        .leave-card-accent{width:4px;}
        .leave-card-body{padding:1rem 1.1rem;}
        .leave-card-top{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
        .leave-card-type{font-size:0.75rem;font-weight:800;letter-spacing:0.04em;}
        .leave-card-id{font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--text-muted);}
        .leave-card-dates{font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--text-secondary);margin-bottom:5px;}
        .leave-card-reason{font-size:0.78rem;color:var(--text-secondary);line-height:1.5;}
        .leave-card-remarks{font-size:0.72rem;color:var(--red);margin-top:4px;font-style:italic;}
        .leave-card-applied{font-family:'JetBrains Mono',monospace;font-size:0.58rem;color:var(--text-muted);margin-top:5px;}
        .leave-card-right{padding:1rem;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:8px;min-width:100px;}
        .status-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:0.62rem;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;border:1px solid;white-space:nowrap;}
        .status-dot{width:5px;height:5px;border-radius:50%;background:currentColor;}
        .days-chip{font-family:'JetBrains Mono',monospace;font-size:0.72rem;font-weight:700;color:var(--text-muted);}
        .cancel-btn{font-size:0.65rem;font-weight:700;font-family:'Syne',sans-serif;padding:3px 9px;border-radius:7px;cursor:pointer;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);color:var(--red);transition:all 0.18s;}
        .cancel-btn:hover:not(:disabled){background:rgba(248,113,113,0.2);}
        .cancel-btn:disabled{opacity:0.5;cursor:not-allowed;}

        .balance-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;}
        .balance-card{background:var(--surface-2);border:1px solid var(--border);border-radius:18px;padding:1.3rem;position:relative;overflow:hidden;transition:border-color 0.2s;}
        .balance-card:hover{border-color:var(--border-hover);}
        .balance-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;}
        .balance-type{display:flex;align-items:center;gap:7px;font-size:0.78rem;font-weight:800;}
        .balance-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
        .balance-total-label{font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;}
        .balance-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:1rem;}
        .balance-num-item{text-align:center;}
        .balance-num{font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:800;line-height:1;margin-bottom:3px;}
        .balance-num-label{font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .balance-bar-track{height:5px;background:var(--surface-3);border-radius:100px;overflow:hidden;}
        .balance-bar-fill{height:100%;border-radius:100px;transition:width 0.5s ease;}
        .balance-glow{position:absolute;bottom:-30px;right:-30px;width:80px;height:80px;border-radius:50%;opacity:0.06;pointer-events:none;}

        .empty-state{padding:3.5rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.8rem;}

        .toast{position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;background:var(--surface);border:1px solid var(--green-border);border-radius:16px;padding:1rem 1.4rem;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;max-width:340px;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .toast-icon{width:34px;height:34px;border-radius:10px;flex-shrink:0;background:var(--green-bg);border:1px solid var(--green-border);display:flex;align-items:center;justify-content:center;}
        .toast-title{font-size:0.82rem;font-weight:800;color:var(--text-primary);margin-bottom:2px;}
        .toast-sub{font-size:0.7rem;font-family:'JetBrains Mono',monospace;color:var(--text-muted);}
        .toast-close{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:2px;margin-left:auto;}

        .policy-note{padding:1rem 1.2rem;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;font-size:0.72rem;color:var(--text-secondary);line-height:1.8;margin-top:1.5rem;}
      `}</style>

      {/* Toast */}
      {successId&&(
        <div className="toast">
          <div className="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div>
            <div className="toast-title">Application Submitted</div>
            <div className="toast-sub">{successId} · Pending approval</div>
          </div>
          <button className="toast-close" onClick={()=>setSuccessId(null)}>✕</button>
        </div>
      )}

      <div className="lp-root">
        <div className="lp-inner">

          {/* Header */}
          <div className="lp-header">
            <div>
              <h1 className="lp-title">Leave Management</h1>
              <p className="lp-subtitle">Apply · Track · Review</p>
            </div>
            <div>
              <div className="lp-user-name">{employeeName||"—"}</div>
              <div className="lp-user-id">#{employeeId||"Loading…"}</div>
            </div>
          </div>

          {/* Summary */}
          <div className="sum-strip">
            {[
              {label:"Pending",val:totalPending,color:"var(--yellow)",ib:"rgba(251,191,36,0.1)",ibc:"rgba(251,191,36,0.2)",ic:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>},
              {label:"Approved",val:totalApproved,color:"var(--green)",ib:"var(--green-bg)",ibc:"var(--green-border)",ic:<><polyline points="20 6 9 17 4 12"/></>},
              {label:"Days Used",val:totalDaysUsed,color:"var(--accent)",ib:"var(--accent-soft)",ibc:"var(--accent-border)",ic:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>},
            ].map((s,i)=>(
              <div className="sum-card" key={i}>
                <div className="sum-icon" style={{background:s.ib,border:`1px solid ${s.ibc}`}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.ic}</svg>
                </div>
                <div><div className="sum-label">{s.label}</div><div className="sum-val" style={{color:s.color}}>{s.val}</div></div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="tabs-row">
            <button className={`tab-btn ${activeTab==="apply"?"active":""}`} onClick={()=>setActiveTab("apply")}>Apply Leave</button>
            <button className={`tab-btn ${activeTab==="history"?"active":""}`} onClick={()=>setActiveTab("history")}>
              My Leaves {totalPending>0&&<span className="tab-badge">{totalPending}</span>}
            </button>
            <button className={`tab-btn ${activeTab==="balance"?"active":""}`} onClick={()=>setActiveTab("balance")}>Balance</button>
          </div>

          {/* ═══ APPLY TAB ═══ */}
          {activeTab==="apply"&&(
            <div className="lp-card">
              <div className="section-label">Select Leave Type</div>

              <div className="leave-type-grid">
                {LEAVE_TYPES.map(type=>(
                  <button key={type} className={`leave-type-btn ${leaveType===type?"active":""}`}
                    style={leaveType===type?{background:LEAVE_COLORS[type],borderColor:LEAVE_COLORS[type]}:{}}
                    onClick={()=>setLeaveType(type)}>
                    <span className="leave-type-dot" style={{background:leaveType===type?"rgba(255,255,255,0.6)":LEAVE_COLORS[type]}}/>
                    {type}
                  </button>
                ))}
              </div>

              {/* Balance indicator */}
              {selBal&&(
                <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"0.6rem 0.9rem",background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"10px",marginBottom:"1.25rem",fontSize:"0.75rem",color:"var(--text-secondary)"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",color:LEAVE_COLORS[leaveType],fontWeight:700}}>{available}</span>
                  <span style={{color:"var(--text-muted)"}}>days available</span>
                  <span style={{flex:1}}/>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.65rem",color:"var(--text-muted)"}}>{selBal.used} used · {selBal.pending} pending</span>
                </div>
              )}

              <div className="form-grid-2" style={{marginBottom:0}}>
                <div className="form-field">
                  <label className="form-label">From Date</label>
                  <input type="date" className="form-input" value={fromDate} min={new Date().toISOString().split("T")[0]}
                    onChange={e=>{setFromDate(e.target.value);if(toDate&&e.target.value>toDate)setToDate("");}}/>
                </div>
                <div className="form-field">
                  <label className="form-label">To Date</label>
                  <input type="date" className="form-input" value={toDate} min={fromDate||new Date().toISOString().split("T")[0]}
                    onChange={e=>setToDate(e.target.value)}/>
                </div>
              </div>

              {fromDate&&toDate&&(
                <div className="day-counter-row">
                  <div className="day-counter-left">
                    {fmt(fromDate)} → {fmt(toDate)}
                    {leaveType!=="Unpaid"&&days>available&&(
                      <div className="day-warning">⚠ Exceeds available balance by {days-available} day{days-available>1?"s":""}</div>
                    )}
                  </div>
                  <div className="day-counter-right">
                    <span className="day-count" style={{color:LEAVE_COLORS[leaveType]}}>{days}</span>
                    <span className="day-count-label">day{days!==1?"s":""}</span>
                  </div>
                </div>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:"1rem",marginTop:"0.25rem"}}>
                <div className="form-field">
                  <label className="form-label">Reason for Leave</label>
                  <textarea className="form-textarea" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Briefly describe the reason for your leave request…"/>
                </div>
                <div className="form-field" style={{maxWidth:"320px"}}>
                  <label className="form-label">Contact During Leave (optional)</label>
                  <input className="form-input" value={contactNo} onChange={e=>setContactNo(e.target.value)} placeholder="+91 XXXXX XXXXX"/>
                </div>
              </div>

              {submitError&&<div className="error-box">{submitError}</div>}

              <div className="form-submit-row" style={{marginTop:"1.5rem"}}>
                <button className="btn-ghost" onClick={()=>{setFromDate("");setToDate("");setReason("");setContactNo("");setSubmitError("");}}>Clear</button>
                <button className="btn-primary" disabled={submitting||!fromDate||!toDate||!reason.trim()||days===0} onClick={handleApply}>
                  {submitting?<><span className="spinner"/> Submitting…</>:"Submit Application"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {activeTab==="history"&&(
            <div className="lp-card">
              <div className="section-label">Leave Applications</div>
              <div className="filter-row">
                {(["All","Pending","Approved","Rejected"] as const).map(s=>(
                  <button key={s} className={`fp ${filterStatus===s?"active":""}`} onClick={()=>setFilterStatus(s)}>
                    {s}{s!=="All"&&<span style={{marginLeft:"5px",fontFamily:"'JetBrains Mono',monospace",opacity:0.7}}>{history.filter(h=>h.status===s).length}</span>}
                  </button>
                ))}
              </div>
              {loadingHist?(
                <div style={{textAlign:"center",padding:"2rem",color:"var(--text-muted)",fontSize:"0.78rem"}}>Loading…</div>
              ):filteredHistory.length===0?(
                <div className="empty-state">No {filterStatus!=="All"?filterStatus.toLowerCase():""} leave applications found.</div>
              ):(
                <div className="leave-card-list">
                  {filteredHistory.map(leave=>{
                    const sc=STATUS_CFG[leave.status];
                    const color=LEAVE_COLORS[leave.type];
                    return(
                      <div className="leave-card" key={leave.id}>
                        <div className="leave-card-accent" style={{background:color}}/>
                        <div className="leave-card-body">
                          <div className="leave-card-top">
                            <span className="leave-card-type" style={{color}}>{leave.type}</span>
                            <span className="leave-card-id">{leave.id}</span>
                          </div>
                          <div className="leave-card-dates">
                            {fmt(leave.from)}{leave.from!==leave.to&&<> → {fmt(leave.to)}</>}
                          </div>
                          <div className="leave-card-reason">{leave.reason}</div>
                          {leave.remarks&&<div className="leave-card-remarks">Remarks: {leave.remarks}</div>}
                          <div className="leave-card-applied">Applied: {fmt(leave.appliedOn)}</div>
                        </div>
                        <div className="leave-card-right">
                          <div className="status-chip" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}>
                            <span className="status-dot"/>{leave.status}
                          </div>
                          <div className="days-chip">{leave.days}d</div>
                          {leave.status==="Pending"&&(
                            <button className="cancel-btn" disabled={cancelling===leave.id} onClick={()=>handleCancel(leave.id)}>
                              {cancelling===leave.id?<span className="spinner" style={{borderTopColor:"var(--red)",borderColor:"rgba(248,113,113,0.3)"}}/>:"Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ BALANCE TAB ═══ */}
          {activeTab==="balance"&&(
            <div className="lp-card">
              <div className="section-label">Leave Balance Overview</div>
              <div className="balance-grid">
                {balances.map(b=>{
                  const color=LEAVE_COLORS[b.type];
                  const usedPct=b.total>0?((b.used+b.pending)/b.total)*100:0;
                  const avail=b.total-b.used-b.pending;
                  return(
                    <div className="balance-card" key={b.type}>
                      <div className="balance-top">
                        <div className="balance-type" style={{color}}>
                          <span className="balance-dot" style={{background:color}}/>{b.type}
                        </div>
                        <div className="balance-total-label">{b.total} Total</div>
                      </div>
                      <div className="balance-nums">
                        <div className="balance-num-item"><div className="balance-num" style={{color}}>{avail}</div><div className="balance-num-label">Available</div></div>
                        <div className="balance-num-item"><div className="balance-num" style={{color:"var(--text-secondary)"}}>{b.used}</div><div className="balance-num-label">Used</div></div>
                        <div className="balance-num-item"><div className="balance-num" style={{color:"var(--yellow)"}}>{b.pending}</div><div className="balance-num-label">Pending</div></div>
                      </div>
                      <div className="balance-bar-track"><div className="balance-bar-fill" style={{width:`${Math.min(usedPct,100)}%`,background:color}}/></div>
                      <div className="balance-glow" style={{background:color}}/>
                    </div>
                  );
                })}
              </div>
              <div className="policy-note">
                <span style={{color:"var(--orange)",fontWeight:700}}>📋 Leave Policy</span><br/>
                • Casual &amp; Sick leaves are credited at the start of each year.<br/>
                • Earned leaves accrue monthly (1.25 days/month).<br/>
                • Unused Casual leaves lapse at year end. Earned leaves carry forward up to 45 days.<br/>
                • Compensatory off must be availed within 60 days of accrual.
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}