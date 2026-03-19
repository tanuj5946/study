const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: authHeaders(),
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// auth
export const login   = (email: string, password: string) =>
  request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signup  = (name: string, email: string, password: string) =>
  request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const getMe   = () => request<User>("/api/auth/me");

// subjects + modules
export const getSubjects = () => request<Subject[]>("/api/subjects");
export const getModules  = (subjectId: number) =>
  request<Module[]>(`/api/subjects/${subjectId}/modules`);

// tests
export const getQuestions = (moduleId: number) =>
  request<Question[]>(`/api/tests/${moduleId}`);
export const submitTest   = (payload: SubmitPayload) =>
  request<AssessmentResult>("/api/tests/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// results + recommendations
export const getMyResults       = () =>
  request<AssessmentResult[]>("/api/tests/results/me");
export const getRecommendations = () =>
  request<TopicMastery[]>("/api/tests/recommendations");

// notes
export const getNotes = (moduleId: number) =>
  request<Note[]>(`/api/notes/${moduleId}`);

// ── Types ─────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: User;
}
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}
export interface Subject {
  id: number;
  name: string;
  description: string;
  modules: Module[];
}
export interface Module {
  id: number;
  subject_id: number;
  module_name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimated_hours: number;
  notes?: Note[];
}
export interface Question {
  id: number;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  options: string[];
  correct_answer: string;
}
export interface SubmitPayload {
  module_id: number;
  answers: {
    question_id: number;
    selected_answer: string;
    is_correct: boolean;
  }[];
}
export interface AssessmentResult {
  assessment_id: number;
  score: number;
  total_questions: number;
  percentage: string;
  module_name?: string;
  subject_name?: string;
  created_at?: string;
}
export interface TopicMastery {
  topic: string;
  accuracy: number;
  attempts: number;
}
export interface Note {
  id: number;
  title: string;
  content: string;
}

// planner
export const getSessions = (from: string, to: string) =>
  request<StudySession[]>(`/api/planner?from=${from}&to=${to}`);

export const createSession = (payload: SessionPayload) =>
  request<StudySession>('/api/planner', { method: 'POST', body: JSON.stringify(payload) });

export const updateSession = (id: number, payload: Partial<SessionPayload & { completed: boolean }>) =>
  request<StudySession>(`/api/planner/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteSession = (id: number) =>
  request(`/api/planner/${id}`, { method: 'DELETE' });

// profile
export const getProfile    = () => request<User>('/api/profile');
export const updateProfile = (name: string) =>
  request<User>('/api/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
export const changePassword = (current_password: string, new_password: string) =>
  request('/api/profile/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) });
export const deleteAccount = () =>
  request('/api/profile', { method: 'DELETE' });

// new types
export interface StudySession {
  id: number;
  user_id: number;
  title: string;
  description: string;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  module_id: number | null;
  completed: boolean;
}

export interface SessionPayload {
  title: string;
  description: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  module_id?: number;
}
// mini test
export const getMiniTestQuestions = (moduleId: number) =>
  request<Question[]>(`/api/minitest/${moduleId}/questions`);

export const getMiniTestStatus = (moduleId: number) =>
  request<MiniTestStatus>(`/api/minitest/${moduleId}/status`);

export const submitMiniTest = (moduleId: number, answers: { question_id: number; selected_answer: string }[]) =>
  request<MiniTestResult>(`/api/minitest/${moduleId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });

export const getUnlocks = () =>
  request<{ unlocked_ids: number[]; flagged_ids: number[] }>('/api/minitest/unlocks');

export interface MiniTestStatus {
  unlocked: boolean;
  attempts: number;
  max_attempts: number;
  passed: boolean;
  flagged: boolean;
  can_attempt: boolean;
}

export interface MiniTestResult {
  score: number;
  total: number;
  passed: boolean;
  flagged: boolean;
  attempts_used: number;
  attempts_left: number;
}