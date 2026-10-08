import { NextRequest, NextResponse } from "next/server";
import { bookAppointment } from "@/lib/scheduling/booking";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Malformed JSON body in request.",
          },
        },
        { status: 400 }
      );
    }

    const result = await bookAppointment(body);

    if (!result.success) {
      const code = result.error.code;
      const status =
        code === "VALIDATION_ERROR"
          ? 400
          : code === "DOCTOR_NOT_FOUND" || code === "SLOT_NOT_FOUND"
          ? 404
          : code === "SLOT_ALREADY_BOOKED" ||
            code === "DOUBLE_BOOKING_PREVENTED" ||
            code === "SLOT_UNAVAILABLE"
          ? 409
          : 500;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error during appointment booking.",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const appointments = await prisma.appointment.findMany({
      take: Math.min(limit, 50),
      orderBy: { createdAt: "desc" },
      include: {
        doctor: {
          select: {
            name: true,
            specialty: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        count: appointments.length,
        appointments,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list appointments.",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
