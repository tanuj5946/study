import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Clock, BookOpen, TrendingUp, Calendar, Activity
} from "lucide-react";

function FauxDashboard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
      {/* Top KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Study Hours", value: "42.5h", icon: Clock, change: "+12%" },
          { label: "Consistency", value: "87%", icon: Activity, change: "+5%" },
          { label: "Modules", value: "6", icon: BookOpen, change: "Active" },
          { label: "Deadlines", value: "3", icon: Calendar, change: "This week" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-lg font-semibold text-foreground">{kpi.value}</div>
            <div className="text-xs text-primary font-medium">{kpi.change}</div>
          </div>
        ))}
      </div>
      {/* Chart + Table row */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3">Study Time – Last 7 Days</div>
          <div className="flex items-end gap-1.5 h-20">
            {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/20"
                style={{ height: `${h}%` }}
              >
                <div
                  className="w-full rounded-sm bg-primary transition-all"
                  style={{ height: `${h * 0.7}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3">Active Modules</div>
          <div className="space-y-2">
            {[
              { name: "DSA", status: "On track" },
              { name: "DBMS", status: "Behind" },
              { name: "OS", status: "On track" },
            ].map((mod) => (
              <div key={mod.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{mod.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  mod.status === "On track"
                    ? "bg-accent text-accent-foreground"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {mod.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="mx-auto max-w-7xl px-5 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center mb-12 md:mb-16">
          <div className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-6">
            AI-Powered Academic Performance OS
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-5 text-balance">
            Academic performance, operationalized.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
            Organize your study materials, track learning behavior, surface knowledge gaps, and receive AI-powered recommendations — all in one structured workspace.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/app">
              <Button size="lg" className="rounded-full px-8 text-base font-semibold">
                Get started
              </Button>
            </Link>
            <Link to="/app">
              <Button size="lg" variant="outline" className="rounded-full px-8 text-base font-semibold">
                View demo
              </Button>
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-4xl animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <FauxDashboard />
        </div>
      </div>
    </section>
  );
}
