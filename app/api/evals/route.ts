import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runEvaluations } from "@/evals/runner";

export async function GET() {
  try {
    const reportPath = path.join(process.cwd(), "eval-results.json");
    if (!fs.existsSync(reportPath)) {
      // Run once if report doesn't exist yet
      await runEvaluations();
    }

    const reportContent = fs.readFileSync(reportPath, "utf-8");
    const report = JSON.parse(reportContent);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EVAL_REPORT_ERROR",
          message: error instanceof Error ? error.message : "Failed to load evaluation report",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await runEvaluations();
    const reportPath = path.join(process.cwd(), "eval-results.json");
    const reportContent = fs.readFileSync(reportPath, "utf-8");
    const report = JSON.parse(reportContent);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EVAL_RUN_ERROR",
          message: error instanceof Error ? error.message : "Failed to execute evaluation suite",
        },
      },
      { status: 500 }
    );
  }
}
