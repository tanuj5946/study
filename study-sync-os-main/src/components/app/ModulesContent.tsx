import { useState } from "react";
import {
  BookOpen, Clock, ChevronRight, CheckCircle2, Circle, Loader2,
  ArrowLeft, FileText, StickyNote, BarChart3, Lock,
  Link as LinkIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  subjectList, subjects, topics,
  getTopicsForSubject, getTopicById, isTopicUnlocked,
  formatMinutes,
  type Subject, type TopicDetail, type Status, type Difficulty,
} from "@/data/studyData";

/* ── Status helpers ─────────────────────────────────────── */

const statusIcon = (s: Status) => {
  switch (s) {
    case "Completed": return <CheckCircle2 size={16} className="text-primary shrink-0" />;
    case "In Progress": return <Loader2 size={16} className="text-accent-foreground shrink-0" />;
    case "Not Started": return <Circle size={16} className="text-muted-foreground shrink-0" />;
  }
};

const statusPill = (s: Status) => {
  const base = "text-[10px] font-semibold px-2.5 py-0.5 rounded-full";
  switch (s) {
    case "Completed": return `${base} bg-primary/10 text-primary`;
    case "In Progress": return `${base} bg-accent text-accent-foreground`;
    case "Not Started": return `${base} bg-secondary text-muted-foreground`;
  }
};

const diffVariant = (d: Difficulty): "secondary" | "default" | "destructive" => {
  switch (d) {
    case "Easy": return "secondary";
    case "Medium": return "default";
    case "Hard": return "destructive";
  }
};

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

/* ── Level 1: Subjects List (was Modules) ───────────────── */

function SubjectsList({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
        <p className="text-sm text-muted-foreground">Select a subject to view its topics.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {subjectList.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelect(sub.id)}
            className="w-full text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{sub.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{sub.description}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span>{sub.topicIds.length} topics</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {formatMinutes(sub.estimatedMinutes)}</span>
              <span className={statusPill(sub.status)}>{sub.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={sub.progress} className="h-1.5 flex-1" />
              <span className="text-xs font-medium text-foreground">{sub.progress}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Level 2: Topics List (with sequential locking) ─────── */

function TopicsList({ subjectId, onSelect, onBack }: {
  subjectId: string; onSelect: (id: string) => void; onBack: () => void;
}) {
  const sub = subjects[subjectId]!;
  const topicList = getTopicsForSubject(subjectId);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Subjects", onClick: onBack },
          { label: sub.title },
        ]}
      />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{sub.title}</h1>
          <p className="text-sm text-muted-foreground">{topicList.length} topics · {formatMinutes(sub.estimatedMinutes)} total · {sub.progress}% complete</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {topicList.map((topic, i) => {
          const unlocked = isTopicUnlocked(subjectId, topic.id);
          return (
            <button
              key={topic.id}
              onClick={() => unlocked && onSelect(topic.id)}
              disabled={!unlocked}
              className={`w-full text-left flex items-center gap-4 px-5 py-4 transition-colors group ${
                i < topicList.length - 1 ? "border-b border-border" : ""
              } ${unlocked ? "hover:bg-secondary/20" : "opacity-50 cursor-not-allowed"}`}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                {i + 1}
              </div>
              <div className="mt-0.5 shrink-0">
                {unlocked ? statusIcon(topic.status) : <Lock size={16} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium transition-colors ${unlocked ? "text-foreground group-hover:text-primary" : "text-muted-foreground"}`}>
                    {topic.title}
                  </span>
                  <Badge variant={diffVariant(topic.difficulty)} className="text-[10px] px-2 py-0">
                    {topic.difficulty}
                  </Badge>
                  {!unlocked && (
                    <span className="text-[10px] text-muted-foreground italic">Complete previous topic to unlock</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{topic.description}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={12} /> {formatMinutes(topic.estimatedMinutes)}
                </span>
                {unlocked && (
                  <div className="flex items-center gap-2 w-20">
                    <Progress value={topic.progress} className="h-1 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-7 text-right">{topic.progress}%</span>
                  </div>
                )}
                <ChevronRight size={14} className={unlocked ? "text-muted-foreground group-hover:text-primary transition-colors" : "text-muted-foreground/40"} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Topic Detail View ──────────────────────────────────── */

function TopicDetailView({ topicId, onBack, onBackToSubjects }: {
  topicId: string; onBack: () => void; onBackToSubjects: () => void;
}) {
  const topic = getTopicById(topicId)!;
  const sub = subjects[topic.subjectId]!;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Subjects", onClick: onBackToSubjects },
          { label: sub.title, onClick: onBack },
          { label: topic.title },
        ]}
      />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{topic.title}</h1>
            <Badge variant={diffVariant(topic.difficulty)}>{topic.difficulty}</Badge>
            <span className={statusPill(topic.status)}>{topic.status}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{sub.title}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: BarChart3, label: "Progress", value: `${topic.progress}%` },
          { icon: Clock, label: "Est. Time", value: formatMinutes(topic.estimatedMinutes) },
          { icon: FileText, label: "Difficulty", value: topic.difficulty },
          { icon: Clock, label: "Last Updated", value: topic.lastUpdated },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Completion</h3>
        <div className="flex items-center gap-4">
          <Progress value={topic.progress} className="h-2 flex-1" />
          <span className="text-sm font-semibold text-foreground">{topic.progress}%</span>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
      </div>

      {/* Notes */}
      {topic.notes && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">(local)</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{topic.notes}</p>
        </div>
      )}

      {/* Resources */}
      {topic.resources.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
          </div>
          <div className="space-y-2">
            {topic.resources.map((res, i) => (
              <a key={i} href={res.url} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ChevronRight size={12} />
                {res.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

type View =
  | { level: "subjects" }
  | { level: "topics"; subjectId: string }
  | { level: "detail"; subjectId: string; topicId: string };

export function ModulesContent() {
  const [view, setView] = useState<View>({ level: "subjects" });

  switch (view.level) {
    case "subjects":
      return <SubjectsList onSelect={(id) => setView({ level: "topics", subjectId: id })} />;
    case "topics":
      return (
        <TopicsList
          subjectId={view.subjectId}
          onSelect={(id) => setView({ level: "detail", subjectId: view.subjectId, topicId: id })}
          onBack={() => setView({ level: "subjects" })}
        />
      );
    case "detail":
      return (
        <TopicDetailView
          topicId={view.topicId}
          onBack={() => setView({ level: "topics", subjectId: view.subjectId })}
          onBackToSubjects={() => setView({ level: "subjects" })}
        />
      );
  }
}
