"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  if (!session) return null;

  const isCoach = session.user.role === "ADMIN";
  const home = isCoach ? "/dashboard/coach" : "/dashboard/client";
  const links = isCoach
    ? [
        { href: "/dashboard/coach", label: "Clients", exact: true },
        { href: "/dashboard/coach/templates", label: "Templates" },
        { href: "/dashboard/coach/analytics", label: "Analytics" },
      ]
    : [
        { href: "/dashboard/client", label: "Workouts", exact: true },
        { href: "/dashboard/client/progress", label: "Progress" },
      ];

  const active = (l: { href: string; exact?: boolean }) =>
    l.exact ? pathname === l.href || pathname.startsWith(`${l.href}/clients`) || pathname.startsWith(`${l.href}/workouts`) : pathname.startsWith(l.href);

  return (
    <nav className="sticky top-0 z-50 bg-tg-darker border-b border-tg-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={home} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-tg-orange to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-lg font-black text-tg-black">TG</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">Exercise Tracker</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active(l) ? "bg-tg-orange text-tg-black" : "hover:bg-tg-gray"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="w-10 h-10 rounded-full bg-tg-orange text-tg-black font-bold flex items-center justify-center"
                aria-label="Account menu"
              >
                {session.user.name?.charAt(0) || session.user.email?.charAt(0)?.toUpperCase() || "U"}
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-tg-darker border border-tg-border rounded-lg shadow-lg">
                  <div className="px-4 py-3 border-b border-tg-border">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-tg-text-secondary truncate">{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-4 py-3 text-sm text-tg-danger hover:bg-tg-gray flex items-center gap-2"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden p-2 hover:bg-tg-gray rounded-lg">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-tg-border pt-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2 text-sm font-medium rounded-lg ${
                  active(l) ? "bg-tg-orange text-tg-black" : "hover:bg-tg-gray"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
