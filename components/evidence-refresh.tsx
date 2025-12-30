"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function EvidenceRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Listen for storage events (when upload completes and sets a flag)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "evidence_uploaded" && pathname === "/evidence") {
        // Clear the flag and refresh
        localStorage.removeItem("evidence_uploaded");
        router.refresh();
      }
    };

    // Check if there's a pending refresh
    if (localStorage.getItem("evidence_uploaded") && pathname === "/evidence") {
      localStorage.removeItem("evidence_uploaded");
      router.refresh();
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router, pathname]);

  return null;
}


