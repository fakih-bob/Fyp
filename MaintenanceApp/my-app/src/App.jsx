import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./Style.css";
import { adminLogin, fetchOrgs, deleteOrg, fetchUsers, toggleUser } from "./Api";

function Login() {
  const [u, setU] = React.useState("admin");
  const [p, setP] = React.useState("admin");
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setMsg("Signing in..."); setErr("");
    try {
      if (u !== "admin" || p !== "admin") throw new Error("Invalid admin credentials");
      const { token } = await adminLogin(u, p);
      localStorage.setItem("ADMIN_TOKEN", token);
      nav("/admin", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2.message);
      setMsg("");
    }
  }

  return (
    <div className="container">
      <h1>Admin Login</h1>
      <form className="card" onSubmit={submit}>
        <label>Username<input value={u} onChange={e=>setU(e.target.value)}/></label>
        <label>Password<input type="password" value={p} onChange={e=>setP(e.target.value)}/></label>
        <button type="submit">Login</button>
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="err">{err}</div>}
      </form>
    </div>
  );
}

function Admin() {
  const nav = useNavigate();
  const [orgs, setOrgs] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [omsg, setOmsg] = React.useState("");
  const [umsg, setUmsg] = React.useState("");

  async function loadOrgs() {
    setOmsg("Loading...");
    try {
      const { data } = await fetchOrgs();
      setOrgs(data.organizations || []);
      setOmsg(`Loaded ${data.organizations?.length ?? 0} organizations.`);
    } catch (e) { setOmsg(e?.response?.data?.error || e.message); }
  }

  async function loadUsers() {
    setUmsg("Loading...");
    try {
      const { data } = await fetchUsers();
      const list = (data.Users || []).map(u=>({ id:u.id, name:u.name, email:u.email, is_restricted:!!u.is_restricted }));
      setUsers(list);
      setUmsg(`Loaded ${list.length} users.`);
    } catch (e) { setUmsg(e?.response?.data?.error || e.message); }
  }

  React.useEffect(()=>{ loadOrgs(); loadUsers(); }, []);

  async function delOrg(id){
    if(!confirm(`Delete org #${id}?`)) return;
    try {
      const { data } = await deleteOrg(id);
      setOmsg(data.message || "Deleted.");
      await loadOrgs();
    } catch(e){ setOmsg(e?.response?.data?.error || e.message); }
  }

  async function onToggleUser(id){
    try {
      const { data } = await toggleUser(id);
      setUmsg(data.message || "Updated.");
      setUsers(prev=>prev.map(u=>u.id===id?{...u,is_restricted:data.is_restricted}:u));
    } catch(e){ setUmsg(e?.response?.data?.error || e.message); }
  }

  function logout(){ localStorage.removeItem("ADMIN_TOKEN"); nav("/login", {replace:true}); }

  return (
    <div className="container">
      <header className="toolbar">
        <h1>Admin Panel</h1>
        <button onClick={logout}>Logout</button>
      </header>

      <section className="card">
        <h2>Organizations</h2>
        <div className="toast">{omsg}</div>
        <div className="table-wrap">
          <table><thead><tr>
            <th style={{width:80}}>ID</th><th>Name</th><th style={{width:140}}>Owner ID</th>
            <th style={{width:220}}>Created</th><th className="right" style={{width:120}}>Actions</th>
          </tr></thead><tbody>
            {orgs.length===0 && <tr><td colSpan="5">No data.</td></tr>}
            {orgs.map(o=>(
              <tr key={o.id}>
                <td>{o.id}</td><td>{o.name??"-"}</td><td>{o.owner_id??"-"}</td><td>{o.created_at??"-"}</td>
                <td className="right"><button className="danger" onClick={()=>delOrg(o.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </section>

      <section className="card" style={{marginTop:16}}>
        <h2>Users</h2>
        <div className="toast">{umsg}</div>
        <div className="table-wrap">
          <table><thead><tr>
            <th style={{width:80}}>ID</th><th>Name</th><th>Email</th>
            <th style={{width:150}}>Restricted</th><th className="right" style={{width:180}}>Actions</th>
          </tr></thead><tbody>
            {users.length===0 && <tr><td colSpan="5">No data.</td></tr>}
            {users.map(u=>(
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.is_restricted?"Yes":"No"}</td>
                <td className="right"><button onClick={()=>onToggleUser(u.id)}>{u.is_restricted?"Unrestrict":"Restrict"}</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}

function Gate({children}) {
  const authed = !!localStorage.getItem("ADMIN_TOKEN");
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/admin" element={<Gate><Admin/></Gate>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
