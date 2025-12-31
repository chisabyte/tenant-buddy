"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  AlertTriangle,
  FolderOpen,
  FileText,
  Settings,
  Lock,
  Menu,
  X,
  Plus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    email?: string;
    id?: string;
  };
  profile?: {
    state?: string;
  };
  property?: {
    address_text?: string;
  };
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/issues",
    label: "My Issues",
    icon: AlertTriangle,
  },
  {
    href: "/evidence",
    label: "Evidence Vault",
    icon: FolderOpen,
  },
  {
    href: "/evidence-packs",
    label: "Evidence Packs",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function AppShell({ children, user, profile, property }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-full w-[260px] flex-col justify-between bg-card-dark border-r border-card-lighter p-4 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Branding */}
          <Link href="/dashboard" className="flex items-center gap-3 px-2 hover:opacity-80 transition-opacity">
            <BrandLogo size="desktop" variant="primary" priority />
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-subtle hover:bg-card-lighter hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "group-hover:text-primary"
                    )}
                  />
                  <p className="text-sm font-medium">{item.label}</p>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-4">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-text-subtle text-xs">
              <Lock className="h-4 w-4 text-green-500" />
              <span>Data is encrypted & secure</span>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card-lighter border border-card-lighter/50">
            <div className="bg-primary/20 rounded-full h-10 w-10 flex items-center justify-center text-primary font-bold">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <p className="text-white text-sm font-medium truncate">
                {user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-text-subtle text-xs truncate">
                Tenant at {property?.address_text || "No property set"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <Button asChild className="w-full h-12 bg-primary hover:bg-primary/90 text-background-dark font-bold shadow-lg shadow-primary/20">
            <Link href="/issues/new">
              <Plus className="h-4 w-4 mr-2" />
              Log New Issue
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-card-dark border-b border-card-lighter sticky top-0 z-20">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BrandLogo size="mobile" variant="mono-light" priority />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => setMobileMenuOpen(false)}>
                  <BrandLogo size="mobile" variant="mono-light" priority />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex flex-col gap-2 p-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-text-subtle hover:bg-card-lighter hover:text-white"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <p className="text-base font-medium">{item.label}</p>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto p-4 border-t border-border">
                <Button asChild className="w-full mb-3">
                  <Link href="/issues/new" onClick={() => setMobileMenuOpen(false)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log New Issue
                  </Link>
                </Button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mb-3"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
                <div className="flex items-center gap-2 text-text-subtle text-xs justify-center">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span>Data is encrypted & secure</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
