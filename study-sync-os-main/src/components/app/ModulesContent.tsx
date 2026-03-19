import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen, Clock, ChevronRight, CheckCircle2, Circle, Loader2,
  ArrowLeft, FileText, StickyNote, BarChart3, Lock,
  Link as LinkIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getSubjects, getModules, getNotes, type Subject, type Module, type Note } from "@/lib/api";

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

const formatHours = (h: number) => h === 1 ? "1h" : `${h}h`;

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
  const [modules, setModules] = useState<Module[]>(subject.modules ?? []);
  const [loading, setLoading] = useState(!subject.modules?.length);

  useEffect(() => {
    if (!subject.modules?.length) {
      getModules(subject.id).then(setModules).finally(() => setLoading(false));
    }
  }, [subject.id]);

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
        {modules.map((mod, i) => (
          <button
            key={mod.id}
            onClick={() => onSelect(mod)}
            className={`w-full text-left flex items-center gap-4 px-5 py-4 transition-colors group hover:bg-secondary/20
              ${i < modules.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
              {i + 1}
            </div>
            <div className="mt-0.5 shrink-0">
              <Circle size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {mod.module_name}
                </span>
                <Badge variant={diffVariant(mod.difficulty as Difficulty)} className="text-[10px] px-2 py-0">
                  {mod.difficulty}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={12} /> {formatHours(mod.estimated_hours)}
              </span>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Notes panel ────────────────────────────────────────── */

function NotesPanel({ moduleId }: { moduleId: number }) {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getNotes(moduleId)
      .then(data => {
        setNotes(data);
        if (data.length) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  if (loading) return <Spinner />;

  if (!notes.length) return (
    <p className="text-sm text-muted-foreground">No notes available for this module.</p>
  );

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
              <StickyNote size={12} className="shrink-0" />
              <span className="line-clamp-2">{n.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* content */}
      {selected && (
        <div className="flex-1 min-w-0">
          {notes.length > 1 && (
            <h4 className="text-sm font-semibold text-foreground mb-3">{selected.title}</h4>
          )}
          <div className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:font-semibold prose-headings:text-foreground
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded
            prose-pre:bg-secondary prose-pre:border prose-pre:border-border
            prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground">
            <ReactMarkdown>{selected.content}</ReactMarkdown>
          </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText,  label: "Difficulty",  value: module.difficulty },
          { icon: Clock,     label: "Est. Time",   value: formatHours(module.estimated_hours) },
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