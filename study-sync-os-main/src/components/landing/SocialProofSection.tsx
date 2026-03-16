import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya K.",
    role: "CS Senior, IIT Delhi",
    quote: "StudySync helped me realize I was spending 60% of my time on subjects I was already strong in. Redistributing my effort improved my GPA by 0.4 in one semester.",
  },
  {
    name: "Marcus L.",
    role: "Pre-Med, UC Berkeley",
    quote: "The gap detection is genuinely useful. It found weak spots in my biochemistry prep that I would have missed until the exam. Highly recommend.",
  },
  {
    name: "Aisha M.",
    role: "Engineering, TU Munich",
    quote: "I used to plan my study sessions in a spreadsheet. StudySync replaced all of that and actually tells me what to focus on next. It's a relief.",
  },
];

const logos = ["MIT OpenCourseWare", "Coursera", "edX", "Khan Academy", "Notion"];

export function SocialProofSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5">
        {/* Logo strip */}
        <div className="mb-16 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6">
            Trusted by students at top institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {logos.map((logo) => (
              <span key={logo} className="text-sm font-semibold text-muted-foreground/50">
                {logo}
              </span>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-5">"{t.quote}"</p>
              <div>
                <div className="text-sm font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
