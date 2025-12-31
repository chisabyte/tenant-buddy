"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Copy, Check, AlertCircle } from "lucide-react";

interface AIDraftHelperProps {
  propertyAddress?: string;
  issueId?: string;
  issueTitle?: string;
  onUseDraft: (draft: string) => void;
}

type DraftType =
  | "Repair Request"
  | "General Query"
  | "Follow Up"
  | "Information Request"
  | "Other";

interface GeneratedDraft {
  content: string;
  subject: string;
  disclaimer: string;
  suggestions?: string[];
}

export function AIDraftHelper({ propertyAddress, issueId, issueTitle, onUseDraft }: AIDraftHelperProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [draftType, setDraftType] = useState<DraftType>("Repair Request");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [contextDetails, setContextDetails] = useState("");

  // Prefill subject when modal opens with issue context
  // Only set once when modal opens and issueTitle is available
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [userEditedSubject, setUserEditedSubject] = useState(false);
  
  useEffect(() => {
    if (open && issueTitle && !hasPrefilled && !subject) {
      // Prefill with issue title, optionally prefix with draft type if it's a Repair Request
      const defaultSubject = draftType === "Repair Request" 
        ? `${draftType}: ${issueTitle}`
        : issueTitle;
      setSubject(defaultSubject);
      setHasPrefilled(true);
    }
  }, [open, issueTitle, hasPrefilled, subject, draftType]);

  // Track if user manually edits the subject
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);
    if (!userEditedSubject) {
      setUserEditedSubject(true);
    }
  };

  // Result state
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftType,
          recipient,
          subject,
          contextDetails,
          propertyAddress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate draft");
      }

      const data = await response.json();
      setGeneratedDraft(data.draft);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedDraft) {
      await navigator.clipboard.writeText(generatedDraft.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseDraft = () => {
    if (generatedDraft) {
      onUseDraft(generatedDraft.content);
      handleClose();
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep("form");
    setGeneratedDraft(null);
    setError(null);
    setDraftType("Repair Request");
    setRecipient("");
    // Reset subject, but allow it to be prefilled again on next open
    setSubject("");
    setContextDetails("");
    setHasPrefilled(false);
    setUserEditedSubject(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        AI Draft Helper
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl" onClose={handleClose}>
          {step === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Draft Helper
                </DialogTitle>
                <DialogDescription>
                  Get help drafting a message. This creates plain-language drafts, not legal documents.
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="draftType" className="text-white">
                    Type of Message
                  </Label>
                  <select
                    id="draftType"
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value as DraftType)}
                    className="flex h-11 w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Repair Request">Repair Request</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="General Query">General Query</option>
                    <option value="Information Request">Information Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-white">
                    Who is this to?
                  </Label>
                  <Input
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g., Property Manager, Landlord, Real Estate Agent"
                    className="h-11 bg-background-dark border-card-lighter text-white placeholder:text-text-subtle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-white">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={handleSubjectChange}
                    placeholder="e.g., Leaking tap in bathroom"
                    className="h-11 bg-background-dark border-card-lighter text-white placeholder:text-text-subtle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contextDetails" className="text-white">
                    What do you want to communicate?
                  </Label>
                  <textarea
                    id="contextDetails"
                    value={contextDetails}
                    onChange={(e) => setContextDetails(e.target.value)}
                    rows={4}
                    placeholder="Describe the situation and what you'd like to happen..."
                    className="flex w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="text-xs text-text-subtle bg-background-dark/50 p-3 rounded-lg">
                  <strong className="text-white">Note:</strong> This creates plain-language drafts to help you communicate.
                  It is not a legal document and does not constitute legal advice.
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !recipient || !subject || !contextDetails}
                  className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Draft
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Generated Draft
                </DialogTitle>
                <DialogDescription>
                  Review the draft below. You can copy it or use it directly.
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-4">
                <div className="relative">
                  <div className="bg-background-dark border border-card-lighter rounded-lg p-4 text-sm text-white whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {generatedDraft?.content}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-2 text-text-subtle hover:text-white hover:bg-card-lighter rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {generatedDraft?.suggestions && generatedDraft.suggestions.length > 0 && (
                  <div className="text-xs text-text-subtle bg-background-dark/50 p-3 rounded-lg space-y-1">
                    <p className="font-medium text-white">Suggestions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {generatedDraft.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-amber-400/80 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  {generatedDraft?.disclaimer?.replace(/---/g, "").trim() ||
                    "This is a plain-language draft and not a legal document. It does not constitute legal advice."}
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStep("form")}
                  className="border-card-lighter bg-background-dark text-white hover:bg-card-lighter hover:text-white"
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="border-card-lighter bg-background-dark text-white hover:bg-card-lighter hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleUseDraft}
                  className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
                >
                  Use This Draft
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
