"use client";
import React, { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { getCurrentStoredUser, User } from "@/lib/api";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  const isPublicOnlyRoute = 
    pathname.startsWith("/public") || 
    pathname.startsWith("/track") || 
    pathname === "/login";

  useEffect(() => {
    const u = getCurrentStoredUser();
    setUser(u);
    setMounted(true);

    const isAuthorized = u && (u.role === "ADMIN" || u.role === "BUREAU_OFFICER" || u.role === "VIEWER");

    // Protection: If unauthenticated user visits internal dashboard routes, redirect to /login
    if (!isAuthorized && !isPublicOnlyRoute) {
      router.replace("/login");
    }
  }, [pathname, isPublicOnlyRoute, router]);

  // While validating credentials for internal routes, show lightweight shell
  if (!mounted && !isPublicOnlyRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-slate-400">
          Loading AICTE Portal...
        </div>
      </div>
    );
  }

  const showSidebar = !isPublicOnlyRoute && user && (user.role === "ADMIN" || user.role === "BUREAU_OFFICER" || user.role === "VIEWER");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      
      {!showSidebar ? (
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
}

