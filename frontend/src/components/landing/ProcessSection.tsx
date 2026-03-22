import { Upload, Cpu, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload & organize",
    description: "Drop your notes, slides, and past papers. AI structures them into review-ready modules.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Track & analyze",
    description: "Log sessions, spot patterns, and let the system surface gaps across your subjects.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Act on insights",
    description: "Get prioritized recommendations and watch your consistency and mastery scores improve.",
  },
];

export function ProcessSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            From files to insights
          </h2>
          <p className="text-muted-foreground text-lg">
            Three steps to transform how you prepare for exams.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.step} className="text-center animate-fade-in" style={{ animationDelay: `${i * 0.15}s`, opacity: 0 }}>
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <s.icon size={24} />
              </div>
              <div className="text-xs font-semibold text-primary tracking-widest uppercase mb-2">
                Step {s.step}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
