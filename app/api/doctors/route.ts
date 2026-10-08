import { NextRequest, NextResponse } from "next/server";
import { getDoctors } from "@/lib/scheduling/availability";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty") || undefined;
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const doctors = await getDoctors({ specialty, activeOnly });

    return NextResponse.json({
      success: true,
      data: {
        count: doctors.length,
        doctors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve doctors directory.",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
