import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const tabs = ["Platform", "Modules", "Insights"];

export function Navbar() {
  const [active, setActive] = useState("Platform");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { user, signOut } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const modulesHref = user ? "/app/modules" : "/auth";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl shadow-nav">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          StudySync
        </Link>

        {/* Center tabs – desktop */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-secondary/80 p-1">
            {tabs.map((tab) =>
              tab === "Modules" ? (
                <Link
                  key={tab}
                  to={modulesHref}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    active === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </Link>
              ) : (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    active === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </nav>
        )}

        {/* Right actions – desktop */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <>
              <Link to="/app">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="rounded-full px-5">
                Get started
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-5 py-4 space-y-3">
          {user && tabs.map((tab) =>
            tab === "Modules" ? (
              <Link
                key={tab}
                to={modulesHref}
                onClick={() => setMobileOpen(false)}
                className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {tab}
              </Link>
            ) : (
              <button
                key={tab}
                onClick={() => { setActive(tab); setMobileOpen(false); }}
                className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {tab}
              </button>
            )
          )}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              {dark ? "Light mode" : "Dark mode"}
            </button>
            {user ? (
              <>
                <Link to="/app" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { signOut(); setMobileOpen(false); }}>
                  <LogOut size={16} className="mr-2" /> Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button className="w-full rounded-full">Get started</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
