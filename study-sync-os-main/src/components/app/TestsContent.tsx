// import { useState, useMemo } from "react";
// import {
//   ArrowLeft, CheckCircle2, XCircle, BookOpen, Trophy,
//   ChevronRight, RotateCcw, Clock,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import { Badge } from "@/components/ui/badge";
// import { subjectList } from "@/data/studyData";
// import { getQuestionsBySubject, type QuizQuestion } from "@/data/quizData";

// /* ── Types ──────────────────────────────────────────────── */

// type View =
//   | { step: "select" }
//   | { step: "quiz"; subjectId: string }
//   | { step: "result"; subjectId: string; answers: number[]; questions: QuizQuestion[] };

// /* ── Subject Selection ──────────────────────────────────── */

// function SubjectSelect({ onStart }: { onStart: (id: string) => void }) {
//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-foreground">Tests</h1>
//         <p className="text-sm text-muted-foreground">
//           Select a subject to take a multiple-choice quiz.
//         </p>
//       </div>
//       <div className="grid gap-4 sm:grid-cols-2">
//         {subjectList.map((sub) => {
//           const count = getQuestionsBySubject(sub.id).length;
//           return (
//             <button
//               key={sub.id}
//               onClick={() => onStart(sub.id)}
//               className="w-full text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/30 hover:shadow-md transition-all group"
//             >
//               <div className="flex items-start justify-between mb-3">
//                 <div className="flex items-center gap-2.5">
//                   <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
//                     <BookOpen size={18} className="text-primary" />
//                   </div>
//                   <div>
//                     <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
//                       {sub.title}
//                     </h3>
//                     <p className="text-xs text-muted-foreground">{count} questions</p>
//                   </div>
//                 </div>
//                 <ChevronRight
//                   size={16}
//                   className="text-muted-foreground group-hover:text-primary transition-colors mt-1"
//                 />
//               </div>
//               <Button size="sm" className="w-full mt-1">
//                 Start Quiz
//               </Button>
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// /* ── Quiz Flow ──────────────────────────────────────────── */

// function QuizFlow({
//   subjectId,
//   onFinish,
//   onBack,
// }: {
//   subjectId: string;
//   onFinish: (answers: number[], questions: QuizQuestion[]) => void;
//   onBack: () => void;
// }) {
//   const questions = useMemo(() => getQuestionsBySubject(subjectId), [subjectId]);
//   const [current, setCurrent] = useState(0);
//   const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
//   const [selected, setSelected] = useState<number | null>(null);
//   const [confirmed, setConfirmed] = useState(false);

//   const q = questions[current];
//   const subjectTitle = subjectList.find((s) => s.id === subjectId)?.title ?? "";
//   const progress = ((current + (confirmed ? 1 : 0)) / questions.length) * 100;

//   const handleSelect = (idx: number) => {
//     if (confirmed) return;
//     setSelected(idx);
//   };

//   const handleConfirm = () => {
//     if (selected === null) return;
//     const updated = [...answers];
//     updated[current] = selected;
//     setAnswers(updated);
//     setConfirmed(true);
//   };

//   const handleNext = () => {
//     if (current < questions.length - 1) {
//       setCurrent(current + 1);
//       setSelected(null);
//       setConfirmed(false);
//     } else {
//       onFinish(answers, questions);
//     }
//   };

//   return (
//     <div className="space-y-6 max-w-2xl mx-auto">
//       {/* Header */}
//       <div className="flex items-center gap-3">
//         <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
//           <ArrowLeft size={18} />
//         </button>
//         <div className="flex-1">
//           <h2 className="text-lg font-bold text-foreground">{subjectTitle}</h2>
//           <p className="text-xs text-muted-foreground">
//             Question {current + 1} of {questions.length}
//           </p>
//         </div>
//         <Badge variant="outline" className="flex items-center gap-1">
//           <Clock size={12} /> {current + 1}/{questions.length}
//         </Badge>
//       </div>

//       <Progress value={progress} className="h-1.5" />

