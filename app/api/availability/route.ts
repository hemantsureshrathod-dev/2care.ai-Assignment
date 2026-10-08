import { NextRequest, NextResponse } from "next/server";
import { getDoctorAvailability } from "@/lib/scheduling/availability";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId") || "";
    const date = searchParams.get("date") || "";

    const result = await getDoctorAvailability({ doctorId, date });

    if (!result.success) {
      const errCode = result.error.code;
      const status =
        errCode === "VALIDATION_ERROR"
          ? 400
          : errCode === "DOCTOR_NOT_FOUND"
          ? 404
          : errCode === "DOCTOR_INACTIVE"
          ? 400
          : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve doctor availability.",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
