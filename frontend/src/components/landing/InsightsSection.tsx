import { TrendingUp, Target, Clock, Zap } from "lucide-react";

const kpis = [
  { icon: TrendingUp, label: "Avg. consistency boost", value: "+34%", color: "text-primary" },
  { icon: Target, label: "Topic mastery improved", value: "2.4x", color: "text-primary" },
  { icon: Clock, label: "Study time saved weekly", value: "5.2h", color: "text-primary" },
  { icon: Zap, label: "Exam readiness score", value: "91%", color: "text-primary" },
];

export function InsightsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-5">
              Insights that change what you do tomorrow
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              StudySync doesn't just show data — it translates your study patterns into concrete next-step recommendations. Know exactly which topic to tackle, when to review, and how your preparation stacks up before exam day.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Students using StudySync report higher consistency, better time allocation, and a measurable improvement in subject mastery within the first two weeks.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <kpi.icon size={20} className="text-muted-foreground mb-3" />
                <div className={`text-2xl font-bold ${kpi.color} mb-1`}>{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
