import { useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

type KpiCard = {
  icon: typeof Clock;
  label: string;
  value: string;
  change: string;
  tone: string;
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

function formatDelta(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) {
    return "0 pts";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(0)} pts`;
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
        return new Date(`${dateValue}T00:00:00`) >= new Date(`${format(today, "yyyy-MM-dd")}T00:00:00`);
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
    const avgSessionMinutes = data.recommendations.studyStats.sessions_this_week > 0
      ? Math.round(last7Minutes / Math.max(data.recommendations.studyStats.sessions_this_week, 1))
      : 0;
    const weeklyGoalMinutes = 360;
    const weeklyGoalProgress = Math.min(100, Math.round((last7Minutes / weeklyGoalMinutes) * 100));
    const nextSessionDate = upcomingSessions[0] ? getSessionDateValue(upcomingSessions[0]) : null;

    const masteryData = data.analytics.topicMastery
      .slice(0, 6)
      .map((topic) => ({
        topic: topic.topic.length > 15 ? `${topic.topic.slice(0, 12)}...` : topic.topic,
        mastery: Number(topic.accuracy),
      }));

    const scoreTrendData = data.analytics.trend.slice(-7).map((item, index, source) => {
      const trendWindow = source.slice(Math.max(0, index - 2), index + 1);
      const rollingAverage = trendWindow.reduce((sum, row) => sum + Number(row.avg_score), 0) / trendWindow.length;

      return {
        day: format(new Date(item.date), "MMM d"),
        score: Number(item.avg_score),
        rollingAverage: Number(rollingAverage.toFixed(1)),
      };
    });

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
        priority: topic.priority === "high" ? "High" : "Medium",
        action: `Revise ${topic.topic}`,
        detail: `${topic.accuracy}% accuracy across ${topic.attempts} attempts`,
      })),
      ...data.recommendations.nextModules.slice(0, 2).map((module) => ({
        priority: module.flagged ? "High" : "Medium",
        action: `${module.action} ${module.module_name}`,
        detail: `${module.subject_name} · ${module.reason}`,
      })),
    ];

    const totalTopics = data.analytics.masteryMap.reduce((sum, subject) => (
      sum + subject.counts.not_started + subject.counts.learning + subject.counts.shaky + subject.counts.strong
    ), 0);
    const startedTopics = data.analytics.masteryMap.reduce((sum, subject) => (
      sum + subject.counts.learning + subject.counts.shaky + subject.counts.strong
    ), 0);
    const strongTopics = data.analytics.masteryMap.reduce((sum, subject) => sum + subject.counts.strong, 0);
    const shakyTopics = data.analytics.masteryMap.reduce((sum, subject) => sum + subject.counts.shaky, 0);
    const masteryCoverage = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;
    const passRate = Number(data.analytics.summary.total_tests) > 0
      ? Math.round((Number(data.analytics.summary.passed) / Number(data.analytics.summary.total_tests)) * 100)
      : 0;
    const strongestSubject = data.analytics.bySubject[0]?.subject_name ?? "No tests yet";
    const recentScores = scoreTrendData.slice(-3).map((item) => item.score);
    const previousScores = scoreTrendData.slice(-6, -3).map((item) => item.score);
    const recentAverage = recentScores.length > 0
      ? recentScores.reduce((sum, value) => sum + value, 0) / recentScores.length
      : 0;
    const previousAverage = previousScores.length > 0
      ? previousScores.reduce((sum, value) => sum + value, 0) / previousScores.length
      : recentAverage;
    const momentum = recentAverage - previousAverage;

    const masteryDistributionData = data.analytics.masteryMap.map((subject) => ({
      subject: subject.subject_name.length > 15 ? `${subject.subject_name.slice(0, 12)}...` : subject.subject_name,
      not_started: subject.counts.not_started,
      learning: subject.counts.learning,
      shaky: subject.counts.shaky,
      strong: subject.counts.strong,
    }));

    const kpis: KpiCard[] = [
      {
        icon: Clock,
        label: "Study Hours",
        value: formatHours(last7Minutes),
        change: `${activeStudyDays}/7 active days · avg ${avgSessionMinutes} min/session`,
        tone: "text-sky-600",
      },
      {
        icon: Activity,
        label: "Consistency",
        value: `${consistencyScore}%`,
        change: `${weeklyGoalProgress}% of weekly study goal`,
        tone: "text-violet-600",
      },
      {
        icon: TrendingUp,
        label: "Pass Rate",
        value: `${passRate}%`,
        change: data.analytics.summary.total_tests
          ? `${data.analytics.summary.passed}/${data.analytics.summary.total_tests} tests cleared`
          : "No tests attempted yet",
        tone: "text-emerald-600",
      },
      {
        icon: ArrowRight,
        label: "Momentum",
        value: formatDelta(momentum),
        change: previousScores.length > 0 ? "Recent trend vs previous 3 test days" : "Needs more trend data",
        tone: momentum >= 0 ? "text-emerald-600" : "text-amber-600",
      },
      {
        icon: BookOpen,
        label: "Mastery Coverage",
        value: `${masteryCoverage}%`,
        change: `${startedTopics}/${totalTopics || 0} topics started · ${strongTopics} strong`,
        tone: "text-primary",
      },
      {
        icon: AlertTriangle,
        label: "Focus Queue",
        value: `${shakyTopics + data.recommendations.revisionQueue.length}`,
        change: data.recommendations.revisionQueue.length
          ? `${data.recommendations.revisionQueue.length} revision topics due`
          : `Top subject: ${strongestSubject}`,
        tone: "text-amber-600",
      },
    ];

    return {
      actionItems,
      consistencyScore,
      kpis,
      masteryData,
      masteryDistributionData,
      nextSessionDate,
      scoreTrendData,
      studyTimeData,
      subjectOverview,
      upcomingSessions,
      weeklyGoalMinutes,
      weeklyGoalProgress,
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

  const { analytics } = data;
  const { summary } = analytics;
  const {
    actionItems,
    kpis,
    masteryData,
    masteryDistributionData,
    nextSessionDate,
    scoreTrendData,
    studyTimeData,
    subjectOverview,
    upcomingSessions,
    weeklyGoalMinutes,
    weeklyGoalProgress,
  } = derived;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">Your academic performance at a glance.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className={kpi.tone} />
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.change}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Study Rhythm</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Weekly goal: {formatHours(weeklyGoalMinutes)} · {weeklyGoalProgress}% completed
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Last 7 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={studyTimeData}>
              <defs>
                <linearGradient id="dashboardStudyFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="hsl(198 93% 60%)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="hsl(198 93% 60%)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <ReferenceLine y={1} stroke="hsl(220 10% 70%)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value: number) => [`${value}h`, "Study time"]}
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="hsl(198 93% 45%)"
                fill="url(#dashboardStudyFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Performance Trend</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Includes rolling average and pass threshold
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Pass line 60%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreTrendData}>
              <defs>
                <linearGradient id="dashboardScoreFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="hsl(238 65% 60%)" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="hsl(238 65% 60%)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" domain={[0, 100]} />
              <ReferenceLine y={60} stroke="hsl(0 72% 51%)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value: number, name: string) => [value, name === "rollingAverage" ? "Rolling avg" : "Average score"]}
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="score" stroke="hsl(238 65% 60%)" fill="url(#dashboardScoreFill)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="rollingAverage" stroke="hsl(152 57% 45%)" fillOpacity={0} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Subject Mastery Mix</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Topic distribution by subject from untouched to strong
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Not started</span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Learning</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Shaky</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">Strong</span>
            </div>
          </div>
          {masteryDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={masteryDistributionData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis type="category" dataKey="subject" width={95} tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <Tooltip
                  formatter={(value: number, name: string) => [value, String(name).replace("_", " ")]}
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(220 14% 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="not_started" stackId="mastery" fill="hsl(215 20% 88%)" radius={[4, 0, 0, 4]} />
                <Bar dataKey="learning" stackId="mastery" fill="hsl(217 91% 60%)" />
                <Bar dataKey="shaky" stackId="mastery" fill="hsl(38 92% 50%)" />
                <Bar dataKey="strong" stackId="mastery" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Mastery distribution appears after subjects and topics are mapped.
            </div>
          )}
        </div>

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
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Topic Mastery Snapshot</h3>
          </div>
          {nextSessionDate && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Upcoming session {format(new Date(`${nextSessionDate}T00:00:00`), "MMM d")}
            </span>
          )}
        </div>
        {masteryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={masteryData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" width={100} />
              <ReferenceLine x={50} stroke="hsl(38 92% 50%)" strokeDasharray="4 4" />
              <ReferenceLine x={75} stroke="hsl(142 71% 45%)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Mastery"]}
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="mastery" radius={[0, 6, 6, 0]}>
                {masteryData.map((entry) => (
                  <Cell
                    key={entry.topic}
                    fill={entry.mastery >= 75 ? "hsl(142 71% 45%)" : entry.mastery >= 50 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Topic mastery will appear after you attempt some tests.
          </div>
        )}
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
          Overview is connected to live progress data. As you take tests and plan sessions, these cards and charts will become much more informative.
        </div>
      )}

      {upcomingSessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          No upcoming planner sessions yet. Add a few study blocks to unlock richer goal tracking here.
        </div>
      )}
    </div>
  );
}