//       {/* Question Card */}
//       <div className="rounded-xl border border-border bg-card p-6 shadow-card">
//         <p className="text-base font-semibold text-foreground mb-5">{q.question}</p>
//         <div className="space-y-3">
//           {q.options.map((opt, idx) => {
//             let borderClass = "border-border";
//             let bgClass = "bg-card hover:bg-secondary/30";

//             if (confirmed) {
//               if (idx === q.correctIndex) {
//                 borderClass = "border-primary";
//                 bgClass = "bg-primary/10";
//               } else if (idx === selected && idx !== q.correctIndex) {
//                 borderClass = "border-destructive";
//                 bgClass = "bg-destructive/10";
//               }
//             } else if (idx === selected) {
//               borderClass = "border-primary";
//               bgClass = "bg-primary/5";
//             }

//             return (
//               <button
//                 key={idx}
//                 onClick={() => handleSelect(idx)}
//                 disabled={confirmed}
//                 className={`w-full text-left flex items-center gap-3 rounded-lg border ${borderClass} ${bgClass} px-4 py-3 transition-all`}
//               >
//                 <span className="h-7 w-7 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
//                   {String.fromCharCode(65 + idx)}
//                 </span>
//                 <span className="text-sm text-foreground flex-1">{opt}</span>
//                 {confirmed && idx === q.correctIndex && (
//                   <CheckCircle2 size={18} className="text-primary shrink-0" />
//                 )}
//                 {confirmed && idx === selected && idx !== q.correctIndex && (
//                   <XCircle size={18} className="text-destructive shrink-0" />
//                 )}
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="flex justify-end gap-3">
//         {!confirmed ? (
//           <Button onClick={handleConfirm} disabled={selected === null}>
//             Confirm Answer
//           </Button>
//         ) : (
//           <Button onClick={handleNext}>
//             {current < questions.length - 1 ? "Next Question" : "View Results"}
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ── Result Screen ──────────────────────────────────────── */

// function ResultScreen({
//   subjectId,
//   answers,
//   questions,
//   onRetry,
//   onBack,
// }: {
//   subjectId: string;
//   answers: number[];
//   questions: QuizQuestion[];
//   onRetry: () => void;
//   onBack: () => void;
// }) {
//   const subjectTitle = subjectList.find((s) => s.id === subjectId)?.title ?? "";
//   const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
//   const total = questions.length;
//   const percent = Math.round((correct / total) * 100);

//   return (
//     <div className="space-y-6 max-w-2xl mx-auto">
//       <div className="flex items-center gap-3">
//         <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
//           <ArrowLeft size={18} />
//         </button>
//         <h2 className="text-lg font-bold text-foreground">Quiz Results</h2>
//       </div>

//       {/* Score Card */}
//       <div className="rounded-xl border border-border bg-card p-8 shadow-card text-center">
//         <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
//           <Trophy size={36} className="text-primary" />
//         </div>
//         <h3 className="text-xl font-bold text-foreground">{subjectTitle}</h3>
//         <p className="text-4xl font-extrabold text-primary mt-2">
//           {correct}/{total}
//         </p>
//         <p className="text-sm text-muted-foreground mt-1">
//           You scored {percent}%
//         </p>
//         <Progress value={percent} className="h-2 mt-4 max-w-xs mx-auto" />
//         <div className="flex justify-center gap-3 mt-6">
//           <Button variant="outline" onClick={onRetry} className="gap-2">
//             <RotateCcw size={14} /> Retry
//           </Button>
//           <Button onClick={onBack}>Back to Tests</Button>
//         </div>
//       </div>

