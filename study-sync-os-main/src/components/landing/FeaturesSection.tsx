import { Brain, BarChart3, Search, Lightbulb } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Smart Modules",
    description: "Upload notes, slides, and past papers. StudySync auto-organizes materials into structured, reviewable modules.",
  },
  {
    icon: BarChart3,
    title: "Behavior Tracking",
    description: "Log study sessions automatically. See patterns in when, what, and how long you study — daily, weekly, and by subject.",
  },
  {
    icon: Search,
    title: "Gap Detection",
    description: "AI analyzes your quiz results, notes coverage, and time distribution to identify topics you're weakest in.",
  },
  {
    icon: Lightbulb,
    title: "AI Recommendations",
    description: "Get prioritized, actionable study tasks based on your schedule, upcoming exams, and detected knowledge gaps.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Everything you need to study with consistency
          </h2>
          <p className="text-muted-foreground text-lg">
            Four pillars that turn fragmented studying into a structured, measurable system.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <f.icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
