"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import type { SessionPayload } from "@/lib/auth/jwt";

export function Shell({ 
  children,
  session
}: { 
  children: ReactNode;
  session?: SessionPayload | null;
}) {
  const pathname = usePathname();

  useEffect(() => {
    window.__gifmemeReady = true;
  }, []);

  const isEmbedRoute = pathname.startsWith("/embed/");

  if (isEmbedRoute) {
    return <main id="main-content">{children}</main>;
  }

  return (
    <div className="shell">
      <Header session={session} />
      <main className="shell__main" id="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}
