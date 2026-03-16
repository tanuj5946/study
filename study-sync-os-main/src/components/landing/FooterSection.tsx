import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="rounded-3xl gradient-cta p-10 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary-foreground mb-4">
            Start building consistency
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
            Join thousands of students who've replaced ad-hoc cramming with a structured, data-driven approach to learning.
          </p>
          <Link to="/app">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-10 text-base font-semibold"
            >
              Get started free
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  const links = {
    Product: ["Platform", "Modules", "Analytics", "Pricing"],
    Resources: ["Documentation", "API Reference", "Blog", "Changelog"],
    Company: ["About", "Careers", "Contact", "Privacy"],
  };

  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-lg font-bold text-foreground mb-3">StudySync</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered academic performance operating system.
            </p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <div className="text-sm font-semibold text-foreground mb-3">{category}</div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2026 StudySync. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Terms</span>
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Privacy</span>
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
