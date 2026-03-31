import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MiniTest } from "@/components/app/MiniTest";
import { getUnlocks } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen, ChevronRight, CheckCircle2, Circle, Loader2,
  ArrowLeft, FileText, StickyNote, BarChart3, Lock, Bot, Send,
  Link as LinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSubjects, getModules, getNotes, markNoteRead, sendChatMessage, updateNoteProgress,
  type Subject, type Module, type Note,
} from "@/lib/api";

/* ── Types ──────────────────────────────────────────────── */

type Difficulty = "Easy" | "Medium" | "Hard";

/* ── Helpers ────────────────────────────────────────────── */

const diffVariant = (d: Difficulty): "secondary" | "default" | "destructive" => {
  switch (d) {
    case "Easy":   return "secondary";
    case "Medium": return "default";
    case "Hard":   return "destructive";
  }
};

/* ── Loading spinner ────────────────────────────────────── */

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ── Breadcrumb ─────────────────────────────────────────── */

function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ── Level 1: Subjects List ─────────────────────────────── */

function SubjectsList({ onSelect }: { onSelect: (subject: Subject) => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getSubjects().then(setSubjects).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
        <p className="text-sm text-muted-foreground">Select a subject to view its modules.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelect(sub)}
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
                  <p className="text-xs text-muted-foreground line-clamp-1">{sub.description}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{sub.modules?.length ?? 0} modules</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Level 2: Modules List ──────────────────────────────── */
function ModulesList({ subject, onSelect, onBack }: {
  subject: Subject;
  onSelect: (module: Module) => void;
  onBack: () => void;
}) {
  const [modules, setModules]           = useState<Module[]>(subject.modules ?? []);
  const [loading, setLoading]           = useState(true);
  const [unlockedIds, setUnlockedIds]   = useState<number[]>([]);
  const [flaggedIds, setFlaggedIds]     = useState<number[]>([]);
  const [miniTestModule, setMiniTestModule] = useState<Module | null>(null);

  useEffect(() => {
    setLoading(true);
    getModules(subject.id)
      .then(setModules)
      .finally(() => setLoading(false));

    getUnlocks().then(({ unlocked_ids, flagged_ids }) => {
      setUnlockedIds(unlocked_ids);
      setFlaggedIds(flagged_ids);
    });
  }, [subject.id]);

  const isUnlocked = (mod: Module, idx: number) => {
    if (idx === 0) return true; // first module always unlocked
    return unlockedIds.includes(mod.id);
  };

  const isFlagged = (mod: Module) => flaggedIds.includes(mod.id);

  const handleModuleClick = (mod: Module, idx: number) => {
    if (isUnlocked(mod, idx)) {
      onSelect(mod);
    } else {
      setMiniTestModule(mod);
    }
  };

  const handleUnlocked = () => {
    // refresh unlocks after mini test
    getUnlocks().then(({ unlocked_ids, flagged_ids }) => {
      setUnlockedIds(unlocked_ids);
      setFlaggedIds(flagged_ids);
    });
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Subjects", onClick: onBack },
        { label: subject.name },
      ]} />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">{modules.length} modules</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {modules.map((mod, i) => {
          const unlocked = isUnlocked(mod, i);
          const flagged  = isFlagged(mod);
          const notesDone = Boolean(mod.notes_done);
          const notesProgress = typeof mod.notes_total === "number" && mod.notes_total > 0
            ? `${mod.notes_completed ?? 0}/${mod.notes_total} notes complete`
            : null;
          return (
            <button
              key={mod.id}
              onClick={() => handleModuleClick(mod, i)}
              className={`w-full text-left flex items-center gap-4 px-5 py-4 transition-colors group
                ${i < modules.length - 1 ? "border-b border-border" : ""}
                ${unlocked ? "hover:bg-secondary/20" : "opacity-60 hover:bg-secondary/10"}`}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                {i + 1}
              </div>
              <div className="mt-0.5 shrink-0">
                {notesDone
                  ? <CheckCircle2 size={16} className="text-primary" />
                  : unlocked
                  ? <Circle size={16} className="text-muted-foreground" />
                  : <Lock size={16} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium transition-colors ${unlocked ? "text-foreground group-hover:text-primary" : "text-muted-foreground"}`}>
                    {mod.module_name}
                  </span>
                  <Badge variant={diffVariant(mod.difficulty as Difficulty)} className="text-[10px] px-2 py-0">
                    {mod.difficulty}
                  </Badge>
                  {notesDone && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      done
                    </span>
                  )}
                  {flagged && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <AlertTriangle size={10} /> needs review
                    </span>
                  )}
                  {!unlocked && (
                    <span className="text-[10px] text-muted-foreground italic">mini test required</span>
                  )}
                </div>
                {notesProgress && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {notesProgress}
                  </p>
                )}
              </div>
              <ChevronRight size={14} className={unlocked ? "text-muted-foreground group-hover:text-primary transition-colors shrink-0" : "text-muted-foreground/40 shrink-0"} />
            </button>
          );
        })}
      </div>

      {/* Mini test dialog */}
      <Dialog open={!!miniTestModule} onOpenChange={(o) => !o && setMiniTestModule(null)}>
        <DialogContent className="max-w-xl">
          {miniTestModule && (
            <MiniTest
              moduleId={miniTestModule.id}
              moduleName={miniTestModule.module_name}
              onUnlocked={handleUnlocked}
              onClose={() => setMiniTestModule(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Notes panel ────────────────────────────────────────── */

function NotesPanel({ moduleId }: { moduleId: number }) {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState<"read" | "ai">("read");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [prompt, setPrompt]     = useState("");
  const [sending, setSending]   = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const syncNoteState = (noteId: number, updates: Partial<Note>) => {
    setNotes((prev) => prev.map((note) => (
      note.id === noteId ? { ...note, ...updates } : note
    )));
    setSelected((prev) => (
      prev?.id === noteId ? { ...prev, ...updates } : prev
    ));
  };

  useEffect(() => {
    setLoading(true);
    getNotes(moduleId)
      .then(data => {
        setNotes(data);
        if (data.length) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }

    setMode("read");
    setPrompt("");
    setMessages([
      {
        role: "bot",
        text: `Ask me anything about "${selected.title}". I can summarize it, explain tough parts, or quiz you on it.`,
      },
    ]);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;

    markNoteRead(selected.id)
      .then(({ progress }) => {
        syncNoteState(selected.id, {
          last_read_at: progress.last_read_at,
          completed: progress.completed,
          completed_at: progress.completed_at,
        });
      })
      .catch(() => {});
  }, [selected?.id]);

  if (loading) return <Spinner />;

  if (!notes.length) return (
    <p className="text-sm text-muted-foreground">No notes available for this module.</p>
  );

  const currentNote = selected ?? notes[0];
  const completedCount = notes.filter((note) => note.completed).length;
  const readCount = notes.filter((note) => Boolean(note.last_read_at)).length;
  const moduleCompleted = notes.length > 0 && completedCount === notes.length;

  const buildScopedPrompt = (question: string) => {
    const noteContent = currentNote.content.slice(0, 6000);

    return `Current note title: ${currentNote.title}
Current note content:
${noteContent}

Student request: ${question}`;
  };

  const sendNotePrompt = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || sending) return;

    setMode("ai");
    setPrompt("");
    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    setSending(true);

    try {
      const { response } = await sendChatMessage(buildScopedPrompt(trimmed));
      setMessages(prev => [...prev, { role: "bot", text: response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: "AI answer abhi nahi aa paya. Thodi der baad phir try karo.",
      }]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    "Summarize this note in simple bullet points.",
    "Explain this note in very simple language.",
    "Make 3 quick revision questions from this note.",
  ];

  const handleToggleCompleted = async () => {
    if (!currentNote || savingProgress) return;

    const nextCompleted = !currentNote.completed;
    setSavingProgress(true);

    try {
      const { progress } = await updateNoteProgress(currentNote.id, nextCompleted);
      syncNoteState(currentNote.id, {
        last_read_at: progress.last_read_at,
        completed: progress.completed,
        completed_at: progress.completed_at,
      });
    } finally {
      setSavingProgress(false);
    }
  };

  return (
    <div className="flex gap-4">
      {/* sidebar */}
      {notes.length > 1 && (
        <div className="w-40 shrink-0 space-y-1">
          {notes.map(n => (
            <button
              key={n.id}
              onClick={() => setSelected(n)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2
                ${selected?.id === n.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary"}`}
            >
              {n.completed
                ? <CheckCircle2 size={12} className="shrink-0 text-primary" />
                : <StickyNote size={12} className="shrink-0" />}
              <div className="min-w-0 flex-1">
                <span className="line-clamp-2 block">{n.title}</span>
                <span className="mt-0.5 block text-[10px] opacity-75">
                  {n.completed ? "Completed" : n.last_read_at ? "Read" : "Unread"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* content */}
      {currentNote && (
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{currentNote.title}</h4>
              {moduleCompleted && (
                <p className="text-xs text-primary mt-1 font-medium">
                  Module completed
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {completedCount}/{notes.length} completed · {readCount}/{notes.length} read
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={currentNote.completed ? "secondary" : "outline"}
                size="sm"
                onClick={() => void handleToggleCompleted()}
                disabled={savingProgress}
                className="gap-2"
              >
                {currentNote.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {currentNote.completed ? "Completed" : "Mark Complete"}
              </Button>
              <div className="inline-flex rounded-lg border border-border bg-secondary/30 p-1">
                <button
                  onClick={() => setMode("read")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === "read"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Read Note
                </button>
                <button
                  onClick={() => setMode("ai")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === "ai"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ask AI
                </button>
              </div>
            </div>
          </div>

          {mode === "read" ? (
            <div className="prose prose-sm max-w-none dark:prose-invert
              prose-headings:font-semibold prose-headings:text-foreground
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded
              prose-pre:bg-secondary prose-pre:border prose-pre:border-border
              prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground">
              <ReactMarkdown>{currentNote.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {quickPrompts.map((quickPrompt) => (
                  <button
                    key={quickPrompt}
                    onClick={() => void sendNotePrompt(quickPrompt)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {quickPrompt}
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "bot" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot size={15} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-secondary text-foreground rounded-tl-sm"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot size={15} className="text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void sendNotePrompt(prompt)}
                  placeholder="Ask about this note..."
                  disabled={sending}
                />
                <Button
                  onClick={() => void sendNotePrompt(prompt)}
                  disabled={sending || !prompt.trim()}
                  size="icon"
                >
                  <Send size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Level 3: Module Detail ─────────────────────────────── */

function ModuleDetail({ module, subject, onBack, onBackToSubjects }: {
  module: Module;
  subject: Subject;
  onBack: () => void;
  onBackToSubjects: () => void;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Subjects",    onClick: onBackToSubjects },
        { label: subject.name,  onClick: onBack },
        { label: module.module_name },
      ]} />

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{module.module_name}</h1>
            <Badge variant={diffVariant(module.difficulty as Difficulty)}>{module.difficulty}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{subject.name}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: FileText,  label: "Difficulty",  value: module.difficulty },
          { icon: BarChart3, label: "Module ID",   value: `#${module.id}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </span>
            </div>
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Notes from DB — rendered as markdown */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
        </div>
        <NotesPanel moduleId={module.id} />
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

type View =
  | { level: "subjects" }
  | { level: "modules";  subject: Subject }
  | { level: "detail";   subject: Subject; module: Module };

export function ModulesContent() {
  const [view, setView] = useState<View>({ level: "subjects" });

  switch (view.level) {
    case "subjects":
      return (
        <SubjectsList
          onSelect={(subject) => setView({ level: "modules", subject })}
        />
      );
    case "modules":
      return (
        <ModulesList
          subject={view.subject}
          onSelect={(module) => setView({ level: "detail", subject: view.subject, module })}
          onBack={() => setView({ level: "subjects" })}
        />
      );
    case "detail":
      return (
        <ModuleDetail
          module={view.module}
          subject={view.subject}
          onBack={() => setView({ level: "modules", subject: view.subject })}
          onBackToSubjects={() => setView({ level: "subjects" })}
        />
      );
  }
}
