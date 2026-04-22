import { Link, useLocation, Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, MessageSquare, User, LogOut, Loader2, Map, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Atelier" },
  { to: "/roadmap", icon: Map, label: "Roadmap" },
  { to: "/quiz", icon: Sparkles, label: "Aptitude" },
  { to: "/chat", icon: MessageSquare, label: "Counsel" },
  { to: "/profile", icon: User, label: "You" },
];

const AppLayout = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigate to a route AND scroll to top (used by footer links so users land
  // at the very start of the target page).
  const goTo = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(to);
      // After route change, ensure we're at the top.
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={1.25} /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Floating glass pill nav */}
      <header className="sticky top-4 z-50 mx-auto w-[min(95%,1100px)] px-2">
        <nav
          className="flex items-center justify-between rounded-full border px-3 py-2 md:px-5 md:py-2.5"
          style={{
            background: "hsl(60 24% 99% / 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "hsl(0 0% 100% / 0.7)",
            boxShadow: "0 1px 2px hsl(140 22% 14% / 0.04), 0 12px 32px -16px hsl(140 22% 14% / 0.18)",
          }}
        >
          <Link to="/dashboard" className="flex items-center gap-2.5 px-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-heading text-base md:text-lg tracking-tight">Maison Guide</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "label-mono px-3 py-1.5 rounded-full transition-all",
                  location.pathname === item.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <div className="md:hidden flex gap-0.5">
              {navItems.map(item => (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 rounded-full", location.pathname === item.to && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
                  >
                    <item.icon className="h-3.5 w-3.5" strokeWidth={1.25} />
                  </Button>
                </Link>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.25} />
            </Button>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-6">
        <Outlet />
      </main>

      {/* Fat footer */}
      <footer className="mt-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 md:px-12 py-16 md:py-24 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="label-mono opacity-60 mb-4">Est. 2026</p>
            <h2 className="font-heading text-4xl md:text-6xl leading-[1.05] tracking-tight">
              The blueprint for<br />your career,<br /><em className="not-italic opacity-70">handcrafted.</em>
            </h2>
          </div>
          <div className="md:col-span-3">
            <p className="label-mono opacity-60 mb-4">The Studio</p>
            <ul className="space-y-2 font-heading text-lg">
              <li><a href="/dashboard" onClick={goTo("/dashboard")} className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer">Atelier</a></li>
              <li><a href="/roadmap" onClick={goTo("/roadmap")} className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer">Roadmap</a></li>
              <li><a href="/quiz" onClick={goTo("/quiz")} className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer">Aptitude</a></li>
              <li><a href="/chat" onClick={goTo("/chat")} className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer">Counsel</a></li>
              <li><a href="/profile" onClick={goTo("/profile")} className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer">You</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <p className="label-mono opacity-60 mb-4">A note</p>
            <p className="text-sm opacity-80 leading-relaxed">
              Built for students who believe a college isn't a brand to chase — it's a chapter to choose. We pair quiet research with honest conversation.
            </p>
            <p className="label-mono opacity-50 mt-8">© 2026 — Maison Guide</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
