/**
 * Database Types for Supabase
 *
 * These types should be regenerated when the database schema changes.
 * Run: npx supabase gen types typescript --project-id <your-project-id> > lib/database.types.ts
 *
 * For now, these are manually maintained to match the migration files.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AustralianState = "VIC" | "NSW" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type EvidenceType = "photo" | "pdf" | "screenshot" | "document" | "other";

export type EvidenceCategory = "Condition Report" | "Maintenance" | "Rent" | "Comms" | "Other";

export type CommsChannel = "email" | "phone" | "sms" | "in_person" | "letter" | "app" | "other";

export type ExpenseCategory =
  | "Repairs"
  | "Cleaning"
  | "Temporary Accommodation"
  | "Moving Costs"
  | "Storage"
  | "Legal Fees"
  | "Lost Income"
  | "Replacement Items"
  | "Other";

export type ReimbursementStatus = "pending" | "claimed" | "approved" | "rejected" | "paid";

export type DeadlineCategory =
  | "Tribunal Hearing"
  | "Response Due"
  | "Inspection"
  | "Rent Payment"
  | "Notice Period"
  | "Repair Deadline"
  | "Evidence Submission"
  | "Mediation"
  | "Other";

export type Priority = "low" | "medium" | "high" | "urgent";

export type DeadlineStatus = "pending" | "completed" | "cancelled" | "overdue";

export type LetterType =
  | "Repair Request"
  | "Rent Reduction Request"
  | "Lease Termination Notice"
  | "Complaint Letter"
  | "Deposit Claim"
  | "Formal Notice"
  | "Other";

export type LetterStatus = "draft" | "sent" | "archived";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          state: AustralianState;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          state: AustralianState;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          state?: AustralianState;
          created_at?: string;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          user_id: string;
          address_text: string;
          state: AustralianState;
          lease_start_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          address_text: string;
          state: AustralianState;
          lease_start_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          address_text?: string;
          state?: AustralianState;
          lease_start_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      issues: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          title: string;
          description: string | null;
          status: IssueStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          title: string;
          description?: string | null;
          status?: IssueStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          title?: string;
          description?: string | null;
          status?: IssueStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      evidence_items: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          issue_id: string | null;
          type: EvidenceType;
          file_path: string | null;
          note: string | null;
          category: EvidenceCategory | null;
          room: string | null;
          occurred_at: string;
          uploaded_at: string;
          sha256: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          issue_id?: string | null;
          type: EvidenceType;
          file_path?: string | null;
          note?: string | null;
          category?: EvidenceCategory | null;
          room?: string | null;
          occurred_at: string;
          uploaded_at?: string;
          sha256: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          issue_id?: string | null;
          type?: EvidenceType;
          file_path?: string | null;
          note?: string | null;
          category?: EvidenceCategory | null;
          room?: string | null;
          occurred_at?: string;
          uploaded_at?: string;
          sha256?: string;
          created_at?: string;
        };
      };
      comms_logs: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          issue_id: string | null;
          occurred_at: string;
          channel: CommsChannel;
          summary: string;
          attachment_links: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          issue_id?: string | null;
          occurred_at: string;
          channel: CommsChannel;
          summary: string;
          attachment_links?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          issue_id?: string | null;
          occurred_at?: string;
          channel?: CommsChannel;
          summary?: string;
          attachment_links?: string[] | null;
          created_at?: string;
        };
      };
      evidence_pack_runs: {
        Row: {
          id: string;
          user_id: string;
          issue_id: string;
          from_date: string;
          to_date: string;
          pdf_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          issue_id: string;
          from_date: string;
          to_date: string;
          pdf_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          issue_id?: string;
          from_date?: string;
          to_date?: string;
          pdf_path?: string | null;
          created_at?: string;
        };
      };
      expense_items: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          issue_id: string | null;
          amount: number;
          currency: string;
          category: ExpenseCategory;
          description: string;
          occurred_at: string;
          receipt_file_path: string | null;
          receipt_sha256: string | null;
          reimbursement_status: ReimbursementStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          issue_id?: string | null;
          amount: number;
          currency?: string;
          category: ExpenseCategory;
          description: string;
          occurred_at: string;
          receipt_file_path?: string | null;
          receipt_sha256?: string | null;
          reimbursement_status?: ReimbursementStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          issue_id?: string | null;
          amount?: number;
          currency?: string;
          category?: ExpenseCategory;
          description?: string;
          occurred_at?: string;
          receipt_file_path?: string | null;
          receipt_sha256?: string | null;
          reimbursement_status?: ReimbursementStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      deadlines: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          issue_id: string | null;
          title: string;
          description: string | null;
          deadline_date: string;
          deadline_time: string | null;
          category: DeadlineCategory;
          priority: Priority;
          status: DeadlineStatus;
          completed_at: string | null;
          reminder_days_before: number[];
          reminders_sent: string[] | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          issue_id?: string | null;
          title: string;
          description?: string | null;
          deadline_date: string;
          deadline_time?: string | null;
          category: DeadlineCategory;
          priority?: Priority;
          status?: DeadlineStatus;
          completed_at?: string | null;
          reminder_days_before?: number[];
          reminders_sent?: string[] | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          issue_id?: string | null;
          title?: string;
          description?: string | null;
          deadline_date?: string;
          deadline_time?: string | null;
          category?: DeadlineCategory;
          priority?: Priority;
          status?: DeadlineStatus;
          completed_at?: string | null;
          reminder_days_before?: number[];
          reminders_sent?: string[] | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      generated_letters: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          issue_id: string | null;
          letter_type: LetterType;
          recipient: string;
          subject: string;
          content: string;
          ai_model: string | null;
          generation_prompt: string | null;
          status: LetterStatus;
          sent_at: string | null;
          sent_via: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          issue_id?: string | null;
          letter_type: LetterType;
          recipient: string;
          subject: string;
          content: string;
          ai_model?: string | null;
          generation_prompt?: string | null;
          status?: LetterStatus;
          sent_at?: string | null;
          sent_via?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          issue_id?: string | null;
          letter_type?: LetterType;
          recipient?: string;
          subject?: string;
          content?: string;
          ai_model?: string | null;
          generation_prompt?: string | null;
          status?: LetterStatus;
          sent_at?: string | null;
          sent_via?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      case_analyses: {
        Row: {
          id: string;
          user_id: string;
          issue_id: string;
          strength_score: number | null;
          strengths: string[] | null;
          weaknesses: string[] | null;
          recommendations: string[] | null;
          ai_model: string | null;
          analysis_date: string;
          evidence_count: number;
          communication_count: number;
          expense_total: number;
          days_since_issue: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          issue_id: string;
          strength_score?: number | null;
          strengths?: string[] | null;
          weaknesses?: string[] | null;
          recommendations?: string[] | null;
          ai_model?: string | null;
          analysis_date?: string;
          evidence_count?: number;
          communication_count?: number;
          expense_total?: number;
          days_since_issue?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          issue_id?: string;
          strength_score?: number | null;
          strengths?: string[] | null;
          weaknesses?: string[] | null;
          recommendations?: string[] | null;
          ai_model?: string | null;
          analysis_date?: string;
          evidence_count?: number;
          communication_count?: number;
          expense_total?: number;
          days_since_issue?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type Issue = Database["public"]["Tables"]["issues"]["Row"];
export type EvidenceItem = Database["public"]["Tables"]["evidence_items"]["Row"];
export type CommsLog = Database["public"]["Tables"]["comms_logs"]["Row"];
export type EvidencePackRun = Database["public"]["Tables"]["evidence_pack_runs"]["Row"];
export type ExpenseItem = Database["public"]["Tables"]["expense_items"]["Row"];
export type Deadline = Database["public"]["Tables"]["deadlines"]["Row"];
export type GeneratedLetter = Database["public"]["Tables"]["generated_letters"]["Row"];
export type CaseAnalysis = Database["public"]["Tables"]["case_analyses"]["Row"];

// Insert types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
export type IssueInsert = Database["public"]["Tables"]["issues"]["Insert"];
export type EvidenceItemInsert = Database["public"]["Tables"]["evidence_items"]["Insert"];
export type CommsLogInsert = Database["public"]["Tables"]["comms_logs"]["Insert"];
export type ExpenseItemInsert = Database["public"]["Tables"]["expense_items"]["Insert"];
export type DeadlineInsert = Database["public"]["Tables"]["deadlines"]["Insert"];
export type GeneratedLetterInsert = Database["public"]["Tables"]["generated_letters"]["Insert"];

// Update types
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];
export type IssueUpdate = Database["public"]["Tables"]["issues"]["Update"];
export type EvidenceItemUpdate = Database["public"]["Tables"]["evidence_items"]["Update"];
export type CommsLogUpdate = Database["public"]["Tables"]["comms_logs"]["Update"];
export type ExpenseItemUpdate = Database["public"]["Tables"]["expense_items"]["Update"];
export type DeadlineUpdate = Database["public"]["Tables"]["deadlines"]["Update"];
export type GeneratedLetterUpdate = Database["public"]["Tables"]["generated_letters"]["Update"];
