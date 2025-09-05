import axios from "axios";

const api = axios.create({ baseURL: "http://127.0.0.1:8000/api" });

export async function adminLogin(username, password) {
  const { data } = await api.post("/admin/login", { username, password });
  return data; // { status, token }
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("ADMIN_TOKEN")}` });

export const fetchOrgs  = () => api.get("/admin/organizations", { headers: auth() });
export const deleteOrg  = (id) => api.delete(`/admin/organizations/${id}`, { headers: auth() });
export const fetchUsers = () => api.get("/admin/users", { headers: auth() });
export const toggleUser = (id) => api.patch(`/admin/users/${id}/restriction`, {}, { headers: auth() });
