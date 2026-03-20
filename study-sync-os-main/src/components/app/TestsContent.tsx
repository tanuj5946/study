import { useState, useEffect } from "react";
import {
  ArrowLeft, CheckCircle2, XCircle, BookOpen, Trophy,
  ChevronRight, RotateCcw, Clock, Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getSubjects, getSubjectQuestions, submitTest,
  type Subject, type Question,
} from "@/lib/api";

/* ── Types ──────────────────────────────────────────────── */

type Difficulty = "easy" | "medium" | "hard" | "mixed";

type AnswerRecord = {
  question_id:     number;
  selected_answer: string;
  is_correct:      boolean;
};

type View =
  | { step: "select" }
  | { step: "difficulty"; subject: Subject }
  | { step: "quiz"; subject: Subject; difficulty: Difficulty; count: number }
  | { step: "result"; subject: Subject; difficulty: Difficulty; answers: AnswerRecord[]; questions: Question[] };

/* ── Difficulty config ───────────────────────────────────── */

const DIFFICULTIES: { value: Difficulty; label: string; desc: string; color: string }[] = [
  { value: "easy",   label: "Easy",   desc: "Foundational concepts",        color: "bg-green-50 border-green-200 hover:border-green-400 text-green-800" },
  { value: "medium", label: "Medium", desc: "Applied understanding",         color: "bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-800" },
  { value: "hard",   label: "Hard",   desc: "Advanced problem solving",      color: "bg-red-50 border-red-200 hover:border-red-400 text-red-800" },
  { value: "mixed",  label: "Mixed",  desc: "Random mix of all difficulties", color: "bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-800" },
];

/* ── Subject Selection ───────────────────────────────────── */

