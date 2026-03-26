"use client";

import { useEffect, useState } from "react";

interface AttendanceRecord {
  id:string; clockIn:string; clockOut?:string;
  projectCode?:string; projectName?:string; timesheet?:string;
}
interface LeaveRecord {
  id:string; type:string; from:string; to:string; days:number;
  reason:string; status:"Pending"|"Approved"|"Rejected";
  appliedOn:string; remarks?:string;
}
interface ExpenseRecord {
  id:string; date:string; description:string; category:string;
  amount:number; status:"Pending"|"Approved"|"Rejected";
  projectCode?:string; billUrls:string[]; remarks?:string;
}

function fmt(d:string) {
  if(!d) return "—";
  return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d));
}
function fmtTime(d:string) {
  return new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"}).format(new Date(d));
}
function normalize<T extends Record<string,any>>(obj:T):T {
  if(!obj.status) return obj;
  const map:Record<string,string>={PENDING:"Pending",APPROVED:"Approved",REJECTED:"Rejected"};
  return {...obj, status:map[obj.status]||obj.status};
}

const LEAVE_COLORS:Record<string,string>={
  CASUAL:"#7c6af7",Casual:"#7c6af7",SICK:"#f87171",Sick:"#f87171",
  EARNED:"#22d3a2",Earned:"#22d3a2",UNPAID:"#9999b5",Unpaid:"#9999b5",
  MATERNITY:"#f97316",Maternity:"#f97316",PATERNITY:"#38bdf8",Paternity:"#38bdf8",
  COMPENSATORY:"#fbbf24",Compensatory:"#fbbf24",
};
const STATUS_CFG:Record<string,{color:string;bg:string;border:string}>={
  Pending: {color:"#fbbf24",bg:"rgba(251,191,36,0.1)", border:"rgba(251,191,36,0.2)"},
  Approved:{color:"#22d3a2",bg:"rgba(34,211,162,0.1)", border:"rgba(34,211,162,0.2)"},
  Rejected:{color:"#f87171",bg:"rgba(248,113,113,0.1)",border:"rgba(248,113,113,0.2)"},
};

