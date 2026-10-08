import { z } from "zod";

// ISO Date regex YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
// Time regex HH:mm (24-hour)
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
// Phone regex - at least 7 digits, supports +, -, spaces, parentheses
const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$|^[0-9+()-\s]{7,20}$/;

export const DoctorQuerySchema = z.object({
  specialty: z.string().optional(),
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val !== "false"),
});

export const AvailabilityQuerySchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
  date: z
    .string()
    .regex(dateRegex, "Date must be in YYYY-MM-DD format"),
});

export const BookAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
  patientName: z
    .string()
    .trim()
    .min(2, "Patient name must be at least 2 characters")
    .max(100, "Patient name is too long"),
  patientPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Valid contact phone number is required (e.g. +1 555-123-4567)"),
  date: z
    .string()
    .regex(dateRegex, "Date must be in YYYY-MM-DD format"),
  startTime: z
    .string()
    .regex(timeRegex, "Start time must be in HH:mm format (24-hour)"),
});

export type BookAppointmentInput = z.infer<typeof BookAppointmentSchema>;
export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>;
export type DoctorQueryInput = z.infer<typeof DoctorQuerySchema>;
