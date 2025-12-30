"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Check,
  Image as ImageIcon,
  Mail,
  File,
  ChevronRight,
  Gavel,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface EvidenceItem {
  id: string;
  type: string;
  note: string | null;
  file_path: string | null;
  uploaded_at: string;
}

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  evidence_items: EvidenceItem[];
}

export default function NewPackPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selection state
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // Filter and sort state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_newest");

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: issuesData, error } = await supabase
      .from("issues")
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        evidence_items!left(
          id,
          type,
          note,
          file_path,
          uploaded_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching issues:", error);
      setLoading(false);
      return;
    }

    setIssues(issuesData || []);

    // Auto-select first issue and expand it
    if (issuesData && issuesData.length > 0) {
      const firstIssue = issuesData[0];
      setSelectedIssues(new Set([firstIssue.id]));
      setExpandedIssues(new Set([firstIssue.id]));

      // Auto-select all evidence from first issue
      const evidenceIds = firstIssue.evidence_items?.map((e: EvidenceItem) => e.id) || [];
      setSelectedEvidence(new Set(evidenceIds));
    }

    setLoading(false);
  };

  const toggleIssueSelection = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    const issue = issues.find(i => i.id === issueId);

    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
      // Also deselect all evidence from this issue
      if (issue) {
        const newEvidenceSelected = new Set(selectedEvidence);
        issue.evidence_items?.forEach(e => newEvidenceSelected.delete(e.id));
        setSelectedEvidence(newEvidenceSelected);
      }
    } else {
      newSelected.add(issueId);
      // Also select all evidence from this issue
      if (issue) {
        const newEvidenceSelected = new Set(selectedEvidence);
        issue.evidence_items?.forEach(e => newEvidenceSelected.add(e.id));
        setSelectedEvidence(newEvidenceSelected);
      }
    }
    setSelectedIssues(newSelected);
  };

  const toggleEvidenceSelection = (evidenceId: string) => {
    const newSelected = new Set(selectedEvidence);
    if (newSelected.has(evidenceId)) {
      newSelected.delete(evidenceId);
    } else {
      newSelected.add(evidenceId);
    }
    setSelectedEvidence(newSelected);
  };

  const toggleIssueExpanded = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const openPreview = async (item: EvidenceItem) => {
    if (!item.file_path) return;

    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewUrl(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("evidence")
        .createSignedUrl(item.file_path, 3600);

      if (error) {
        console.error("Error getting signed URL:", error);
        setPreviewLoading(false);
        return;
      }

      setPreviewUrl(data.signedUrl);
    } catch (err) {
      console.error("Error opening preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewUrl(null);
  };

  const handleGeneratePack = async () => {
    if (selectedIssues.size === 0) {
      alert("Please select at least one issue to include in the pack.");
      return;
    }

    setGenerating(true);

    try {
      // For now, we'll just show a success message
      // In a real implementation, this would call an API to generate the PDF
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert("Evidence pack generation is not yet implemented. This feature will generate a PDF with your selected issues and evidence.");
    } catch (err) {
      console.error("Error generating pack:", err);
      alert("Failed to generate evidence pack. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Filter and sort issues
  const filteredIssues = issues
    .filter(issue => {
      if (categoryFilter === "all") return true;
      // Add category filtering logic when category data is available
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "date_newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Calculate stats
  const totalSelectedEvidence = selectedEvidence.size;
  const estimatedSize = (totalSelectedEvidence * 0.5).toFixed(1); // Rough estimate
  const estimatedPages = Math.max(1, Math.ceil(totalSelectedEvidence * 1.5) + 2); // Cover + TOC + content

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "photo":
      case "screenshot":
        return ImageIcon;
      case "email":
        return Mail;
      case "pdf":
      case "document":
        return FileText;
      default:
        return File;
    }
  };

  const getIconColors = (type: string) => {
    switch (type?.toLowerCase()) {
      case "photo":
      case "screenshot":
        return "bg-blue-500/20 text-blue-400";
      case "email":
        return "bg-purple-500/20 text-purple-400";
      case "pdf":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-700 text-slate-400";
    }
  };

  const isImageType = (type: string) => {
    return ["photo", "screenshot"].includes(type?.toLowerCase());
  };

  const isPdfType = (type: string) => {
    return type?.toLowerCase() === "pdf";
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/dashboard"
          className="text-text-subtle hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-text-subtle" />
        <span className="text-white font-medium">New Evidence Pack</span>
      </div>

      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white">
            Create Evidence Pack
          </h1>
          <p className="text-text-subtle text-lg leading-relaxed">
            Select the issues and evidence items you want to include in your PDF
            submission for the tribunal or landlord.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 h-full">
        {/* Left Column: Builder (Selection) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Filters and Controls */}
          <div className="bg-card-dark rounded-xl p-4 border border-card-lighter shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  categoryFilter === "all"
                    ? "bg-primary text-background-dark shadow-lg shadow-primary/20"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                All Issues
              </button>
              <button
                onClick={() => setCategoryFilter("repairs")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  categoryFilter === "repairs"
                    ? "bg-primary text-background-dark"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                Repairs
              </button>
              <button
                onClick={() => setCategoryFilter("rent")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  categoryFilter === "rent"
                    ? "bg-primary text-background-dark"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                Rent
              </button>
              <button
                onClick={() => setCategoryFilter("inspections")}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  categoryFilter === "inspections"
                    ? "bg-primary text-background-dark"
                    : "bg-card-lighter text-text-subtle hover:bg-card-lighter/80"
                }`}
              >
                Inspections
              </button>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none bg-background-dark border border-card-lighter text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="date_newest">Sort by Date (Newest)</option>
                  <option value="date_oldest">Sort by Date (Oldest)</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-text-subtle pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-text-subtle">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading issues...
              </div>
            ) : filteredIssues && filteredIssues.length > 0 ? (
              filteredIssues.map((issue, index) => {
                const evidenceItems = issue.evidence_items || [];
                const isExpanded = expandedIssues.has(issue.id);
                const isSelected = selectedIssues.has(issue.id);
                const reportedDate = format(new Date(issue.created_at), "MMM d, yyyy");
                const isFirstOpen = index === 0 && issue.status === "open";

                return (
                  <div
                    key={issue.id}
                    className={`bg-card-dark rounded-xl border-l-4 ${
                      isSelected
                        ? "border-l-primary border-y border-r border-card-lighter"
                        : isFirstOpen
                          ? "border-l-orange-500 border-y border-r border-card-lighter"
                          : "border border-card-lighter hover:border-card-lighter/80"
                    } overflow-hidden shadow-sm`}
                  >
                    <div className="p-5 flex items-start gap-4">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIssueSelection(issue.id)}
                          className="h-5 w-5 rounded border-card-lighter text-primary focus:ring-0 bg-background-dark cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {issue.title}
                            </h3>
                            <p className="text-sm text-text-subtle">
                              Reported: {reportedDate} • Category: Repairs
                            </p>
                          </div>
                          {isFirstOpen && (
                            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wide">
                              High Urgency
                            </span>
                          )}
                        </div>
                        {isExpanded && (
                          <>
                            <p className="text-text-subtle text-sm mb-4">
                              {issue.description || "No description provided."}
                            </p>
                            {/* Evidence Items */}
                            {evidenceItems.length > 0 ? (
                              <div className="space-y-2 bg-background-dark rounded-lg p-3 border border-card-lighter">
                                {evidenceItems.map((item) => {
                                  const Icon = getFileIcon(item.type);
                                  const iconColors = getIconColors(item.type);
                                  const isEvidenceSelected = selectedEvidence.has(item.id);

                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 p-2 hover:bg-card-dark rounded-md transition-colors group"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isEvidenceSelected}
                                        onChange={() => toggleEvidenceSelection(item.id)}
                                        className="h-4 w-4 rounded border-card-lighter text-primary focus:ring-0 bg-transparent cursor-pointer"
                                      />
                                      <div
                                        className={`h-8 w-8 rounded ${iconColors} flex items-center justify-center`}
                                      >
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                          {item.note || item.file_path?.split("/").pop() || "Evidence item"}
                                        </p>
                                        <p className="text-xs text-text-subtle">
                                          {format(new Date(item.uploaded_at), "MMM d")}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => openPreview(item)}
                                        className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-primary transition-all p-1"
                                        title="Preview file"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-text-subtle bg-background-dark rounded-lg p-3 border border-card-lighter">
                                No evidence attached to this issue.
                              </div>
                            )}
                          </>
                        )}
                        {!isExpanded && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-text-subtle bg-background-dark px-2 py-0.5 rounded">
                              Repairs
                            </span>
                            <span className="text-xs text-text-subtle">
                              • {evidenceItems.length}{" "}
                              {evidenceItems.length === 1 ? "file" : "files"} attached
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleIssueExpanded(issue.id)}
                        className="p-2 text-text-subtle hover:text-primary transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-text-subtle">
                No issues available.{" "}
                <Link href="/issues/new" className="text-primary hover:underline">
                  Create an issue first
                </Link>
              </div>
            )}

            <div className="py-4 text-center">
              <Link
                href="/issues/new"
                className="text-primary hover:text-primary/80 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
              >
                <PlusCircle className="h-4 w-4" />
                Manually add item to pack
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Previewer */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="sticky top-24 space-y-6">
            {/* Preview Card */}
            <div className="bg-card-dark rounded-xl border border-card-lighter shadow-xl overflow-hidden flex flex-col relative group">
              {/* Decorative Glow */}
              <div className="absolute inset-0 bg-primary/10 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-6 border-b border-card-lighter">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Pack Summary
                </h2>
              </div>
              <div className="relative p-8 flex flex-col items-center text-center bg-background-dark/50">
                {/* PDF Icon Graphic */}
                <div className="relative mb-6">
                  <div className="w-24 h-32 bg-gradient-to-br from-card-lighter to-background-dark rounded-lg shadow-lg flex items-center justify-center border border-card-lighter relative z-10">
                    <FileText className="h-12 w-12 text-text-subtle" />
                  </div>
                  <div className="absolute top-2 -right-3 w-24 h-32 bg-background-dark rounded-lg border border-card-lighter -z-0 rotate-6" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">
                  Preview.pdf
                </h3>
                <p className="text-sm text-text-subtle mb-4">
                  Generated on {format(new Date(), "MMM d, yyyy")}
                </p>
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className="bg-card-dark p-3 rounded-lg border border-card-lighter">
                    <p className="text-xs text-text-subtle uppercase font-semibold">
                      Issues
                    </p>
                    <p className="text-xl font-bold text-white">
                      {selectedIssues.size}
                    </p>
                  </div>
                  <div className="bg-card-dark p-3 rounded-lg border border-card-lighter">
                    <p className="text-xs text-text-subtle uppercase font-semibold">
                      Evidence
                    </p>
                    <p className="text-xl font-bold text-white">
                      {totalSelectedEvidence} Files
                    </p>
                  </div>
                  <div className="bg-card-dark p-3 rounded-lg border border-card-lighter">
                    <p className="text-xs text-text-subtle uppercase font-semibold">
                      Est. Size
                    </p>
                    <p className="text-xl font-bold text-white">{estimatedSize} MB</p>
                  </div>
                  <div className="bg-card-dark p-3 rounded-lg border border-card-lighter">
                    <p className="text-xs text-text-subtle uppercase font-semibold">
                      Pages
                    </p>
                    <p className="text-xl font-bold text-white">~{estimatedPages}</p>
                  </div>
                </div>
                <Button
                  onClick={handleGeneratePack}
                  disabled={generating || selectedIssues.size === 0}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-background-dark font-bold text-lg shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Generate Evidence Pack
                    </>
                  )}
                </Button>
                {selectedIssues.size === 0 && (
                  <p className="mt-2 text-xs text-orange-400">
                    Select at least one issue to generate a pack
                  </p>
                )}
                <p className="mt-4 text-xs text-text-subtle">
                  By generating this pack, you agree to the{" "}
                  <Link href="/terms" className="underline hover:text-primary">
                    Terms of Use
                  </Link>{" "}
                  regarding evidence submission.
                </p>
              </div>
            </div>

            {/* Structure Preview */}
            <div className="bg-card-dark rounded-xl border border-card-lighter p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Document Structure
              </h4>
              <div className="space-y-0 relative">
                {/* Vertical line connector */}
                <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-card-lighter" />
                <div className="relative flex items-center gap-3 pb-4">
                  <div className="h-6 w-6 rounded-full bg-green-500 border-2 border-card-dark z-10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white">Cover Sheet</span>
                </div>
                <div className="relative flex items-center gap-3 pb-4">
                  <div className="h-6 w-6 rounded-full bg-green-500 border-2 border-card-dark z-10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white">
                    Table of Contents
                  </span>
                </div>
                <div className="relative flex items-center gap-3 pb-4">
                  <div className={`h-6 w-6 rounded-full border-2 border-card-dark z-10 flex items-center justify-center ${selectedIssues.size > 0 ? "bg-primary shadow-lg shadow-primary/30" : "bg-card-lighter"}`}>
                    <FileText className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${selectedIssues.size > 0 ? "text-primary" : "text-text-subtle"}`}>
                      Evidence Body
                    </span>
                    <span className="text-xs text-text-subtle">
                      {selectedIssues.size} issues, {totalSelectedEvidence} files
                    </span>
                  </div>
                </div>
                <div className="relative flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-card-lighter border-2 border-card-dark z-10 flex items-center justify-center">
                    <Gavel className="h-3 w-3 text-text-subtle" />
                  </div>
                  <span className="text-sm font-medium text-text-subtle">
                    Legal Appendix (Optional)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closePreview}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full bg-card-dark rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-card-lighter">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getFileIcon(previewItem.type);
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
                <div>
                  <h3 className="text-white font-semibold">
                    {previewItem.note || previewItem.file_path?.split("/").pop() || "Evidence"}
                  </h3>
                  <p className="text-xs text-text-subtle">
                    Uploaded {format(new Date(previewItem.uploaded_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-text-subtle hover:text-primary transition-colors"
                    title="Open in new tab"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                )}
                <button
                  onClick={closePreview}
                  className="p-2 text-text-subtle hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-80px)] overflow-auto">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-text-subtle">Loading preview...</p>
                </div>
              ) : previewUrl ? (
                isImageType(previewItem.type) ? (
                  <img
                    src={previewUrl}
                    alt={previewItem.note || "Evidence"}
                    className="max-w-full max-h-[calc(90vh-120px)] object-contain"
                  />
                ) : isPdfType(previewItem.type) ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[calc(90vh-120px)]"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="h-16 w-16 text-text-subtle" />
                    <p className="text-text-subtle">Preview not available for this file type</p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download to view
                    </a>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <FileText className="h-16 w-16 text-text-subtle" />
                  <p className="text-text-subtle">Unable to load preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
