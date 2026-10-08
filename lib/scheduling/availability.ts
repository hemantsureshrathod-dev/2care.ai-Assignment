import { prisma } from "@/lib/db/prisma";
import { AvailabilityQuerySchema } from "@/lib/validation/schemas";

export interface DoctorDTO {
  id: string;
  name: string;
  specialty: string;
  location: string;
  active: boolean;
}

export interface SlotDTO {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

/**
 * Fetch all doctors, optionally filtering by specialty or active status
 */
export async function getDoctors(options?: {
  specialty?: string;
  activeOnly?: boolean;
}) {
  const activeOnly = options?.activeOnly !== false;
  const specialtyFilter = options?.specialty?.trim().toLowerCase();

  const doctors = await prisma.doctor.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: { name: "asc" },
  });

  if (specialtyFilter) {
    return doctors.filter(
      (doc) =>
        doc.specialty.toLowerCase().includes(specialtyFilter) ||
        specialtyFilter.includes(doc.specialty.toLowerCase())
    );
  }

  return doctors;
}

/**
 * Helper to resolve doctor ID or fuzzy name/specialty match for natural conversational input
 */
export async function resolveDoctor(
  query: string
): Promise<DoctorDTO | null> {
  const normalized = query.trim().toLowerCase();

  // 1. Direct ID match
  const byId = await prisma.doctor.findUnique({
    where: { id: query },
  });
  if (byId) return byId;

  // 2. Exact or partial name match
  const allDoctors = await prisma.doctor.findMany({
    where: { active: true },
  });

  // Check name match
  const nameMatch = allDoctors.find(
    (d) =>
      d.name.toLowerCase().includes(normalized) ||
      normalized.includes(d.name.toLowerCase().replace("dr. ", ""))
  );
  if (nameMatch) return nameMatch;

  // Check specialty match
  const specialtyMatch = allDoctors.find(
    (d) =>
      d.specialty.toLowerCase().includes(normalized) ||
      normalized.includes(d.specialty.toLowerCase())
  );
  if (specialtyMatch) return specialtyMatch;

  return null;
}

export type AvailabilityResult =
  | {
      success: true;
      data: {
        doctor: {
          id: string;
          name: string;
          specialty: string;
          location: string;
        };
        date: string;
        totalSlots: number;
        availableCount: number;
        availableSlots: Array<{
          id: string;
          startTime: string;
          endTime: string;
        }>;
        allSlots: Array<{
          id: string;
          startTime: string;
          endTime: string;
          status: string;
        }>;
      };
    }
  | {
      success: false;
      error: {
        code: "VALIDATION_ERROR" | "DOCTOR_NOT_FOUND" | "DOCTOR_INACTIVE" | "INTERNAL_ERROR";
        message: string;
        details?: unknown;
      };
    };

/**
 * Get availability slots for a doctor on a specific date
 */
export async function getDoctorAvailability(
  rawInput: unknown
): Promise<AvailabilityResult> {
  const validation = AvailabilityQuerySchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid availability query parameters. 'doctorId' and 'date' (YYYY-MM-DD) are required.",
        details: validation.error.flatten().fieldErrors,
      },
    };
  }

  const { doctorId, date } = validation.data;

  // Verify doctor
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    return {
      success: false,
      error: {
        code: "DOCTOR_NOT_FOUND",
        message: `Doctor with ID '${doctorId}' not found.`,
      },
    };
  }

  if (!doctor.active) {
    return {
      success: false,
      error: {
        code: "DOCTOR_INACTIVE",
        message: `Doctor '${doctor.name}' is currently inactive.`,
      },
    };
  }

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      doctorId,
      date,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

  return {
    success: true,
    data: {
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        location: doctor.location,
      },
      date,
      totalSlots: slots.length,
      availableCount: availableSlots.length,
      availableSlots: availableSlots.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      allSlots: slots.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
      })),
    },
  };
}
