import { describe, it, expect, beforeAll } from "vitest";
import { getDoctors, resolveDoctor, getDoctorAvailability } from "@/lib/scheduling/availability";
import { seed } from "@/prisma/seed";

describe("CareBook AI — Unit & Integration Tests: Availability & Doctors", () => {
  beforeAll(async () => {
    await seed();
  });

  it("1. Doctor Directory: lists active doctors and filters by specialty", async () => {
    const allActive = await getDoctors({ activeOnly: true });
    expect(allActive.length).toBe(3); // Ananya, Arjun, Priya

    const cardiologists = await getDoctors({ specialty: "Cardiology" });
    expect(cardiologists.length).toBe(1);
    expect(cardiologists[0].name).toBe("Dr. Arjun Mehta");
  });

  it("2. Fuzzy Resolution: correctly identifies doctor by surname or specialty", async () => {
    const docByName = await resolveDoctor("Mehta");
    expect(docByName).toBeDefined();
    expect(docByName?.id).toBe("doc_arjun_mehta");

    const docBySpecialty = await resolveDoctor("Dermatology");
    expect(docBySpecialty).toBeDefined();
    expect(docBySpecialty?.id).toBe("doc_priya_nair");

    const invalidDoc = await resolveDoctor("NonExistentDoc");
    expect(invalidDoc).toBeNull();
  });

  it("3. Availability Lookup: retrieves verified real slots from database", async () => {
    const availability = await getDoctorAvailability({
      doctorId: "doc_ananya_sharma",
      date: "2026-10-15",
    });

    expect(availability.success).toBe(true);
    if (!availability.success) {
      throw new Error("Availability query failed");
    }

    expect(availability.data.doctor.name).toBe("Dr. Ananya Sharma");
    expect(availability.data.availableCount).toBeGreaterThan(0);
    // 11:00 is booked, 15:00 is unavailable
    const times = availability.data.availableSlots.map((s) => s.startTime);
    expect(times).not.toContain("11:00");
    expect(times).not.toContain("15:00");
  });

  it("4. Unknown Doctor Rejection: returns 404/not found error", async () => {
    const res = await getDoctorAvailability({
      doctorId: "non_existent_doctor_id",
      date: "2026-10-15",
    });

    expect(res.success).toBe(false);
    if (res.success) {
      throw new Error("Expected unknown doctor query to fail");
    }
    expect(res.error.code).toBe("DOCTOR_NOT_FOUND");
  });
});
