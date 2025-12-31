"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Edit, Loader2 } from "lucide-react";

interface IssueActionsProps {
  issueId: string;
  issueTitle: string;
  currentStatus: string;
}

export function IssueActions({ issueId, issueTitle, currentStatus }: IssueActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${issueTitle}"?\n\nThis will permanently remove the issue and unlink any associated evidence and communications. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("issues")
        .delete()
        .eq("id", issueId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Redirect to issues list after successful deletion
      router.push("/issues");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete issue";
      setError(errorMessage);
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("issues")
        .update({ status: newStatus })
        .eq("id", issueId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status";
      setError(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Status Change Dropdown */}
        <div className="relative">
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updating}
            className="h-9 px-3 pr-8 rounded-lg border border-card-lighter bg-card-lighter text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 appearance-none cursor-pointer [&>option]:bg-card-dark [&>option]:text-white"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          {updating && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Delete Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        >
          {deleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Issue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