function SubjectSelect({ onStart }: { onStart: (subject: Subject) => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getSubjects().then(setSubjects).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tests</h1>
        <p className="text-sm text-muted-foreground">
          Select a subject to start a test. Questions are pulled from all modules.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => onStart(sub)}
            className="w-full text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {sub.modules?.length ?? 0} modules · {sub.description}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {["Easy", "Medium", "Hard", "Mixed"].map(d => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Difficulty Selection ────────────────────────────────── */

function DifficultySelect({ subject, onSelect, onBack }: {
  subject: Subject;
  onSelect: (difficulty: Difficulty, count: number) => void;
  onBack: () => void;
}) {
  const [questionCount, setQuestionCount] = useState(10);

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{subject.name}</h2>
          <p className="text-sm text-muted-foreground">Choose difficulty level</p>
        </div>
      </div>

      {/* question count selector */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">Number of questions</p>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map(n => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                ${questionCount === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* difficulty cards */}
      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTIES.map(d => (
          <button
            key={d.value}
            onClick={() => onSelect(d.value)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${d.color}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {d.value === "mixed"
                ? <Shuffle size={16} />
                : <BookOpen size={16} />}
              <span className="font-semibold text-sm">{d.label}</span>
            </div>
            <p className="text-xs opacity-75">{d.desc}</p>
            <p className="text-xs mt-2 opacity-60">{questionCount} questions</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Quiz Flow ───────────────────────────────────────────── */

function QuizFlow({ subject, difficulty, count, onFinish, onBack }: {
  subject:    Subject;
  difficulty: Difficulty;
  onFinish:   (answers: AnswerRecord[], questions: Question[]) => void;
  onBack:     () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  // const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers]     = useState<AnswerRecord[]>([]);

  useEffect(() => {
    getSubjectQuestions(subject.id, difficulty,count)
      .then(setQuestions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [subject.id, difficulty,count]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="text-center py-20 space-y-3">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" onClick={onBack}>Go back</Button>
    </div>
  );

  if (!questions.length) return (
    <div className="text-center py-20 space-y-3">
      <p className="text-sm text-muted-foreground">No questions found for this difficulty.</p>
      <Button variant="outline" onClick={onBack}>Go back</Button>
    </div>
  );

  const q        = questions[current];
 const progress = ((current + (selected !== null ? 1 : 0)) / questions.length) * 100;
const handleNext = () => {
  if (selected === null) return;

  const newAnswer = {
    question_id:     q.id,
    selected_answer: q.options[selected],
    is_correct:      q.options[selected] === q.correct_answer,
  };

  if (current < questions.length - 1) {
    setAnswers(prev => [...prev, newAnswer]);
    setCurrent(c => c + 1);
    setSelected(null);
  } else {
    onFinish([...answers, newAnswer], questions);
  }
};

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{subject.name}</h2>
          <p className="text-xs text-muted-foreground">
            Question {current + 1} of {questions.length} · {q.topic} ·{" "}
            <span className={
              q.difficulty === "Easy"   ? "text-green-600" :
              q.difficulty === "Medium" ? "text-blue-600"  : "text-red-600"
            }>{q.difficulty}</span>
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock size={12} /> {current + 1}/{questions.length}
        </Badge>
      </div>

      <Progress value={progress} className="h-1.5" />
<div className="rounded-xl border border-border bg-card p-6 shadow-card">
  <p className="text-base font-semibold text-foreground mb-5">{q.question}</p>
  <div className="space-y-3">
    {q.options.map((opt, idx) => (
      <button
        key={idx}
        onClick={() => setSelected(idx)}
        className={`w-full text-left flex items-center gap-3 rounded-lg border px-4 py-3 transition-all
          ${idx === selected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:bg-secondary/30"}`}
      >
        <span className="h-7 w-7 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
          {String.fromCharCode(65 + idx)}
        </span>
        <span className="text-sm text-foreground flex-1">{opt}</span>
      </button>
    ))}
  </div>
</div>

      <div className="flex justify-end gap-3">
  <Button onClick={handleNext} disabled={selected === null}>
    {current < questions.length - 1 ? "Next Question" : "View Results"}
  </Button>
</div>
    </div>
  );
}

/* ── Result Screen ───────────────────────────────────────── */

function ResultScreen({ subject, difficulty, answers, questions, onRetry, onBack }: {
  subject:    Subject;
  difficulty: Difficulty;
  answers:    AnswerRecord[];
  questions:  Question[];
  onRetry:    () => void;
  onBack:     () => void;
}) {
  const correct = answers.filter(a => a.is_correct).length;
  const total   = questions.length;
  const percent = Math.round((correct / total) * 100);

  // breakdown by difficulty
  const breakdown = ["Easy", "Medium", "Hard"].map(d => {
    const dqs      = questions.filter(q => q.difficulty === d);
    const dCorrect = answers.filter((a, i) => questions[i]?.difficulty === d && a.is_correct).length;
    return { difficulty: d, correct: dCorrect, total: dqs.length };
  }).filter(b => b.total > 0);

  useEffect(() => {
    // find a representative module_id from the questions
    const module_id = questions[0] ? (questions[0] as any).module_id : null;
    if (!module_id) return;
    submitTest({
      module_id,
      answers: answers.map((a, i) => ({
        question_id:     a.question_id,
        selected_answer: a.selected_answer,
        is_correct:      a.is_correct,
      })),
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-foreground">Results — {subject.name}</h2>
      </div>

      {/* score card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-card text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Trophy size={36} className="text-primary" />
        </div>
        <p className="text-4xl font-extrabold text-primary">{correct}/{total}</p>
        <p className="text-sm text-muted-foreground mt-1">
          You scored {percent}% on {DIFFICULTIES.find(d => d.value === difficulty)?.label} difficulty
        </p>
        <Progress value={percent} className="h-2 mt-4 max-w-xs mx-auto" />
        <div className="flex justify-center gap-3 mt-6">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw size={14} /> Retry
          </Button>
          <Button onClick={onBack}>Back to Tests</Button>
        </div>
      </div>

      {/* difficulty breakdown */}
      {breakdown.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Breakdown by difficulty</h3>
          <div className="space-y-3">
            {breakdown.map(b => (
              <div key={b.difficulty}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{b.difficulty}</span>
                  <span className="font-medium text-foreground">{b.correct}/{b.total}</span>
                </div>
                <Progress value={(b.correct / b.total) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* answer review */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Answer Review</h3>
        </div>
        {questions.map((q, i) => {
          const isCorrect = answers[i]?.is_correct;
          return (
            <div key={q.id} className={`px-5 py-4 border-b border-border last:border-0 ${isCorrect ? "bg-primary/5" : "bg-destructive/5"}`}>
              <div className="flex items-start gap-2 mb-2">
                {isCorrect
                  ? <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  : <XCircle      size={16} className="text-destructive shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  <span className="text-[10px] text-muted-foreground">{q.topic} · {q.difficulty}</span>
                </div>
              </div>
              <div className="ml-6 space-y-1">
                {!isCorrect && answers[i]?.selected_answer && (
                  <p className="text-xs text-destructive">Your answer: {answers[i].selected_answer}</p>
                )}
                <p className="text-xs text-primary">Correct: {q.correct_answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */

export function TestsContent() {
  const [view, setView] = useState<View>({ step: "select" });

  switch (view.step) {
    case "select":
      return (
        <SubjectSelect
          onStart={(subject) => setView({ step: "difficulty", subject })}
        />
      );
    case "difficulty":
      return (
        <DifficultySelect
          subject={view.subject}
          onSelect={(difficulty,count) => setView({ step: "quiz", subject: view.subject, difficulty,count })}
          onBack={() => setView({ step: "select" })}
        />
      );
    case "quiz":
      return (
        <QuizFlow
          subject={view.subject}
          difficulty={view.difficulty}
          count={view.count}
          onFinish={(answers, questions) =>
            setView({ step: "result", subject: view.subject, difficulty: view.difficulty, answers, questions })
          }
          onBack={() => setView({ step: "difficulty", subject: view.subject })}
        />
      );
    case "result":
      return (
        <ResultScreen
          subject={view.subject}
          difficulty={view.difficulty}
          answers={view.answers}
          questions={view.questions}
          onRetry={() => setView({ step: "quiz", subject: view.subject, difficulty: view.difficulty })}
          onBack={() => setView({ step: "select" })}
        />
      );
  }
}