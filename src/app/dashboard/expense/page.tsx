"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  "Travel","Business Meals","Business Cards","Dues","Legal Fees","License Fees",
  "Mileage","Office Supplies","Passport Fee","Postage","Printer Cartridges",
  "Printer Paper","Software","Stationery","Subscriptions","Telephones","Tools",
  "Training Fees","Work Clothing","Gatepass Formalities","On Site Materials","Other",
];

interface ExpenseRow {
  id: string; date: string; description: string;
  category: string; cost: string;
}

interface Expense {
  id: string; date: string; description: string; category: string;
  amount: number; status: "Pending"|"Approved"|"Rejected";
  projectCode?: string; remarks?: string; submittedOn: string;
}

interface Project { id: string; code: string; name: string; }

function uid() { return Math.random().toString(36).slice(2, 9); }
function emptyRow(): ExpenseRow {
  return { id: uid(), date: "", description: "", category: "Travel", cost: "" };
}
function fmt(d: string) {
  if(!d) return "—";
  return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d));
}

const STATUS_CFG: Record<string,{color:string;bg:string;border:string}> = {
  Pending:  {color:"#fbbf24",bg:"rgba(251,191,36,0.1)", border:"rgba(251,191,36,0.2)"},
  Approved: {color:"#22d3a2",bg:"rgba(34,211,162,0.1)", border:"rgba(34,211,162,0.2)"},
  Rejected: {color:"#f87171",bg:"rgba(248,113,113,0.1)",border:"rgba(248,113,113,0.2)"},
};

