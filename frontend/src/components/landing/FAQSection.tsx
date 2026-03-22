import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does StudySync differ from a regular study planner?",
    a: "StudySync goes beyond scheduling. It tracks your study behavior over time, detects knowledge gaps across subjects, and delivers AI-powered recommendations on what to focus on next — turning raw effort into measurable progress.",
  },
  {
    q: "Do I need to manually log study sessions?",
    a: "You can, but it's optional. StudySync uses lightweight session tracking to automatically capture when and how long you study each module. You can also adjust logs manually for offline study time.",
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. All data is encrypted at rest and in transit. We never share or sell your academic data. Institutional deployments include SSO and full admin controls for compliance.",
  },
  {
    q: "How does AI gap detection work?",
    a: "StudySync analyzes your study patterns, session frequency, and topic coverage to identify areas where you're under-prepared. It then surfaces prioritized recommendations so you can focus where it matters most.",
  },
  {
    q: "Can I use StudySync for group study?",
    a: "Yes. Team features include shared modules, group dashboards, and collaborative analytics so study groups can coordinate and track progress together.",
  },
];

export function FAQSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-3xl px-5">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Frequently asked questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border bg-card px-5 shadow-card"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
