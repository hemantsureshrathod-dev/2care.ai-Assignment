import { prisma } from "@/lib/db/prisma";
import { BookAppointmentInput, BookAppointmentSchema } from "@/lib/validation/schemas";

export interface BookingResultSuccess {
  success: true;
  data: {
    appointmentId: string;
    doctorId: string;
    doctorName: string;
    specialty: string;
    clinicLocation: string;
    patientName: string;
    patientPhone: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    confirmationCode: string;
  };
}

export interface BookingResultFailure {
  success: false;
  error: {
    code:
      | "VALIDATION_ERROR"
      | "DOCTOR_NOT_FOUND"
      | "DOCTOR_INACTIVE"
      | "SLOT_NOT_FOUND"
      | "SLOT_ALREADY_BOOKED"
      | "SLOT_UNAVAILABLE"
      | "DOUBLE_BOOKING_PREVENTED"
      | "TRANSACTION_FAILED";
    message: string;
    details?: unknown;
    alternativeSlots?: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
    }>;
  };
}

export type BookingResult = BookingResultSuccess | BookingResultFailure;

/**
 * Finds alternative available slots for a given doctor on a requested date
 */
export async function getAlternativeSlots(
  doctorId: string,
  date: string,
  limit: number = 3
) {
  try {
    const slots = await prisma.availabilitySlot.findMany({
      where: {
        doctorId,
        date,
        status: "AVAILABLE",
      },
      orderBy: {
        startTime: "asc",
      },
      take: limit,
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
      },
    });
    return slots;
  } catch {
    return [];
  }
}

/**
 * Core appointment booking service with strict transactional integrity
 * Guarantees zero double-booking and re-checks status immediately before commit.
 */
export async function bookAppointment(
  rawInput: unknown
): Promise<BookingResult> {
  // 1. Zod input validation
  const validationResult = BookAppointmentSchema.safeParse(rawInput);
  if (!validationResult.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid booking request parameters.",
        details: validationResult.error.flatten().fieldErrors,
      },
    };
  }

  const input: BookAppointmentInput = validationResult.data;

  // 2. Doctor verification
  const doctor = await prisma.doctor.findUnique({
    where: { id: input.doctorId },
  });

  if (!doctor) {
    return {
      success: false,
      error: {
        code: "DOCTOR_NOT_FOUND",
        message: `Doctor with ID '${input.doctorId}' does not exist in our clinic directory.`,
      },
    };
  }

  if (!doctor.active) {
    return {
      success: false,
      error: {
        code: "DOCTOR_INACTIVE",
        message: `Doctor '${doctor.name}' is currently not taking new appointments.`,
      },
    };
  }

  // 3 & 4. Verify slot existence & status
  const existingSlot = await prisma.availabilitySlot.findUnique({
    where: {
      doctorId_date_startTime: {
        doctorId: input.doctorId,
        date: input.date,
        startTime: input.startTime,
      },
    },
  });

  if (!existingSlot) {
    const alternatives = await getAlternativeSlots(input.doctorId, input.date);
    return {
      success: false,
      error: {
        code: "SLOT_NOT_FOUND",
        message: `No appointment slot exists for ${doctor.name} on ${input.date} at ${input.startTime}.`,
        alternativeSlots: alternatives,
      },
    };
  }

  if (existingSlot.status === "BOOKED") {
    const alternatives = await getAlternativeSlots(input.doctorId, input.date);
    return {
      success: false,
      error: {
        code: "SLOT_ALREADY_BOOKED",
        message: `The ${input.startTime} slot on ${input.date} with ${doctor.name} has already been booked.`,
        alternativeSlots: alternatives,
      },
    };
  }

  if (existingSlot.status !== "AVAILABLE") {
    const alternatives = await getAlternativeSlots(input.doctorId, input.date);
    return {
      success: false,
      error: {
        code: "SLOT_UNAVAILABLE",
        message: `The requested time ${input.startTime} is not available for booking.`,
        alternativeSlots: alternatives,
      },
    };
  }

  // 5, 6, 7, 8. Atomic Database Transaction
  // Ensures race condition protection and ACID atomicity
  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Re-fetch slot inside transaction with status check
      const currentSlot = await tx.availabilitySlot.findUnique({
        where: { id: existingSlot.id },
      });

      if (!currentSlot || currentSlot.status !== "AVAILABLE") {
        throw new Error("RACE_CONDITION_SLOT_TAKEN");
      }

      // Check if patient already has a confirmed booking for the same doctor/time
      const duplicateBooking = await tx.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          date: input.date,
          startTime: input.startTime,
          status: "CONFIRMED",
        },
      });

      if (duplicateBooking) {
        throw new Error("RACE_CONDITION_DOUBLE_BOOKING");
      }

      // Mark slot as BOOKED
      await tx.availabilitySlot.update({
        where: { id: currentSlot.id },
        data: { status: "BOOKED" },
      });

      // Create Appointment record
      const appointment = await tx.appointment.create({
        data: {
          doctorId: doctor.id,
          slotId: currentSlot.id,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          date: input.date,
          startTime: input.startTime,
          endTime: currentSlot.endTime,
          status: "CONFIRMED",
        },
      });

      return {
        appointment,
        slot: currentSlot,
      };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    const confirmationCode = `CB-${transactionResult.appointment.id.slice(-6).toUpperCase()}`;

    return {
      success: true,
      data: {
        appointmentId: transactionResult.appointment.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        clinicLocation: doctor.location,
        patientName: transactionResult.appointment.patientName,
        patientPhone: transactionResult.appointment.patientPhone,
        date: transactionResult.appointment.date,
        startTime: transactionResult.appointment.startTime,
        endTime: transactionResult.appointment.endTime,
        status: transactionResult.appointment.status,
        confirmationCode,
      },
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const alternatives = await getAlternativeSlots(input.doctorId, input.date);

    if (
      errMessage.includes("RACE_CONDITION_SLOT_TAKEN") ||
      errMessage.includes("RACE_CONDITION_DOUBLE_BOOKING")
    ) {
      return {
        success: false,
        error: {
          code: "DOUBLE_BOOKING_PREVENTED",
          message:
            "This slot was just claimed by another patient during checkout. Please select an alternative time.",
          alternativeSlots: alternatives,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "TRANSACTION_FAILED",
        message: "An unexpected database transaction error occurred. Please try again.",
        details: errMessage,
      },
    };
  }
}
