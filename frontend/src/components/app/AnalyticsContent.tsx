import { useState, useEffect } from "react";
import {
  Trophy, Target, TrendingUp, XCircle, CheckCircle2,
  Download, ChevronRight, ArrowLeft, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, BarChart, Bar, Legend,
} from "recharts";
import {
  getAnalyticsSummary, getResults, getResultDetail,
  type AnalyticsSummary, type ResultRow, type ResultDetail,
} from "@/lib/api";

type View = { step: "list" } | { step: "detail"; id: number };

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
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

async function exportPDF(results: ResultRow[], summary: AnalyticsSummary["summary"]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();

  // header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("StudySync — Test Results Report", 14, 20);

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
  doc.text("StudySync — Test Detail Report", 14, 20);

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
      a.question.length > 60 ? a.question.slice(0, 57) + "..." : a.question,
      a.selected_answer || "—",
      a.correct_answer,
      a.topic,
      a.is_correct ? "✓" : "✗",
    ]),
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 60 },
      5: { cellWidth: 12, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 5 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw === "✓" ? [0, 128, 0] : [200, 0, 0];
      }
    },
  });

  doc.save(`result-${detail.id}-${detail.module_name.replace(/\s+/g, "-")}.pdf`);
}

/* ── Results list ── */
function ResultsList({ onView }: { onView: (id: number) => void }) {
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

  const { summary: s, bySubject, topicMastery, trend } = summary;

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
                  {r.subject_name} — {r.module_name}
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
          <h1 className="text-xl font-bold text-foreground">{detail.subject_name} — {detail.module_name}</h1>
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
                      Your answer: {a.selected_answer || "—"} · Correct: {a.correct_answer}
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
