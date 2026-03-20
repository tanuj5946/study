import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, isSameDay, isAfter } from "date-fns";
import { Plus, Clock, Trash2, CalendarDays, CheckCircle2, Circle, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  getSessions, createSession, updateSession, deleteSession, getSubjects,
  type StudySession, type SessionPayload, type Subject,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface SessionForm {
  title: string;
  description: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  module_id: string;
}

const defaultForm = (date?: Date): SessionForm => ({
  title: "",
  description: "",
  date: format(date ?? new Date(), "yyyy-MM-dd"),
  start_time: "",
  duration_minutes: 60,
  module_id: "",
});

export function PlannerContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth]               = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [form, setForm] = useState<SessionForm>(defaultForm());

  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(month),   "yyyy-MM-dd");

  const { data: sessions = [], isLoading } = useQuery({
    
    queryKey: ["study-sessions", monthStart, monthEnd],
    queryFn: () => getSessions(monthStart, monthEnd),
    // enabled: !!user,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });

  const createMutation = useMutation({
    mutationFn: (data: SessionPayload) => createSession(data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["study-sessions"] });
      toast({ title: "Session created" });
      closeDialog();
    },
    onError: () => toast({ title: "Failed to create session", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SessionPayload & { completed: boolean }> }) =>
      updateSession(id, data),
    onSuccess: () => queryClient.refetchQueries({ queryKey: ["study-sessions"] }),
    onError: () => toast({ title: "Failed to update session", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSession(id),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["study-sessions"] });
      toast({ title: "Session deleted" });
      closeDialog();
    },
    onError: () => toast({ title: "Failed to delete session", variant: "destructive" }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSession(null);
    setForm(defaultForm(selectedDate));
  };

  const openCreate = () => {
    setEditingSession(null);
    setForm(defaultForm(selectedDate));
    setDialogOpen(true);
  };

  const openEdit = (session: StudySession) => {
    setEditingSession(session);
    setForm({
      title:            session.title,
      description:      session.description,
      date:             session.date,
      start_time:       session.start_time ?? "",
      duration_minutes: session.duration_minutes,
      module_id:        session.module_id?.toString() ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload: SessionPayload = {
      title:            form.title,
      description:      form.description,
      date:             form.date,
      start_time:       form.start_time,
      duration_minutes: form.duration_minutes,
      module_id:        form.module_id ? parseInt(form.module_id) : undefined,
    };
    if (editingSession) {
      updateMutation.mutate({ id: editingSession.id, data: payload });
      toast({ title: "Session updated" });
      closeDialog();
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleComplete = (session: StudySession) =>
    updateMutation.mutate({ id: session.id, data: { completed: !session.completed } });

  const daySessions = useMemo(
  () => sessions.filter(s => {
    const d = s.date ?? s.session_date?.split('T')[0];
    if (!d) return false;
    return isSameDay(new Date(d + "T00:00:00"), selectedDate);
  }),
  [sessions, selectedDate]
);

const datesWithSessions = useMemo(
  () => sessions
    .map(s => s.date ?? s.session_date?.split('T')[0])
    .filter(Boolean)
    .map(d => new Date(d + "T00:00:00")),
  [sessions]
);

const upcoming = useMemo(
  () => sessions.filter(s => {
    const d = s.date ?? s.session_date?.split('T')[0];
    if (!d || s.completed) return false;
    return isAfter(new Date(d + "T00:00:00"), new Date());
  }).slice(0, 5),
  [sessions]
);

  const formatTime = (t: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  };

  // flat list of all modules across subjects for the selector
  const allModules = useMemo(
    () => (subjects as Subject[]).flatMap(s => (s.modules ?? []).map(m => ({ ...m, subjectName: s.name }))),
    [subjects]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
          <p className="text-sm text-muted-foreground">Schedule and track your study sessions</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus size={16} />Add Session</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                month={month}
                onMonthChange={setMonth}
                className="pointer-events-auto"
                modifiers={{ hasSession: datesWithSessions }}
                modifiersClassNames={{ hasSession: "bg-primary/10 font-semibold" }}
              />
            </CardContent>
          </Card>

          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Upcoming</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcoming.map(s => (
                  <button key={s.id}
                  onClick={() => {
  const dateStr = s.date ?? s.session_date?.split('T')[0];
  if (!dateStr) return;
  const d = new Date(dateStr + "T00:00:00");
  setSelectedDate(d);
  setMonth(d);
}}
                    className="w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{s.title}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date((s.date ?? s.session_date?.split('T')[0]) + "T00:00:00"), "MMM d")}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{format(selectedDate, "EEEE, MMMM d")}</h2>
            <span className="text-sm text-muted-foreground">{daySessions.length} session{daySessions.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : daySessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No sessions scheduled for this day</p>
                <Button variant="outline" size="sm" className="mt-4 gap-1" onClick={openCreate}>
                  <Plus size={14} /> Add one
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {daySessions.map(session => (
                <Card key={session.id} className={cn("transition-colors", session.completed && "opacity-60")}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <button onClick={() => toggleComplete(session)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      {session.completed
                        ? <CheckCircle2 size={20} className="text-primary" />
                        : <Circle size={20} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-sm", session.completed && "line-through")}>{session.title}</p>
                      {session.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{session.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {session.start_time && <span className="flex items-center gap-1"><Clock size={12} />{formatTime(session.start_time)}</span>}
                        <span>{session.duration_minutes}m</span>
                        {session.module_id && (
                          <span className="bg-secondary px-1.5 py-0.5 rounded text-xs">
                            {allModules.find(m => m.id === session.module_id)?.module_name ?? `Module ${session.module_id}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => openEdit(session)}>
                      <Pencil size={14} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "New Study Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update the details of your study session." : "Schedule a new study session."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Review Normalization" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" min={5} step={5} value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} />
              </div>
              <div className="space-y-2">
                <Label>Module</Label>
                <Select value={form.module_id} onValueChange={v => setForm({ ...form, module_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {(subjects as Subject[]).map(sub => (
                      <div key={sub.id}>
                        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{sub.name}</p>
                        {(sub.modules ?? []).map(m => (
                          <SelectItem key={m.id} value={m.id.toString()}>{m.module_name}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingSession && (
              <Button variant="destructive" size="sm" className="mr-auto gap-1"
                onClick={() => deleteMutation.mutate(editingSession.id)}>
                <Trash2 size={14} /> Delete
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingSession ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
