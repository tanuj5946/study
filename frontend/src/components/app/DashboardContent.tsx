import { useEffect, useMemo, useState } from "react";
import { format, addDays, subDays } from "date-fns";
import {
  Clock, Activity, CalendarDays, AlertTriangle, Lightbulb,
  BookOpen, TrendingUp, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

import {
  getAnalyticsSummary,
  getRecommendationsFull,
  getSessions,
  getSubjects,
  type AnalyticsSummary,
  type RecommendationData,
  type StudySession,
  type Subject,
} from "@/lib/api";

type DashboardState = {
  analytics: AnalyticsSummary;
  recommendations: RecommendationData;
  sessions: StudySession[];
  subjects: Subject[];
};

type ActionItem = {
  priority: "High" | "Medium" | "Low";
  action: string;
  detail: string;
};

function getSessionDateValue(session: Pick<StudySession, "date" | "session_date">) {
  const raw = session.date ?? session.session_date;
  if (!raw) return null;
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function getPriorityLabel(score: number) {
  if (score < 60) return { label: "Needs focus", className: "bg-destructive/10 text-destructive" };
  if (score < 75) return { label: "Improving", className: "bg-amber-100 text-amber-700" };
  return { label: "On track", className: "bg-accent text-accent-foreground" };
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

export function DashboardContent() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const from = format(subDays(today, 29), "yyyy-MM-dd");
    const to = format(addDays(today, 30), "yyyy-MM-dd");

    Promise.all([
      getAnalyticsSummary(),
      getRecommendationsFull(),
      getSessions(from, to),
      getSubjects(),
    ])
      .then(([analytics, recommendations, sessions, subjects]) => {
        setData({ analytics, recommendations, sessions, subjects });
      })
      .catch((err: Error) => setError(err.message || "Failed to load overview"))
      .finally(() => setLoading(false));
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;

    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(today, 6 - index);
      return {
        key: format(date, "yyyy-MM-dd"),
        label: format(date, "EEE"),
      };
    });

    const sessionBuckets = new Map<string, number>();
    const upcomingSessions = data.sessions
      .filter((session) => {
        const dateValue = getSessionDateValue(session);
        if (!dateValue || session.completed) return false;
        return new Date(`${dateValue}T00:00:00`) >= new Date(format(today, "yyyy-MM-dd") + "T00:00:00");
      })
      .sort((a, b) => {
        const dateA = getSessionDateValue(a) ?? "";
        const dateB = getSessionDateValue(b) ?? "";
        return dateA.localeCompare(dateB) || (a.start_time ?? "").localeCompare(b.start_time ?? "");
      });

    data.sessions.forEach((session) => {
      const dateValue = getSessionDateValue(session);
      if (!dateValue) return;
      sessionBuckets.set(dateValue, (sessionBuckets.get(dateValue) ?? 0) + (session.duration_minutes || 0));
    });

    const studyTimeData = last7Days.map((day) => ({
      day: day.label,
      hours: Number(((sessionBuckets.get(day.key) ?? 0) / 60).toFixed(1)),
    }));

    const last7Minutes = studyTimeData.reduce((sum, day) => sum + day.hours * 60, 0);
    const activeStudyDays = studyTimeData.filter((day) => day.hours > 0).length;
    const consistencyScore = Math.round((activeStudyDays / 7) * 100);

    const nextSessionDate = upcomingSessions[0] ? getSessionDateValue(upcomingSessions[0]) : null;

    const masteryData = data.analytics.topicMastery
      .slice(0, 6)
      .map((topic) => ({
        topic: topic.topic.length > 14 ? `${topic.topic.slice(0, 11)}...` : topic.topic,
        mastery: Number(topic.accuracy),
      }));

    const scoreTrendData = data.analytics.trend
      .slice(-7)
      .map((item) => ({
        day: format(new Date(item.date), "MMM d"),
        score: Number(item.avg_score),
      }));

    const subjectLookup = new Map(
      data.analytics.bySubject.map((subject) => [subject.subject_name, subject])
    );
    const recommendationLookup = new Map(
      data.recommendations.subjectPerformance.map((subject) => [subject.subject, subject])
    );
    const nextModuleLookup = new Map<string, string>();

    data.recommendations.nextModules.forEach((module) => {
      if (!nextModuleLookup.has(module.subject_name)) {
        nextModuleLookup.set(module.subject_name, `${module.action} ${module.module_name}`);
      }
    });

    const subjectOverview = data.subjects.map((subject) => {
      const analytics = subjectLookup.get(subject.name);
      const recommendation = recommendationLookup.get(subject.name);
      const avgScore = analytics ? Number(analytics.avg_score) : 0;
      const status = getPriorityLabel(avgScore);

      return {
        name: subject.name,
        modules: subject.modules?.length ?? 0,
        tests: analytics?.total_tests ?? 0,
        avgScore,
        trend: recommendation?.trend ?? "stable",
        status,
        nextModule: nextModuleLookup.get(subject.name)
          ?? (subject.modules?.length && subject.modules.every((module) => module.notes_done)
            ? "All notes completed"
            : "No recommendation yet"),
      };
    });

    const actionItems: ActionItem[] = [
      ...data.recommendations.weakTopics.slice(0, 3).map((topic) => ({
        priority: topic.priority === "high" ? "High" as const : "Medium" as const,
        action: `Revise ${topic.topic}`,
        detail: `${topic.accuracy}% accuracy across ${topic.attempts} attempts`,
      })),
      ...data.recommendations.nextModules.slice(0, 2).map((module) => ({
        priority: module.flagged ? "High" as const : "Medium" as const,
        action: `${module.action} ${module.module_name}`,
        detail: `${module.subject_name} · ${module.reason}`,
      })),
    ];

    return {
      studyTimeData,
      masteryData,
      scoreTrendData,
      subjectOverview,
      actionItems,
      last7Minutes,
      consistencyScore,
      upcomingSessions,
      nextSessionDate,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data || !derived) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">Your academic performance at a glance.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {error || "Overview data could not be loaded."}
        </div>
      </div>
    );
  }

  const { analytics, recommendations } = data;
  const { summary } = analytics;
  const { studyTimeData, masteryData, scoreTrendData, subjectOverview, actionItems, last7Minutes, consistencyScore, upcomingSessions, nextSessionDate } = derived;

  const kpis = [
    {
      icon: Clock,
      label: "Study Hours",
      value: formatHours(last7Minutes),
      change: "Last 7 days",
    },
    {
      icon: Activity,
      label: "Consistency Score",
      value: `${consistencyScore}%`,
      change: `${recommendations.studyStats.sessions_this_week} sessions this week`,
    },
    {
      icon: CalendarDays,
      label: "Upcoming Sessions",
      value: `${upcomingSessions.length}`,
      change: nextSessionDate ? `Next: ${format(new Date(`${nextSessionDate}T00:00:00`), "MMM d")}` : "No upcoming sessions",
    },
    {
      icon: AlertTriangle,
      label: "Weak Topics",
      value: `${recommendations.weakTopics.length}`,
      change: recommendations.weakTopics.length
        ? recommendations.weakTopics.slice(0, 2).map((topic) => topic.topic).join(", ")
        : "No weak topics flagged",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">Your academic performance at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-primary mt-1">{kpi.change}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Study Time - Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={studyTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <Tooltip
                formatter={(value: number) => [`${value}h`, "Study time"]}
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="hours" fill="hsl(238 65% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Score Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" domain={[0, 100]} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Average score"]}
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="score" stroke="hsl(238 65% 60%)" strokeWidth={2} dot={{ fill: "hsl(238 65% 60%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Subject Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Modules</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tests</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Avg Score</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Next Focus</th>
                </tr>
              </thead>
              <tbody>
                {subjectOverview.map((subject) => (
                  <tr key={subject.name} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{subject.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{subject.modules}</td>
                    <td className="px-5 py-3 text-muted-foreground">{subject.tests}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${subject.avgScore}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{subject.avgScore.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${subject.status.className}`}>
                        {subject.status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{subject.nextModule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Topic Mastery</h3>
          </div>
          {masteryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={masteryData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
                <YAxis type="category" dataKey="topic" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" width={90} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Mastery"]}
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(220 14% 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="mastery" fill="hsl(238 65% 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Topic mastery will appear after you attempt some tests.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Next Actions</h3>
        </div>
        <div className="space-y-3">
          {actionItems.length > 0 ? (
            actionItems.map((item, index) => (
              <div key={`${item.action}-${index}`} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                  item.priority === "High"
                    ? "bg-destructive/10 text-destructive"
                    : item.priority === "Medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {item.priority}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item.action}</p>
                  <span className="text-xs text-muted-foreground">{item.detail}</span>
                </div>
                <ArrowRight size={14} className="text-muted-foreground mt-1 shrink-0" />
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              No AI actions yet. Take a few tests and add study sessions to unlock personalized guidance.
            </div>
          )}
        </div>
      </div>

      {summary.total_tests === 0 && (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Overview is now connected to real data. Once you start taking tests and adding planner sessions, these charts and cards will fill in automatically.
        </div>
      )}
    </div>
  );
}
