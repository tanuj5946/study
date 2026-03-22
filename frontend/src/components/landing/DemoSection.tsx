import { Clock, Activity, CalendarDays, AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
];

const kpis = [
  { icon: Clock, label: "Study Hours", value: "42.5h", change: "+12% vs last week" },
  { icon: Activity, label: "Consistency Score", value: "87%", change: "+5 points" },
  { icon: CalendarDays, label: "Upcoming Deadlines", value: "3", change: "Next: Mar 5" },
  { icon: AlertTriangle, label: "Weak Topics", value: "4", change: "CN, DBMS flagged" },
];

export function DemoSection() {
  return (
    <section className="py-20 px-5 bg-secondary/30">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Live Preview</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">
            See Your Dashboard in Action
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Here's what your personalized study dashboard looks like — charts, modules, and AI-powered actions all in one place.
          </p>
        </div>

        {/* Demo Dashboard Container */}
        <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-6 shadow-md relative overflow-hidden">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-destructive/60" />
              <span className="w-3 h-3 rounded-full bg-accent" />
              <span className="w-3 h-3 rounded-full bg-primary/30" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-secondary rounded-full px-4 py-1 text-xs text-muted-foreground font-mono">
                studysync.app/dashboard
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <kpi.icon size={14} className="text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{kpi.value}</div>
                  <div className="text-[11px] text-primary mt-0.5">{kpi.change}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Study Time – Last 7 Days</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={studyTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                    <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Topic Mastery</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topicMasteryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="topic" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="mastery" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Modules Table */}
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-xs font-semibold text-foreground">Active Modules</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Module</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Topics</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Progress</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Next Exam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.name} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">{mod.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{mod.topics}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${mod.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">{mod.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            mod.status === "On track"
                              ? "bg-accent text-accent-foreground"
                              : "bg-destructive/10 text-destructive"
                          }`}>
                            {mod.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">{mod.exam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Next Actions */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={14} className="text-primary" />
                <h3 className="text-xs font-semibold text-foreground">AI Next Actions</h3>
              </div>
              <div className="space-y-2">
                {aiActions.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      item.priority === "High"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent text-accent-foreground"
                    }`}>
                      {item.priority}
                    </span>
                    <p className="text-xs text-foreground flex-1">{item.action}</p>
                    <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA below demo */}
        <div className="text-center mt-10">
          <Link to="/auth">
            <Button size="lg" className="rounded-full px-8">
              Get Started Free
            </Button>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required</p>
        </div>
      </div>
    </section>
  );
}
