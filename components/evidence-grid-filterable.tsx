"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MoreVertical, Eye, Image, FileText, Mail, File, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface EvidenceItem {
  id: string;
  type: string;
  category?: string;
  note?: string;
  file_path?: string;
  occurred_at: string;
  created_at: string;
}

interface EvidenceCardProps {
  item: EvidenceItem;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  photo: Image,
  pdf: FileText,
  document: FileText,
  email: Mail,
  screenshot: Image,
};

const categoryColors: Record<string, string> = {
  damage: "bg-red-500/10 text-red-400 border-red-500/20",
  contract: "bg-primary/10 text-primary border-primary/20",
  correspondence: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "entry report": "bg-green-500/10 text-green-400 border-green-500/20",
  maintenance: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "condition report": "bg-green-500/10 text-green-400 border-green-500/20",
  rent: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  comms: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  default: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function EvidenceCardWithDelete({ item, onView, onDelete }: EvidenceCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const Icon = typeIcons[item.type.toLowerCase()] || File;
  const categoryColor =
    categoryColors[item.category?.toLowerCase() || ""] || categoryColors.default;
  const isImage = ["photo", "screenshot"].includes(item.type.toLowerCase());

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch signed URL for image files
  useEffect(() => {
    if (isImage && item.file_path) {
      const fetchImageUrl = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.storage
            .from("evidence")
            .createSignedUrl(item.file_path!, 3600);

          if (error) {
            console.error("Error fetching image URL:", error);
            setIsLoading(false);
            return;
          }

          if (data?.signedUrl) {
            setImageUrl(data.signedUrl);
          }
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching image:", error);
          setIsLoading(false);
        }
      };

      fetchImageUrl();
    } else {
      setIsLoading(false);
    }
  }, [isImage, item.file_path]);

  const handleView = () => {
    if (isImage && imageUrl) {
      setShowModal(true);
    } else {
      onView?.(item.id);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmed = window.confirm("Are you sure you want to delete this evidence? This action cannot be undone.");
    if (!confirmed) {
      setShowMenu(false);
      return;
    }

    setIsDeleting(true);
    setShowMenu(false);

    try {
      onDelete?.(item.id);
    } catch (error) {
      console.error("Error deleting:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={cn(
        "group flex flex-col bg-card rounded-xl overflow-hidden border border-border hover:border-primary transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/10",
        isDeleting && "opacity-50 pointer-events-none"
      )}>
        {/* Preview Area */}
        <div
          className="relative h-40 bg-accent overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={handleView}
        >
          {/* Type Badge */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1 z-10">
            <Icon className="h-3.5 w-3.5" />
            <span className="capitalize">{item.type}</span>
          </div>

          {isImage && item.file_path ? (
            isLoading ? (
              <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 animate-pulse" />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={item.note || item.file_path?.split("/").pop() || "Evidence"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                <Icon className="h-16 w-16 text-border" />
              </div>
            )
          ) : (
            <Icon className="h-16 w-16 text-border" />
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleView();
              }}
              className="bg-white/90 text-slate-900 rounded-full p-2 hover:bg-primary hover:text-white transition-colors"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 flex flex-col flex-1 gap-2">
          <div className="flex justify-between items-start">
            <h3
              className="text-foreground font-semibold text-sm line-clamp-1"
              title={item.note || item.file_path || "Evidence item"}
            >
              {item.note || item.file_path?.split("/").pop() || "Evidence item"}
            </h3>
            {/* 3-dots menu with delete option */}
            <div className="relative" ref={menuRef}>
              <button
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-card-lighter transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Dropdown Menu - positioned above if near bottom */}
              {showMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-36 bg-card-dark border border-card-lighter rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-card-lighter transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors border-t border-card-lighter"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {new Date(item.occurred_at).toLocaleDateString("en-AU", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {item.category && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded border capitalize",
                  categoryColor
                )}
              >
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showModal && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt={item.note || item.file_path?.split("/").pop() || "Evidence"}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface EvidenceGridWithFiltersProps {
  items: EvidenceItem[];
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  showUploadCard?: boolean;
}

export function EvidenceGridWithFilters({
  items,
  onView,
  onDelete,
  showUploadCard = false,
}: EvidenceGridWithFiltersProps) {
  if (items.length === 0 && !showUploadCard) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-card-lighter flex items-center justify-center mb-4">
          <File className="h-8 w-8 text-text-subtle" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">No evidence found</h3>
        <p className="text-text-subtle text-sm mb-4">
          Upload your first piece of evidence to get started
        </p>
        <Link
          href="/evidence/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Upload Evidence
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <EvidenceCardWithDelete
          key={item.id}
          item={item}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
      {showUploadCard && (
        <Link
          href="/evidence/upload"
          className="group flex flex-col justify-center items-center bg-transparent rounded-xl border-2 border-dashed border-border-surface hover:border-primary hover:bg-primary/5 transition-all duration-300 cursor-pointer min-h-[260px]"
        >
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-card-lighter flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-3xl text-text-subtle group-hover:text-primary">
                +
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-white font-bold text-lg">Upload New</h3>
              <p className="text-text-subtle text-sm">
                Drag files here or click
              </p>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full mt-2">
              Encrypted
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
