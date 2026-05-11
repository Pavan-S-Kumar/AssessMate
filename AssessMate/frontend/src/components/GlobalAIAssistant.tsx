"use client";

import { usePathname } from "next/navigation";
import AIAssistantButton from "./AIAssistantButton";

export default function GlobalAIAssistant() {
  const pathname = usePathname();
  
  // Hide global Mate on public/auth pages and test pages (which use a custom hint Mate)
  if (!pathname || pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/test/")) {
    return null;
  }
  
  return <AIAssistantButton isDashboard={pathname === "/dashboard"} />;
}
