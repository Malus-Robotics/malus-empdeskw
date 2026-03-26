"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee { id:string; employeeId:string; name:string; email:string; department?:string; }
interface Project  { id:string; code:string; name:string; client?:string; status:"Active"|"Inactive"|"Completed"; createdAt:string; }
interface BillFile { name:string; url:string; type:"image"|"pdf"; }
interface ExpenseItem {
  id:string; employeeId:string; employeeName:string; date:string;
  description:string; category:string; projectCode:string; amount:number;
  status:"Pending"|"Approved"|"Rejected"; billUrls:string[]; submittedOn:string; remarks?:string;
}
interface LeaveRecord {
  id:string; employeeId:string; employeeName:string;
  type:string; from:string; to:string; days:number;
  reason:string; status:"Pending"|"Approved"|"Rejected";
  appliedOn:string; remarks?:string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d:string) {
  if(!d) return "—";
  return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d));
}

function normalize<T extends Record<string,any>>(obj:T): T {
  // DB returns uppercase enums (PENDING/APPROVED/REJECTED/ACTIVE etc.)
  // UI expects title-case. Normalize status field only.
  if(!obj.status) return obj;
  const map:Record<string,string> = {
    PENDING:"Pending",APPROVED:"Approved",REJECTED:"Rejected",
    ACTIVE:"Active",INACTIVE:"Inactive",COMPLETED:"Completed",
  };
  return { ...obj, status: map[obj.status] || obj.status };
}

const STATUS_CFG:Record<string,{color:string;bg:string;border:string}> = {
  Active:    {color:"#22d3a2",bg:"rgba(34,211,162,0.1)",  border:"rgba(34,211,162,0.2)"},
  Inactive:  {color:"#9999b5",bg:"rgba(153,153,181,0.1)", border:"rgba(153,153,181,0.2)"},
  Completed: {color:"#7c6af7",bg:"rgba(124,106,247,0.1)", border:"rgba(124,106,247,0.2)"},
  Pending:   {color:"#fbbf24",bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.2)"},
  Approved:  {color:"#22d3a2",bg:"rgba(34,211,162,0.1)",  border:"rgba(34,211,162,0.2)"},
  Rejected:  {color:"#f87171",bg:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.2)"},
};

