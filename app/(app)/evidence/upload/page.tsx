"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  validateFile,
  generateSafeFileName,
  MAX_FILE_SIZES,
  inferMimeTypeFromExtension,
  type EvidenceType,
} from "@/lib/file-validation";
import { ArrowLeft, Upload, Lock } from "lucide-react";

interface Property {
  id: string;
  address_text: string;
}

function UploadEvidenceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueId = searchParams?.get("issueId") ?? null;

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState(issueId || "");
  const [type, setType] = useState<EvidenceType>("photo");
  const [category, setCategory] = useState<string>("");
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: props } = await supabase
          .from("properties")
          .select("id, address_text")
          .eq("user_id", user.id);
        if (props) {
          setProperties(props);
          if (props.length === 1) {
            setPropertyId(props[0].id);
          }
        }

        // Fetch plan file size limit
        try {
          const limitResponse = await fetch("/api/evidence/file-size-limit");
          if (limitResponse.ok) {
            const limitData = await limitResponse.json();
            setMaxFileSizeMB(limitData.maxFileSizeMB);
          }
        } catch (err) {
          console.error("Failed to fetch file size limit:", err);
          // Fallback to default
          setMaxFileSizeMB(10);
        }
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function validate() {
      if (file && maxFileSizeMB !== null) {
        // First validate file type and basic checks
        const result = await validateFile(file, type);
        
        // Then check against plan-based file size limit
        if (result.valid) {
          const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
          if (file.size > maxSizeBytes) {
            setFileValidation({
              valid: false,
              error: `File size exceeds your plan limit of ${maxFileSizeMB}MB. Please upgrade your plan to upload larger files.`,
            });
            setError(`File size exceeds your plan limit of ${maxFileSizeMB}MB`);
          } else {
            setFileValidation(result);
            setError(null);
          }
        } else {
          setFileValidation(result);
          setError(result.error || "Invalid file");
        }
      } else if (file) {
        // If we don't have the limit yet, just do basic validation
        const result = await validateFile(file, type);
        setFileValidation(result);
        if (!result.valid) {
          setError(result.error || "Invalid file");
        }
      } else {
        setFileValidation(null);
      }
    }
    validate();
  }, [file, type, maxFileSizeMB]);

  const calculateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUploadProgress("Validating...");

    try {
      if (!file) {
        throw new Error("Please select a file to upload");
      }

      if (!propertyId) {
        throw new Error("Please select a property");
      }

      // Check plan limits before upload
      setUploadProgress("Checking plan limits...");
      const limitCheckResponse = await fetch("/api/evidence/upload-check", {
        method: "POST",
      });

      if (!limitCheckResponse.ok) {
        const limitData = await limitCheckResponse.json();
        throw new Error(limitData.error || "Upload limit reached");
      }

      const validationResult = await validateFile(file, type);
      if (!validationResult.valid) {
        throw new Error(validationResult.error || "Invalid file");
      }

      setUploadProgress("Calculating integrity hash...");
      const sha256 = await calculateSHA256(file);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in");
      }

      setUploadProgress("Uploading file...");

      const fileName = generateSafeFileName(file.name, user.id, type);

      // Use the validated MIME type from validation result (already normalized and verified)
      // This ensures we use the detected type from magic bytes, not just browser-reported type
      const contentType = validationResult.mimeType || inferMimeTypeFromExtension(file.name);

      // CRITICAL: Always use 'evidence' bucket, NOT evidenceType
      // The evidenceType is only used as a folder prefix in the file path
      const bucketName = "evidence";
      
      console.log('[Upload] Uploading to Supabase Storage', {
        bucketName,
        fileName,
        contentType,
        evidenceType: type,
        fileSize: file.size,
      });

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: contentType,
        });

      if (uploadError) {
        console.error('[Upload] Supabase Storage error', {
          error: uploadError,
          fileName,
          contentType,
          fileSize: file.size,
          evidenceType: type,
        });
        // Check if it's a MIME type error from Supabase
        if (uploadError.message?.toLowerCase().includes('mime type') || 
            uploadError.message?.toLowerCase().includes('content type')) {
          throw new Error(`Upload failed: ${uploadError.message}. Detected MIME type: ${contentType}`);
        }
        throw uploadError;
      }

      setUploadProgress("Saving metadata...");

      const { data: insertedData, error: insertError } = await supabase
        .from("evidence_items")
        .insert({
          user_id: user.id,
          property_id: propertyId,
          issue_id: selectedIssueId || null,
          type,
          category: category || null,
          room: room || null,
          note: note || null,
          file_path: fileName,
          occurred_at: occurredAt,
          sha256,
        })
        .select();

      if (insertError) {
        console.error('[Upload] Error inserting evidence item:', insertError);
        throw insertError;
      }

      console.log('[Upload] Successfully inserted evidence item:', insertedData);

      setUploadProgress("Complete!");
      
      // Set a flag in localStorage to trigger refresh
      localStorage.setItem("evidence_uploaded", "true");
      
      // Navigate to evidence page - it will fetch fresh data
      // Use replace to avoid back button issues
      router.replace("/evidence");
      
      // Force a hard refresh after a short delay to ensure data is loaded
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (err: unknown) {
      console.error('[Upload] Error during upload', {
        error: err,
        fileName: file?.name,
        evidenceType: type,
      });
      
      let errorMessage = "An error occurred";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  const getMaxFileSize = (evidenceType: EvidenceType): string => {
    const bytes = MAX_FILE_SIZES[evidenceType];
    return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  };

  const getAcceptedFileTypes = (evidenceType: EvidenceType): string => {
    switch (evidenceType) {
      case "photo":
        return "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif";
      case "pdf":
        return "application/pdf";
      case "screenshot":
        return "image/jpeg,image/jpg,image/png,image/webp";
      case "document":
        return "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
      case "other":
        return "image/jpeg,image/jpg,image/png,image/webp,application/pdf,text/plain";
      default:
        return "*";
    }
  };

  return (
    <div className="flex flex-col max-w-[800px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Back Button */}
      <Link
        href="/evidence"
        className="inline-flex items-center gap-2 text-text-subtle hover:text-primary transition-colors text-sm font-medium w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Evidence Vault
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Upload Evidence
        </h1>
        <p className="text-text-subtle text-sm">
          Add photos, PDFs, or documents to your evidence vault. Files are
          verified with SHA-256 hash for integrity.
        </p>
      </div>

      {/* Upload Form Card */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="property" className="text-white">
              Property
            </Label>
            <select
              id="property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={loading}
            >
              <option value="">Select a property</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.address_text}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-white">
              Evidence Type
            </Label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as EvidenceType);
                setFile(null);
                setFileValidation(null);
              }}
              className="flex h-11 w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={loading}
            >
              <option value="photo">Photo</option>
              <option value="pdf">PDF</option>
              <option value="screenshot">Screenshot</option>
              <option value="document">Document</option>
              <option value="other">Other</option>
            </select>
            <p className="text-xs text-text-subtle">
              Max file size: {maxFileSizeMB !== null ? `${maxFileSizeMB}MB` : getMaxFileSize(type)} (based on your plan)
            </p>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label htmlFor="file" className="text-white">
              File
            </Label>
            <div className="relative">
              <Input
                id="file"
                type="file"
                accept={getAcceptedFileTypes(type)}
                onChange={handleFileChange}
                required
                disabled={loading}
                key={type}
                className="h-11 bg-background-dark border-card-lighter text-white file:bg-card-lighter file:text-white file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-lg"
              />
            </div>
            {file && fileValidation && (
              <div
                className={`text-xs p-3 rounded-lg ${fileValidation.valid ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
              >
                {fileValidation.valid ? (
                  <>
                    File validated: {file.name} ({(file.size / 1024).toFixed(1)}
                    KB)
                  </>
                ) : (
                  fileValidation.error
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">
                Category (Optional)
              </Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                <option value="">None</option>
                <option value="Condition Report">Condition Report</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Rent">Rent</option>
                <option value="Comms">Comms</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room" className="text-white">
                Room/Location (Optional)
              </Label>
              <Input
                id="room"
                type="text"
                placeholder="e.g., Bathroom, Kitchen"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={loading}
                className="h-11 bg-background-dark border-card-lighter text-white placeholder:text-text-subtle"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occurredAt" className="text-white">
              Date/Time Occurred
            </Label>
            <Input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              disabled={loading}
              className="h-11 bg-background-dark border-card-lighter text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-white">
              Notes (Optional)
            </Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              rows={3}
              className="flex w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Additional notes about this evidence..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          {uploadProgress && (
            <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg border border-primary/20 flex items-center gap-2">
              <Upload className="h-4 w-4 animate-pulse" />
              {uploadProgress}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-background-dark font-bold h-11 px-6"
              disabled={
                loading || (fileValidation !== null && !fileValidation.valid)
              }
            >
              {loading ? "Uploading..." : "Upload Evidence"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80 h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-2 text-text-subtle text-xs justify-center">
        <Lock className="h-4 w-4 text-green-500" />
        <span>Files are encrypted and verified with SHA-256 hash</span>
      </div>
    </div>
  );
}

export default function UploadEvidencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-text-subtle">Loading...</div>
        </div>
      }
    >
      <UploadEvidenceForm />
    </Suspense>
  );
}
