import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getMiniTestQuestions, submitMiniTest, getMiniTestStatus, type Question, type MiniTestStatus, type MiniTestResult } from "@/lib/api";

interface MiniTestProps {
  moduleId: number;
  moduleName: string;
  onUnlocked: () => void;
  onClose: () => void;
}

type View = "status" | "quiz" | "result";

export function MiniTest({ moduleId, moduleName, onUnlocked, onClose }: MiniTestProps) {
  const [view, setView]           = useState<View>("status");
  const [status, setStatus]       = useState<MiniTestStatus | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers]     = useState<{ question_id: number; selected_answer: string }[]>([]);
  const [result, setResult]       = useState<MiniTestResult | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMiniTestStatus(moduleId)
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [moduleId]);

  const startTest = async () => {
    setLoading(true);
    const qs = await getMiniTestQuestions(moduleId);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setAnswers([]);
    setView("quiz");
    setLoading(false);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setAnswers(prev => [...prev, {
      question_id:     questions[current].id,
      selected_answer: questions[current].options[selected],
    }]);
    setConfirmed(true);
  };

  const handleNext = async () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      // submit
      setSubmitting(true);
      try {
        const res = await submitMiniTest(moduleId, answers);
        setResult(res);
        setView("result");
        if (res.passed || res.flagged) onUnlocked();
        // refresh status
        const newStatus = await getMiniTestStatus(moduleId);
        setStatus(newStatus);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Status screen ── */
  if (view === "status" && status) return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
        <Lock size={28} className="text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Module Locked</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete a mini test to unlock <span className="font-medium">{moduleName}</span>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2">
        <p className="text-sm font-medium text-foreground">Mini test rules:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 4 questions from the previous module</li>
          <li>• Score 3/4 or more to unlock</li>
          <li>• Maximum 3 attempts</li>
          <li>• After 3 failed attempts, module unlocks but gets flagged</li>
        </ul>
      </div>

      {status.attempts > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Attempts used: <span className="font-semibold text-foreground">{status.attempts}/{status.max_attempts}</span>
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        {status.can_attempt && (
          <Button onClick={startTest}>
            {status.attempts > 0 ? "Retry Mini Test" : "Start Mini Test"}
          </Button>
        )}
      </div>
    </div>
  );

  /* ── Quiz screen ── */
  if (view === "quiz" && questions.length > 0) {
    const q        = questions[current];
    const progress = ((current + (confirmed ? 1 : 0)) / questions.length) * 100;

    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Mini Test — {moduleName}</h2>
          <span className="text-xs text-muted-foreground">{current + 1}/4</span>
        </div>

        <Progress value={progress} className="h-1.5" />

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-4">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              const isCorrect = confirmed && opt === q.correct_answer;
              const isWrong   = confirmed && idx === selected && opt !== q.correct_answer;
              return (
                <button
                  key={idx}
                  onClick={() => !confirmed && setSelected(idx)}
                  disabled={confirmed}
                  className={`w-full text-left flex items-center gap-3 rounded-lg border px-4 py-3 transition-all text-sm
                    ${isCorrect ? "border-primary bg-primary/10"
                    : isWrong   ? "border-destructive bg-destructive/10"
                    : idx === selected ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-secondary/30"}`}
                >
                  <span className="h-6 w-6 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isCorrect && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                  {isWrong   && <XCircle      size={16} className="text-destructive shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          {!confirmed
            ? <Button onClick={handleConfirm} disabled={selected === null}>Confirm</Button>
            : <Button onClick={handleNext} disabled={submitting}>
                {submitting ? "Submitting..." : current < questions.length - 1 ? "Next" : "Submit"}
              </Button>
          }
        </div>
      </div>
    );
  }

  /* ── Result screen ── */
  if (view === "result" && result) return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full mx-auto
        ${result.passed ? "bg-primary/10" : result.flagged ? "bg-amber-100" : "bg-destructive/10"}`}>
        {result.passed
          ? <CheckCircle2 size={28} className="text-primary" />
          : result.flagged
            ? <AlertTriangle size={28} className="text-amber-600" />
            : <XCircle size={28} className="text-destructive" />}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">
          {result.passed ? "Unlocked!" : result.flagged ? "Module Flagged" : "Not Quite"}
        </h2>
        <p className="text-3xl font-extrabold text-primary mt-2">{result.score}/{result.total}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {result.passed
            ? `Great job! ${moduleName} is now unlocked.`
            : result.flagged
              ? `You've used all attempts. ${moduleName} is unlocked but flagged for review.`
              : `You need 3/4 to pass. ${result.attempts_left} attempt${result.attempts_left !== 1 ? "s" : ""} remaining.`}
        </p>
      </div>

      {result.flagged && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Flagged module</p>
          </div>
          <p className="text-xs text-amber-700">
            This module is marked as not fully mastered. We recommend revisiting the previous module's notes before continuing.
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button onClick={onClose}>
          {result.passed || result.flagged ? "Continue" : "Close"}
        </Button>
        {!result.passed && !result.flagged && (
          <Button variant="outline" onClick={startTest} className="gap-2">
            <RotateCcw size={14} /> Retry
          </Button>
        )}
      </div>
    </div>
  );

  return null;
}