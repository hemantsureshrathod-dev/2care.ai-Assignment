import { getDoctors, getDoctorAvailability, resolveDoctor } from "@/lib/scheduling/availability";
import { bookAppointment } from "@/lib/scheduling/booking";

/**
 * Standardized dispatcher for Retell AI custom functions.
 * Resolves conversational arguments (e.g., doctor names instead of IDs,
 * standardizing time strings) and calls the transactional domain services.
 */
export async function dispatchRetellTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: unknown }> {
  try {
    switch (toolName) {
      case "get_doctors": {
        const specialty = typeof args.specialty === "string" ? args.specialty : undefined;
        const doctors = await getDoctors({ specialty, activeOnly: true });
        return {
          success: true,
          result: {
            count: doctors.length,
            doctors: doctors.map((d) => ({
              id: d.id,
              name: d.name,
              specialty: d.specialty,
              clinicLocation: d.location,
            })),
          },
        };
      }

      case "check_availability": {
        let doctorId = typeof args.doctorId === "string" ? args.doctorId : "";
        const rawDoctorName = typeof args.doctor_name === "string" ? args.doctor_name : "";
        const date = typeof args.date === "string" ? args.date.trim() : "";

        // Resolve doctor by ID, name, or specialty
        const targetDoctor = await resolveDoctor(doctorId || rawDoctorName);
        if (!targetDoctor) {
          return {
            success: false,
            error: {
              code: "DOCTOR_NOT_FOUND",
              message: `Could not identify a doctor matching '${doctorId || rawDoctorName}'. Please specify Dr. Ananya Sharma, Dr. Arjun Mehta, or Dr. Priya Nair.`,
            },
          };
        }

        doctorId = targetDoctor.id;
        const availability = await getDoctorAvailability({ doctorId, date });

        if (!availability.success) {
          return {
            success: false,
            error: availability.error,
          };
        }

        return {
          success: true,
          result: {
            doctor: availability.data.doctor.name,
            specialty: availability.data.doctor.specialty,
            date: availability.data.date,
            availableSlotsCount: availability.data.availableCount,
            availableSlots: availability.data.availableSlots.map((s) => s.startTime),
            message:
              availability.data.availableCount > 0
                ? `Found ${availability.data.availableCount} available slot(s): ${availability.data.availableSlots.map((s) => s.startTime).join(", ")}`
                : `No available slots remaining for ${availability.data.doctor.name} on ${date}.`,
          },
        };
      }

      case "book_appointment": {
        let doctorId = typeof args.doctorId === "string" ? args.doctorId : "";
        const rawDoctorName = typeof args.doctor_name === "string" ? args.doctor_name : "";
        const date = typeof args.date === "string" ? args.date.trim() : "";
        let startTime = typeof args.startTime === "string" ? args.startTime.trim() : "";
        const patientName = typeof args.patientName === "string" ? args.patientName.trim() : "";
        const patientPhone = typeof args.patientPhone === "string" ? args.patientPhone.trim() : "";

        // Normalize HH:mm format if caller passed "9:00" or similar
        if (/^\d:[0-5]\d$/.test(startTime)) {
          startTime = `0${startTime}`;
        }

        // Resolve doctor
        const targetDoctor = await resolveDoctor(doctorId || rawDoctorName);
        if (!targetDoctor) {
          return {
            success: false,
            error: {
              code: "DOCTOR_NOT_FOUND",
              message: `Could not identify a doctor matching '${doctorId || rawDoctorName}'.`,
            },
          };
        }

        doctorId = targetDoctor.id;

        const bookingResult = await bookAppointment({
          doctorId,
          date,
          startTime,
          patientName,
          patientPhone,
        });

        if (!bookingResult.success) {
          return {
            success: false,
            error: bookingResult.error,
          };
        }

        return {
          success: true,
          result: {
            message: `Appointment successfully booked with ${bookingResult.data.doctorName} for ${bookingResult.data.patientName}.`,
            confirmationCode: bookingResult.data.confirmationCode,
            appointmentId: bookingResult.data.appointmentId,
            doctorName: bookingResult.data.doctorName,
            date: bookingResult.data.date,
            time: bookingResult.data.startTime,
            location: bookingResult.data.clinicLocation,
          },
        };
      }

      default:
        return {
          success: false,
          error: {
            code: "UNKNOWN_TOOL",
            message: `Tool '${toolName}' is not recognized. Expected get_doctors, check_availability, or book_appointment.`,
          },
        };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "EXECUTION_ERROR",
        message: "An internal error occurred while executing the tool.",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