const LEAVE_COLORS:Record<string,string> = {
  CASUAL:"#7c6af7",Casual:"#7c6af7",SICK:"#f87171",Sick:"#f87171",
  EARNED:"#22d3a2",Earned:"#22d3a2",UNPAID:"#9999b5",Unpaid:"#9999b5",
  MATERNITY:"#f97316",Maternity:"#f97316",PATERNITY:"#38bdf8",Paternity:"#38bdf8",
  COMPENSATORY:"#fbbf24",Compensatory:"#fbbf24",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  // ── Nav ──
  const [activeNav, setActiveNav] = useState<"employees"|"projects"|"expenses"|"leaves">("employees");

  // ── Loading/error ──
  const [loading, setLoading]   = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"ok"|"err">("ok");

  function toast(msg:string, type:"ok"|"err"="ok") {
    setToastMsg(msg); setToastType(type);
    setTimeout(()=>setToastMsg(""), 3000);
  }

  // ── Employees ──
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [empSearch, setEmpSearch]   = useState("");
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDept, setNewEmpDept]   = useState("");
  const [addEmpSaving, setAddEmpSaving] = useState(false);
  const [addEmpError, setAddEmpError]   = useState("");

  // ── Projects ──
  const [projects, setProjects]           = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<"All"|"Active"|"Inactive"|"Completed">("All");
  const [showProjModal, setShowProjModal] = useState(false);
  const [editProject, setEditProject]     = useState<Project|null>(null);
  const [deleteProjId, setDeleteProjId]   = useState<string|null>(null);
  const [pCode,setPCode]   = useState("");
  const [pName,setPName]   = useState("");
  const [pClient,setPClient] = useState("");
  const [pStatus,setPStatus] = useState<"Active"|"Inactive"|"Completed">("Active");
  const [pSaving,setPSaving] = useState(false);

  // ── Expenses ──
  const [expenses, setExpenses]               = useState<ExpenseItem[]>([]);
  const [expLoading, setExpLoading]           = useState(false);
  const [expSearch, setExpSearch]             = useState("");
  const [expStatusFilter, setExpStatusFilter] = useState<"All"|"Pending"|"Approved"|"Rejected">("All");
  const [expEmpFilter, setExpEmpFilter]       = useState("All");
  const [expRemarksMap, setExpRemarksMap]     = useState<Record<string,string>>({});
  const [expActioning, setExpActioning]       = useState<string|null>(null);
  const [viewBillUrls, setViewBillUrls]       = useState<string[]|null>(null);

  // ── Leaves ──
  const [leaves, setLeaves]                       = useState<LeaveRecord[]>([]);
  const [leaveLoading, setLeaveLoading]           = useState(false);
  const [leaveSearch, setLeaveSearch]             = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<"All"|"Pending"|"Approved"|"Rejected">("All");
  const [leaveEmpFilter, setLeaveEmpFilter]       = useState("All");
  const [leaveRemarksMap, setLeaveRemarksMap]     = useState<Record<string,string>>({});
  const [leaveActioning, setLeaveActioning]       = useState<string|null>(null);

  // ── Init — auth check + load all data in parallel ──
  useEffect(()=>{
    async function init() {
      const r = await fetch("/api/admin/check");
      const d = await r.json();
      if(!d.authorized){ router.push("/admin/login"); return; }

      const [empRes, projRes, expRes, leaveRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/projects"),
        fetch("/api/admin/expenses"),
        fetch("/api/admin/leaves"),
      ]);

      const [empData, projData, expData, leaveData] = await Promise.all([
        empRes.json(), projRes.json(), expRes.json(), leaveRes.json(),
      ]);

      setEmployees(empData.data || []);
      setProjects((projData.projects || []).map(normalize));
      setExpenses((expData.expenses || []).map((e:any) => normalize({
        ...e,
        employeeName: e.employee?.name || e.employeeId,
        billUrls:     e.billUrls || [],
      })));
      setLeaves((leaveData.leaves || []).map((l:any) => normalize({
        ...l,
        employeeName: l.employee?.name || l.employeeId,
        type: l.type.charAt(0) + l.type.slice(1).toLowerCase(),
      })));
      setLoading(false);
    }
    init();
  },[]);

  async function reloadExpenses() {
    setExpLoading(true);
    const r = await fetch("/api/admin/expenses");
    const d = await r.json();
    setExpenses((d.expenses||[]).map((e:any)=>normalize({
      ...e, employeeName:e.employee?.name||e.employeeId, billUrls:e.billUrls||[],
    })));
    setExpLoading(false);
  }

  async function reloadLeaves() {
    setLeaveLoading(true);
    const r = await fetch("/api/admin/leaves");
    const d = await r.json();
    setLeaves((d.leaves||[]).map((l:any)=>normalize({
      ...l, employeeName:l.employee?.name||l.employeeId,
      type: l.type.charAt(0)+l.type.slice(1).toLowerCase(),
    })));
    setLeaveLoading(false);
  }

  // ── Filters ──
  const filteredEmp = employees.filter(e=>
    e.name?.toLowerCase().includes(empSearch.toLowerCase())||
    e.employeeId?.toLowerCase().includes(empSearch.toLowerCase())||
    e.email?.toLowerCase().includes(empSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(p=>{
    const ms = projectFilter==="All" || p.status===projectFilter;
    const mq = p.code.toLowerCase().includes(projectSearch.toLowerCase()) ||
               p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
               (p.client||"").toLowerCase().includes(projectSearch.toLowerCase());
    return ms && mq;
  });

  const uniqueExpEmp   = Array.from(new Set(expenses.map(e=>e.employeeName)));
  const filteredExpenses = expenses.filter(e=>{
    const ms = expStatusFilter==="All" || e.status===expStatusFilter;
    const me = expEmpFilter==="All" || e.employeeName===expEmpFilter;
    const mq = expSearch==="" ||
      e.description?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.employeeName?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.projectCode?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.category?.toLowerCase().includes(expSearch.toLowerCase());
    return ms && me && mq;
  });

  const uniqueLeaveEmp = Array.from(new Set(leaves.map(l=>l.employeeName)));
  const filteredLeaves = leaves.filter(l=>{
    const ms = leaveStatusFilter==="All" || l.status===leaveStatusFilter;
    const me = leaveEmpFilter==="All" || l.employeeName===leaveEmpFilter;
    const mq = leaveSearch==="" ||
      l.employeeName?.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      l.type?.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      l.reason?.toLowerCase().includes(leaveSearch.toLowerCase());
    return ms && me && mq;
  });

  // ── Stats ──
  const activeProjects   = projects.filter(p=>p.status==="Active").length;
  const completedProjects = projects.filter(p=>p.status==="Completed").length;
  const pendingExpenses  = expenses.filter(e=>e.status==="Pending").length;
  const pendingLeaves    = leaves.filter(l=>l.status==="Pending").length;
  const totalApprovedAmt = expenses.filter(e=>e.status==="Approved").reduce((a,e)=>a+e.amount,0);
  const pendingExpAmt    = expenses.filter(e=>e.status==="Pending").reduce((a,e)=>a+e.amount,0);

  // ── Employee CRUD ──
  async function saveEmployee() {
    setAddEmpError("");
    if(!newEmpName.trim()||!newEmpEmail.trim()){ setAddEmpError("Name and email are required."); return; }
    if(!newEmpEmail.trim().toLowerCase().endsWith("@malusrobotics.com")){ setAddEmpError("Must be a @malusrobotics.com email."); return; }
    setAddEmpSaving(true);
    try {
      const res  = await fetch("/api/admin/employees/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newEmpName.trim(),email:newEmpEmail.trim().toLowerCase(),department:newEmpDept.trim()})});
      const data = await res.json();
      if(data.success){ setEmployees(prev=>[data.employee,...prev]); setShowAddEmp(false); setNewEmpName(""); setNewEmpEmail(""); setNewEmpDept(""); toast("Employee created successfully"); }
      else { setAddEmpError(data.error||"Failed to create employee."); }
    } catch { setAddEmpError("Connection error. Please try again."); }
    finally { setAddEmpSaving(false); }
  }

  // ── Project CRUD ──
  function openNewProj()    { setEditProject(null); setPCode(""); setPName(""); setPClient(""); setPStatus("Active"); setShowProjModal(true); }
  function openEditProj(p:Project) { setEditProject(p); setPCode(p.code); setPName(p.name); setPClient(p.client||""); setPStatus(p.status); setShowProjModal(true); }

  async function saveProject() {
    if(!pCode.trim()||!pName.trim()) return;
    setPSaving(true);
    try {
      const isEdit = !!editProject;
      const res = await fetch("/api/admin/projects",{
        method: isEdit ? "PATCH" : "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(isEdit
          ? {id:editProject!.id, code:pCode.trim(), name:pName.trim(), client:pClient.trim()||null, status:pStatus.toUpperCase()}
          : {code:pCode.trim(), name:pName.trim(), client:pClient.trim()||null, status:pStatus.toUpperCase()}
        ),
      });
      const data = await res.json();
      if(data.success) {
        const p = normalize(data.project);
        if(isEdit) setProjects(prev=>prev.map(x=>x.id===p.id?p:x));
        else       setProjects(prev=>[p,...prev]);
        setShowProjModal(false);
        toast(isEdit?"Project updated":"Project created");
      } else { toast(data.error||"Failed to save project","err"); }
    } catch { toast("Connection error","err"); }
    finally { setPSaving(false); }
  }

  async function deleteProject(id:string) {
    try {
      const res  = await fetch(`/api/admin/projects?id=${id}`,{method:"DELETE"});
      const data = await res.json();
      if(data.success){ setProjects(prev=>prev.filter(p=>p.id!==id)); setDeleteProjId(null); toast("Project deleted"); }
      else { toast(data.error||"Failed to delete","err"); }
    } catch { toast("Connection error","err"); }
  }

  // ── Expense actions ──
  async function actionExpense(id:string, status:"Approved"|"Rejected") {
    setExpActioning(id);
    try {
      const res  = await fetch("/api/admin/expenses",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id, status:status.toUpperCase(), remarks:expRemarksMap[id]||null}),
      });
      const data = await res.json();
      if(data.success){ await reloadExpenses(); toast(`Expense ${status.toLowerCase()}`); }
      else { toast(data.error||"Failed","err"); }
    } catch { toast("Connection error","err"); }
    finally { setExpActioning(null); }
  }

  // ── Leave actions ──
  async function actionLeave(id:string, status:"Approved"|"Rejected") {
    setLeaveActioning(id);
    try {
      const res  = await fetch("/api/admin/leaves",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id, status:status.toUpperCase(), remarks:leaveRemarksMap[id]||null}),
      });
      const data = await res.json();
      if(data.success){ await reloadLeaves(); toast(`Leave ${status.toLowerCase()}`); }
      else { toast(data.error||"Failed","err"); }
    } catch { toast("Connection error","err"); }
    finally { setLeaveActioning(null); }
  }

  // ── Loading screen ──
  if(loading) return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",color:"var(--text-muted)"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
        <div style={{width:"32px",height:"32px",border:"2px solid var(--surface-3)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
        <span style={{fontSize:"0.78rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>Loading admin panel…</span>
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
          --modal-overlay:rgba(0,0,0,0.78);--sidebar-w:245px;
        }
        [data-theme="light"]{
          --bg:#f4f5f9;--surface:#ffffff;--surface-2:#f0f1f6;--surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.08);--border-hover:rgba(0,0,0,0.15);
          --accent:#6355e8;--accent-soft:rgba(99,85,232,0.08);--accent-border:rgba(99,85,232,0.2);--accent-glow:rgba(99,85,232,0.2);
          --green:#0fa87a;--green-bg:rgba(15,168,122,0.08);--green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a;--red:#dc2626;--yellow:#d97706;
          --text-primary:#0f0f1a;--text-secondary:#555570;--text-muted:#9999b5;
          --modal-overlay:rgba(0,0,0,0.35);--sidebar-w:245px;
        }
        *{transition:background-color 0.25s ease,border-color 0.25s ease,color 0.25s ease;}
        .ad-layout{display:flex;min-height:100vh;background:var(--bg);font-family:'Syne',sans-serif;color:var(--text-primary);}
        .sidebar{width:var(--sidebar-w);flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow:hidden;}
        .sidebar::before{content:'';position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:160px;height:160px;background:radial-gradient(ellipse,rgba(124,106,247,0.15) 0%,transparent 70%);pointer-events:none;}
        .sb-logo{position:relative;z-index:1;padding:1.4rem 1.3rem 1.3rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;}
        .sb-logo-mark{width:30px;height:30px;border-radius:8px;background:var(--accent);box-shadow:0 0 16px var(--accent-glow);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .sb-logo-mark svg{width:14px;height:14px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;}
        .sb-brand{font-size:0.92rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary);}
        .sb-brand-sub{font-size:0.58rem;font-weight:600;color:var(--accent);letter-spacing:0.12em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
        .sb-nav{flex:1;padding:1.1rem 0.8rem;display:flex;flex-direction:column;gap:3px;position:relative;z-index:1;overflow-y:auto;}
        .sb-section{font-size:0.56rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;padding:0 0.55rem;margin:10px 0 5px;}
        .sb-divider{height:1px;background:var(--border);margin:8px 0.55rem;}
        .nav-btn{display:flex;align-items:center;gap:9px;padding:0.6rem 0.8rem;border-radius:10px;font-size:0.8rem;font-weight:600;color:var(--text-secondary);cursor:pointer;transition:all 0.18s;border:1px solid transparent;position:relative;background:none;width:100%;text-align:left;}
        .nav-btn:hover{background:var(--surface-2);color:var(--text-primary);border-color:var(--border);}
        .nav-btn.active{background:var(--accent-soft);color:var(--accent);border-color:var(--accent-border);}
        .nav-btn.active::before{content:'';position:absolute;left:-0.8rem;top:50%;transform:translateY(-50%);width:3px;height:60%;background:var(--accent);border-radius:0 3px 3px 0;}
        .nav-btn svg{width:15px;height:15px;flex-shrink:0;}
        .nb-count{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:0.58rem;font-weight:700;padding:2px 6px;border-radius:100px;background:var(--surface-3);color:var(--text-muted);}
        .nav-btn.active .nb-count{background:var(--accent-border);color:var(--accent);}
        .nb-count.alert{background:rgba(251,191,36,0.15)!important;color:var(--yellow)!important;}
        .sb-footer{position:relative;z-index:1;padding:0.85rem 0.8rem 1.3rem;border-top:1px solid var(--border);}
        .logout-btn{display:flex;align-items:center;gap:9px;width:100%;padding:0.6rem 0.8rem;border-radius:10px;background:transparent;border:1px solid var(--border);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.18s;}
        .logout-btn:hover{background:rgba(248,113,113,0.08);border-color:rgba(248,113,113,0.25);color:var(--red);}
        .ad-main{flex:1;min-width:0;padding:2.5rem 2rem 4rem;}
        .ad-inner{max-width:1150px;margin:0 auto;display:flex;flex-direction:column;gap:1.75rem;}
        .page-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:1.5rem;border-bottom:1px solid var(--border);}
        .page-title{font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:5px;}
        .page-subtitle{font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1.2rem 1.4rem;display:flex;align-items:center;gap:1rem;}
        .stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .stat-label{font-size:0.58rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;color:var(--text-muted);margin-bottom:4px;}
        .stat-value{font-size:1.5rem;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1;}
        .search-bar{display:flex;align-items:center;gap:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:0.55rem 1rem;}
        .search-icon{color:var(--text-muted);flex-shrink:0;}
        .search-input{flex:1;background:transparent;border:none;outline:none;color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.8rem;min-width:0;}
        .search-input::placeholder{color:var(--text-muted);}
        .search-count{font-family:'JetBrains Mono',monospace;font-size:0.63rem;color:var(--text-muted);flex-shrink:0;}
        .filter-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
        .fp{padding:0.35rem 0.85rem;border-radius:100px;border:1px solid var(--border);font-size:0.7rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all 0.18s;background:var(--surface-2);color:var(--text-muted);}
        .fp:hover{border-color:var(--border-hover);color:var(--text-secondary);}
        .fp.active{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent);}
        .fsel{background:var(--surface-2);border:1px solid var(--border);color:var(--text-secondary);font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:600;padding:0.35rem 0.8rem;border-radius:100px;outline:none;cursor:pointer;}
        .emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:1rem;}
        .emp-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1.3rem;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;}
        .emp-card:hover{border-color:var(--accent-border);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.18);}
        .emp-avatar-row{display:flex;align-items:center;gap:11px;margin-bottom:1rem;}
        .emp-avatar{width:42px;height:42px;border-radius:11px;background:var(--accent);box-shadow:0 0 14px var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:#fff;flex-shrink:0;}
        .emp-name{font-size:0.88rem;font-weight:800;}
        .emp-email{font-size:0.68rem;color:var(--text-secondary);}
        .emp-divider{height:1px;background:var(--border);margin-bottom:0.85rem;}
        .emp-id-label{font-size:0.56rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px;}
        .emp-id-val{font-family:'JetBrains Mono',monospace;font-size:0.78rem;font-weight:700;color:var(--accent);}
        .emp-arrow{position:absolute;bottom:1.1rem;right:1.1rem;color:var(--text-muted);opacity:0;transition:opacity 0.18s;}
        .emp-card:hover .emp-arrow{opacity:1;}
        .project-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:1rem;}
        .project-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1.35rem;position:relative;overflow:hidden;transition:border-color 0.2s;}
        .project-card:hover{border-color:var(--border-hover);}
        .pj-code{font-family:'JetBrains Mono',monospace;font-size:0.66rem;font-weight:700;color:var(--accent);letter-spacing:0.1em;margin-bottom:5px;}
        .pj-name{font-size:0.88rem;font-weight:800;margin-bottom:3px;}
        .pj-client{font-size:0.7rem;color:var(--text-secondary);margin-bottom:0.9rem;}
        .pj-footer{display:flex;align-items:center;justify-content:space-between;padding-top:0.85rem;border-top:1px solid var(--border);}
        .pj-date{font-family:'JetBrains Mono',monospace;font-size:0.58rem;color:var(--text-muted);}
        .pj-actions{display:flex;gap:6px;}
        .sc{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:100px;font-size:0.58rem;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;border:1px solid;white-space:nowrap;}
        .sc-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
        .table-wrap{overflow-x:auto;border-radius:14px;border:1px solid var(--border);}
        .apt{width:100%;border-collapse:collapse;}
        .apt thead tr{border-bottom:1px solid var(--border);background:var(--surface-2);}
        .apt th{padding:0.75rem 0.9rem;text-align:left;font-size:0.56rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;white-space:nowrap;}
        .apt tbody tr{border-bottom:1px solid var(--border);transition:background 0.15s;}
        .apt tbody tr:last-child{border-bottom:none;}
        .apt tbody tr:hover{background:var(--surface-2);}
        .apt td{padding:0.8rem 0.9rem;vertical-align:middle;font-size:0.76rem;}
        .td-mono{font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--text-secondary);}
        .td-bold{font-weight:700;color:var(--text-primary);}
        .td-muted{color:var(--text-muted);font-size:0.7rem;}
        .td-accent{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);}
        .btn-approve{padding:4px 10px;border-radius:7px;font-size:0.66rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid var(--green-border);background:var(--green-bg);color:var(--green);transition:all 0.18s;}
        .btn-approve:hover:not(:disabled){filter:brightness(1.15);}
        .btn-approve:disabled{opacity:0.45;cursor:not-allowed;}
        .btn-reject{padding:4px 10px;border-radius:7px;font-size:0.66rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid rgba(248,113,113,0.2);background:rgba(248,113,113,0.08);color:var(--red);transition:all 0.18s;}
        .btn-reject:hover:not(:disabled){filter:brightness(1.15);}
        .btn-reject:disabled{opacity:0.45;cursor:not-allowed;}
        .btn-view{padding:4px 10px;border-radius:7px;font-size:0.66rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid var(--accent-border);background:var(--accent-soft);color:var(--accent);transition:all 0.18s;}
        .btn-edit{padding:4px 10px;border-radius:7px;font-size:0.66rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid var(--border);background:var(--surface-2);color:var(--text-secondary);transition:all 0.18s;}
        .btn-edit:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .btn-del{padding:4px 10px;border-radius:7px;font-size:0.66rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid rgba(248,113,113,0.2);background:rgba(248,113,113,0.07);color:var(--red);transition:all 0.18s;}
        .btn-new{display:flex;align-items:center;gap:7px;padding:0.58rem 1.2rem;border-radius:11px;background:var(--accent);color:#fff;font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 0 18px var(--accent-glow);transition:all 0.2s;}
        .btn-new:hover{filter:brightness(1.1);transform:translateY(-1px);}
        .remarks-input{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.7rem;padding:4px 9px;border-radius:7px;outline:none;width:110px;}
        .remarks-input:focus{border-color:var(--accent-border);}
        .remarks-input::placeholder{color:var(--text-muted);}
        .action-row{display:flex;gap:5px;align-items:center;flex-wrap:wrap;}
        .sum-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
        .sum-card{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:1rem 1.15rem;}
        .sum-label{font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:6px;}
        .sum-val{font-family:'JetBrains Mono',monospace;font-size:1.25rem;font-weight:800;line-height:1;}
        .lv-type{display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:800;}
        .lv-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
        .empty-state{padding:3rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.8rem;}
        .modal-overlay{position:fixed;inset:0;background:var(--modal-overlay);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:999;animation:fadeBg 0.2s ease;}
        @keyframes fadeBg{from{opacity:0}to{opacity:1}}
        .modal-box{background:var(--surface);border:1px solid var(--border-hover);border-radius:22px;width:520px;max-width:calc(100vw - 2rem);padding:2rem;animation:slideUp 0.25s ease;max-height:90vh;overflow-y:auto;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;}
        .modal-title{font-size:1rem;font-weight:800;letter-spacing:-0.02em;}
        .modal-close{width:32px;height:32px;border-radius:8px;background:var(--surface-3);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:all 0.18s;}
        .modal-close:hover{color:var(--text-primary);}
        .modal-field{display:flex;flex-direction:column;gap:6px;margin-bottom:1rem;}
        .modal-label{font-size:0.62rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .modal-input,.modal-select{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.8rem;padding:0.7rem 1rem;border-radius:11px;outline:none;width:100%;}
        .modal-input:focus,.modal-select:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .modal-input::placeholder{color:var(--text-muted);}
        .modal-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;}
        .modal-footer{display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;}
        .btn-mc{padding:0.65rem 1.3rem;border-radius:10px;background:var(--surface-3);border:1px solid var(--border);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;cursor:pointer;}
        .btn-ms{padding:0.65rem 1.5rem;border-radius:10px;background:var(--accent);color:#fff;font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 0 14px var(--accent-glow);}
        .btn-ms:hover:not(:disabled){filter:brightness(1.1);}
        .btn-ms:disabled{opacity:0.4;cursor:not-allowed;}
        .del-box{background:var(--surface);border:1px solid rgba(248,113,113,0.25);border-radius:18px;padding:1.75rem;max-width:380px;width:100%;animation:slideUp 0.25s ease;}
        .del-title{font-size:0.95rem;font-weight:800;margin-bottom:8px;}
        .del-sub{font-size:0.76rem;color:var(--text-secondary);margin-bottom:1.5rem;line-height:1.6;}
        .btn-del-confirm{padding:0.6rem 1.3rem;border-radius:10px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);color:var(--red);font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:700;cursor:pointer;}
        .policy-note{padding:1rem 1.2rem;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;font-size:0.7rem;color:var(--text-secondary);line-height:1.8;}
        .spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .toast{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1099;padding:0.75rem 1.25rem;border-radius:12px;font-family:'Syne',sans-serif;font-size:0.8rem;font-weight:700;animation:slideUp 0.25s ease;box-shadow:0 8px 32px rgba(0,0,0,0.3);}
        .toast.ok{background:var(--green);color:#fff;}
        .toast.err{background:var(--red);color:#fff;}
        .refresh-btn{display:flex;align-items:center;gap:6px;padding:0.4rem 0.9rem;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:600;cursor:pointer;transition:all 0.18s;}
        .refresh-btn:hover{border-color:var(--border-hover);color:var(--text-secondary);}
      `}</style>

      {/* Toast */}
      {toastMsg && <div className={`toast ${toastType}`}>{toastMsg}</div>}

      <div className="ad-layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-mark">
              <svg viewBox="0 0 14 14"><rect x="3" y="5" width="8" height="6" rx="1.5"/><line x1="7" y1="2" x2="7" y2="5"/><circle cx="7" cy="1.5" r="0.8" fill="white" stroke="none"/><line x1="2" y1="7.5" x2="3" y2="7.5"/><line x1="11" y1="7.5" x2="12" y2="7.5"/></svg>
            </div>
            <div><div className="sb-brand">Malus Robotics</div><div className="sb-brand-sub">Admin Panel</div></div>
          </div>

          <nav className="sb-nav">
            <div className="sb-section">Management</div>
            <button className={`nav-btn ${activeNav==="employees"?"active":""}`} onClick={()=>setActiveNav("employees")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Employees <span className="nb-count">{employees.length}</span>
            </button>
            <button className={`nav-btn ${activeNav==="projects"?"active":""}`} onClick={()=>setActiveNav("projects")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Projects <span className="nb-count">{activeProjects} active</span>
            </button>
            <div className="sb-divider"/>
            <div className="sb-section">Finance & HR</div>
            <button className={`nav-btn ${activeNav==="expenses"?"active":""}`} onClick={()=>setActiveNav("expenses")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Expenses {pendingExpenses>0&&<span className={`nb-count ${activeNav!=="expenses"?"alert":""}`}>{pendingExpenses}</span>}
            </button>
            <button className={`nav-btn ${activeNav==="leaves"?"active":""}`} onClick={()=>setActiveNav("leaves")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Leave Requests {pendingLeaves>0&&<span className={`nb-count ${activeNav!=="leaves"?"alert":""}`}>{pendingLeaves}</span>}
            </button>
          </nav>

          <div className="sb-footer">
            <button className="logout-btn" onClick={()=>{fetch("/api/admin/logout",{method:"POST"});router.push("/admin/login");}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="ad-main">
          <div className="ad-inner">

            {/* ════ EMPLOYEES ════ */}
            {activeNav==="employees"&&(<>
              <div className="page-header">
                <div><h1 className="page-title">Employee Directory</h1><p className="page-subtitle">Manage Malus Robotics employees</p></div>
                <button className="btn-new" onClick={()=>{setShowAddEmp(true);setAddEmpError("");}}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>
                  Add Employee
                </button>
              </div>
              <div className="stats-row">
                {[
                  {label:"Total Employees",val:employees.length,color:"var(--accent)",ib:"var(--accent-soft)",ibc:"var(--accent-border)",ic:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>},
                  {label:"Active Projects",val:activeProjects,color:"var(--green)",ib:"var(--green-bg)",ibc:"var(--green-border)",ic:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/></>},
                  {label:"Pending Expenses",val:pendingExpenses,color:"var(--yellow)",ib:"rgba(251,191,36,0.1)",ibc:"rgba(251,191,36,0.2)",ic:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>},
                  {label:"Pending Leaves",val:pendingLeaves,color:"var(--orange)",ib:"rgba(249,115,22,0.1)",ibc:"rgba(249,115,22,0.2)",ic:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>},
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <div className="stat-icon" style={{background:s.ib,border:`1px solid ${s.ibc}`}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.ic}</svg>
                    </div>
                    <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{color:s.color}}>{s.val}</div></div>
                  </div>
                ))}
              </div>
              <div className="search-bar">
                <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="search-input" placeholder="Search by name, ID or email…" value={empSearch} onChange={e=>setEmpSearch(e.target.value)}/>
                <span className="search-count">{filteredEmp.length} results</span>
              </div>
              {filteredEmp.length===0?<div className="empty-state">No employees match your search.</div>:(
                <div className="emp-grid">
                  {filteredEmp.map(e=>(
                    <div key={e.id} className="emp-card" onClick={()=>router.push(`/admin/employee/${e.employeeId}`)}>
                      <div className="emp-avatar-row">
                        <div className="emp-avatar">{e.name?.[0]?.toUpperCase()}</div>
                        <div><div className="emp-name">{e.name}</div><div className="emp-email">{e.email}</div></div>
                      </div>
                      <div className="emp-divider"/>
                      <div className="emp-id-label">Employee ID</div>
                      <div className="emp-id-val">{e.employeeId}</div>
                      {e.department&&<div style={{fontSize:"0.68rem",color:"var(--text-muted)",marginTop:"4px"}}>{e.department}</div>}
                      <div className="emp-arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7"/><polyline points="8 4 11 7 8 10"/></svg></div>
                    </div>
                  ))}
                </div>
              )}
            </>)}

            {/* ════ PROJECTS ════ */}
            {activeNav==="projects"&&(<>
              <div className="page-header">
                <div><h1 className="page-title">Project Registry</h1><p className="page-subtitle">{projects.length} projects · {activeProjects} active · {completedProjects} completed</p></div>
                <button className="btn-new" onClick={openNewProj}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>New Project</button>
              </div>
              <div className="filter-row">
                {(["All","Active","Inactive","Completed"] as const).map(f=>(
                  <button key={f} className={`fp ${projectFilter===f?"active":""}`} onClick={()=>setProjectFilter(f)}>{f}</button>
                ))}
                <div className="search-bar" style={{flex:1,maxWidth:"320px",padding:"0.4rem 0.9rem"}}>
                  <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="search-input" placeholder="Search projects…" value={projectSearch} onChange={e=>setProjectSearch(e.target.value)}/>
                </div>
              </div>
              {filteredProjects.length===0?<div className="empty-state">No projects match.</div>:(
                <div className="project-grid">
                  {filteredProjects.map(p=>{
                    const sc=STATUS_CFG[p.status];
                    return(
                      <div className="project-card" key={p.id}>
                        <div className="pj-code">{p.code}</div>
                        <div className="pj-name">{p.name}</div>
                        {p.client&&<div className="pj-client">{p.client}</div>}
                        <div className="pj-footer">
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <span className="sc" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}><span className="sc-dot"/>{p.status}</span>
                            <span className="pj-date">Created {fmt(p.createdAt)}</span>
                          </div>
                          <div className="pj-actions">
                            <button className="btn-edit" onClick={()=>openEditProj(p)}>Edit</button>
                            <button className="btn-del"  onClick={()=>setDeleteProjId(p.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="policy-note"><span style={{color:"var(--accent)",fontWeight:700}}>ℹ Project Codes</span> — Only <strong>Active</strong> projects appear in employee dropdowns. Setting Inactive or Completed hides it from employee forms while preserving records.</div>
            </>)}

            {/* ════ EXPENSES ════ */}
            {activeNav==="expenses"&&(<>
              <div className="page-header">
                <div><h1 className="page-title">Expense Management</h1><p className="page-subtitle">Review, approve and verify employee reimbursements</p></div>
                <button className="refresh-btn" onClick={reloadExpenses} disabled={expLoading}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  {expLoading?"Refreshing…":"Refresh"}
                </button>
              </div>
              <div className="sum-strip">
                <div className="sum-card"><div className="sum-label">Total Submitted</div><div className="sum-val" style={{color:"var(--accent)"}}>₹{expenses.reduce((a,e)=>a+e.amount,0).toLocaleString("en-IN")}</div></div>
                <div className="sum-card"><div className="sum-label">Approved</div><div className="sum-val" style={{color:"var(--green)"}}>₹{totalApprovedAmt.toLocaleString("en-IN")}</div></div>
                <div className="sum-card"><div className="sum-label">Pending Amount</div><div className="sum-val" style={{color:"var(--yellow)"}}>₹{pendingExpAmt.toLocaleString("en-IN")}</div></div>
                <div className="sum-card"><div className="sum-label">Pending Items</div><div className="sum-val" style={{color:"var(--orange)"}}>{pendingExpenses}</div></div>
              </div>
              <div className="filter-row">
                {(["All","Pending","Approved","Rejected"] as const).map(f=>(
                  <button key={f} className={`fp ${expStatusFilter===f?"active":""}`} onClick={()=>setExpStatusFilter(f)}>{f}</button>
                ))}
                <select className="fsel" value={expEmpFilter} onChange={e=>setExpEmpFilter(e.target.value)}>
                  <option value="All">All Employees</option>
                  {uniqueExpEmp.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                <div className="search-bar" style={{flex:1,maxWidth:"300px",padding:"0.4rem 0.9rem"}}>
                  <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="search-input" placeholder="Search…" value={expSearch} onChange={e=>setExpSearch(e.target.value)}/>
                  <span className="search-count">{filteredExpenses.length}</span>
                </div>
              </div>
              {filteredExpenses.length===0?<div className="empty-state">No expense records match.</div>:(
                <div className="table-wrap">
                  <table className="apt">
                    <thead><tr><th>Employee</th><th>Date</th><th>Description</th><th>Category</th><th>Project</th><th>Amount</th><th>Bills</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredExpenses.map(e=>{
                        const sc=STATUS_CFG[e.status];
                        const isActioning = expActioning===e.id;
                        return(
                          <tr key={e.id}>
                            <td><div className="td-bold">{e.employeeName}</div><div className="td-mono" style={{fontSize:"0.6rem"}}>{e.employeeId}</div></td>
                            <td className="td-mono">{fmt(e.date)}</td>
                            <td style={{maxWidth:"160px",fontSize:"0.74rem",lineHeight:1.4}}>{e.description}</td>
                            <td className="td-muted">{e.category}</td>
                            <td className="td-accent">{e.projectCode||"—"}</td>
                            <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>₹{e.amount.toLocaleString("en-IN")}</span></td>
                            <td>
                              {e.billUrls?.length>0
                                ? <button className="btn-view" onClick={()=>setViewBillUrls(e.billUrls)}>{e.billUrls.length} bill{e.billUrls.length!==1?"s":""}</button>
                                : <span style={{fontSize:"0.62rem",color:"var(--red)",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>✗ None</span>
                              }
                            </td>
                            <td>
                              <span className="sc" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}><span className="sc-dot"/>{e.status}</span>
                              {e.remarks&&<div style={{fontSize:"0.58rem",color:"var(--red)",marginTop:"3px",fontStyle:"italic",fontFamily:"'JetBrains Mono',monospace"}}>"{e.remarks}"</div>}
                            </td>
                            <td>
                              {e.status==="Pending"?(
                                <div className="action-row">
                                  <input className="remarks-input" placeholder="Remarks…" value={expRemarksMap[e.id]||""} onChange={ev=>setExpRemarksMap(p=>({...p,[e.id]:ev.target.value}))}/>
                                  <button className="btn-approve" disabled={isActioning} onClick={()=>actionExpense(e.id,"Approved")}>{isActioning?"…":"Approve"}</button>
                                  <button className="btn-reject"  disabled={isActioning} onClick={()=>actionExpense(e.id,"Rejected")}>{isActioning?"…":"Reject"}</button>
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
            </>)}

            {/* ════ LEAVES ════ */}
            {activeNav==="leaves"&&(<>
              <div className="page-header">
                <div><h1 className="page-title">Leave Requests</h1><p className="page-subtitle">Review and approve employee leave applications</p></div>
                <button className="refresh-btn" onClick={reloadLeaves} disabled={leaveLoading}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  {leaveLoading?"Refreshing…":"Refresh"}
                </button>
              </div>
              <div className="sum-strip">
                <div className="sum-card"><div className="sum-label">Total Requests</div><div className="sum-val" style={{color:"var(--accent)"}}>{leaves.length}</div></div>
                <div className="sum-card"><div className="sum-label">Pending</div><div className="sum-val" style={{color:"var(--yellow)"}}>{pendingLeaves}</div></div>
                <div className="sum-card"><div className="sum-label">Approved</div><div className="sum-val" style={{color:"var(--green)"}}>{leaves.filter(l=>l.status==="Approved").length}</div></div>
                <div className="sum-card"><div className="sum-label">Days Approved</div><div className="sum-val" style={{color:"var(--orange)"}}>{leaves.filter(l=>l.status==="Approved").reduce((a,l)=>a+l.days,0)}</div></div>
              </div>
              <div className="filter-row">
                {(["All","Pending","Approved","Rejected"] as const).map(f=>(
                  <button key={f} className={`fp ${leaveStatusFilter===f?"active":""}`} onClick={()=>setLeaveStatusFilter(f)}>{f}</button>
                ))}
                <select className="fsel" value={leaveEmpFilter} onChange={e=>setLeaveEmpFilter(e.target.value)}>
                  <option value="All">All Employees</option>
                  {uniqueLeaveEmp.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                <div className="search-bar" style={{flex:1,maxWidth:"300px",padding:"0.4rem 0.9rem"}}>
                  <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="search-input" placeholder="Search leaves…" value={leaveSearch} onChange={e=>setLeaveSearch(e.target.value)}/>
                  <span className="search-count">{filteredLeaves.length}</span>
                </div>
              </div>
              {filteredLeaves.length===0?<div className="empty-state">No leave requests match.</div>:(
                <div className="table-wrap">
                  <table className="apt">
                    <thead><tr><th>Employee</th><th>Type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredLeaves.map(l=>{
                        const sc=STATUS_CFG[l.status];
                        const lc=LEAVE_COLORS[l.type]||"#7c6af7";
                        const isActioning=leaveActioning===l.id;
                        return(
                          <tr key={l.id}>
                            <td><div className="td-bold">{l.employeeName}</div><div className="td-mono" style={{fontSize:"0.6rem"}}>{l.employeeId}</div></td>
                            <td><span className="lv-type" style={{color:lc}}><span className="lv-dot" style={{background:lc}}/>{l.type}</span></td>
                            <td className="td-mono" style={{fontSize:"0.68rem",lineHeight:1.5}}>{fmt(l.from)}{l.from!==l.to&&<><br/>→ {fmt(l.to)}</>}</td>
                            <td className="td-accent">{l.days}d</td>
                            <td style={{maxWidth:"160px",fontSize:"0.74rem",color:"var(--text-secondary)",lineHeight:1.4}}>
                              {l.reason}
                              {l.remarks&&<div style={{color:"var(--red)",fontSize:"0.64rem",marginTop:"3px",fontStyle:"italic"}}>"{l.remarks}"</div>}
                            </td>
                            <td className="td-mono">{fmt(l.appliedOn)}</td>
                            <td><span className="sc" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}><span className="sc-dot"/>{l.status}</span></td>
                            <td>
                              {l.status==="Pending"?(
                                <div className="action-row">
                                  <input className="remarks-input" placeholder="Remarks…" value={leaveRemarksMap[l.id]||""} onChange={ev=>setLeaveRemarksMap(p=>({...p,[l.id]:ev.target.value}))}/>
                                  <button className="btn-approve" disabled={isActioning} onClick={()=>actionLeave(l.id,"Approved")}>{isActioning?"…":"Approve"}</button>
                                  <button className="btn-reject"  disabled={isActioning} onClick={()=>actionLeave(l.id,"Rejected")}>{isActioning?"…":"Reject"}</button>
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
              <div className="policy-note"><span style={{color:"var(--yellow)",fontWeight:700}}>📋 Leave Policy</span> — Sick leave requires a medical certificate for more than <strong>2 consecutive days</strong>. Casual leaves cannot be carried forward. Earned leaves accrue at <strong>1.25 days/month</strong>.</div>
            </>)}

          </div>
        </main>
      </div>

      {/* ── ADD EMPLOYEE MODAL ── */}
      {showAddEmp&&(
        <div className="modal-overlay" onClick={()=>setShowAddEmp(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:"440px"}}>
            <div className="modal-header">
              <div><div className="modal-title">Add Employee</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.62rem",color:"var(--text-muted)",marginTop:"3px"}}>Employee sets password via /register</div></div>
              <button className="modal-close" onClick={()=>setShowAddEmp(false)}>✕</button>
            </div>
            <div className="modal-field"><label className="modal-label">Full Name *</label><input className="modal-input" placeholder="Employee full name" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)}/></div>
            <div className="modal-field"><label className="modal-label">Company Email *</label><input className="modal-input" type="email" placeholder="name@malusrobotics.com" value={newEmpEmail} onChange={e=>setNewEmpEmail(e.target.value)}/></div>
            <div className="modal-field"><label className="modal-label">Department</label><input className="modal-input" placeholder="e.g. Projects, R&D, HR" value={newEmpDept} onChange={e=>setNewEmpDept(e.target.value)}/></div>
            {addEmpError&&<div style={{display:"flex",alignItems:"center",gap:"7px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"10px",padding:"0.55rem 0.85rem",fontSize:"0.7rem",color:"var(--red)",fontWeight:600,marginBottom:"0.85rem"}}>{addEmpError}</div>}
            <div className="modal-footer">
              <button className="btn-mc" onClick={()=>setShowAddEmp(false)}>Cancel</button>
              <button className="btn-ms" disabled={addEmpSaving||!newEmpName.trim()||!newEmpEmail.trim()} onClick={saveEmployee}>{addEmpSaving?<><span className="spinner"/> Saving…</>:"Create Employee"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECT MODAL ── */}
      {showProjModal&&(
        <div className="modal-overlay" onClick={()=>setShowProjModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editProject?"Edit Project":"New Project"}</div><button className="modal-close" onClick={()=>setShowProjModal(false)}>✕</button></div>
            <div className="modal-grid-2">
              <div className="modal-field"><label className="modal-label">Project Code *</label><input className="modal-input" value={pCode} onChange={e=>setPCode(e.target.value)} placeholder="e.g. PROJ-005"/></div>
              <div className="modal-field"><label className="modal-label">Status</label><select className="modal-select" value={pStatus} onChange={e=>setPStatus(e.target.value as any)}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Completed">Completed</option></select></div>
            </div>
            <div className="modal-field"><label className="modal-label">Project Name *</label><input className="modal-input" value={pName} onChange={e=>setPName(e.target.value)} placeholder="Full project name"/></div>
            <div className="modal-field"><label className="modal-label">Client / Organisation</label><input className="modal-input" value={pClient} onChange={e=>setPClient(e.target.value)} placeholder="Client or department"/></div>
            <div className="modal-footer">
              <button className="btn-mc" onClick={()=>setShowProjModal(false)}>Cancel</button>
              <button className="btn-ms" disabled={pSaving||!pCode.trim()||!pName.trim()} onClick={saveProject}>{pSaving?<><span className="spinner"/> Saving…</>:editProject?"Save Changes":"Create Project"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PROJECT ── */}
      {deleteProjId&&(
        <div className="modal-overlay" onClick={()=>setDeleteProjId(null)}>
          <div className="del-box" onClick={e=>e.stopPropagation()}>
            <div className="del-title">Delete this project?</div>
            <div className="del-sub">The project will be removed from the registry. Existing records are not affected.</div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button className="btn-mc" onClick={()=>setDeleteProjId(null)}>Cancel</button>
              <button className="btn-del-confirm" onClick={()=>deleteProject(deleteProjId)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BILL VIEWER ── */}
      {viewBillUrls&&(
        <div className="modal-overlay" onClick={()=>setViewBillUrls(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Attached Bills ({viewBillUrls.length})</div><button className="modal-close" onClick={()=>setViewBillUrls(null)}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"1.5rem"}}>
              {viewBillUrls.map((url,i)=>{
                const isPdf = url.toLowerCase().endsWith(".pdf");
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"0.65rem 0.9rem",background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"10px"}}>
                    {isPdf
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
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