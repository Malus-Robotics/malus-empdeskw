// src/app/dashboard/expense/page.tsx
"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";

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
  Pending:  {color:"var(--yellow)",bg:"var(--yellow-soft)",border:"var(--yellow-border)"},
  Approved: {color:"var(--green)", bg:"var(--green-soft)", border:"var(--green-border)"},
  Rejected: {color:"var(--red)",   bg:"var(--red-soft)",   border:"var(--red-border)"},
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

      try {
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
      } catch {
        firstError = "Could not reach the server. Please try again.";
      }
    }

    setSubmitting(false);

    if(successN > 0) {
      toast.success(`${successN} expense${successN!==1?"s":""} submitted. Pending approval.`);
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
        .ep-root{min-height:100vh;background:var(--bg);font-family:var(--font-jakarta),system-ui,sans-serif;color:var(--text-primary);padding:2.25rem 2rem 4rem;}
        .ep-root *,.ep-root *::before,.ep-root *::after{box-sizing:border-box;}
        .ep-inner{max-width:1060px;margin:0 auto;display:flex;flex-direction:column;gap:1.4rem;}
        [data-theme="dark"] .ep-root input[type="date"]{color-scheme:dark;}

        .ep-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
        .ep-title{font-size:1.85rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1;}
        .ep-sub{font-size:0.9rem;color:var(--text-muted);margin-top:6px;}
        .ep-user{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:100px;padding:6px 14px 6px 6px;box-shadow:var(--shadow-card);}
        .ep-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;}
        .ep-user-name{font-size:0.85rem;font-weight:700;line-height:1.2;}
        .ep-user-id{font-size:0.72rem;color:var(--text-muted);}

        .ep-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:0.8rem;}
        .ep-kpi{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1rem 1.2rem;box-shadow:var(--shadow-card);}
        .ep-kpi-l{display:flex;align-items:center;gap:7px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);}
        .ep-kpi-dot{width:8px;height:8px;border-radius:50%;background:var(--kc);}
        .ep-kpi-n{font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;line-height:1;margin-top:10px;color:var(--kc);}

        .ep-tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:5px;box-shadow:var(--shadow-card);}
        .ep-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:0.65rem 0.8rem;border-radius:10px;border:0;background:transparent;color:var(--text-muted);font-family:inherit;font-size:0.84rem;font-weight:700;cursor:pointer;transition:background .15s,color .15s;}
        .ep-tab:hover{background:var(--surface-2);color:var(--text-primary);}
        .ep-tab.active{background:var(--accent);color:#fff;box-shadow:0 4px 12px var(--accent-glow);}
        .ep-tab-badge{min-width:20px;height:20px;padding:0 6px;border-radius:100px;background:var(--accent-soft);color:var(--accent);font-size:0.68rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;}
        .ep-tab.active .ep-tab-badge{background:rgba(255,255,255,0.25);color:#fff;}

        .ep-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:1.7rem;box-shadow:var(--shadow-card);}
        .ep-h{font-size:1.05rem;font-weight:800;letter-spacing:-0.01em;margin-bottom:1.1rem;}

        /* fields */
        .ep-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;}
        .ep-field{display:flex;flex-direction:column;gap:6px;}
        .ep-field label{font-size:0.78rem;font-weight:700;color:var(--text-secondary);}
        .ep-input,.ep-select,.ep-ta{width:100%;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.88rem;outline:none;}
        .ep-input,.ep-select{height:44px;padding:0 0.9rem;}
        .ep-select{cursor:pointer;}
        .ep-ta{min-height:90px;padding:0.8rem 0.95rem;resize:vertical;line-height:1.6;}
        .ep-input::placeholder,.ep-ta::placeholder{color:var(--text-muted);}
        .ep-input:focus,.ep-select:focus,.ep-ta:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}

        /* itemized table */
        .ep-table-wrap{overflow-x:auto;margin:0 -0.3rem;padding:0 0.3rem;}
        .ep-table{width:100%;min-width:700px;border-collapse:collapse;}
        .ep-table th{padding:0.4rem 0.5rem 0.7rem;text-align:left;font-size:0.78rem;font-weight:600;color:var(--text-muted);}
        .ep-table td{padding:0.35rem 0.5rem;vertical-align:middle;}
        .ep-table .ep-input,.ep-table .ep-select{height:42px;font-size:0.85rem;}
        .ep-del{background:none;border:0;color:var(--text-muted);cursor:pointer;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;}
        .ep-del:hover{background:var(--red-soft);color:var(--red);}
        .ep-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:0.9rem;height:46px;border:1px dashed var(--border-hover);border-radius:12px;background:none;color:var(--text-secondary);font-family:inherit;font-size:0.85rem;font-weight:700;cursor:pointer;}
        .ep-add:hover{border-color:var(--accent-border);color:var(--accent);background:var(--accent-soft);}

        /* summary */
        .ep-totals{display:grid;grid-template-columns:1fr 320px;gap:1.5rem;align-items:start;}
        .ep-note{font-size:0.84rem;color:var(--text-secondary);line-height:1.8;background:var(--yellow-soft);border:1px solid var(--yellow-border);border-radius:14px;padding:1rem 1.2rem;}
        .ep-note b{display:flex;align-items:center;gap:8px;color:var(--text-primary);font-size:0.88rem;margin-bottom:6px;}
        .ep-note ul{padding-left:1.1rem;}
        .ep-note strong{color:var(--text-primary);}
        .ep-trow{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:0.8rem 0;border-bottom:1px solid var(--border);}
        .ep-trow:last-child{border-bottom:0;}
        .ep-tk{font-size:0.86rem;color:var(--text-secondary);}
        .ep-tv{font-size:0.95rem;font-weight:800;font-variant-numeric:tabular-nums;}
        .ep-tv.accent{color:var(--accent);}
        .ep-tv.big{color:var(--green);font-size:1.3rem;}
        .ep-adv{display:flex;align-items:center;gap:6px;}
        .ep-adv span{font-size:0.9rem;color:var(--text-muted);}
        .ep-adv .ep-input{width:110px;text-align:right;height:40px;}

        .ep-error{display:flex;align-items:center;gap:10px;background:var(--red-soft);border:1px solid var(--red-border);border-radius:12px;padding:0.8rem 1rem;font-size:0.85rem;color:var(--red);font-weight:600;}
        .ep-bar{display:flex;justify-content:flex-end;gap:0.8rem;align-items:center;}
        .ep-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 1.6rem;border-radius:12px;font-family:inherit;font-size:0.9rem;font-weight:700;cursor:pointer;border:1px solid transparent;transition:background .15s,border-color .15s;}
        .ep-btn.primary{background:var(--accent);color:#fff;box-shadow:0 4px 14px var(--accent-glow);}
        .ep-btn.primary:hover:not(:disabled){background:var(--accent-hover);}
        .ep-btn.ghost{background:var(--surface);color:var(--text-secondary);border-color:var(--border);}
        .ep-btn.ghost:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .ep-btn:disabled{opacity:0.5;cursor:not-allowed;box-shadow:none;}
        .ep-spin{animation:ep-rot .8s linear infinite;}
        @keyframes ep-rot{to{transform:rotate(360deg)}}

        /* history */
        .ep-chips{display:flex;gap:6px;margin-bottom:1.2rem;flex-wrap:wrap;}
        .ep-chip{display:inline-flex;align-items:center;gap:6px;padding:0.45rem 1rem;border-radius:100px;border:1px solid var(--border);background:var(--surface);color:var(--text-secondary);font-family:inherit;font-size:0.8rem;font-weight:700;cursor:pointer;}
        .ep-chip:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .ep-chip.on{background:var(--accent);border-color:var(--accent);color:#fff;}
        .ep-chip em{font-style:normal;font-size:0.72rem;opacity:0.75;}
        .ep-list{display:flex;flex-direction:column;gap:0.7rem;}
        .ep-exp{position:relative;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:start;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1rem 1.2rem 1rem 1.4rem;overflow:hidden;}
        .ep-exp::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--sc);}
        .ep-exp:hover{border-color:var(--border-hover);}
        .ep-exp-d{font-size:0.92rem;font-weight:700;margin-bottom:5px;}
        .ep-exp-m{display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center;font-size:0.78rem;color:var(--text-muted);}
        .ep-exp-code{font-weight:700;color:var(--accent);}
        .ep-exp-r{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
        .ep-exp-a{font-size:1.05rem;font-weight:800;font-variant-numeric:tabular-nums;}
        .ep-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:100px;border:1px solid;font-size:0.72rem;font-weight:700;white-space:nowrap;}
        .ep-pill::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;}
        .ep-remarks{margin-top:8px;font-size:0.8rem;color:var(--red);background:var(--red-soft);border-radius:10px;padding:0.5rem 0.8rem;}
        .ep-empty{padding:3rem 1.5rem;text-align:center;border:1px dashed var(--border);border-radius:16px;color:var(--text-muted);font-size:0.9rem;line-height:1.7;}
        .ep-empty b{display:block;color:var(--text-primary);font-size:1rem;margin-bottom:4px;}

        @media(max-width:760px){
          .ep-grid3,.ep-totals{grid-template-columns:1fr;}
        }
        @media(max-width:640px){
          .ep-root{padding:1.25rem 1rem 3rem;}
          .ep-title{font-size:1.5rem;}
          .ep-kpis{grid-template-columns:1fr 1fr;}
          .ep-kpis .ep-kpi:last-child{grid-column:1 / -1;}
          .ep-card{padding:1.2rem;border-radius:18px;}
          .ep-tab{font-size:0.78rem;padding:0.6rem 0.4rem;}
          .ep-input,.ep-select,.ep-ta{font-size:16px;} /* stops iOS zoom on focus */
          .ep-bar{flex-direction:column-reverse;align-items:stretch;}
          .ep-exp{grid-template-columns:1fr;}
          .ep-exp-r{flex-direction:row;align-items:center;justify-content:space-between;}
        }
      `}</style>

      <div className="ep-root">
        <div className="ep-inner">

          {/* Header */}
          <div className="ep-head">
            <div>
              <h1 className="ep-title">Expenses</h1>
              <p className="ep-sub">Claim advances and reimbursements, and follow their approval.</p>
            </div>
            {employeeName && (
              <div className="ep-user">
                <div className="ep-avatar">{employeeName.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}</div>
                <div>
                  <div className="ep-user-name">{employeeName}</div>
                  <div className="ep-user-id">#{employeeId||"…"}</div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="ep-kpis">
            <div className="ep-kpi" style={{["--kc" as any]:"var(--accent)"}}><span className="ep-kpi-l"><span className="ep-kpi-dot"/>Total submitted</span><div className="ep-kpi-n">₹{totalSubmitted.toLocaleString("en-IN")}</div></div>
            <div className="ep-kpi" style={{["--kc" as any]:"var(--green)"}}><span className="ep-kpi-l"><span className="ep-kpi-dot"/>Approved</span><div className="ep-kpi-n">₹{totalApproved.toLocaleString("en-IN")}</div></div>
            <div className="ep-kpi" style={{["--kc" as any]:"var(--yellow)"}}><span className="ep-kpi-l"><span className="ep-kpi-dot"/>Pending review</span><div className="ep-kpi-n">{pendingCount} item{pendingCount!==1?"s":""}</div></div>
          </div>

          {/* Tabs */}
          <div className="ep-tabs" role="tablist">
            <button role="tab" aria-selected={activeTab==="submit"} className={`ep-tab ${activeTab==="submit"?"active":""}`} onClick={()=>setActiveTab("submit")}>New claim</button>
            <button role="tab" aria-selected={activeTab==="history"} className={`ep-tab ${activeTab==="history"?"active":""}`} onClick={()=>setActiveTab("history")}>
              My claims {pendingCount>0&&<span className="ep-tab-badge">{pendingCount}</span>}
            </button>
          </div>

          {/* ═══ SUBMIT TAB ═══ */}
          {activeTab==="submit"&&(<>
            <div className="ep-card">
              <h2 className="ep-h">Claim details</h2>
              <div className="ep-grid3">
                <div className="ep-field">
                  <label htmlFor="ep-project">Project / PO number</label>
                  <select id="ep-project" className="ep-select" value={projectCode} onChange={e=>setProjectCode(e.target.value)}>
                    <option value="">Select a project</option>
                    {projects.map(p=><option key={p.id} value={p.code}>{p.code} · {p.name}</option>)}
                    <option value="OTHER">Other / no project</option>
                  </select>
                </div>
                <div className="ep-field">
                  <label htmlFor="ep-from">Expense period from</label>
                  <input id="ep-from" type="date" className="ep-input" value={periodFrom} onChange={e=>setPeriodFrom(e.target.value)}/>
                </div>
                <div className="ep-field">
                  <label htmlFor="ep-to">Expense period to</label>
                  <input id="ep-to" type="date" className="ep-input" value={periodTo} min={periodFrom||undefined} onChange={e=>setPeriodTo(e.target.value)}/>
                </div>
              </div>
              <div className="ep-field">
                <label htmlFor="ep-purpose">Business purpose</label>
                <textarea id="ep-purpose" className="ep-ta" value={businessPurpose} onChange={e=>setBusinessPurpose(e.target.value)} placeholder="Describe the business purpose of these expenses"/>
              </div>
            </div>

            <div className="ep-card">
              <h2 className="ep-h">Expense items</h2>
              <div className="ep-table-wrap">
                <table className="ep-table">
                  <thead>
                    <tr>
                      <th style={{width:"150px"}}>Date</th>
                      <th>Description</th>
                      <th style={{width:"180px"}}>Category</th>
                      <th style={{width:"140px"}}>Amount (₹)</th>
                      <th style={{width:"44px"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row=>(
                      <tr key={row.id}>
                        <td><input type="date" className="ep-input" aria-label="Date" value={row.date} onChange={e=>updateRow(row.id,"date",e.target.value)}/></td>
                        <td><input className="ep-input" aria-label="Description" value={row.description} onChange={e=>updateRow(row.id,"description",e.target.value)} placeholder="Route, vendor or purpose"/></td>
                        <td>
                          <select className="ep-select" aria-label="Category" value={row.category} onChange={e=>updateRow(row.id,"category",e.target.value)}>
                            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td><input className="ep-input" aria-label="Amount in rupees" inputMode="decimal" value={row.cost} onChange={e=>updateRow(row.id,"cost",e.target.value)} placeholder="0.00"/></td>
                        <td>
                          <button className="ep-del" onClick={()=>removeRow(row.id)} aria-label="Remove row" disabled={rows.length===1} style={rows.length===1?{opacity:0.3,cursor:"not-allowed"}:undefined}>
                            <X size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="ep-add" onClick={addRow}><Plus size={16}/> Add another item</button>
            </div>

            <div className="ep-card">
              <h2 className="ep-h">Summary</h2>
              <div className="ep-totals">
                <div className="ep-note">
                  <b><AlertTriangle size={16}/> Before you submit</b>
                  <ul>
                    <li>Attach all original receipts to the physical expense form.</li>
                    <li>Mileage reimbursement for a personal car is <strong>₹7.5 per km</strong>.</li>
                    <li>Claims submitted without bills may not be processed.</li>
                    <li>Submit within <strong>30 days</strong> of incurring the expense.</li>
                  </ul>
                </div>
                <div>
                  <div className="ep-trow"><span className="ep-tk">Subtotal</span><span className="ep-tv accent">₹{subtotal.toFixed(2)}</span></div>
                  <div className="ep-trow">
                    <label className="ep-tk" htmlFor="ep-adv">Less cash advance</label>
                    <div className="ep-adv">
                      <span>₹</span>
                      <input id="ep-adv" className="ep-input" inputMode="decimal" value={cashAdvance} onChange={e=>setCashAdvance(e.target.value)}/>
                    </div>
                  </div>
                  <div className="ep-trow"><span className="ep-tk" style={{fontWeight:700,color:"var(--text-primary)"}}>Total reimbursement</span><span className="ep-tv big">₹{totalReimbursement.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            {submitError&&<div className="ep-error"><AlertTriangle size={16}/>{submitError}</div>}

            <div className="ep-bar">
              <button className="ep-btn ghost" onClick={()=>setRows([emptyRow()])} disabled={submitting}>Clear items</button>
              <button className="ep-btn primary" disabled={submitting} onClick={handleSubmit}>
                {submitting?<><Loader2 size={16} className="ep-spin"/> Submitting…</>:"Submit claim"}
              </button>
            </div>
          </>)}

          {/* ═══ HISTORY TAB ═══ */}
          {activeTab==="history"&&(
            <div className="ep-card">
              <h2 className="ep-h">My claims</h2>
              <div className="ep-chips">
                {(["All","Pending","Approved","Rejected"] as const).map(f=>(
                  <button key={f} className={`ep-chip ${histFilter===f?"on":""}`} onClick={()=>setHistFilter(f)}>
                    {f}{f!=="All"&&<em>{expenses.filter(e=>e.status===f).length}</em>}
                  </button>
                ))}
              </div>
              {loadingExp?(
                <div className="ep-empty">Loading…</div>
              ):filteredExp.length===0?(
                <div className="ep-empty">
                  <b>{histFilter==="All"?"No claims yet":`No ${histFilter.toLowerCase()} claims`}</b>
                  {histFilter==="All"?"Submit your first claim from the New claim tab.":"Try another filter."}
                </div>
              ):(
                <div className="ep-list">
                  {filteredExp.map(e=>{
                    const sc=STATUS_CFG[e.status];
                    return(
                      <div className="ep-exp" key={e.id} style={{["--sc" as any]:sc.color}}>
                        <div>
                          <div className="ep-exp-d">{e.description}</div>
                          <div className="ep-exp-m">
                            <span>{fmt(e.date)}</span>
                            <span>{e.category}</span>
                            {e.projectCode&&<span className="ep-exp-code">{e.projectCode}</span>}
                            <span>Submitted {fmt(e.submittedOn)}</span>
                          </div>
                          {e.remarks&&<div className="ep-remarks"><strong>Remarks:</strong> {e.remarks}</div>}
                        </div>
                        <div className="ep-exp-r">
                          <div className="ep-exp-a">₹{e.amount.toLocaleString("en-IN")}</div>
                          <span className="ep-pill" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}>{e.status}</span>
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
