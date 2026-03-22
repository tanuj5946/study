import { Clock, Activity, CalendarDays, AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const studyTimeData = [
  { day: "Mon", hours: 3.2 }, { day: "Tue", hours: 4.5 }, { day: "Wed", hours: 2.8 },
  { day: "Thu", hours: 5.1 }, { day: "Fri", hours: 3.9 }, { day: "Sat", hours: 6.2 },
  { day: "Sun", hours: 4.0 },
];

const topicMasteryData = [
  { topic: "DSA", mastery: 78 }, { topic: "DBMS", mastery: 62 },
  { topic: "OS", mastery: 85 }, { topic: "CN", mastery: 54 },
];

const modules = [
  { name: "Data Structures & Algorithms", topics: 24, progress: 78, status: "On track", exam: "Midterm – Mar 5" },
  { name: "Database Management Systems", topics: 18, progress: 62, status: "Behind", exam: "Finals – Apr 20" },
  { name: "Operating Systems", topics: 20, progress: 85, status: "On track", exam: "Midterm – Mar 8" },
  { name: "Computer Networks", topics: 16, progress: 54, status: "At risk", exam: "Midterm – Mar 12" },
];

const aiActions = [
  { priority: "High", action: "Review CN Transport Layer — weakest topic, exam in 24 days", topic: "CN" },
  { priority: "High", action: "Complete DBMS Normalization practice set (3NF/BCNF)", topic: "DBMS" },
  { priority: "Medium", action: "Revise OS Process Scheduling — last reviewed 8 days ago", topic: "OS" },
  { priority: "Medium", action: "Start DSA Graph Algorithms module (0% coverage)", topic: "DSA" },
  { priority: "Low", action: "Review DSA Sorting Algorithms — strong but due for spaced repetition", topic: "DSA" },
];

const kpis = [
  { icon: Clock, label: "Study Hours", value: "42.5h", change: "+12% vs last week" },
  { icon: Activity, label: "Consistency Score", value: "87%", change: "+5 points" },
  { icon: CalendarDays, label: "Upcoming Deadlines", value: "3", change: "Next: Mar 5" },
  { icon: AlertTriangle, label: "Weak Topics", value: "4", change: "CN, DBMS flagged" },
];

export function DashboardContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">Your academic performance at a glance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-primary mt-1">{kpi.change}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Study Time – Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={studyTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="hours" stroke="hsl(238 65% 60%)" strokeWidth={2} dot={{ fill: "hsl(238 65% 60%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Topic Mastery</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topicMasteryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 14% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="mastery" fill="hsl(238 65% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Modules Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Active Modules</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Module</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Topics</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Progress</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Next Exam</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod.name} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{mod.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{mod.topics}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{mod.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      mod.status === "On track"
                        ? "bg-accent text-accent-foreground"
                        : mod.status === "Behind"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {mod.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{mod.exam}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Next Actions */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Next Actions</h3>
        </div>
        <div className="space-y-3">
          {aiActions.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                item.priority === "High"
                  ? "bg-destructive/10 text-destructive"
                  : item.priority === "Medium"
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {item.priority}
              </span>
              <div className="flex-1">
                <p className="text-sm text-foreground">{item.action}</p>
                <span className="text-xs text-muted-foreground">{item.topic}</span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground mt-1 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
