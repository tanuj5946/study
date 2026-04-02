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
export const markNoteRead = (noteId: number) =>
  request<{ success: boolean; progress: NoteProgress }>(`/api/notes/${noteId}/read`, {
    method: "POST",
  });
export const updateNoteProgress = (noteId: number, completed: boolean) =>
  request<{ success: boolean; progress: NoteProgress }>(`/api/notes/${noteId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
export const getNoteRevisionPack = (noteId: number) =>
  request<NoteRevisionPack>(`/api/notes/${noteId}/revision-pack`);
export const getNoteInlineChecks = (noteId: number) =>
  request<{ checks: NoteInlineCheck[] }>(`/api/notes/${noteId}/inline-checks`);

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
  notes_total?: number;
  notes_completed?: number;
  notes_done?: boolean;
  notes?: Note[];
}
export interface Question {
  id: number;
  module_id?: number;
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
  last_read_at?: string | null;
  completed?: boolean;
  completed_at?: string | null;
}

export interface NoteProgress {
  note_id: number;
  last_read_at: string | null;
  completed: boolean;
  completed_at: string | null;
}

export interface NoteRevisionPack {
  summary: string[];
  flashcards: {
    id: string;
    front: string;
    back: string;
  }[];
  quickQuestions: {
    id: string;
    question: string;
    answer: string;
  }[];
  tutorTips: string[];
}

export interface NoteInlineCheck {
  section_index: number;
  heading: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
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

// notifications
export const getNotificationPreferences = () =>
  request<NotificationPreferences>('/api/notifications/preferences');

export const updateNotificationPreferences = (payload: NotificationPreferences) =>
  request<NotificationPreferences>('/api/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const getNotifications = () =>
  request<NotificationsResponse>('/api/notifications');

export const markNotificationsRead = (notification_ids: string[]) =>
  request<{ success: boolean }>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notification_ids }),
  });

// new types
export interface StudySession {
  id: number;
  user_id: number;
  title: string;
  description: string;
  date: string;
  session_date: string;  
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

export interface NotificationPreferences {
  email_notifications: boolean;
  study_reminders: boolean;
  weekly_digest: boolean;
  progress_alerts: boolean;
}

export interface AppNotification {
  id: string;
  type: 'session' | 'milestone' | 'digest';
  title: string;
  body: string;
  created_at: string;
  event_at: string | null;
  read: boolean;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
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
export const getSubjectQuestions = (
  subjectId: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed',
  limit: number = 10
) => request<Question[]>(`/api/tests/subject/${subjectId}?difficulty=${difficulty}&limit=${limit}`);

// admin
export const adminGetQuestions = (moduleId?: number) =>
  request<AdminQuestion[]>(`/api/admin/questions${moduleId ? `?module_id=${moduleId}` : ''}`);

export const adminAddQuestion = (payload: AdminQuestionPayload) =>
  request<AdminQuestion>('/api/admin/questions', { method: 'POST', body: JSON.stringify(payload) });

export const adminDeleteQuestion = (id: number) =>
  request(`/api/admin/questions/${id}`, { method: 'DELETE' });

export const adminAddModule = (payload: AdminModulePayload) =>
  request<Module>('/api/admin/modules', { method: 'POST', body: JSON.stringify(payload) });

export const adminAddNote = (payload: AdminNotePayload) =>
  request<Note>('/api/admin/notes', { method: 'POST', body: JSON.stringify(payload) });

export interface AdminQuestion {
  id: number;
  module_id: number;
  module_name: string;
  subject_name: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[] | string | null;
  correct_answer: string;
}

export interface AdminQuestionPayload {
  module_id: number;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_answer: string;
}

export interface AdminModulePayload {
  subject_id: number;
  module_name: string;
  difficulty: string;
  estimated_hours: number;
}

export interface AdminNotePayload {
  module_id: number;
  title: string;
  content: string;
}

// analytics
export const getAnalyticsSummary = () =>
  request<AnalyticsSummary>('/api/analytics/summary');

export const getResults = () =>
  request<ResultRow[]>('/api/analytics/results');

export const getResultDetail = (id: number) =>
  request<ResultDetail>(`/api/analytics/results/${id}`);

export interface AnalyticsSummary {
  summary: {
    total_tests: number;
    avg_score: string;
    best_score: string;
    passed: number;
    failed: number;
  };
  bySubject: { subject_name: string; total_tests: number; avg_score: string }[];
  topicMastery: { topic: string; accuracy: string; attempts: number }[];
  trend: { date: string; avg_score: string; tests_taken: number }[];
  masteryMap: {
    subject_id: number;
    subject_name: string;
    counts: {
      not_started: number;
      learning: number;
      shaky: number;
      strong: number;
    };
    topics: {
      topic: string;
      attempts: number;
      accuracy: number;
      status: "not_started" | "learning" | "shaky" | "strong";
    }[];
  }[];
}

export interface ResultRow {
  id: number;
  score: number;
  total_questions: number;
  percentage: string;
  created_at: string;
  module_name: string;
  subject_name: string;
  passed: boolean;
}

export interface ResultDetail extends ResultRow {
  module_id?: number;
  answers: {
    question_id: number;
    module_id?: number;
    question: string;
    options: string[];
    correct_answer: string;
    selected_answer: string;
    is_correct: boolean;
    topic: string;
    difficulty: string;
    explanation: string | null;
    study_hint: string | null;
    related_notes: {
      id: number;
      title: string;
      module_id: number;
      module_name: string;
      subject_name: string;
      snippet: string;
    }[];
  }[];
}


// recommendations + chat
export const getRecommendationsFull = () =>
  request<RecommendationData>('/api/recommendations');

export const sendChatMessage = (message: string) =>
  request<{ response: string }>('/api/recommendations/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

export interface RecommendationData {
  weakTopics: {
    topic: string; accuracy: number; attempts: number; priority: string;
  }[];
  subjectPerformance: {
    subject: string; avg_score: number; tests: number; trend: string;
  }[];
  nextModules: {
    id: number; module_name: string; subject_name: string;
    difficulty: string; flagged: boolean; action: string; reason: string;
    notes_total?: number; notes_completed?: number;
  }[];
  revisionQueue: {
    topic: string;
    accuracy: number;
    interval_days: number;
    streak: number;
    due_at: string;
    overdue_hours: number;
    priority: string;
    reason: string;
    module_id?: number | null;
    module_name?: string | null;
    subject_name?: string | null;
  }[];
  predictions: {
    topic: string; current_accuracy: number;
    predicted_gain: number; predicted_score: number;
  }[];
  studyPlan: {
    day: string; focus: string; activity: string;
    duration: string; priority: string;
  }[];
  studyStats: {
    avg_minutes_per_day: number;
    sessions_this_week: number;
    total_tests: number;
  };
}
