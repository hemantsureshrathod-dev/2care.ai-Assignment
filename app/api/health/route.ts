import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    // Ping DB
    const doctorCount = await prisma.doctor.count();
    const retellConfigured = Boolean(
      process.env.RETELL_API_KEY && process.env.RETELL_API_KEY.length > 5
    );

    return NextResponse.json({
      success: true,
      data: {
        status: "healthy",
        service: "CareBook AI API",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          doctorsCount: doctorCount,
        },
        voiceEngine: {
          retellConfigured,
          mode: retellConfigured ? "live" : "simulation-ready",
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: "Database or internal service health check failed.",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 503 }
    );
  }
}
