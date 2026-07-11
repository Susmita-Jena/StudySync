// api.js
// Thin wrapper around fetch() for every backend endpoint. The token is kept
// in localStorage (fine here — this is a real deployed page hitting a real
// server, not an inline artifact preview) so you stay logged in across visits.

const TOKEN_KEY = "studysync_token";
const USER_KEY = "studysync_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch("/api" + path, { ...options, headers });
  } catch (networkErr) {
    const err = new Error("network");
    err.isNetworkError = true;
    throw err;
  }

  if (res.status === 401) {
    clearSession();
    const err = new Error("Session expired");
    err.isAuthError = true;
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Something went wrong." }));
    throw new Error(body.error || "Something went wrong.");
  }

  if (res.status === 204) return null;
  return res.json();
}

const api = {
  isLoggedIn: () => !!getToken(),
  getCachedUser,
  logout: clearSession,

  register: (name, email, password) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) })
      .then((data) => { setSession(data.token, data.user); return data; }),

  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
      .then((data) => { setSession(data.token, data.user); return data; }),

  me: () => apiFetch("/me"),

  getTasks: () => apiFetch("/tasks"),
  addTask: (text, priority) => apiFetch("/tasks", { method: "POST", body: JSON.stringify({ text, priority }) }),
  toggleTask: (id, done) => apiFetch(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  deleteTask: (id) => apiFetch(`/tasks/${id}`, { method: "DELETE" }),

  getMoods: () => apiFetch("/mood"),
  logMood: (mood, color, note, date) =>
    apiFetch("/mood", { method: "POST", body: JSON.stringify({ mood, color, note, date }) }),

  getState: () => apiFetch("/state"),
  getAchievements: () => apiFetch("/achievements"),
  completePomodoro: (minutes, type) =>
    apiFetch("/pomodoro/complete", { method: "POST", body: JSON.stringify({ minutes, type }) }),
  setWater: (count, date) => apiFetch("/water", { method: "POST", body: JSON.stringify({ count, date }) }),
};

window.studySyncApi = api;
