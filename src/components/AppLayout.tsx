import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, MessageSquare, LayoutDashboard, User, LogOut, Loader2, Map, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/roadmap", icon: Map, label: "Roadmap" },
  { to: "/quiz", icon: Sparkles, label: "Aptitude Quiz" },
  { to: "/chat", icon: MessageSquare, label: "AI Counsellor" },
  { to: "/profile", icon: User, label: "Profile" },
];

const AppLayout = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4">
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-heading text-lg font-bold gradient-text">UniGuide AI</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile nav */}
        <nav className="md:hidden flex items-center justify-between border-b border-border bg-card p-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-bold gradient-text">UniGuide AI</span>
          </Link>
          <div className="flex gap-1">
            {navItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(location.pathname === item.to && "bg-primary/10 text-primary")}
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
