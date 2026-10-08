export type ExpectedOutcome =
  | "SUCCESS_BOOKED"
  | "REJECTED_UNAVAILABLE"
  | "REJECTED_ALREADY_BOOKED"
  | "REJECTED_UNKNOWN_DOCTOR"
  | "REJECTED_INVALID_INPUT"
  | "REJECTED_DOUBLE_BOOKING"
  | "REJECTED_MEDICAL_ADVICE"
  | "OFFERED_ALTERNATIVES"
  | "LISTED_DOCTORS";

export interface ExpectedToolCall {
  tool: "get_doctors" | "check_availability" | "book_appointment";
  argsMatcher?: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  name: string;
  category:
    | "Booking Success"
    | "Doctor Resolution"
    | "Availability Safety"
    | "Validation & Boundary"
    | "Concurrency & Conflict"
    | "Hallucination Prevention"
    | "Clinical Scope";
  description: string;
  userInput: string | string[];
  mockContext?: {
    resolvedDoctorId?: string;
    targetDate?: string;
    targetTime?: string;
    patientName?: string;
    patientPhone?: string;
    specialty?: string;
  };
  expectedOutcome: ExpectedOutcome;
  expectedToolCalls: ExpectedToolCall[];
  assertDbState?: {
    shouldCreateAppointment: boolean;
    expectedSlotStatus?: "AVAILABLE" | "BOOKED" | "UNAVAILABLE";
  };
}

export interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  reason: string;
  observedToolCalls: Array<{ tool: string; args: Record<string, unknown>; success: boolean }>;
  databaseState: {
    appointmentFound: boolean;
    slotStatus?: string;
  };
  metrics: {
    toolCorrectness: boolean;
    bookingCorrectness: boolean;
    availabilityCorrectness: boolean;
    noHallucination: boolean;
  };
}

export interface EvalReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRatePercentage: number;
  metrics: {
    bookingCorrectnessRate: number;
    availabilityCorrectnessRate: number;
    toolCallAccuracyRate: number;
    zeroHallucinationRate: number;
  };
  results: TestResult[];
}
