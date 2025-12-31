"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, XCircle, Info } from "lucide-react";
import type { EnforcementResult } from "@/lib/enforcement";
import { cn } from "@/lib/utils";

interface EnforcementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enforcement: EnforcementResult;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  showReasonInput?: boolean;
}

export function EnforcementModal({
  open,
  onOpenChange,
  enforcement,
  onConfirm,
  onCancel,
  showReasonInput = false,
}: EnforcementModalProps) {
  const [reason, setReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(reason || undefined);
    } finally {
      setIsConfirming(false);
      setReason("");
    }
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  const isBlocked = enforcement.level === "hard-blocked";
  const isSoftBlocked = enforcement.level === "soft-blocked";
  const isWarned = enforcement.level === "warned";

  // Get icon based on enforcement level
  const Icon = isBlocked ? XCircle : isSoftBlocked ? ShieldAlert : AlertTriangle;

  // Get colors based on enforcement level
  const iconColorClass = isBlocked
    ? "text-red-400"
    : isSoftBlocked
    ? "text-amber-400"
    : "text-amber-400";

  const iconBgClass = isBlocked
    ? "bg-red-500/20"
    : isSoftBlocked
    ? "bg-amber-500/20"
    : "bg-amber-500/20";

  const borderClass = isBlocked
    ? "border-red-500/30"
    : isSoftBlocked
    ? "border-amber-500/30"
    : "border-card-lighter";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("border-2", borderClass)} onClose={handleCancel}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-xl shrink-0", iconBgClass)}>
              <Icon className={cn("h-6 w-6", iconColorClass)} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogTitle>{enforcement.message.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {enforcement.message.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {/* Warning text */}
          {enforcement.message.warningText && (
            <div
              className={cn(
                "p-4 rounded-lg mb-4",
                isBlocked ? "bg-red-500/10" : "bg-amber-500/10"
              )}
            >
              <div className="flex items-start gap-2">
                <Info
                  className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    isBlocked ? "text-red-400" : "text-amber-400"
                  )}
                />
                <p className="text-sm text-text-subtle">
                  {enforcement.message.warningText}
                </p>
              </div>
            </div>
          )}

          {/* Health status indicator */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card-lighter/50 mb-4">
            <div className="text-sm">
              <span className="text-text-subtle">Case Health: </span>
              <span
                className={cn(
                  "font-semibold",
                  enforcement.context.healthStatus === "at-risk"
                    ? "text-red-400"
                    : enforcement.context.healthStatus === "weak"
                    ? "text-amber-400"
                    : enforcement.context.healthStatus === "adequate"
                    ? "text-amber-300"
                    : "text-green-400"
                )}
              >
                {enforcement.context.healthScore}% (
                {enforcement.context.healthStatus.replace("-", " ")})
              </span>
            </div>
          </div>

          {/* Plan mode indicator */}
          <div className="text-xs text-text-subtle mb-4">
            Mode:{" "}
            <span className="text-white font-medium capitalize">
              {enforcement.context.planMode}
            </span>
            {enforcement.context.planMode === "guided" && (
              <span className="text-text-subtle">
                {" "}
                - Protective guardrails are active
              </span>
            )}
          </div>

          {/* Optional reason input for soft-blocked */}
          {showReasonInput && isSoftBlocked && (
            <div className="mb-4">
              <label
                htmlFor="override-reason"
                className="block text-sm font-medium text-white mb-2"
              >
                Why are you proceeding? (optional)
              </label>
              <textarea
                id="override-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Issue resolved verbally, Landlord agreed to fix..."
                className="w-full px-3 py-2 bg-card-lighter border border-card-lighter rounded-lg text-white placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={2}
              />
              <p className="mt-1 text-xs text-text-subtle">
                This will be saved to your override history for your records.
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {isBlocked ? (
            // Hard-blocked: only cancel button
            <Button
              onClick={handleCancel}
              className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
            >
              {enforcement.message.cancelLabel || "Go Back"}
            </Button>
          ) : (
            // Warned or soft-blocked: both buttons
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-card-lighter text-text-subtle hover:text-white hover:bg-card-lighter"
              >
                {enforcement.message.cancelLabel || "Cancel"}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
                className={cn(
                  "font-bold",
                  isSoftBlocked
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-primary hover:bg-primary/90 text-background-dark"
                )}
              >
                {isConfirming
                  ? "Processing..."
                  : enforcement.message.confirmLabel || "Proceed"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline warning component for "warned" level enforcement.
 * Use this instead of modal for less intrusive warnings.
 */
interface EnforcementWarningProps {
  enforcement: EnforcementResult;
  className?: string;
}

export function EnforcementWarning({
  enforcement,
  className,
}: EnforcementWarningProps) {
  if (enforcement.level !== "warned") {
    return null;
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-amber-500/10 border border-amber-500/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm">
            {enforcement.message.title}
          </h4>
          <p className="text-text-subtle text-sm mt-1">
            {enforcement.message.description}
          </p>
          {enforcement.message.warningText && (
            <p className="text-amber-400/80 text-xs mt-2">
              {enforcement.message.warningText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hard block indicator - shows when action is completely blocked
 */
interface EnforcementBlockProps {
  enforcement: EnforcementResult;
  className?: string;
}

export function EnforcementBlock({
  enforcement,
  className,
}: EnforcementBlockProps) {
  if (enforcement.level !== "hard-blocked") {
    return null;
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-red-500/10 border border-red-500/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm">
            {enforcement.message.title}
          </h4>
          <p className="text-text-subtle text-sm mt-1">
            {enforcement.message.description}
          </p>
          {enforcement.message.warningText && (
            <p className="text-red-400/80 text-xs mt-2">
              {enforcement.message.warningText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
