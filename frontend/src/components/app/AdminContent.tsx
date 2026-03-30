import { useState, useEffect } from "react";
import { Plus, Trash2, BookOpen, FileText, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  getSubjects, adminGetQuestions, adminAddQuestion,
  adminDeleteQuestion, adminAddModule, adminAddNote,
  type Subject, type AdminQuestion,
  type AdminQuestionPayload, type AdminModulePayload, type AdminNotePayload,
} from "@/lib/api";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const getQuestionOptions = (options: AdminQuestion["options"]): string[] => {
  if (Array.isArray(options)) {
    return options.map((option) => String(option));
  }

  if (typeof options === "string") {
    try {
      return getQuestionOptions(JSON.parse(options));
    } catch {
      return options.trim() ? [options] : [];
    }
  }

  return [];
};

export function AdminContent() {
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [questions, setQuestions]       = useState<AdminQuestion[]>([]);
  const [filterModule, setFilterModule] = useState<string>("all");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const allModules = subjects.flatMap(s =>
    (s.modules ?? []).map(m => ({ ...m, subjectName: s.name }))
  );

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(err => setError(err.message));
    adminGetQuestions()
      .then(setQuestions)
      .catch(err => setError(err.message));
  }, []);

  const refreshQuestions = (moduleId?: number) => {
    adminGetQuestions(moduleId).then(setQuestions);
  };

  /* ── Question form ── */
  const [qForm, setQForm] = useState<AdminQuestionPayload>({
    module_id: 0, topic: "", difficulty: "Medium",
    question: "", options: ["", "", "", ""], correct_answer: "",
  });

  const handleAddQuestion = async () => {
    if (!qForm.module_id || !qForm.question || !qForm.topic) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    if (qForm.options.some(o => !o.trim())) {
      toast({ title: "All 4 options are required", variant: "destructive" }); return;
    }
    if (!qForm.correct_answer) {
      toast({ title: "Select the correct answer", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const newQ = await adminAddQuestion(qForm);
      setQuestions(prev => [newQ, ...prev]);
      setQForm({
        module_id: qForm.module_id, topic: qForm.topic, difficulty: qForm.difficulty,
        question: "", options: ["", "", "", ""], correct_answer: "",
      });
      toast({ title: "Question added!" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDeleteQuestion = async (id: number) => {
    try {
      await adminDeleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast({ title: "Question deleted" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  /* ── Module form ── */
  const [mForm, setMForm] = useState<AdminModulePayload>({
    subject_id: 0, module_name: "", difficulty: "Medium", estimated_hours: 1,
  });

  const handleAddModule = async () => {
    if (!mForm.subject_id || !mForm.module_name) {
      toast({ title: "Subject and module name required", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      await adminAddModule(mForm);
      const updated = await getSubjects();
      setSubjects(updated);
      setMForm({ subject_id: mForm.subject_id, module_name: "", difficulty: "Medium", estimated_hours: 1 });
      toast({ title: "Module added!" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  /* ── Note form ── */
  const [nForm, setNForm] = useState<AdminNotePayload>({
    module_id: 0, title: "", content: "",
  });

  const handleAddNote = async () => {
    if (!nForm.module_id || !nForm.title || !nForm.content) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      await adminAddNote(nForm);
      setNForm({ module_id: nForm.module_id, title: "", content: "" });
      toast({ title: "Note added!" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const filteredQuestions = filterModule && filterModule !== "all"
    ? questions.filter(q => q.module_id === parseInt(filterModule))
    : questions;

  if (error) return (
    <div className="text-center py-20 space-y-3">
      <p className="text-sm text-destructive font-medium">{error}</p>
      <p className="text-xs text-muted-foreground">Make sure your account has admin role</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage questions, modules and notes</p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="questions" className="gap-2 text-xs sm:text-sm">
            <BookOpen size={14} /> Questions
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2 text-xs sm:text-sm">
            <FileText size={14} /> Modules
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2 text-xs sm:text-sm">
            <StickyNote size={14} /> Notes
          </TabsTrigger>
        </TabsList>

        {/* ── Questions tab ── */}
        <TabsContent value="questions" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Add New Question</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select
                  value={qForm.module_id ? qForm.module_id.toString() : ""}
                  onValueChange={v => setQForm({ ...qForm, module_id: parseInt(v), topic: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(sub => (
                      <SelectGroup key={sub.id}>
                        <SelectLabel>{sub.name}</SelectLabel>
                        {(sub.modules ?? []).map(m => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.module_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  value={qForm.topic}
                  onChange={e => setQForm({ ...qForm, topic: e.target.value })}
                  placeholder="e.g. Normalization"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={qForm.difficulty}
                  onValueChange={v => setQForm({ ...qForm, difficulty: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea
                value={qForm.question}
                onChange={e => setQForm({ ...qForm, question: e.target.value })}
                placeholder="Enter the question text"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Options * <span className="text-xs text-muted-foreground">(click the letter to mark correct answer)</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {qForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQForm({ ...qForm, correct_answer: opt })}
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all
                        ${qForm.correct_answer === opt && opt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-muted-foreground"}`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>
                    <Input
                      value={opt}
                      onChange={e => {
                        const newOpts = [...qForm.options];
                        const wasCorrect = qForm.correct_answer === qForm.options[idx];
                        newOpts[idx] = e.target.value;
                        setQForm({
                          ...qForm,
                          options: newOpts,
                          correct_answer: wasCorrect ? e.target.value : qForm.correct_answer,
                        });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                  </div>
                ))}
              </div>
              {qForm.correct_answer && (
                <p className="text-xs text-primary mt-1">
                  Correct answer: <span className="font-medium">{qForm.correct_answer}</span>
                </p>
              )}
            </div>

            <Button onClick={handleAddQuestion} disabled={loading} className="gap-2">
              <Plus size={14} /> Add Question
            </Button>
          </div>

          {/* Question list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                All Questions <span className="text-muted-foreground font-normal">({filteredQuestions.length})</span>
              </h2>
              <Select
                value={filterModule}
                onValueChange={v => {
                  setFilterModule(v);
                  refreshQuestions(v !== "all" ? parseInt(v) : undefined);
                }}
              >
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Filter by module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {allModules.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.module_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {filteredQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No questions found</p>
              ) : (
                filteredQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    className={`px-5 py-4 flex items-start gap-3 ${i < filteredQuestions.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-muted-foreground">{q.subject_name} → {q.module_name}</span>
                        <Badge
                          variant={q.difficulty === "Easy" ? "secondary" : q.difficulty === "Hard" ? "destructive" : "default"}
                          className="text-[10px] px-2 py-0"
                        >{q.difficulty}</Badge>
                        <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{q.topic}</span>
                      </div>
                      <p className="text-sm text-foreground font-medium">{q.question}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getQuestionOptions(q.options).map((opt, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded border ${opt === q.correct_answer
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border text-muted-foreground"}`}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Modules tab ── */}
        <TabsContent value="modules" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Add New Module</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={mForm.subject_id ? mForm.subject_id.toString() : ""}
                  onValueChange={v => setMForm({ ...mForm, subject_id: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Module Name *</Label>
                <Input
                  value={mForm.module_name}
                  onChange={e => setMForm({ ...mForm, module_name: e.target.value })}
                  placeholder="e.g. Advanced SQL"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={mForm.difficulty}
                  onValueChange={v => setMForm({ ...mForm, difficulty: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Hours</Label>
                <Input
                  type="number" min={1}
                  value={mForm.estimated_hours}
                  onChange={e => setMForm({ ...mForm, estimated_hours: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <Button onClick={handleAddModule} disabled={loading} className="gap-2">
              <Plus size={14} /> Add Module
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {subjects.map(sub => (
              <div key={sub.id}>
                <div className="px-5 py-3 bg-secondary/50 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{sub.name}</p>
                </div>
                {(sub.modules ?? []).map((m, i, arr) => (
                  <div
                    key={m.id}
                    className={`px-5 py-3 flex items-center justify-between ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div>
                      <p className="text-sm text-foreground">{m.module_name}</p>
                      <p className="text-xs text-muted-foreground">{m.difficulty} · {m.estimated_hours}h</p>
                    </div>
                    <Badge
                      variant={m.difficulty === "Easy" ? "secondary" : m.difficulty === "Hard" ? "destructive" : "default"}
                      className="text-[10px]"
                    >{m.difficulty}</Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Notes tab ── */}
        <TabsContent value="notes" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Add Note to Module</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select
                  value={nForm.module_id ? nForm.module_id.toString() : ""}
                  onValueChange={v => setNForm({ ...nForm, module_id: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(sub => (
                      <SelectGroup key={sub.id}>
                        <SelectLabel>{sub.name}</SelectLabel>
                        {(sub.modules ?? []).map(m => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.module_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note Title *</Label>
                <Input
                  value={nForm.title}
                  onChange={e => setNForm({ ...nForm, title: e.target.value })}
                  placeholder="e.g. Key Concepts"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content * <span className="text-xs text-muted-foreground">(supports markdown)</span></Label>
              <Textarea
                value={nForm.content}
                onChange={e => setNForm({ ...nForm, content: e.target.value })}
                placeholder={`# Heading\n\n**Bold text**\n\n- Bullet point\n- Another point`}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleAddNote} disabled={loading} className="gap-2">
              <Plus size={14} /> Add Note
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
