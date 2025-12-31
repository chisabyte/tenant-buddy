"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceGridWithFilters } from "@/components/evidence-grid-filterable";
import Link from "next/link";
import { Upload, Archive, FolderOpen, History, Cloud, Search, Grid3x3, List, ChevronDown, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  checkEnforcement,
  type EnforcementResult,
} from "@/lib/enforcement";
import { EnforcementModal } from "@/components/enforcement-modal";
import type { CaseHealthStatus } from "@/lib/case-health";
import type { PlanId } from "@/lib/billing/plans";

interface EvidenceItem {
  id: string;
  type: string;
  category: string | null;
  room: string | null;
  note: string | null;
  occurred_at: string;
  uploaded_at: string;
  sha256: string | null;
  file_path: string | null;
  issue_id: string | null;
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lastUpload, setLastUpload] = useState("Never");
  const [storageUsed, setStorageUsed] = useState("0 B");
  const [storagePercentage, setStoragePercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_newest");

  // Enforcement state
  const [enforcement, setEnforcement] = useState<EnforcementResult | null>(null);
  const [showEnforcementModal, setShowEnforcementModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [userPlanId, setUserPlanId] = useState<PlanId>("free");
  const [caseHealthCache, setCaseHealthCache] = useState<Map<string, { status: CaseHealthStatus; score: number }>>(new Map());

  const fetchEvidence = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch user's subscription for plan
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("price_id, status")
      .eq("user_id", user.id)
      .single();

    let planId: PlanId = "free";
    if (subscription?.status === "active" || subscription?.status === "trialing") {
      if (subscription.price_id?.includes("pro")) {
        planId = "pro";
      } else if (subscription.price_id?.includes("plus")) {
        planId = "plus";
      }
    }
    setUserPlanId(planId);

    // Fetch evidence items
    const { data: evidenceData, error } = await supabase
      .from("evidence_items")
      .select(`
        id,
        type,
        category,
        room,
        note,
        occurred_at,
        uploaded_at,
        sha256,
        file_path,
        issue_id
      `)
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching evidence:", error);
      setLoading(false);
      return;
    }

    setEvidence(evidenceData || []);
    setTotalCount(evidenceData?.length || 0);

    // Set last upload date
    if (evidenceData && evidenceData.length > 0) {
      const lastUploadDate = evidenceData[0].uploaded_at;
      if (lastUploadDate) {
        setLastUpload(format(new Date(lastUploadDate), "MMM d, yyyy"));
      }
    }

    // Calculate storage by listing all files in user's storage folders
    let storageBytes = 0;
    if (evidenceData && evidenceData.length > 0) {
      try {
        // Get unique folder paths from evidence items
        const folderPaths = new Set<string>();
        evidenceData.forEach(item => {
          if (item.file_path) {
            // file_path format: userId/evidenceType/timestamp-random-filename
            const parts = item.file_path.split("/");
            if (parts.length >= 2) {
              const userFolder = parts[0];
              const typeFolder = parts[1];
              folderPaths.add(`${userFolder}/${typeFolder}`);
            }
          }
        });

        // List files in each folder and sum up sizes
        for (const folderPath of folderPaths) {
          try {
            const { data: files, error: listError } = await supabase.storage
              .from("evidence")
              .list(folderPath, { limit: 1000 });

            if (!listError && files) {
              for (const file of files) {
                // Skip folders (they have id but no metadata.size typically)
                if (file.metadata?.size) {
                  storageBytes += file.metadata.size;
                }
              }
            }
          } catch (folderErr) {
            console.log("Could not list folder:", folderPath);
          }
        }

        console.log("[Evidence] Storage calculation:", {
          folderPaths: Array.from(folderPaths),
          totalBytes: storageBytes,
          fileCount: evidenceData.length,
        });
      } catch (err) {
        console.error("Error calculating storage:", err);
      }
    }

    // Format storage
    const storageTotalBytes = 1024 * 1024 * 1024; // 1 GB
    const percentage = Math.round((storageBytes / storageTotalBytes) * 100);
    setStoragePercentage(percentage);

    if (storageBytes === 0) {
      setStorageUsed("0 B");
    } else {
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(storageBytes) / Math.log(k));
      setStorageUsed(Math.round((storageBytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  // Filter and sort evidence
  const filteredEvidence = evidence
    .filter((item) => {
      // Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "photos" && !["photo", "screenshot"].includes(item.type)) return false;
        if (typeFilter === "documents" && !["pdf", "document"].includes(item.type)) return false;
        if (typeFilter === "other" && ["photo", "screenshot", "pdf", "document"].includes(item.type)) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNote = item.note?.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesFile = item.file_path?.toLowerCase().includes(query);
        if (!matchesNote && !matchesCategory && !matchesFile) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_oldest":
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case "name_asc":
          return (a.note || a.file_path || "").localeCompare(b.note || b.file_path || "");
        case "name_desc":
          return (b.note || b.file_path || "").localeCompare(a.note || a.file_path || "");
        case "date_newest":
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });

  const getIssueHealth = async (issueId: string): Promise<{ status: CaseHealthStatus; score: number }> => {
    // Check cache first
    if (caseHealthCache.has(issueId)) {
      return caseHealthCache.get(issueId)!;
    }

    const supabase = createClient();

    // Get evidence count for issue
    const { count: evCount } = await supabase
      .from("evidence_items")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId);

    // Get comms count
    const { count: cmCount } = await supabase
      .from("comms_logs")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId);

    const ev = evCount || 0;
    const cm = cmCount || 0;

    let score = 40;
    if (ev >= 1) score += 15;
    if (ev >= 3) score += 15;
    if (cm >= 1) score += 15;
    if (cm >= 2) score += 15;

    let status: CaseHealthStatus = "at-risk";
    if (score >= 80) status = "strong";
    else if (score >= 60) status = "adequate";
    else if (score >= 40) status = "weak";

    const health = { status, score };
    setCaseHealthCache(new Map(caseHealthCache.set(issueId, health)));
    return health;
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();

    // Find the item to get file path and issue_id
    const item = evidence.find(e => e.id === id);

    // If item is linked to an issue, check enforcement
    if (item?.issue_id) {
      const health = await getIssueHealth(item.issue_id);
      const enforcementResult = checkEnforcement("delete_evidence", health.status, health.score, userPlanId);

      if (!enforcementResult.allowed) {
        // Hard blocked
        setEnforcement(enforcementResult);
        setPendingDeleteId(id);
        setShowEnforcementModal(true);
        return;
      }

      if (enforcementResult.requiresConfirmation) {
        // Soft blocked - needs confirmation
        setEnforcement(enforcementResult);
        setPendingDeleteId(id);
        setShowEnforcementModal(true);
        return;
      }

      if (enforcementResult.level === "warned") {
        // Show warning but allow
        const proceed = window.confirm(
          `${enforcementResult.message.title}\n\n${enforcementResult.message.description}\n\nDo you want to proceed?`
        );
        if (!proceed) return;

        // Log the override
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("override_logs").insert({
            user_id: user.id,
            action: "delete_evidence",
            enforcement_level: "warned",
            health_status: health.status,
            health_score: health.score,
            issue_id: item.issue_id,
            evidence_id: id,
            plan_id: userPlanId,
            plan_mode: userPlanId === "pro" ? "advisor" : "guided",
          });
        }
      }
    }

    // Proceed with deletion
    await performDelete(id);
  };

  const performDelete = async (id: string, reason?: string) => {
    const supabase = createClient();
    const item = evidence.find(e => e.id === id);

    // Log override if we had enforcement
    if (enforcement && item?.issue_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("override_logs").insert({
          user_id: user.id,
          action: "delete_evidence",
          enforcement_level: enforcement.level,
          health_status: enforcement.context.healthStatus,
          health_score: enforcement.context.healthScore,
          issue_id: item.issue_id,
          evidence_id: id,
          reason: reason || null,
          plan_id: enforcement.context.planId,
          plan_mode: enforcement.context.planMode,
        });
      }
    }

    // Delete from storage if file path exists
    if (item?.file_path) {
      await supabase.storage.from("evidence").remove([item.file_path]);
    }

    // Delete from database
    const { error } = await supabase
      .from("evidence_items")
      .delete()
      .eq("id", id);

    if (!error) {
      // Refresh data
      fetchEvidence();
    }

    // Clear enforcement state
    setEnforcement(null);
    setPendingDeleteId(null);
  };

  const handleEnforcementConfirm = async (reason?: string) => {
    setShowEnforcementModal(false);
    if (pendingDeleteId) {
      await performDelete(pendingDeleteId, reason);
    }
  };

  const handleEnforcementCancel = () => {
    setShowEnforcementModal(false);
    setEnforcement(null);
    setPendingDeleteId(null);
  };

  return (
    <div className="flex flex-col max-w-[1200px] flex-1 mx-auto p-4 md:px-10 lg:px-20 gap-6">
      {/* Page Heading & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-card-lighter">
        <div className="flex flex-col gap-2">
          <h1 className="text-white text-4xl font-black leading-tight tracking-tight">
            My Evidence Vault
          </h1>
          <p className="text-text-subtle text-base font-normal leading-normal max-w-xl">
            Securely store and organize your tenancy documents. All files are
            encrypted with bank-level security.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            asChild
            variant="outline"
            className="h-10 px-4 bg-card-lighter hover:bg-card-lighter/80 border-card-lighter text-white"
          >
            <Link href="/packs/new">
              <Archive className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Generate Pack</span>
            </Link>
          </Button>
          <Button
            asChild
            className="h-10 px-4 bg-primary hover:bg-primary/90 text-background-dark font-bold shadow-[0_0_15px_rgba(19,182,236,0.3)]"
          >
            <Link href="/evidence/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Evidence
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1 rounded-xl p-5 bg-card-dark border border-card-lighter shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-text-subtle text-sm font-medium">Total Files</p>
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <p className="text-white text-2xl font-bold">
            {loading ? "..." : totalCount}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl p-5 bg-card-dark border border-card-lighter shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-text-subtle text-sm font-medium">Last Upload</p>
            <History className="h-5 w-5 text-primary" />
          </div>
          <p className="text-white text-2xl font-bold">
            {loading ? "..." : lastUpload}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl p-5 bg-card-dark border border-card-lighter shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-primary opacity-50" />
          <div className="flex items-center justify-between">
            <p className="text-text-subtle text-sm font-medium">Storage Used</p>
            <Cloud className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-white text-2xl font-bold">
              {loading ? "..." : `${storagePercentage}%`}
            </p>
            <p className="text-text-subtle text-sm mb-1">of 1 GB</p>
          </div>
          <div className="w-full bg-card-lighter h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          <p className="text-text-subtle text-xs mt-1">{storageUsed} used</p>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-card-dark p-4 rounded-xl border border-card-lighter shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-subtle" />
          </div>
          <input
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg leading-5 bg-background-dark text-white placeholder-text-subtle focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            placeholder="Search files by name, tag, or description..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-background-dark rounded-lg border border-card-lighter">
            <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
              Type:
            </span>
            <select
              className="bg-background-dark border-none text-sm text-white focus:ring-0 cursor-pointer py-1 pl-0 pr-6 [&>option]:bg-card-dark [&>option]:text-white"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="photos">Photos</option>
              <option value="documents">Documents</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown className="h-4 w-4 text-text-subtle pointer-events-none -ml-4" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-background-dark rounded-lg border border-card-lighter">
            <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
              Sort:
            </span>
            <select
              className="bg-background-dark border-none text-sm text-white focus:ring-0 cursor-pointer py-1 pl-0 pr-6 [&>option]:bg-card-dark [&>option]:text-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_newest">Date (Newest)</option>
              <option value="date_oldest">Date (Oldest)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
            <ChevronDown className="h-4 w-4 text-text-subtle pointer-events-none -ml-4" />
          </div>
        </div>
      </section>

      {/* Evidence Grid */}
      <section>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-text-subtle">Loading...</p>
          </div>
        ) : (
          <EvidenceGridWithFilters
            items={filteredEvidence.map((item) => ({
              id: item.id,
              type: item.type,
              category: item.category || undefined,
              note: item.note || item.file_path?.split("/").pop() || "Evidence item",
              file_path: item.file_path || undefined,
              occurred_at: item.occurred_at,
              created_at: item.uploaded_at,
            }))}
            showUploadCard={true}
            onDelete={handleDelete}
          />
        )}
      </section>

      {/* Pagination / Footer of Grid */}
      {filteredEvidence.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-subtle">
            Showing {filteredEvidence.length} of {totalCount} items
          </p>
        </div>
      )}

      {/* Enforcement Modal */}
      {enforcement && (
        <EnforcementModal
          open={showEnforcementModal}
          onOpenChange={setShowEnforcementModal}
          enforcement={enforcement}
          onConfirm={handleEnforcementConfirm}
          onCancel={handleEnforcementCancel}
          showReasonInput={enforcement.level === "soft-blocked"}
        />
      )}
    </div>
  );
}
