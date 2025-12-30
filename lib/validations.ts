import { z } from "zod";

/**
 * Password validation with security requirements
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character (!@#$%^&*)"
  );

/**
 * Authentication schema for login/signup
 */
export const authSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: passwordSchema,
});

/**
 * Login schema (less strict password validation for existing users)
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const onboardingSchema = z.object({
  state: z.enum(['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  addressText: z.string().min(5, "Address must be at least 5 characters"),
  leaseStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export const propertySchema = z.object({
  addressText: z.string().min(5),
  state: z.enum(['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  leaseStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const issueSchema = z.object({
  propertyId: z.string().uuid("Please select a valid property"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
});

export const evidenceItemSchema = z.object({
  propertyId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  type: z.enum(['photo', 'pdf', 'screenshot', 'document', 'other']),
  category: z.enum(['Condition Report', 'Maintenance', 'Rent', 'Comms', 'Other']).optional(),
  room: z.string().optional(),
  note: z.string().optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
});

export const commsLogSchema = z.object({
  propertyId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
  channel: z.enum(['email', 'phone', 'sms', 'in_person', 'letter', 'app', 'other']),
  summary: z.string().min(5, "Summary must be at least 5 characters"),
  attachmentLinks: z.array(z.string().url()).optional(),
});

export const evidencePackSchema = z.object({
  issueId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const expenseItemSchema = z.object({
  propertyId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  amount: z.number().positive("Amount must be positive").max(999999.99),
  currency: z.string().default('AUD'),
  category: z.enum([
    'Repairs', 'Cleaning', 'Temporary Accommodation',
    'Moving Costs', 'Storage', 'Legal Fees',
    'Lost Income', 'Replacement Items', 'Other'
  ]),
  description: z.string().min(5, "Description must be at least 5 characters"),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
  reimbursementStatus: z.enum(['pending', 'claimed', 'approved', 'rejected', 'paid']).default('pending'),
  notes: z.string().optional(),
});

export const deadlineSchema = z.object({
  propertyId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deadlineTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  category: z.enum([
    'Tribunal Hearing', 'Response Due', 'Inspection',
    'Rent Payment', 'Notice Period', 'Repair Deadline',
    'Evidence Submission', 'Mediation', 'Other'
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  reminderDaysBefore: z.array(z.number().int().positive()).default([7, 3, 1]),
  notes: z.string().optional(),
});

export const letterGenerationSchema = z.object({
  propertyId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  letterType: z.enum([
    'Repair Request', 'Rent Reduction Request', 'Lease Termination Notice',
    'Complaint Letter', 'Deposit Claim', 'Formal Notice', 'Other'
  ]),
  recipient: z.string().min(2),
  subject: z.string().min(5),
  contextDetails: z.string().min(10, "Please provide context for the letter"),
});

