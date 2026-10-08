import { seed } from "../prisma/seed";
import { EVAL_SCENARIOS } from "./scenarios";
import { evaluateScenario } from "./evaluator";
import { generateEvalReport, printCliSummary, saveEvalReport } from "./report";
import { TestResult } from "./types";
import { prisma } from "../lib/db/prisma";

export async function runEvaluations(): Promise<boolean> {
  console.log("Preparing fresh evaluation environment...");
  // 1. Fresh seed for deterministic testing
  await seed();

  console.log(`\nRunning ${EVAL_SCENARIOS.length} CareBook AI agent evaluation scenarios...\n`);

  const results: TestResult[] = [];

  for (const scenario of EVAL_SCENARIOS) {
    const res = await evaluateScenario(scenario);
    results.push(res);
  }

  const report = generateEvalReport(results);
  printCliSummary(report);

  const reportPath = saveEvalReport(report);
  console.log(`Saved machine-readable report to: ${reportPath}\n`);

  return report.failed === 0;
}

if (require.main === module || process.argv[1]?.includes("runner")) {
  runEvaluations()
    .then((allPassed) => {
      prisma.$disconnect().then(() => {
        process.exit(allPassed ? 0 : 1);
      });
    })
    .catch((err) => {
      console.error("Evaluation suite fatal error:", err);
      prisma.$disconnect().then(() => {
        process.exit(1);
      });
    });
}