export default function ExpensesPage() {
  const [employeeId,   setEmployeeId]   = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [projects,     setProjects]     = useState<Project[]>([]);
  const [expenses,     setExpenses]     = useState<Expense[]>([]);
  const [loadingExp,   setLoadingExp]   = useState(true);

  // Form state
  const [projectCode,      setProjectCode]      = useState("");
  const [businessPurpose,  setBusinessPurpose]  = useState("");
  const [periodFrom,       setPeriodFrom]        = useState("");
  const [periodTo,         setPeriodTo]          = useState("");
  const [cashAdvance,      setCashAdvance]       = useState("0");
  const [rows,             setRows]             = useState<ExpenseRow[]>([emptyRow()]);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitError,      setSubmitError]      = useState("");
  const [successCount,     setSuccessCount]     = useState(0); // how many lines submitted

  // Tab
  const [activeTab, setActiveTab] = useState<"submit"|"history">("submit");

  // ── Load user, projects, existing expenses ──
  useEffect(()=>{
    fetch("/api/me").then(r=>r.json()).then(d=>{
      if(d.employeeId) setEmployeeId(d.employeeId);
      if(d.name)       setEmployeeName(d.name);
    }).catch(()=>{});

    fetch("/api/projects").then(r=>r.json()).then(d=>{
      setProjects(d.projects||[]);
    }).catch(()=>{});

    loadExpenses();
  },[]);

  async function loadExpenses() {
    setLoadingExp(true);
    const r = await fetch("/api/expense").catch(()=>null);
    if(r) {
      const d = await r.json();
      setExpenses((d.expenses||[]).map((e:any)=>({
        ...e,
        status: e.status.charAt(0)+e.status.slice(1).toLowerCase() as any,
      })));
    }
    setLoadingExp(false);
  }

  const subtotal = rows.reduce((acc,r)=>acc+(parseFloat(r.cost.replace(/[₹,]/g,""))||0),0);
  const advance  = parseFloat(cashAdvance)||0;
  const totalReimbursement = subtotal - advance;

  function updateRow(id:string, field:keyof ExpenseRow, value:string) {
    setRows(prev=>prev.map(r=>r.id===id?{...r,[field]:value}:r));
  }
  function addRow()        { setRows(prev=>[...prev,emptyRow()]); }
  function removeRow(id:string) { setRows(prev=>prev.length>1?prev.filter(r=>r.id!==id):prev); }

  // ── Submit — one API call per row ──
  async function handleSubmit() {
    setSubmitError("");
    const validRows = rows.filter(r=>r.date&&r.description.trim()&&r.cost);
    if(validRows.length===0){
      setSubmitError("Please fill in at least one complete expense row (date, description, amount).");
      return;
    }
    setSubmitting(true);
    let successN = 0;
    let firstError = "";

    for(const row of validRows) {
      const amount = parseFloat(row.cost.replace(/[₹,]/g,""));
      if(!amount||amount<=0) continue;

      const res = await fetch("/api/expense",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          amount,
          category:    row.category,
          description: row.description.trim(),
          projectCode: projectCode.trim() || null,
          date:        row.date,
          billUrls:    [], // file upload can be wired separately
        }),
      });
      const data = await res.json();
      if(data.success) {
        successN++;
      } else {
        firstError = data.error || "Failed to submit one or more expenses.";
      }
    }

    setSubmitting(false);

    if(successN > 0) {
      setSuccessCount(successN);
      setRows([emptyRow()]);
      setBusinessPurpose(""); setProjectCode("");
      setPeriodFrom(""); setPeriodTo(""); setCashAdvance("0");
      await loadExpenses();
      setActiveTab("history");
    }
    if(firstError) setSubmitError(firstError);
  }

  // ── History filter ──
  const [histFilter, setHistFilter] = useState<"All"|"Pending"|"Approved"|"Rejected">("All");
  const filteredExp = histFilter==="All" ? expenses : expenses.filter(e=>e.status===histFilter);

  const totalSubmitted = expenses.reduce((a,e)=>a+e.amount,0);
  const totalApproved  = expenses.filter(e=>e.status==="Approved").reduce((a,e)=>a+e.amount,0);
  const pendingCount   = expenses.filter(e=>e.status==="Pending").length;

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
          --accent:#6355e8;--accent-soft:rgba(99,85,232,0.08);--accent-border:rgba(99,85,232,0.2);--accent-glow:rgba(99,85,232,0.15);
          --green:#0fa87a;--green-bg:rgba(15,168,122,0.08);--green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a;--red:#dc2626;--yellow:#d97706;
          --text-primary:#0f0f1a;--text-secondary:#555570;--text-muted:#9999b5;
        }
        *{transition:background-color 0.25s ease,border-color 0.25s ease,color 0.25s ease;}

        .ep-root{min-height:100vh;background:var(--bg);font-family:'Syne',sans-serif;color:var(--text-primary);padding:2.5rem 2rem 4rem;}
        .ep-inner{max-width:1060px;margin:0 auto;display:flex;flex-direction:column;gap:1.75rem;}

        .ep-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:1.5rem;border-bottom:1px solid var(--border);}
        .ep-title{font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:5px;}
        .ep-subtitle{font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;}
        .ep-user{text-align:right;}
        .ep-user-name{font-size:0.88rem;font-weight:700;margin-bottom:3px;}
        .ep-user-id{font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--text-muted);}

        .sum-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;}
        .sum-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1.1rem 1.3rem;}
        .sum-label{font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:6px;}
        .sum-val{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:800;line-height:1;}

        .tabs-row{display:flex;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:5px;}
        .tab-btn{flex:1;padding:0.6rem 1rem;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.78rem;font-weight:700;border:none;cursor:pointer;transition:all 0.18s;color:var(--text-muted);background:transparent;}
        .tab-btn:hover{color:var(--text-secondary);background:var(--surface-2);}
        .tab-btn.active{background:var(--accent);color:#fff;box-shadow:0 0 16px var(--accent-glow);}
        .tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:rgba(255,255,255,0.2);font-size:0.6rem;font-weight:800;margin-left:6px;vertical-align:middle;padding:0 4px;}
        .tab-btn:not(.active) .tab-badge{background:var(--surface-3);color:var(--text-muted);}

        .ep-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:1.75rem;}
        .section-label{font-size:0.6rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:1.25rem;}

        .form-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;}
        @media(max-width:720px){.form-grid-3{grid-template-columns:1fr;}}
        .form-field{display:flex;flex-direction:column;gap:6px;}
        .form-label{font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .form-input,.form-select,.form-textarea{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.82rem;padding:0.75rem 1rem;border-radius:11px;outline:none;width:100%;}
        .form-input::placeholder,.form-textarea::placeholder{color:var(--text-muted);}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .form-textarea{resize:vertical;min-height:80px;line-height:1.6;}

        .expense-table-wrap{overflow-x:auto;}
        .expense-table{width:100%;border-collapse:collapse;min-width:680px;}
        .expense-table th{padding:0.7rem 0.85rem;text-align:left;font-size:0.58rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-family:'JetBrains Mono',monospace;border-bottom:1px solid var(--border);}
        .expense-table td{padding:0.55rem 0.5rem;vertical-align:top;}
        .expense-table tbody tr{border-bottom:1px solid rgba(128,128,128,0.06);}
        .expense-table tbody tr:last-child{border-bottom:none;}
        .tbl-input{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.8rem;padding:0.6rem 0.75rem;border-radius:9px;outline:none;width:100%;}
        .tbl-input::placeholder{color:var(--text-muted);}
        .tbl-input:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .tbl-select{background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.78rem;padding:0.6rem 0.75rem;border-radius:9px;outline:none;width:100%;cursor:pointer;}
        .tbl-select:focus{border-color:var(--accent-border);}
        .row-del-btn{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;border-radius:7px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
        .row-del-btn:hover{background:rgba(248,113,113,0.1);color:var(--red);}
        .add-row-btn{display:flex;align-items:center;gap:8px;background:none;border:1px dashed var(--border);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.78rem;font-weight:600;padding:0.65rem 1rem;border-radius:11px;cursor:pointer;transition:all 0.18s;width:100%;margin-top:0.75rem;}
        .add-row-btn:hover{border-color:var(--accent-border);color:var(--accent);background:var(--accent-soft);}

        .totals-grid{display:grid;grid-template-columns:1fr 300px;gap:1.5rem;align-items:start;}
        @media(max-width:700px){.totals-grid{grid-template-columns:1fr;}}
        .totals-note{font-size:0.72rem;color:var(--text-secondary);line-height:1.7;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem;}
        .totals-note strong{color:var(--orange);}
        .totals-row{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border);}
        .totals-row:last-child{border-bottom:none;}
        .totals-key{font-size:0.78rem;color:var(--text-secondary);}
        .totals-val{font-family:'JetBrains Mono',monospace;font-size:0.85rem;font-weight:700;color:var(--text-primary);}
        .totals-val.accent{color:var(--accent);font-size:1rem;}
        .totals-val.green{color:var(--green);font-size:1.1rem;}
        .advance-wrap{display:flex;align-items:center;gap:6px;}
        .advance-prefix{font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-muted);}

        .submit-bar{display:flex;justify-content:flex-end;gap:1rem;align-items:center;padding-top:0.5rem;}
        .btn-submit{display:flex;align-items:center;gap:10px;background:var(--accent);color:#fff;font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:0.8rem 2rem;border-radius:12px;border:none;cursor:pointer;box-shadow:0 0 30px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,0.15);transition:all 0.2s;}
        .btn-submit:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
        .btn-submit:disabled{opacity:0.45;cursor:not-allowed;transform:none;}
        .btn-reset{background:var(--surface-3);border:1px solid var(--border);color:var(--text-muted);font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:600;padding:0.8rem 1.5rem;border-radius:12px;cursor:pointer;transition:all 0.18s;}
        .btn-reset:hover{border-color:var(--border-hover);color:var(--text-secondary);}
        .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .error-box{background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:0.65rem 1rem;font-size:0.75rem;color:var(--red);font-weight:600;}

        .filter-row{display:flex;gap:6px;margin-bottom:1.25rem;flex-wrap:wrap;}
        .fp{padding:0.38rem 0.9rem;border-radius:100px;border:1px solid var(--border);font-size:0.72rem;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all 0.18s;background:var(--surface-2);color:var(--text-muted);}
        .fp:hover{border-color:var(--border-hover);color:var(--text-secondary);}
        .fp.active{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent);}

        .exp-list{display:flex;flex-direction:column;gap:0.75rem;}
        .exp-row{display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:start;background:var(--surface-2);border:1px solid var(--border);border-radius:16px;padding:1rem 1.2rem;transition:border-color 0.2s;}
        .exp-row:hover{border-color:var(--border-hover);}
        .exp-desc{font-size:0.85rem;font-weight:700;margin-bottom:4px;}
        .exp-meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:0.68rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .exp-meta span{display:flex;align-items:center;gap:3px;}
        .exp-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px;}
        .exp-amount{font-family:'JetBrains Mono',monospace;font-size:1rem;font-weight:800;color:var(--text-primary);}
        .sc{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:100px;font-size:0.58rem;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;border:1px solid;white-space:nowrap;}
        .sc-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
        .exp-remarks{font-size:0.68rem;color:var(--red);font-style:italic;font-family:'JetBrains Mono',monospace;}
        .empty-state{padding:3rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.8rem;}

        .toast{position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;background:var(--surface);border:1px solid var(--green-border);border-radius:16px;padding:1rem 1.4rem;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;max-width:340px;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .toast-icon{width:34px;height:34px;border-radius:10px;flex-shrink:0;background:var(--green-bg);border:1px solid var(--green-border);display:flex;align-items:center;justify-content:center;}
        .toast-title{font-size:0.82rem;font-weight:800;color:var(--text-primary);margin-bottom:2px;}
        .toast-sub{font-size:0.7rem;font-family:'JetBrains Mono',monospace;color:var(--text-muted);}
        .toast-close{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:2px;margin-left:auto;}
      `}</style>

      {/* Toast */}
      {successCount > 0 && (
        <div className="toast">
          <div className="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div>
            <div className="toast-title">Submitted Successfully</div>
            <div className="toast-sub">{successCount} expense{successCount!==1?"s":""} submitted · Pending approval</div>
          </div>
          <button className="toast-close" onClick={()=>setSuccessCount(0)}>✕</button>
        </div>
      )}

      <div className="ep-root">
        <div className="ep-inner">

          {/* Header */}
          <div className="ep-header">
            <div>
              <h1 className="ep-title">Expense Report</h1>
              <p className="ep-subtitle">Advance / Reimbursement Submission</p>
            </div>
            <div className="ep-user">
              <div className="ep-user-name">{employeeName||"—"}</div>
              <div className="ep-user-id">#{employeeId||"Loading…"}</div>
            </div>
          </div>

          {/* Summary */}
          <div className="sum-strip">
            <div className="sum-card"><div className="sum-label">Total Submitted</div><div className="sum-val" style={{color:"var(--accent)"}}>₹{totalSubmitted.toLocaleString("en-IN")}</div></div>
            <div className="sum-card"><div className="sum-label">Approved</div><div className="sum-val" style={{color:"var(--green)"}}>₹{totalApproved.toLocaleString("en-IN")}</div></div>
            <div className="sum-card"><div className="sum-label">Pending Review</div><div className="sum-val" style={{color:"var(--yellow)"}}>{pendingCount} items</div></div>
          </div>

          {/* Tabs */}
          <div className="tabs-row">
            <button className={`tab-btn ${activeTab==="submit"?"active":""}`} onClick={()=>setActiveTab("submit")}>Submit Expenses</button>
            <button className={`tab-btn ${activeTab==="history"?"active":""}`} onClick={()=>setActiveTab("history")}>
              My Claims {pendingCount>0&&<span className="tab-badge">{pendingCount}</span>}
            </button>
          </div>

          {/* ═══ SUBMIT TAB ═══ */}
          {activeTab==="submit"&&(<>
            {/* Context fields */}
            <div className="ep-card">
              <div className="section-label">Claim Context</div>
              <div className="form-grid-3" style={{marginBottom:"1rem"}}>
                <div className="form-field">
                  <label className="form-label">Project / PO Number</label>
                  <select className="form-select" value={projectCode} onChange={e=>setProjectCode(e.target.value)}>
                    <option value="">— Select project —</option>
                    {projects.map(p=><option key={p.id} value={p.code}>{p.code} · {p.name}</option>)}
                    <option value="OTHER">Other / No project</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Expense Period From</label>
                  <input type="date" className="form-input" value={periodFrom} onChange={e=>setPeriodFrom(e.target.value)}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Expense Period To</label>
                  <input type="date" className="form-input" value={periodTo} onChange={e=>setPeriodTo(e.target.value)}/>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Business Purpose</label>
                <textarea className="form-textarea" value={businessPurpose} onChange={e=>setBusinessPurpose(e.target.value)} placeholder="Describe the business purpose of these expenses…"/>
              </div>
            </div>

            {/* Expense rows */}
            <div className="ep-card">
              <div className="section-label">Itemized Expenses</div>
              <div className="expense-table-wrap">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th style={{width:"110px"}}>Date</th>
                      <th>Description</th>
                      <th style={{width:"160px"}}>Category</th>
                      <th style={{width:"120px"}}>Amount (₹)</th>
                      <th style={{width:"40px"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row=>(
                      <tr key={row.id}>
                        <td><input type="date" className="tbl-input" value={row.date} onChange={e=>updateRow(row.id,"date",e.target.value)}/></td>
                        <td><input className="tbl-input" value={row.description} onChange={e=>updateRow(row.id,"description",e.target.value)} placeholder="Route, vendor, purpose…"/></td>
                        <td>
                          <select className="tbl-select" value={row.category} onChange={e=>updateRow(row.id,"category",e.target.value)}>
                            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td><input className="tbl-input" value={row.cost} onChange={e=>updateRow(row.id,"cost",e.target.value)} placeholder="0.00" style={{fontFamily:"'JetBrains Mono',monospace"}}/></td>
                        <td>
                          <button className="row-del-btn" onClick={()=>removeRow(row.id)}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="add-row-btn" onClick={addRow}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>
                Add Expense Row
              </button>
            </div>

            {/* Summary */}
            <div className="ep-card">
              <div className="section-label">Summary</div>
              <div className="totals-grid">
                <div className="totals-note">
                  <strong>⚠ Reminders</strong><br/>
                  • Attach all original receipts to the physical expense form.<br/>
                  • Mileage reimbursement for personal car = <strong>₹7.5 / km</strong>.<br/>
                  • Claims submitted without bills may not be processed.<br/>
                  • Submit within <strong>30 days</strong> of incurring the expense.
                </div>
                <div>
                  <div className="totals-row"><span className="totals-key">Subtotal</span><span className="totals-val accent">₹{subtotal.toFixed(2)}</span></div>
                  <div className="totals-row">
                    <span className="totals-key">Less Cash Advance</span>
                    <div className="advance-wrap">
                      <span className="advance-prefix">₹</span>
                      <input className="tbl-input" value={cashAdvance} onChange={e=>setCashAdvance(e.target.value)} style={{width:"90px",fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}/>
                    </div>
                  </div>
                  <div className="totals-row"><span className="totals-key" style={{fontWeight:700,color:"var(--text-primary)"}}>Total Reimbursement</span><span className="totals-val green">₹{totalReimbursement.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            {submitError&&<div className="error-box">{submitError}</div>}

            <div className="submit-bar">
              <button className="btn-reset" onClick={()=>setRows([emptyRow()])}>Clear Rows</button>
              <button className="btn-submit" disabled={submitting} onClick={handleSubmit}>
                {submitting?<><span className="spinner"/> Submitting…</>:<>Submit Expense Report</>}
              </button>
            </div>
          </>)}

          {/* ═══ HISTORY TAB ═══ */}
          {activeTab==="history"&&(
            <div className="ep-card">
              <div className="section-label">My Expense Claims</div>
              <div className="filter-row">
                {(["All","Pending","Approved","Rejected"] as const).map(f=>(
                  <button key={f} className={`fp ${histFilter===f?"active":""}`} onClick={()=>setHistFilter(f)}>
                    {f}{f!=="All"&&<span style={{marginLeft:"5px",opacity:0.7,fontFamily:"'JetBrains Mono',monospace"}}>{expenses.filter(e=>e.status===f).length}</span>}
                  </button>
                ))}
              </div>
              {loadingExp?(
                <div style={{textAlign:"center",padding:"2rem",color:"var(--text-muted)",fontSize:"0.78rem"}}>Loading…</div>
              ):filteredExp.length===0?(
                <div className="empty-state">No {histFilter!=="All"?histFilter.toLowerCase():""} expense claims found.</div>
              ):(
                <div className="exp-list">
                  {filteredExp.map(e=>{
                    const sc=STATUS_CFG[e.status];
                    return(
                      <div className="exp-row" key={e.id}>
                        <div>
                          <div className="exp-desc">{e.description}</div>
                          <div className="exp-meta">
                            <span>{fmt(e.date)}</span>
                            <span>·</span>
                            <span>{e.category}</span>
                            {e.projectCode&&<><span>·</span><span style={{color:"var(--accent)"}}>{e.projectCode}</span></>}
                            <span>·</span>
                            <span>Submitted {fmt(e.submittedOn)}</span>
                          </div>
                          {e.remarks&&<div className="exp-remarks" style={{marginTop:"5px"}}>Remarks: {e.remarks}</div>}
                        </div>
                        <div className="exp-right">
                          <div className="exp-amount">₹{e.amount.toLocaleString("en-IN")}</div>
                          <span className="sc" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}><span className="sc-dot"/>{e.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}