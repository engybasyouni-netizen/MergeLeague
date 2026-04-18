import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/team", label: "Team" },
  { href: "/wallet", label: "Wallet" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.15),transparent_35%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-8">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur xl:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#67e8f9,#facc15)] text-base font-bold text-slate-950">
                    ML
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight text-white">MergeLeague</p>
                    <p className="text-sm text-slate-400">Engineering competition, scored for real work.</p>
                  </div>
                </Link>
                <Badge className="hidden border-cyan-300/20 bg-cyan-300/10 text-cyan-100 md:inline-flex">
                  Developer League
                </Badge>
              </div>

              <nav className="flex flex-wrap items-center gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href={`${apiUrl}/auth/github`}
                  className="ml-0 inline-flex h-11 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-medium text-slate-950 shadow-[0_14px_50px_rgba(103,232,249,0.18)] transition hover:bg-cyan-200 sm:w-auto lg:ml-2"
                >
                  Sign in with GitHub
                </a>
              </nav>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
