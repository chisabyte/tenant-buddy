import {
  authSchema,
  onboardingSchema,
  issueSchema,
  evidenceItemSchema,
  commsLogSchema,
  evidencePackSchema,
} from "@/lib/validations";

describe("Validation Schemas", () => {
  describe("authSchema", () => {
    test("validates correct email and password", () => {
      const result = authSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid email", () => {
      const result = authSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    test("rejects short password", () => {
      const result = authSchema.safeParse({
        email: "test@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("onboardingSchema", () => {
    test("validates correct onboarding data", () => {
      const result = onboardingSchema.safeParse({
        state: "VIC",
        addressText: "123 Main St, Melbourne VIC 3000",
        leaseStartDate: "2024-01-01",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid state", () => {
      const result = onboardingSchema.safeParse({
        state: "INVALID",
        addressText: "123 Main St",
        leaseStartDate: "2024-01-01",
      });
      expect(result.success).toBe(false);
    });

    test("rejects short address", () => {
      const result = onboardingSchema.safeParse({
        state: "VIC",
        addressText: "123",
        leaseStartDate: "2024-01-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("issueSchema", () => {
    test("validates correct issue data", () => {
      const result = issueSchema.safeParse({
        propertyId: "123e4567-e89b-12d3-a456-426614174000",
        title: "Mould in bathroom",
        description: "Black mould growing on ceiling",
        status: "open",
      });
      expect(result.success).toBe(true);
    });

    test("rejects short title", () => {
      const result = issueSchema.safeParse({
        propertyId: "123e4567-e89b-12d3-a456-426614174000",
        title: "Hi",
        status: "open",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("evidenceItemSchema", () => {
    test("validates correct evidence item data", () => {
      const result = evidenceItemSchema.safeParse({
        propertyId: "123e4567-e89b-12d3-a456-426614174000",
        type: "photo",
        category: "Maintenance",
        occurredAt: "2024-01-01T10:00:00",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid type", () => {
      const result = evidenceItemSchema.safeParse({
        propertyId: "123e4567-e89b-12d3-a456-426614174000",
        type: "invalid",
        occurredAt: "2024-01-01T10:00:00",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("commsLogSchema", () => {
    test("validates correct comms log data", () => {
      const result = commsLogSchema.safeParse({
        propertyId: "123e4567-e89b-12d3-a456-426614174000",
        occurredAt: "2024-01-01T10:00:00",
        channel: "email",
        summary: "Discussed maintenance request with agent",
      });
      expect(result.success).toBe(true);
    });

    test("rejects short summary", () => {
      const result = commsLogSchema.safeParse({
        propertyId: "123e4567-e89b-12d3-a456-426614174000",
        occurredAt: "2024-01-01T10:00:00",
        channel: "email",
        summary: "Hi",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("evidencePackSchema", () => {
    test("validates correct evidence pack data", () => {
      const result = evidencePackSchema.safeParse({
        issueId: "123e4567-e89b-12d3-a456-426614174000",
        fromDate: "2024-01-01",
        toDate: "2024-12-31",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid date format", () => {
      const result = evidencePackSchema.safeParse({
        issueId: "123e4567-e89b-12d3-a456-426614174000",
        fromDate: "01/01/2024",
        toDate: "12/31/2024",
      });
      expect(result.success).toBe(false);
    });
  });
});

