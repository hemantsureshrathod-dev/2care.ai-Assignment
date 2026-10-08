import { describe, it, expect, beforeAll } from "vitest";
import { bookAppointment } from "@/lib/scheduling/booking";
import { seed } from "@/prisma/seed";
import { prisma } from "@/lib/db/prisma";

describe("CareBook AI — Unit & Integration Tests: Booking Service", () => {
  beforeAll(async () => {
    await seed();
  });

  it("1. Successful Booking: validates input, updates slot, and persists appointment", async () => {
    const result = await bookAppointment({
      doctorId: "doc_ananya_sharma",
      date: "2026-10-15",
      startTime: "09:00",
      patientName: "John Doe",
      patientPhone: "+15551234567",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.doctorName).toBe("Dr. Ananya Sharma");
    expect(result.data.patientName).toBe("John Doe");
    expect(result.data.confirmationCode).toMatch(/^CB-[A-Z0-9]+$/);

    // Verify slot status in DB
    const slot = await prisma.availabilitySlot.findFirst({
      where: {
        doctorId: "doc_ananya_sharma",
        date: "2026-10-15",
        startTime: "09:00",
      },
    });
    expect(slot?.status).toBe("BOOKED");
  });

  it("2. Unavailable Slot Rejection: rejects booking for doctor in hospital rounds", async () => {
    const result = await bookAppointment({
      doctorId: "doc_ananya_sharma",
      date: "2026-10-15",
      startTime: "15:00", // Seeded as UNAVAILABLE
      patientName: "Jane Smith",
      patientPhone: "+15559876543",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("SLOT_UNAVAILABLE");
    expect(result.error.alternativeSlots).toBeDefined();
    expect(Array.isArray(result.error.alternativeSlots)).toBe(true);
  });

  it("3. Already Booked Slot Rejection: rejects booking for pre-booked slot", async () => {
    const result = await bookAppointment({
      doctorId: "doc_ananya_sharma",
      date: "2026-10-15",
      startTime: "11:00", // Seeded as BOOKED for Rahul Verma
      patientName: "Alex Turner",
      patientPhone: "+15553334444",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("SLOT_ALREADY_BOOKED");
  });

  it("4. Double Booking Prevention: concurrent requests for the same slot allow exactly one", async () => {
    // Dr. Priya Nair at 11:00 on 2026-10-15 is AVAILABLE
    const [bookingA, bookingB] = await Promise.all([
      bookAppointment({
        doctorId: "doc_priya_nair",
        date: "2026-10-15",
        startTime: "11:00",
        patientName: "Patient A",
        patientPhone: "+15550001111",
      }),
      bookAppointment({
        doctorId: "doc_priya_nair",
        date: "2026-10-15",
        startTime: "11:00",
        patientName: "Patient B",
        patientPhone: "+15550002222",
      }),
    ]);

    const successCount = (bookingA.success ? 1 : 0) + (bookingB.success ? 1 : 0);
    expect(successCount).toBe(1);

    const failed = bookingA.success ? bookingB : bookingA;
    if (!failed.success) {
      expect(["DOUBLE_BOOKING_PREVENTED", "SLOT_ALREADY_BOOKED"]).toContain(failed.error.code);
    }
  });

  it("5. Input Validation: Zod rejects malformed dates, invalid times, and empty patient names", async () => {
    const result = await bookAppointment({
      doctorId: "doc_ananya_sharma",
      date: "invalid-date",
      startTime: "25:99",
      patientName: "",
      patientPhone: "bad-phone",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.details).toBeDefined();
  });

  it("6. Inactive Doctor Rejection: rejects booking when doctor is inactive", async () => {
    const result = await bookAppointment({
      doctorId: "doc_robert_chen", // Inactive doctor in seed
      date: "2026-10-15",
      startTime: "10:00",
      patientName: "Test Patient",
      patientPhone: "+15559998888",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("DOCTOR_INACTIVE");
  });
});
