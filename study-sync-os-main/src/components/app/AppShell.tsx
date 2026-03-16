import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, CalendarDays, BarChart3,
  Lightbulb, Settings, Search, Bell, ChevronLeft, Menu, LogOut, Check, ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, endOfWeek } from "date-fns";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/app" },
  { icon: BookOpen, label: "Modules", path: "/app/modules" },
  { icon: CalendarDays, label: "Planner", path: "/app/planner" },
  { icon: ClipboardCheck, label: "Tests", path: "/app/tests" },
  { icon: BarChart3, label: "Analytics", path: "/app/analytics" },
  { icon: Lightbulb, label: "Recommendations", path: "/app/recommendations" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
];

const mockNotifications = [
  { id: "1", title: "Study reminder", body: "You have a session scheduled in 30 minutes.", time: "10 min ago", read: false },
  { id: "2", title: "Milestone reached!", body: "You completed 10 study sessions this week.", time: "2 hrs ago", read: false },
  { id: "3", title: "Weekly digest ready", body: "Your weekly progress report is available.", time: "1 day ago", read: true },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link to="/" className="text-base font-bold text-foreground">StudySync</Link>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function getUserInitials(user: any): string {
  const name = user?.user_metadata?.display_name || user?.email || "";
  if (user?.user_metadata?.display_name) {
    return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function AppTopbar({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const dateRange = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const initials = getUserInitials(user);
  const unreadCount = mockNotifications.filter(n => !n.read && !readIds.has(n.id)).length;

  const markAllRead = () => {
    setReadIds(new Set(mockNotifications.map(n => n.id)));
  };

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-6 transition-all ${
        sidebarCollapsed ? "ml-16" : "ml-60"
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search modules, topics..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden sm:block">{dateRange}</span>

        {/* Notification Popover */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {mockNotifications.map(n => {
                const isRead = n.read || readIds.has(n.id);
                return (
                  <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 ${!isRead ? "bg-accent/30" : ""}`}>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Avatar Popover */}
        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {initials}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <p className="px-2 py-1 text-sm font-medium text-foreground truncate">
              {user?.user_metadata?.display_name || user?.email}
            </p>
            <p className="px-2 pb-2 text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="border-t border-border pt-1 space-y-0.5">
              <button
                onClick={() => { setProfileOpen(false); navigate("/app/settings"); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-foreground rounded hover:bg-secondary"
              >
                <Settings size={14} /> Settings
              </button>
              <button
                onClick={() => { setProfileOpen(false); signOut(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive rounded hover:bg-secondary"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
