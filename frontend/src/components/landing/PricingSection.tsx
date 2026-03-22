import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For getting started with structured studying.",
    features: ["3 modules", "Basic session tracking", "Weekly summary", "Community support"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    monthlyPrice: 12,
    yearlyPrice: 9,
    description: "For serious students who want AI-powered insights.",
    features: ["Unlimited modules", "AI gap detection", "Smart recommendations", "Advanced analytics", "Priority support"],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Campus",
    monthlyPrice: 29,
    yearlyPrice: 22,
    description: "For study groups and academic departments.",
    features: ["Everything in Pro", "Team dashboards", "Shared modules", "Admin controls", "SSO & LMS integration", "Dedicated support"],
    cta: "Contact sales",
    highlighted: false,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start free. Upgrade when you're ready for AI-powered insights.
          </p>
          {/* Toggle */}
          <div className="inline-flex items-center gap-3 rounded-full bg-secondary p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                !annual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                annual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-primary font-semibold">Save 25%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-card shadow-card-hover ring-1 ring-primary/20"
                  : "border-border bg-card shadow-card"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-primary mb-3">Most popular</div>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-4xl font-bold text-foreground">
                  ${annual ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span className="text-sm text-muted-foreground ml-1">/mo</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check size={16} className="text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/app">
                <Button
                  className={`w-full rounded-full ${plan.highlighted ? "" : ""}`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
