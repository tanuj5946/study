import { useState, useEffect, useRef } from "react";
import {
  Brain, TrendingUp, BookOpen, Target, AlertTriangle,
  Send, Bot, User, Loader2, ChevronRight, Calendar,
  BarChart3, Lightbulb, ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { getRecommendationsFull, sendChatMessage, type RecommendationData } from "@/lib/api";

/* ── Chat message type ── */
interface Message {
  role: "user" | "bot";
  text: string;
  time: string;
}

/* ── Markdown-like renderer ── */
function ChatText({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:marker:text-muted-foreground [&_strong]:font-semibold">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

/* ── Recommendations tab ── */
function RecommendationsTab({ data }: { data: RecommendationData }) {
  const { weakTopics, subjectPerformance, nextModules, predictions, studyPlan, studyStats } = data;

  const priorityColor = (p: string) =>
    p === "high" ? "text-destructive" : p === "medium" ? "text-amber-600" : "text-green-600";

  const trendIcon = (t: string) =>
    t === "improving" ? "📈" : t === "declining" ? "📉" : "➡️";

  return (
    <div className="space-y-6">

      {/* Study stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total tests", value: studyStats.total_tests, icon: BarChart3 },
          { label: "Sessions this week", value: studyStats.sessions_this_week, icon: Calendar },
          { label: "Avg daily mins", value: `${studyStats.avg_minutes_per_day}m`, icon: Target },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Weak topics — focus here first</h3>
          </div>
          <div className="space-y-3">
            {weakTopics.map(t => (
              <div key={t.topic}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${priorityColor(t.priority)}`}>
                      {t.priority === "high" ? "🔴" : "🟡"} {t.topic}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.accuracy}% · {t.attempts} attempts
                  </span>
                </div>
                <Progress
                  value={t.accuracy}
                  className="h-1.5 [&>div]:bg-destructive"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject performance */}
      {subjectPerformance.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Subject performance</h3>
          </div>
          <div className="space-y-3">
            {subjectPerformance.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {trendIcon(s.trend)} {s.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.avg_score}% avg · {s.tests} tests
                  </span>
                </div>
                <Progress
                  value={s.avg_score}
                  className={`h-1.5 ${s.avg_score >= 75 ? "[&>div]:bg-green-500" : s.avg_score >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive"}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next modules */}
      {nextModules.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recommended next modules</h3>
          </div>
          {nextModules.map((m, i) => (
            <div key={m.id}
              className={`px-5 py-3 flex items-center gap-3 ${i < nextModules.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{m.module_name}</p>
                  {m.flagged && (
                    <Badge variant="destructive" className="text-[10px] px-2 py-0">Needs review</Badge>
                  )}
                  <Badge
                    variant={m.difficulty === "Easy" ? "secondary" : m.difficulty === "Hard" ? "destructive" : "default"}
                    className="text-[10px] px-2 py-0"
                  >{m.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.subject_name} · {m.reason}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {/* Score predictions */}
      {predictions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-600" />
            <h3 className="text-sm font-semibold text-foreground">Score predictions — if you study these</h3>
          </div>
          <div className="space-y-3">
            {predictions.map(p => (
              <div key={p.topic} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.topic}</p>
                  <p className="text-xs text-muted-foreground">Current: {p.current_accuracy}%</p>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <ArrowUp size={14} />
                  <span className="text-sm font-bold">+{p.predicted_gain}%</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{p.predicted_score}%</p>
                  <p className="text-[10px] text-muted-foreground">predicted</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study plan */}
      {studyPlan.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Your 7-day study plan</h3>
          </div>
          <div className="space-y-3">
            {studyPlan.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                  ${p.priority === "high" ? "bg-red-100 text-red-700" : p.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{p.day}</p>
                    <span className="text-xs text-muted-foreground">{p.duration}</span>
                  </div>
                  <p className="text-xs font-medium text-primary mt-0.5">{p.focus}</p>
                  <p className="text-xs text-muted-foreground">{p.activity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weakTopics.length === 0 && subjectPerformance.length === 0 && (
        <div className="text-center py-16">
          <Brain size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold text-foreground">Koi data nahi abhi tak</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Pehle kuch tests do — phir main aapke liye personalized recommendations generate karunga!
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Chat tab ── */
function ChatTab({ data }: { data: RecommendationData | null }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Namaste! 👋 Main aapka StudySync AI assistant hun. Aap mujhse apni padhai ke baare mein kuch bhi pooch sakte ho!\n\nKuch examples:\n- **\"Mujhe kya padhna chahiye?\"**\n- **\"Meri weak topics kaunsi hain?\"**\n- **\"Study plan do\"**\n- **\"Mera performance kaisa hai?\"**",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    setMessages(prev => [...prev, {
      role: "user",
      text: userMsg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);

    setLoading(true);
    try {
      const { response } = await sendChatMessage(userMsg);
      setMessages(prev => [...prev, {
        role: "bot",
        text: response,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: "Kuch error aa gaya! 😅 Thodi der baad try karo.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false); }
  };

  const quickQuestions = [
    "Mujhe kya padhna chahiye?",
    "Meri weak topics kaunsi hain?",
    "Study plan do",
    "Mera performance kaisa hai?",
    "Motivate karo!",
  ];

  return (
    <div className="flex flex-col h-[600px]">

      {/* Quick questions */}
      <div className="flex gap-2 flex-wrap mb-3">
        {quickQuestions.map(q => (
          <button key={q}
            onClick={() => { setInput(q); }}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-xl border border-border bg-card">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0
              ${m.role === "bot" ? "bg-primary/10" : "bg-secondary"}`}>
              {m.role === "bot"
                ? <Bot size={16} className="text-primary" />
                : <User size={16} className="text-muted-foreground" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3
              ${m.role === "bot"
                ? "bg-secondary text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
              {m.role === "bot"
                ? <ChatText text={m.text} />
                : <p className="text-sm">{m.text}</p>}
              <p className={`text-[10px] mt-1 ${m.role === "bot" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                {m.time}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Kuch bhi poochho... (Enter press karo)"
          className="flex-1"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function RecommendationsContent() {
  const [data, setData]     = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecommendationsFull().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recommendations</h1>
        <p className="text-sm text-muted-foreground">AI-powered insights based on your performance</p>
      </div>

      <Tabs defaultValue="recommendations">
        <TabsList className="grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="recommendations" className="gap-2">
            <Brain size={14} /> Recommendations
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <Bot size={14} /> AI Chatbot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-6">
          {data ? <RecommendationsTab data={data} /> : (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Koi data nahi mila. Pehle kuch tests do!
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