//       {/* Detailed Review */}
//       <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
//         <div className="px-5 py-3 border-b border-border">
//           <h3 className="text-sm font-semibold text-foreground">Answer Review</h3>
//         </div>
//         {questions.map((q, i) => {
//           const isCorrect = answers[i] === q.correctIndex;
//           return (
//             <div
//               key={q.id}
//               className={`px-5 py-4 border-b border-border last:border-0 ${
//                 isCorrect ? "bg-primary/5" : "bg-destructive/5"
//               }`}
//             >
//               <div className="flex items-start gap-2 mb-2">
//                 {isCorrect ? (
//                   <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
//                 ) : (
//                   <XCircle size={16} className="text-destructive shrink-0 mt-0.5" />
//                 )}
//                 <p className="text-sm font-medium text-foreground">{q.question}</p>
//               </div>
//               <div className="ml-6 space-y-1">
//                 {!isCorrect && answers[i] >= 0 && (
//                   <p className="text-xs text-destructive">
//                     Your answer: {q.options[answers[i]]}
//                   </p>
//                 )}
//                 <p className="text-xs text-primary">
//                   Correct answer: {q.options[q.correctIndex]}
//                 </p>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// /* ── Main Component ─────────────────────────────────────── */

// export function TestsContent() {
//   const [view, setView] = useState<View>({ step: "select" });

//   switch (view.step) {
//     case "select":
//       return <SubjectSelect onStart={(id) => setView({ step: "quiz", subjectId: id })} />;
//     case "quiz":
//       return (
//         <QuizFlow
//           subjectId={view.subjectId}
//           onFinish={(answers, questions) =>
//             setView({ step: "result", subjectId: view.subjectId, answers, questions })
//           }
//           onBack={() => setView({ step: "select" })}
//         />
//       );
//     case "result":
//       return (
//         <ResultScreen
//           subjectId={view.subjectId}
//           answers={view.answers}
//           questions={view.questions}
//           onRetry={() => setView({ step: "quiz", subjectId: view.subjectId })}
//           onBack={() => setView({ step: "select" })}
//         />
//       );
//   }
// }


import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft, CheckCircle2, XCircle, BookOpen, Trophy,
  ChevronRight, RotateCcw, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getSubjects, getQuestions, submitTest,
  type Subject, type Question,
} from "@/lib/api";

type AnswerRecord = {
  question_id: number;
  selected_answer: string;
  is_correct: boolean;
};

type View =
  | { step: "select" }
  | { step: "quiz"; moduleId: number; moduleTitle: string }
  | { step: "result"; moduleId: number; moduleTitle: string; answers: AnswerRecord[]; questions: Question[] };

/* ── Subject Selection ──────────────────────────────────────── */

