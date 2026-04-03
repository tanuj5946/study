import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Trophy, Target, TrendingUp, XCircle, CheckCircle2,
  Download, ChevronRight, ArrowLeft, FileText, Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import {
  getAnalyticsSummary, getResults, getResultDetail,
  type AnalyticsSummary, type ResultRow, type ResultDetail,
} from "@/lib/api";

type View = { step: "list" } | { step: "detail"; id: number };

const chartTooltipStyle = {
  backgroundColor: "hsl(0 0% 100%)",
  border: "1px solid hsl(220 14% 90%)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
};

function shortLabel(value: string, limit = 18) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function formatMomentum(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) {
    return "Flat";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(0)} pts`;
}

function renderEmptyChart(message: string) {
  return (
    <div className="flex h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
      <div className="max-w-xs">{message}</div>
    </div>
  );
}

function csvValue(value: string | number | boolean | null | undefined) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-full bg-secondary p-2">
          <Icon size={15} className={color} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <p className="mt-2 text-xs leading-5 text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── Export helpers ── */
function exportCSV(results: ResultRow[]) {
  const headers = ["Date", "Subject", "Module", "Score", "Total", "Percentage", "Status"];
  const rows = results.map(r => [
    format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    r.subject_name,
    r.module_name,
    r.score,
    r.total_questions,
    `${r.percentage}%`,
    r.passed ? "Pass" : "Fail",
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `studysync-results-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportDetailCSV(detail: ResultDetail) {
  const headers = [
    "Date",
    "Subject",
    "Module",
    "Question No",
    "Topic",
    "Difficulty",
    "Question",
    "Your Answer",
    "Correct Answer",
    "Result",
  ];

  const rows = detail.answers.map((answer, index) => [
    format(new Date(detail.created_at), "yyyy-MM-dd HH:mm"),
    detail.subject_name,
    detail.module_name,
    index + 1,
    answer.topic,
    answer.difficulty,
    answer.question,
    answer.selected_answer || "-",
    answer.correct_answer,
    answer.is_correct ? "Correct" : "Incorrect",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvValue).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `result-${detail.id}-${detail.module_name.replace(/\s+/g, "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(results: ResultRow[], summary: AnalyticsSummary["summary"]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();

  // header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("StudySync - Test Results Report", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 28);

  // summary box
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 40);

  autoTable(doc, {
    startY: 44,
    head: [["Total Tests", "Avg Score", "Best Score", "Passed", "Failed"]],
    body: [[
      summary.total_tests,
      `${summary.avg_score}%`,
      `${summary.best_score}%`,
      summary.passed,
      summary.failed,
    ]],
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 10 },
  });

  // results table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const afterSummary = (doc as any).lastAutoTable.finalY + 10;
  doc.text("All Results", 14, afterSummary);

  autoTable(doc, {
    startY: afterSummary + 4,
    head: [["Date", "Subject", "Module", "Score", "%", "Status"]],
    body: results.map(r => [
      format(new Date(r.created_at), "dd MMM yyyy"),
      r.subject_name,
      r.module_name,
      `${r.score}/${r.total_questions}`,
      `${r.percentage}%`,
      r.passed ? "Pass" : "Fail",
    ]),
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 9 },
    columnStyles: {
      5: { fontStyle: "bold" },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 5 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw === "Pass" ? [0, 128, 0] : [200, 0, 0];
      }
    },
  });

  doc.save(`studysync-results-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

async function exportDetailPDF(detail: ResultDetail) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("StudySync - Test Detail Report", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Subject: ${detail.subject_name}  |  Module: ${detail.module_name}`, 14, 30);
  doc.text(`Date: ${format(new Date(detail.created_at), "dd MMM yyyy HH:mm")}`, 14, 36);
  doc.text(`Score: ${detail.score}/${detail.total_questions} (${detail.percentage}%)  |  Status: ${detail.passed ? "PASS" : "FAIL"}`, 14, 42);

  autoTable(doc, {
    startY: 50,
    head: [["#", "Question", "Your Answer", "Correct Answer", "Topic", "Result"]],
    body: detail.answers.map((a, i) => [
      i + 1,
      a.question,
      a.selected_answer || "-",
      a.correct_answer,
      a.topic,
      a.is_correct ? "OK" : "X",
    ]),
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 72 },
      5: { cellWidth: 12, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 5 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw === "OK" ? [0, 128, 0] : [200, 0, 0];
      }
    },
  });

  doc.save(`result-${detail.id}-${detail.module_name.replace(/\s+/g, "-")}.pdf`);
}

function ResultsList({ onView }: { onView: (id: number) => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAnalyticsSummary(), getResults()])
      .then(([analyticsSummary, resultRows]) => {
        setSummary(analyticsSummary);
        setResults(resultRows);
      })
      .finally(() => setLoading(false));
  }, []);

  const derived = useMemo(() => {
    if (!summary) return null;

    const { summary: aggregate, bySubject, topicMastery, trend, masteryMap } = summary;
    const totalTests = Number(aggregate.total_tests) || 0;
    const averageScore = Number(aggregate.avg_score) || 0;
    const bestScore = Number(aggregate.best_score) || 0;
    const passed = Number(aggregate.passed) || 0;
    const failed = Number(aggregate.failed) || 0;
    const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

    const totalTopics = masteryMap.reduce(
      (sum, subject) => sum + subject.counts.not_started + subject.counts.learning + subject.counts.shaky + subject.counts.strong,
      0
    );
    const strongTopics = masteryMap.reduce((sum, subject) => sum + subject.counts.strong, 0);
    const shakyTopics = masteryMap.reduce((sum, subject) => sum + subject.counts.shaky, 0);
    const startedTopics = masteryMap.reduce(
      (sum, subject) => sum + subject.counts.learning + subject.counts.shaky + subject.counts.strong,
      0
    );
    const masteryCoverage = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;

    const scoreTrendData = trend.map((item, index, points) => {
      const rollingWindow = points.slice(Math.max(0, index - 2), index + 1);
      const rollingAverage = rollingWindow.reduce((sum, point) => sum + Number(point.avg_score), 0) / rollingWindow.length;

      return {
        date: format(new Date(item.date), "MMM d"),
        score: Number(item.avg_score),
        rollingAverage: Number(rollingAverage.toFixed(1)),
        tests: item.tests_taken,
      };
    });

    const recentScores = scoreTrendData.slice(-3).map((item) => item.score);
    const previousScores = scoreTrendData.slice(-6, -3).map((item) => item.score);
    const recentAverage = recentScores.length
      ? recentScores.reduce((sum, value) => sum + value, 0) / recentScores.length
      : averageScore;
    const previousAverage = previousScores.length
      ? previousScores.reduce((sum, value) => sum + value, 0) / previousScores.length
      : recentAverage;
    const momentum = recentAverage - previousAverage;

    const subjectData = bySubject.map((subject) => ({
      subject: shortLabel(subject.subject_name, 16),
      fullName: subject.subject_name,
      avg: Number(subject.avg_score),
      tests: subject.total_tests,
    }));

    const masteryDistributionData = masteryMap.map((subject) => ({
      subject: shortLabel(subject.subject_name, 16),
      fullName: subject.subject_name,
      not_started: subject.counts.not_started,
      learning: subject.counts.learning,
      shaky: subject.counts.shaky,
      strong: subject.counts.strong,
    }));

    const weakestTopics = topicMastery.slice(0, 6).map((topic) => ({
      topic: shortLabel(topic.topic, 18),
      fullName: topic.topic,
      accuracy: Number(topic.accuracy),
      attempts: topic.attempts,
    }));

    return {
      averageScore,
      bestScore,
      failed,
      masteryCoverage,
      masteryDistributionData,
      masteryMap,
      momentum,
      passRate,
      passed,
      scoreTrendData,
      shakyTopics,
      strongTopics,
      strongestSubject: bySubject[0]?.subject_name ?? "No subject data",
      subjectData,
      totalTests,
      totalTopics,
      weakestTopic: topicMastery[0]?.topic ?? "No topic data",
      weakestTopics,
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!summary || !derived) return null;

  async function handleDetailExport(resultId: number, format: "csv" | "pdf") {
    const key = `${resultId}-${format}`;
    setExportingKey(key);

    try {
      const detail = await getResultDetail(resultId);
      if (format === "csv") {
        exportDetailCSV(detail);
      } else {
        await exportDetailPDF(detail);
      }
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export this test sheet.",
        variant: "destructive",
      });
    } finally {
      setExportingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cleaner KPIs and richer charts so you can spot trend, revision pressure, and mastery gaps faster.
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCSV(results)}>
              <Download size={14} /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportPDF(results, summary.summary)}>
              <FileText size={14} /> PDF
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard icon={Trophy} label="Total Tests" value={derived.totalTests} sub={`${summary.bySubject.length} subjects tracked`} color="text-sky-600" />
        <StatCard icon={Target} label="Average Score" value={`${derived.averageScore.toFixed(0)}%`} sub={`Best score ${derived.bestScore.toFixed(0)}%`} color="text-indigo-600" />
        <StatCard icon={CheckCircle2} label="Pass Rate" value={`${derived.passRate}%`} sub={`${derived.passed} passed and ${derived.failed} failed`} color="text-emerald-600" />
        <StatCard icon={TrendingUp} label="Momentum" value={formatMomentum(derived.momentum)} sub={derived.scoreTrendData.length > 3 ? "Recent 3 test days vs previous 3" : "Needs more trend history"} color={derived.momentum >= 0 ? "text-emerald-600" : "text-amber-600"} />
        <StatCard icon={Layers3} label="Mastery Coverage" value={`${derived.masteryCoverage}%`} sub={`${derived.strongTopics} strong topics out of ${derived.totalTopics || 0}`} color="text-primary" />
        <StatCard icon={AlertTriangle} label="Weak Topic Load" value={derived.shakyTopics} sub={derived.weakestTopic === "No topic data" ? "No topic data yet" : `Lowest topic: ${derived.weakestTopic}`} color="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Performance Trend</h3>
              <p className="mt-1 text-xs text-muted-foreground">Average score with rolling average and pass threshold.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Strongest: {derived.strongestSubject}
            </span>
          </div>
          {derived.scoreTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={derived.scoreTrendData}>
                <defs>
                  <linearGradient id="analyticsScoreFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <ReferenceLine y={60} stroke="hsl(0 72% 51%)" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value}%`, name === "rollingAverage" ? "Rolling average" : "Average score"]}
                  labelFormatter={(label) => `Test day ${label}`}
                  contentStyle={chartTooltipStyle}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(221 83% 53%)" fill="url(#analyticsScoreFill)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="rollingAverage" stroke="hsl(160 84% 35%)" fillOpacity={0} strokeWidth={2.25} />
              </AreaChart>
            </ResponsiveContainer>
          ) : renderEmptyChart("Attempt a few tests to unlock score trend insights here.")}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Performance by Subject</h3>
              <p className="mt-1 text-xs text-muted-foreground">Compare which subjects are safely above the pass line and which need attention.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Pass rate {derived.passRate}%
            </span>
          </div>
          {derived.subjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={derived.subjectData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <ReferenceLine y={60} stroke="hsl(0 72% 51%)" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(value: number, _name: string, item: { payload?: { tests: number } }) => [`${value}%`, `Average score (${item.payload?.tests ?? 0} tests)`]}
                  labelFormatter={(label) => `Subject: ${label}`}
                  contentStyle={chartTooltipStyle}
                />
                <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                  {derived.subjectData.map((subject) => (
                    <Cell
                      key={subject.fullName}
                      fill={subject.avg >= 75 ? "hsl(142 71% 45%)" : subject.avg >= 60 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : renderEmptyChart("Subject comparison appears once you have assessment history.")}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Mastery Map by Subject</h3>
              <p className="mt-1 text-xs text-muted-foreground">Each bar shows what is untouched, learning, shaky, or already strong.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Not started</span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Learning</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Shaky</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">Strong</span>
            </div>
          </div>
          {derived.masteryDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={derived.masteryDistributionData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis type="category" dataKey="subject" width={110} tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <Tooltip
                  formatter={(value: number, name: string) => [value, String(name).replace("_", " ")]}
                  labelFormatter={(label) => `Subject: ${label}`}
                  contentStyle={chartTooltipStyle}
                />
                <Bar dataKey="not_started" stackId="mastery" fill="hsl(215 20% 88%)" radius={[4, 0, 0, 4]} />
                <Bar dataKey="learning" stackId="mastery" fill="hsl(217 91% 60%)" />
                <Bar dataKey="shaky" stackId="mastery" fill="hsl(38 92% 50%)" />
                <Bar dataKey="strong" stackId="mastery" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : renderEmptyChart("Mastery coverage becomes visible after more topic-level data is collected.")}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Weakest Topics</h3>
              <p className="mt-1 text-xs text-muted-foreground">Lowest-accuracy topics float to the top so revision priority is obvious.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Coverage {derived.masteryCoverage}%
            </span>
          </div>
          {derived.weakestTopics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={derived.weakestTopics} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis type="category" dataKey="topic" width={125} tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <ReferenceLine x={50} stroke="hsl(0 72% 51%)" strokeDasharray="4 4" />
                <ReferenceLine x={75} stroke="hsl(142 71% 45%)" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(value: number, _name: string, item: { payload?: { attempts: number } }) => [`${value}%`, `Accuracy (${item.payload?.attempts ?? 0} attempts)`]}
                  labelFormatter={(label) => `Topic: ${label}`}
                  contentStyle={chartTooltipStyle}
                />
                <Bar dataKey="accuracy" radius={[0, 8, 8, 0]}>
                  {derived.weakestTopics.map((topic) => (
                    <Cell
                      key={topic.fullName}
                      fill={topic.accuracy >= 75 ? "hsl(142 71% 45%)" : topic.accuracy >= 60 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : renderEmptyChart("Weak-topic pressure will appear after you answer more questions.")}
        </div>
      </div>

      {derived.masteryMap.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Subject Drilldown</h3>
          </div>
          <div className="space-y-4">
            {derived.masteryMap.map((subject) => (
              <div key={subject.subject_id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{subject.subject_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subject.counts.strong} strong, {subject.counts.shaky} shaky, {subject.counts.learning} learning
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700">
                      not started {subject.counts.not_started}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-medium text-blue-700">
                      learning {subject.counts.learning}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-700">
                      shaky {subject.counts.shaky}
                    </span>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-medium text-green-700">
                      strong {subject.counts.strong}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {subject.topics.map((topic) => {
                    const tone =
                      topic.status === "strong"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : topic.status === "shaky"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : topic.status === "learning"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-700";

                    return (
                      <div
                        key={`${subject.subject_id}-${topic.topic}`}
                        className={`rounded-full border px-3 py-1.5 text-[11px] ${tone}`}
                      >
                        <span className="font-medium">{topic.topic}</span>
                        <span className="ml-2 opacity-80">
                          {topic.status.replace("_", " ")}
                          {topic.attempts > 0 ? ` - ${topic.accuracy}%` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Test History <span className="text-muted-foreground font-normal">({results.length})</span>
          </h3>
          {results.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              Avg score {derived.averageScore.toFixed(0)}%
            </Badge>
          )}
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No tests taken yet.</p>
          </div>
        ) : (
          results.map((r, i) => (
            <div
              key={r.id}
              className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors
                ${i < results.length - 1 ? "border-b border-border" : ""}`}
            >
              <button
                onClick={() => onView(r.id)}
                className="group flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                  ${r.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {r.percentage}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {r.subject_name} - {r.module_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.score}/{r.total_questions} correct - {format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
                <Badge variant={r.passed ? "default" : "destructive"} className="text-[10px] shrink-0">
                  {r.passed ? "Pass" : "Fail"}
                </Badge>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-[11px]"
                  disabled={exportingKey === `${r.id}-csv` || exportingKey === `${r.id}-pdf`}
                  onClick={() => void handleDetailExport(r.id, "csv")}
                >
                  <Download size={12} />
                  {exportingKey === `${r.id}-csv` ? "Exporting..." : "CSV"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-[11px]"
                  disabled={exportingKey === `${r.id}-csv` || exportingKey === `${r.id}-pdf`}
                  onClick={() => void handleDetailExport(r.id, "pdf")}
                >
                  <FileText size={12} />
                  {exportingKey === `${r.id}-pdf` ? "Exporting..." : "PDF"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
/* ── Results list ── */
function LegacyResultsList({ onView }: { onView: (id: number) => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalyticsSummary(), getResults()])
      .then(([s, r]) => { setSummary(s); setResults(r); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!summary) return null;

  const { summary: s, bySubject, topicMastery, trend, masteryMap } = summary;

  // chart data
  const trendData = trend.map(t => ({
    date:  format(new Date(t.date), "MMM d"),
    score: parseFloat(t.avg_score),
  }));

  const subjectData = bySubject.map(b => ({
    subject: b.subject_name.split(" ")[0],
    avg:     parseFloat(b.avg_score),
    tests:   b.total_tests,
  }));

  const topicData = topicMastery.slice(0, 8).map(t => ({
    topic:    t.topic.length > 15 ? t.topic.slice(0, 12) + "..." : t.topic,
    accuracy: parseFloat(t.accuracy),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your learning performance overview</p>
        </div>
        {results.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => exportCSV(results)}>
              <Download size={14} /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => exportPDF(results, s)}>
              <FileText size={14} /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard icon={Trophy}    label="Total tests"  value={s.total_tests} />
        <StatCard icon={Target}    label="Avg score"    value={`${s.avg_score}%`} />
        <StatCard icon={TrendingUp} label="Best score"  value={`${s.best_score}%`} color="text-green-600" />
        <StatCard icon={CheckCircle2} label="Passed"    value={s.passed} color="text-green-600" />
        <StatCard icon={XCircle}   label="Failed"       value={s.failed} color="text-destructive" />
      </div>

      {/* Charts row */}
      {trendData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Score trend */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Score trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, "Avg score"]} />
                <Line type="monotone" dataKey="score" stroke="#7F77DD" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subject performance */}
          {subjectData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Performance by subject</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Avg score"]} />
                  <Bar dataKey="avg" fill="#7F77DD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Topic mastery */}
      {topicData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Topic mastery <span className="text-xs text-muted-foreground font-normal">(sorted by weakest first)</span>
          </h3>
          <div className="space-y-3">
            {topicMastery.slice(0, 10).map(t => (
              <div key={t.topic}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">{t.topic}</span>
                  <span className="text-muted-foreground">
                    {t.accuracy}% · {t.attempts} attempt{t.attempts !== 1 ? "s" : ""}
                  </span>
                </div>
                <Progress
                  value={parseFloat(t.accuracy)}
                  className={`h-1.5 ${parseFloat(t.accuracy) < 50 ? "[&>div]:bg-destructive" : parseFloat(t.accuracy) < 75 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {masteryMap.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers3 size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Mastery map by subject</h3>
          </div>
          <div className="space-y-4">
            {masteryMap.map((subject) => (
              <div key={subject.subject_id} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{subject.subject_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Topic-level view of what is untouched, in progress, shaky, or strong.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700">
                      not started {subject.counts.not_started}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-medium text-blue-700">
                      learning {subject.counts.learning}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-700">
                      shaky {subject.counts.shaky}
                    </span>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-medium text-green-700">
                      strong {subject.counts.strong}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {subject.topics.map((topic) => {
                    const tone =
                      topic.status === "strong"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : topic.status === "shaky"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : topic.status === "learning"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-700";

                    return (
                      <div
                        key={`${subject.subject_id}-${topic.topic}`}
                        className={`rounded-full border px-3 py-1.5 text-[11px] ${tone}`}
                      >
                        <span className="font-medium">{topic.topic}</span>
                        <span className="ml-2 opacity-80">
                          {topic.status.replace("_", " ")}
                          {topic.attempts > 0 ? ` · ${topic.accuracy}%` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Test history <span className="text-muted-foreground font-normal">({results.length})</span>
          </h3>
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No tests taken yet</p>
          </div>
        ) : (
          results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => onView(r.id)}
              className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors group
                ${i < results.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                ${r.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {r.percentage}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {r.subject_name} - {r.module_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.score}/{r.total_questions} correct · {format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
              <Badge variant={r.passed ? "default" : "destructive"} className="text-[10px] shrink-0">
                {r.passed ? "Pass" : "Fail"}
              </Badge>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Result detail ── */
function ResultDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResultDetail(id).then(setDetail).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!detail) return null;

  // topic accuracy from this test
  const topicMap: Record<string, { correct: number; total: number }> = {};
  detail.answers.forEach(a => {
    if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 };
    topicMap[a.topic].total++;
    if (a.is_correct) topicMap[a.topic].correct++;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{detail.subject_name} - {detail.module_name}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(detail.created_at), "dd MMM yyyy, HH:mm")}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2"
          onClick={() => exportDetailPDF(detail)}>
          <Download size={14} /> Export PDF
        </Button>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Trophy} label="Score"      value={`${detail.score}/${detail.total_questions}`} />
        <StatCard icon={Target} label="Percentage" value={`${detail.percentage}%`} />
        <StatCard
          icon={detail.passed ? CheckCircle2 : XCircle}
          label="Status"
          value={detail.passed ? "Pass" : "Fail"}
          color={detail.passed ? "text-green-600" : "text-destructive"}
        />
        <StatCard icon={FileText} label="Questions" value={detail.total_questions} />
      </div>

      {/* Topic accuracy */}
      {Object.keys(topicMap).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Topic accuracy in this test</h3>
          <div className="space-y-3">
            {Object.entries(topicMap).map(([topic, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={topic}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{topic}</span>
                    <span className="text-muted-foreground">{stats.correct}/{stats.total} correct</span>
                  </div>
                  <Progress
                    value={pct}
                    className={`h-1.5 ${pct < 50 ? "[&>div]:bg-destructive" : pct < 75 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question breakdown */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Question breakdown</h3>
        </div>
        {detail.answers.map((a, i) => (
          <div key={a.question_id}
            className={`px-5 py-4 border-b border-border last:border-0 ${a.is_correct ? "bg-green-50/50 dark:bg-green-950/20" : "bg-red-50/50 dark:bg-red-950/20"}`}>
            <div className="flex items-start gap-3">
              {a.is_correct
                ? <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                : <XCircle      size={16} className="text-destructive shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{a.topic}</span>
                  <Badge variant={a.difficulty === "Easy" ? "secondary" : a.difficulty === "Hard" ? "destructive" : "default"}
                    className="text-[10px] px-2 py-0">{a.difficulty}</Badge>
                </div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Q{i + 1}. {a.question}
                </p>
                <div className="flex flex-wrap gap-2">
                  {a.options.map((opt, idx) => (
                    <span key={idx}
                      className={`text-xs px-2 py-1 rounded border ${
                        opt === a.correct_answer
                          ? "border-green-500 bg-green-50 text-green-700 font-medium dark:bg-green-950/30 dark:text-green-400"
                          : opt === a.selected_answer && !a.is_correct
                            ? "border-destructive bg-red-50 text-destructive dark:bg-red-950/30"
                            : "border-border text-muted-foreground"}`}>
                      {String.fromCharCode(65 + idx)}. {opt}
                    </span>
                  ))}
                </div>
                {!a.is_correct && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-destructive">
                      Your answer: {a.selected_answer || "-"} | Correct: {a.correct_answer}
                    </p>
                    {a.explanation && (
                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="text-xs font-semibold text-foreground">Why this went wrong</p>
                        <p className="text-xs text-muted-foreground mt-1">{a.explanation}</p>
                        {a.study_hint && (
                          <p className="text-xs text-primary mt-2">{a.study_hint}</p>
                        )}
                      </div>
                    )}
                    {a.related_notes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Revise these notes</p>
                        {a.related_notes.map((note) => (
                          <div key={note.id} className="rounded-lg border border-border bg-card p-3">
                            <p className="text-xs font-medium text-foreground">
                              {note.subject_name} · {note.module_name} · {note.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{note.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function AnalyticsContent() {
  const [view, setView] = useState<View>({ step: "list" });

  if (view.step === "detail") {
    return <ResultDetail id={view.id} onBack={() => setView({ step: "list" })} />;
  }
  return <ResultsList onView={(id) => setView({ step: "detail", id })} />;
}
