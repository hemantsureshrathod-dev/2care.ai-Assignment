import { EvalReport, TestResult } from "./types";
import fs from "fs";
import path from "path";

export function generateEvalReport(results: TestResult[]): EvalReport {
  const totalTests = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = totalTests - passed;
  const passRatePercentage = totalTests > 0 ? (passed / totalTests) * 100 : 0;

  const bookingCorrect = results.filter((r) => r.metrics.bookingCorrectness).length;
  const availCorrect = results.filter((r) => r.metrics.availabilityCorrectness).length;
  const toolCorrect = results.filter((r) => r.metrics.toolCorrectness).length;
  const noHallucination = results.filter((r) => r.metrics.noHallucination).length;

  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    totalTests,
    passed,
    failed,
    passRatePercentage: Math.round(passRatePercentage * 10) / 10,
    metrics: {
      bookingCorrectnessRate: Math.round((bookingCorrect / totalTests) * 1000) / 10,
      availabilityCorrectnessRate: Math.round((availCorrect / totalTests) * 1000) / 10,
      toolCallAccuracyRate: Math.round((toolCorrect / totalTests) * 1000) / 10,
      zeroHallucinationRate: Math.round((noHallucination / totalTests) * 1000) / 10,
    },
    results,
  };

  return report;
}

export function saveEvalReport(report: EvalReport, filepath?: string) {
  const targetPath = filepath || path.join(process.cwd(), "eval-results.json");
  fs.writeFileSync(targetPath, JSON.stringify(report, null, 2), "utf-8");
  return targetPath;
}

export function printCliSummary(report: EvalReport) {
  console.log("\n=======================================================");
  console.log("       CAREBOOK AI — AGENT EVALUATION REPORT          ");
  console.log("=======================================================\n");

  for (const r of report.results) {
    const symbol = r.passed ? "✔ PASS" : "✖ FAIL";
    const statusCol = r.passed ? `\x1b[32m${symbol}\x1b[0m` : `\x1b[31m${symbol}\x1b[0m`;
    console.log(
      ` ${statusCol} [${r.id}] ${r.name} (${r.durationMs}ms)`
    );
    if (!r.passed) {
      console.log(`        Reason: \x1b[33m${r.reason}\x1b[0m`);
    }
  }

  console.log("\n-------------------------------------------------------");
  console.log("               EVALUATION METRICS SUMMARY              ");
  console.log("-------------------------------------------------------");
  console.log(` Total Scenarios Tested : ${report.totalTests}`);
  console.log(` Passed Scenarios       : \x1b[32m${report.passed}\x1b[0m`);
  console.log(` Failed Scenarios       : ${report.failed > 0 ? `\x1b[31m${report.failed}\x1b[0m` : "0"}`);
  console.log(` Overall Pass Rate      : \x1b[1m${report.passRatePercentage}%\x1b[0m`);
  console.log("-------------------------------------------------------");
  console.log(` Booking Correctness    : ${report.metrics.bookingCorrectnessRate}%`);
  console.log(` Availability Accuracy  : ${report.metrics.availabilityCorrectnessRate}%`);
  console.log(` Tool Calling Accuracy  : ${report.metrics.toolCallAccuracyRate}%`);
  console.log(` Zero-Hallucination Rate: ${report.metrics.zeroHallucinationRate}%`);
  console.log("=======================================================\n");
}