function SubjectSelect({ onStart }: {
  onStart: (moduleId: number, moduleTitle: string) => void
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

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
          Select a module to take a multiple-choice quiz.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.flatMap(subject =>
          (subject.modules ?? []).map(mod => (
            <button
              key={mod.id}
              onClick={() => onStart(mod.id, mod.module_name)}
              className="w-full text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{subject.name}</p>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {mod.module_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{mod.difficulty} · {mod.estimated_hours}h</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
              <Button size="sm" className="w-full mt-1">Start Quiz</Button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Quiz Flow ──────────────────────────────────────────────── */

function QuizFlow({ moduleId, moduleTitle, onFinish, onBack }: {
  moduleId: number;
  moduleTitle: string;
  onFinish: (answers: AnswerRecord[], questions: Question[]) => void;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]     = useState(true);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers]     = useState<AnswerRecord[]>([]);

  useEffect(() => {
    getQuestions(moduleId).then(setQuestions).finally(() => setLoading(false));
  }, [moduleId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!questions.length) return (
    <div className="text-center py-20 text-muted-foreground">
      No questions found for this module.
    </div>
  );

  const q        = questions[current];
  const progress = ((current + (confirmed ? 1 : 0)) / questions.length) * 100;

  const handleConfirm = () => {
    if (selected === null) return;
    setAnswers(prev => [...prev, {
      question_id:     q.id,
      selected_answer: q.options[selected],
      is_correct:      q.options[selected] === q.correct_answer,
    }]);
    setConfirmed(true);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      onFinish(answers, questions);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{moduleTitle}</h2>
          <p className="text-xs text-muted-foreground">Question {current + 1} of {questions.length}</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock size={12} /> {current + 1}/{questions.length}
        </Badge>
      </div>

      <Progress value={progress} className="h-1.5" />

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <p className="text-base font-semibold text-foreground mb-5">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isCorrect = opt === q.correct_answer;
            let borderClass = "border-border";
            let bgClass     = "bg-card hover:bg-secondary/30";
            if (confirmed) {
              if (isCorrect)                        { borderClass = "border-primary";     bgClass = "bg-primary/10"; }
              else if (idx === selected && !isCorrect) { borderClass = "border-destructive"; bgClass = "bg-destructive/10"; }
            } else if (idx === selected) {
              borderClass = "border-primary"; bgClass = "bg-primary/5";
            }
            return (
              <button
                key={idx}
                onClick={() => !confirmed && setSelected(idx)}
                disabled={confirmed}
                className={`w-full text-left flex items-center gap-3 rounded-lg border ${borderClass} ${bgClass} px-4 py-3 transition-all`}
              >
                <span className="h-7 w-7 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm text-foreground flex-1">{opt}</span>
                {confirmed && isCorrect   && <CheckCircle2 size={18} className="text-primary shrink-0" />}
                {confirmed && idx === selected && !isCorrect && <XCircle size={18} className="text-destructive shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {!confirmed
          ? <Button onClick={handleConfirm} disabled={selected === null}>Confirm Answer</Button>
          : <Button onClick={handleNext}>{current < questions.length - 1 ? "Next Question" : "View Results"}</Button>
        }
      </div>
    </div>
  );
}

/* ── Result Screen ──────────────────────────────────────────── */

function ResultScreen({ moduleId, moduleTitle, answers, questions, onRetry, onBack }: {
  moduleId: number;
  moduleTitle: string;
  answers: AnswerRecord[];
  questions: Question[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const correct = answers.filter(a => a.is_correct).length;
  const total   = questions.length;
  const percent = Math.round((correct / total) * 100);

  // submit to DB once on mount
  useEffect(() => {
    submitTest({ module_id: moduleId, answers }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-foreground">Quiz Results</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 shadow-card text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Trophy size={36} className="text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{moduleTitle}</h3>
        <p className="text-4xl font-extrabold text-primary mt-2">{correct}/{total}</p>
        <p className="text-sm text-muted-foreground mt-1">You scored {percent}%</p>
        <Progress value={percent} className="h-2 mt-4 max-w-xs mx-auto" />
        <div className="flex justify-center gap-3 mt-6">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw size={14} /> Retry
          </Button>
          <Button onClick={onBack}>Back to Tests</Button>
        </div>
      </div>

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
                  : <XCircle     size={16} className="text-destructive shrink-0 mt-0.5" />}
                <p className="text-sm font-medium text-foreground">{q.question}</p>
              </div>
              <div className="ml-6 space-y-1">
                {!isCorrect && answers[i]?.selected_answer && (
                  <p className="text-xs text-destructive">Your answer: {answers[i].selected_answer}</p>
                )}
                <p className="text-xs text-primary">Correct answer: {q.correct_answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function TestsContent() {
  const [view, setView] = useState<View>({ step: "select" });

  switch (view.step) {
    case "select":
      return <SubjectSelect onStart={(id, title) => setView({ step: "quiz", moduleId: id, moduleTitle: title })} />;
    case "quiz":
      return (
        <QuizFlow
          moduleId={view.moduleId}
          moduleTitle={view.moduleTitle}
          onFinish={(answers, questions) =>
            setView({ step: "result", moduleId: view.moduleId, moduleTitle: view.moduleTitle, answers, questions })
          }
          onBack={() => setView({ step: "select" })}
        />
      );
    case "result":
      return (
        <ResultScreen
          moduleId={view.moduleId}
          moduleTitle={view.moduleTitle}
          answers={view.answers}
          questions={view.questions}
          onRetry={() => setView({ step: "quiz", moduleId: view.moduleId, moduleTitle: view.moduleTitle })}
          onBack={() => setView({ step: "select" })}
        />
      );
  }
}