export default function AdminEmployeeDetail({ params }:any) {
  const [employeeId, setEmployeeId] = useState<string|null>(null);
  const [employee,   setEmployee]   = useState<any>(null);
  const [records,    setRecords]    = useState<AttendanceRecord[]>([]);
  const [leaves,     setLeaves]     = useState<LeaveRecord[]>([]);
  const [expenses,   setExpenses]   = useState<ExpenseRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<"attendance"|"leaves"|"expenses">("attendance");

  const [leaveRemarksMap,   setLeaveRemarksMap]   = useState<Record<string,string>>({});
  const [expRemarksMap,     setExpRemarksMap]     = useState<Record<string,string>>({});
  const [leaveActioning,    setLeaveActioning]    = useState<string|null>(null);
  const [expActioning,      setExpActioning]      = useState<string|null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<string|null>(null);
  const [viewBillUrls,      setViewBillUrls]      = useState<string[]|null>(null);
  const [toastMsg,          setToastMsg]          = useState("");

  function toast(msg:string) { setToastMsg(msg); setTimeout(()=>setToastMsg(""),3000); }

  useEffect(()=>{ async function p(){ const r=await params; setEmployeeId(r.employeeId); } p(); },[params]);

  useEffect(()=>{
    if(!employeeId) return;
    async function load() {
      const [attRes, leaveRes, expRes] = await Promise.all([
        fetch(`/api/admin/employee/${employeeId}`),
        fetch(`/api/admin/leaves?employeeId=${employeeId}`),
        fetch(`/api/admin/expenses?employeeId=${employeeId}`),
      ]);
      const [attData, leaveData, expData] = await Promise.all([
        attRes.json(), leaveRes.json(), expRes.json(),
      ]);
      setEmployee(attData.employee || null);
      setRecords(attData.records   || []);
      setLeaves((leaveData.leaves   ||[]).map((l:any)=>normalize({
        ...l, type: l.type.charAt(0)+l.type.slice(1).toLowerCase(),
      })));
      setExpenses((expData.expenses ||[]).map(normalize));
      setLoading(false);
    }
    load();
  },[employeeId]);

  // ── Leave action ──
  async function actionLeave(id:string, status:"Approved"|"Rejected") {
    setLeaveActioning(id);
    const res  = await fetch("/api/admin/leaves",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:status.toUpperCase(),remarks:leaveRemarksMap[id]||null})});
    const data = await res.json();
    if(data.success){
      setLeaves(prev=>prev.map(l=>l.id===id?{...l,status,remarks:leaveRemarksMap[id]||l.remarks}:l));
      toast(`Leave ${status.toLowerCase()}`);
    }
    setLeaveActioning(null);
  }

  // ── Expense action ──
  async function actionExpense(id:string, status:"Approved"|"Rejected") {
    setExpActioning(id);
    const res  = await fetch("/api/admin/expenses",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:status.toUpperCase(),remarks:expRemarksMap[id]||null})});
    const data = await res.json();
    if(data.success){
      setExpenses(prev=>prev.map(e=>e.id===id?{...e,status,remarks:expRemarksMap[id]||e.remarks}:e));
      toast(`Expense ${status.toLowerCase()}`);
    }
    setExpActioning(null);
  }

  // ── Stats ──
  const totalSecs = records.reduce((a,r)=>{
    if(r.clockIn&&r.clockOut) a+=(new Date(r.clockOut).getTime()-new Date(r.clockIn).getTime())/1000;
    return a;
  },0);
  const totalHours   = `${Math.floor(totalSecs/3600)}h ${Math.floor((totalSecs%3600)/60)}m`;
  const pendingLeaves = leaves.filter(l=>l.status==="Pending").length;
  const totalExpAmt  = expenses.reduce((a,e)=>a+e.amount,0);

  if(loading) return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",color:"var(--text-muted)"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
        <div style={{width:"32px",height:"32px",border:"2px solid var(--surface-3)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root,[data-theme="dark"]{
          --bg:#0a0a0f;--surface:#111118;--surface-2:#16161f;--surface-3:#1c1c28;
          --border:rgba(255,255,255,0.06);--border-hover:rgba(255,255,255,0.13);
          --accent:#7c6af7;--accent-soft:rgba(124,106,247,0.12);--accent-border:rgba(124,106,247,0.2);--accent-glow:rgba(124,106,247,0.25);
          --green:#22d3a2;--green-bg:rgba(34,211,162,0.1);--green-border:rgba(34,211,162,0.2);
          --orange:#f97316;--red:#f87171;--yellow:#fbbf24;
          --text-primary:#f0f0f8;--text-secondary:#8888aa;--text-muted:#44445a;
          --modal-overlay:rgba(0,0,0,0.75);
        }
        [data-theme="light"]{
          --bg:#f4f5f9;--surface:#ffffff;--surface-2:#f0f1f6;--surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.08);--border-hover:rgba(0,0,0,0.15);
          --accent:#6355e8;--accent-soft:rgba(99,85,232,0.08);--accent-border:rgba(99,85,232,0.2);--accent-glow:rgba(99,85,232,0.2);
          --green:#0fa87a;--green-bg:rgba(15,168,122,0.08);--green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a;--red:#dc2626;--yellow:#d97706;
          --text-primary:#0f0f1a;--text-secondary:#555570;--text-muted:#9999b5;
          --modal-overlay:rgba(0,0,0,0.35);
        }
        *{transition:background-color 0.25s ease,border-color 0.25s ease,color 0.25s ease;}
        .ap-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:'Syne',sans-serif;padding:2.5rem 2rem 4rem;}
        .ap-inner{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:1.75rem;}
        .ap-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:1.5rem;border-bottom:1px solid var(--border);}
        .ap-title{font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:5px;}
        .ap-subtitle{font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;}
        .back-btn{display:flex;align-items:center;gap:7px;padding:0.55rem 1rem;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text-secondary);font-size:0.78rem;font-weight:600;cursor:pointer;text-decoration:none;transition:all 0.18s;}
        .back-btn:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .profile-card{display:flex;align-items:center;gap:1.25rem;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:1.5rem 1.75rem;}
        .profile-avatar{width:54px;height:54px;border-radius:14px;background:var(--accent);box-shadow:0 0 20px var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;color:#fff;flex-shrink:0;}
        .profile-name{font-size:1.1rem;font-weight:800;margin-bottom:3px;}
        .profile-email{font-size:0.78rem;color:var(--text-secondary);margin-bottom:2px;}
        .profile-id{font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--text-muted);}
        .profile-badges{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;}
        .profile-badge{display:flex;flex-direction:column;align-items:center;padding:0.6rem 1rem;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;min-width:80px;}
        .profile-badge-val{font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:800;line-height:1;margin-bottom:3px;}
        .profile-badge-label{font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .tabs-row{display:flex;gap:5px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:5px;}
        .tab-btn{flex:1;padding:0.6rem 1rem;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;border:none;cursor:pointer;transition:all 0.18s;color:var(--text-muted);background:transparent;}
        .tab-btn:hover{color:var(--text-secondary);background:var(--surface-2);}
        .tab-btn.active{background:var(--accent);color:#fff;box-shadow:0 0 16px var(--accent-glow);}
        .tab-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:rgba(255,255,255,0.2);font-size:0.58rem;font-weight:800;margin-left:6px;vertical-align:middle;padding:0 4px;}
        .tab-btn:not(.active) .tab-count{background:var(--surface-3);color:var(--text-muted);}
        .ap-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:1.75rem;}
        .section-label{font-size:0.6rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:1.25rem;}
        .table-wrap{overflow-x:auto;border-radius:14px;border:1px solid var(--border);}
        .ap-table{width:100%;border-collapse:collapse;min-width:700px;}
        .ap-table thead tr{border-bottom:1px solid var(--border);background:var(--surface-2);}
        .ap-table th{padding:0.8rem 1.1rem;text-align:left;font-size:0.58rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;white-space:nowrap;}
        .ap-table tbody tr{border-bottom:1px solid var(--border);transition:background 0.15s;}
        .ap-table tbody tr:last-child{border-bottom:none;}
        .ap-table tbody tr:hover{background:var(--surface-2);}
        .ap-table td{padding:0.85rem 1.1rem;vertical-align:middle;font-size:0.8rem;}
        .td-mono{font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-secondary);}
        .td-bold{font-weight:700;color:var(--text-primary);}
        .td-muted{color:var(--text-muted);font-size:0.75rem;}
        .td-accent{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);}
        .sc{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:100px;font-size:0.6rem;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;border:1px solid;white-space:nowrap;}
        .sc-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
        .lv-type{display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:800;}
        .lv-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
        .action-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
        .btn-approve{padding:4px 12px;border-radius:8px;font-size:0.68rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid var(--green-border);background:var(--green-bg);color:var(--green);transition:all 0.18s;}
        .btn-approve:hover:not(:disabled){filter:brightness(1.15);}
        .btn-approve:disabled{opacity:0.45;cursor:not-allowed;}
        .btn-reject{padding:4px 12px;border-radius:8px;font-size:0.68rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid rgba(248,113,113,0.2);background:rgba(248,113,113,0.08);color:var(--red);transition:all 0.18s;}
        .btn-reject:hover:not(:disabled){filter:brightness(1.15);}
        .btn-reject:disabled{opacity:0.45;cursor:not-allowed;}
        .btn-view{padding:4px 11px;border-radius:8px;font-size:0.68rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid var(--accent-border);background:var(--accent-soft);color:var(--accent);transition:all 0.18s;}
        .remarks-input{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.72rem;padding:4px 9px;border-radius:8px;outline:none;width:130px;}
        .remarks-input:focus{border-color:var(--accent-border);}
        .remarks-input::placeholder{color:var(--text-muted);}
        .exp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;}
        .exp-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:1rem 1.2rem;}
        .exp-stat-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:6px;}
        .exp-stat-val{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:800;line-height:1;}
        .empty-state{padding:3rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.8rem;}
        .modal-overlay{position:fixed;inset:0;background:var(--modal-overlay);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:999;animation:fadeBg 0.2s ease;}
        @keyframes fadeBg{from{opacity:0}to{opacity:1}}
        .modal-box{background:var(--surface);border:1px solid var(--border-hover);border-radius:22px;width:520px;max-width:calc(100vw - 2rem);padding:2rem;animation:slideUp 0.25s ease;max-height:90vh;overflow-y:auto;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;}
        .modal-title{font-size:1rem;font-weight:800;}
        .modal-close{width:32px;height:32px;border-radius:8px;background:var(--surface-3);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:all 0.18s;}
        .modal-close:hover{color:var(--text-primary);}
        .modal-footer{display:flex;justify-content:flex-end;margin-top:1.5rem;}
        .btn-mc{padding:0.65rem 1.3rem;border-radius:10px;background:var(--surface-3);border:1px solid var(--border);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;cursor:pointer;}
        .ts-body{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:1.25rem;font-size:0.8rem;line-height:1.7;color:var(--text-secondary);white-space:pre-line;min-height:80px;font-family:'JetBrains Mono',monospace;margin-bottom:1.5rem;}
        .toast{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1099;padding:0.75rem 1.25rem;border-radius:12px;background:var(--green);color:#fff;font-family:'Syne',sans-serif;font-size:0.8rem;font-weight:700;animation:slideUp 0.25s ease;box-shadow:0 8px 32px rgba(0,0,0,0.3);}
        .spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {toastMsg&&<div className="toast">{toastMsg}</div>}

      <div className="ap-root">
        <div className="ap-inner">

          {/* Header */}
          <div className="ap-header">
            <div>
              <h1 className="ap-title">Employee Analytics</h1>
              <p className="ap-subtitle">Malus Robotics · Admin Panel</p>
            </div>
            <a href="/admin" className="back-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="11" y1="7" x2="3" y2="7"/><polyline points="6 4 3 7 6 10"/></svg>
              All Employees
            </a>
          </div>

          {/* Profile */}
          {employee&&(
            <div className="profile-card">
              <div className="profile-avatar">{employee.name?.[0]?.toUpperCase()}</div>
              <div>
                <div className="profile-name">{employee.name}</div>
                <div className="profile-email">{employee.email}</div>
                <div className="profile-id">#{employee.employeeId}</div>
              </div>
              <div className="profile-badges">
                <div className="profile-badge"><span className="profile-badge-val" style={{color:"var(--accent)"}}>{records.length}</span><span className="profile-badge-label">Sessions</span></div>
                <div className="profile-badge"><span className="profile-badge-val" style={{color:"var(--green)"}}>{totalHours}</span><span className="profile-badge-label">Hours</span></div>
                <div className="profile-badge"><span className="profile-badge-val" style={{color:"var(--yellow)"}}>{pendingLeaves}</span><span className="profile-badge-label">Pending</span></div>
                <div className="profile-badge"><span className="profile-badge-val" style={{color:"var(--orange)"}}>₹{(totalExpAmt/1000).toFixed(1)}k</span><span className="profile-badge-label">Expenses</span></div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs-row">
            {([
              {key:"attendance",label:"Attendance",count:records.length},
              {key:"leaves",    label:"Leaves",    count:pendingLeaves},
              {key:"expenses",  label:"Expenses",  count:expenses.filter(e=>e.status==="Pending").length},
            ] as const).map(t=>(
              <button key={t.key} className={`tab-btn ${activeTab===t.key?"active":""}`} onClick={()=>setActiveTab(t.key)}>
                {t.label}{t.count>0&&<span className="tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* ════ ATTENDANCE ════ */}
          {activeTab==="attendance"&&(
            <div className="ap-card">
              <div className="section-label">Attendance Records — {records.length} sessions</div>
              {records.length===0?<div className="empty-state">No attendance records found.</div>:(
                <div className="table-wrap">
                  <table className="ap-table">
                    <thead><tr><th>Date</th><th>Project Code</th><th>Project Name</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Timesheet</th></tr></thead>
                    <tbody>
                      {records.map(r=>{
                        let dur="—";
                        if(r.clockIn&&r.clockOut){ const s=(new Date(r.clockOut).getTime()-new Date(r.clockIn).getTime())/1000; dur=`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`; }
                        return(
                          <tr key={r.id}>
                            <td className="td-mono">{fmt(r.clockIn)}</td>
                            <td className="td-accent">{r.projectCode||"—"}</td>
                            <td className="td-bold">{r.projectName||"—"}</td>
                            <td className="td-mono">{fmtTime(r.clockIn)}</td>
                            <td className="td-mono">{r.clockOut?fmtTime(r.clockOut):<span style={{color:"var(--orange)",fontFamily:"'JetBrains Mono',monospace",fontSize:"0.68rem"}}>Active</span>}</td>
                            <td className="td-accent">{dur}</td>
                            <td>{r.timesheet?<button className="btn-view" onClick={()=>setSelectedTimesheet(r.timesheet!)}>View</button>:<span className="td-muted">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ LEAVES ════ */}
          {activeTab==="leaves"&&(
            <div className="ap-card">
              <div className="section-label">Leave Applications — {leaves.length} total · {pendingLeaves} pending</div>
              {leaves.length===0?<div className="empty-state">No leave applications found.</div>:(
                <div className="table-wrap">
                  <table className="ap-table">
                    <thead><tr><th>Type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {leaves.map(l=>{
                        const sc=STATUS_CFG[l.status];
                        const lc=LEAVE_COLORS[l.type]||"#7c6af7";
                        const isActioning=leaveActioning===l.id;
                        return(
                          <tr key={l.id}>
                            <td><span className="lv-type" style={{color:lc}}><span className="lv-dot" style={{background:lc}}/>{l.type}</span></td>
                            <td className="td-mono" style={{fontSize:"0.7rem",lineHeight:1.5}}>{fmt(l.from)}{l.from!==l.to&&<><br/>→ {fmt(l.to)}</>}</td>
                            <td className="td-accent">{l.days}d</td>
                            <td style={{maxWidth:"200px",fontSize:"0.75rem",color:"var(--text-secondary)",lineHeight:1.4}}>
                              {l.reason}
                              {l.remarks&&<div style={{color:"var(--red)",fontSize:"0.68rem",marginTop:"3px",fontStyle:"italic"}}>"{l.remarks}"</div>}
                            </td>
                            <td className="td-mono">{fmt(l.appliedOn)}</td>
                            <td><span className="sc" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}><span className="sc-dot"/>{l.status}</span></td>
                            <td>
                              {l.status==="Pending"?(
                                <div className="action-row">
                                  <input className="remarks-input" placeholder="Remarks…" value={leaveRemarksMap[l.id]||""} onChange={e=>setLeaveRemarksMap(p=>({...p,[l.id]:e.target.value}))}/>
                                  <button className="btn-approve" disabled={isActioning} onClick={()=>actionLeave(l.id,"Approved")}>{isActioning?<span className="spinner"/>:"Approve"}</button>
                                  <button className="btn-reject"  disabled={isActioning} onClick={()=>actionLeave(l.id,"Rejected")}>{isActioning?<span className="spinner"/>:"Reject"}</button>
                                </div>
                              ):<span className="td-muted">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ EXPENSES ════ */}
          {activeTab==="expenses"&&(
            <div className="ap-card">
              <div className="exp-stats">
                <div className="exp-stat"><div className="exp-stat-label">Total Claimed</div><div className="exp-stat-val" style={{color:"var(--accent)"}}>₹{totalExpAmt.toLocaleString("en-IN")}</div></div>
                <div className="exp-stat"><div className="exp-stat-label">Approved</div><div className="exp-stat-val" style={{color:"var(--green)"}}>₹{expenses.filter(e=>e.status==="Approved").reduce((a,e)=>a+e.amount,0).toLocaleString("en-IN")}</div></div>
                <div className="exp-stat"><div className="exp-stat-label">Pending</div><div className="exp-stat-val" style={{color:"var(--yellow)"}}>{expenses.filter(e=>e.status==="Pending").length} items</div></div>
              </div>
              <div className="section-label">Expense Line Items</div>
              {expenses.length===0?<div className="empty-state">No expense records found.</div>:(
                <div className="table-wrap">
                  <table className="ap-table">
                    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Project</th><th>Amount</th><th>Bills</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {expenses.map(e=>{
                        const sc=STATUS_CFG[e.status];
                        const isActioning=expActioning===e.id;
                        return(
                          <tr key={e.id}>
                            <td className="td-mono">{fmt(e.date)}</td>
                            <td style={{fontSize:"0.78rem",maxWidth:"180px",lineHeight:1.4}}>{e.description}</td>
                            <td className="td-muted">{e.category}</td>
                            <td className="td-accent">{e.projectCode||"—"}</td>
                            <td style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>₹{e.amount.toLocaleString("en-IN")}</td>
                            <td>
                              {e.billUrls?.length>0
                                ?<button className="btn-view" onClick={()=>setViewBillUrls(e.billUrls)}>{e.billUrls.length} bill{e.billUrls.length!==1?"s":""}</button>
                                :<span style={{fontSize:"0.62rem",color:"var(--red)",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>✗ None</span>
                              }
                            </td>
                            <td>
                              <span className="sc" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}><span className="sc-dot"/>{e.status}</span>
                              {e.remarks&&<div style={{fontSize:"0.6rem",color:"var(--red)",marginTop:"3px",fontStyle:"italic",fontFamily:"'JetBrains Mono',monospace"}}>"{e.remarks}"</div>}
                            </td>
                            <td>
                              {e.status==="Pending"?(
                                <div className="action-row">
                                  <input className="remarks-input" placeholder="Remarks…" value={expRemarksMap[e.id]||""} onChange={ev=>setExpRemarksMap(p=>({...p,[e.id]:ev.target.value}))}/>
                                  <button className="btn-approve" disabled={isActioning} onClick={()=>actionExpense(e.id,"Approved")}>{isActioning?<span className="spinner"/>:"Approve"}</button>
                                  <button className="btn-reject"  disabled={isActioning} onClick={()=>actionExpense(e.id,"Rejected")}>{isActioning?<span className="spinner"/>:"Reject"}</button>
                                </div>
                              ):<span className="td-muted">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Timesheet Modal */}
      {selectedTimesheet!==null&&(
        <div className="modal-overlay" onClick={()=>setSelectedTimesheet(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Timesheet Notes</div><button className="modal-close" onClick={()=>setSelectedTimesheet(null)}>✕</button></div>
            <div className="ts-body">{selectedTimesheet||"No notes provided."}</div>
            <div className="modal-footer"><button className="btn-mc" onClick={()=>setSelectedTimesheet(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Bill Viewer Modal */}
      {viewBillUrls&&(
        <div className="modal-overlay" onClick={()=>setViewBillUrls(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Attached Bills ({viewBillUrls.length})</div><button className="modal-close" onClick={()=>setViewBillUrls(null)}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"1.5rem"}}>
              {viewBillUrls.map((url,i)=>{
                const isPdf=url.toLowerCase().endsWith(".pdf");
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"0.65rem 0.9rem",background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"10px"}}>
                    {isPdf
                      ?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      :<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    }
                    <span style={{flex:1,fontSize:"0.75rem",color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url.split("/").pop()||`Bill ${i+1}`}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{padding:"4px 12px",borderRadius:"7px",fontSize:"0.66rem",fontWeight:700,fontFamily:"'Syne',sans-serif",border:"1px solid var(--accent-border)",background:"var(--accent-soft)",color:"var(--accent)",textDecoration:"none"}}>View</a>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer"><button className="btn-mc" onClick={()=>setViewBillUrls(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}