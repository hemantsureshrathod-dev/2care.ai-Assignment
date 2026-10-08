"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, ShieldCheck, Play, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { EvalReport } from "@/evals/types";

export function EvalSummaryCard() {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/evals");
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunEvals = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/evals", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      }
    } catch {
      // ignore
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Automated Evaluation Harness (Part B)</h2>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-semibold uppercase">
              20 Scenarios
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Objective deterministic test suite verifying tool calling, database state mutations, and hallucination guardrails.
          </p>
        </div>

        <button
          onClick={handleRunEvals}
          disabled={isRunning}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-purple-600/20"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Executing 20 Scenarios..." : "Re-Run Evaluation Suite"}
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          Loading evaluation metrics...
        </div>
      ) : report ? (
        <div>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Pass Rate</span>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                {report.passRatePercentage}%
              </div>
              <span className="text-[10px] text-slate-500">
                {report.passed}/{report.totalTests} Scenarios Passed
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Booking Correctness</span>
              <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                {report.metrics.bookingCorrectnessRate}%
              </div>
              <span className="text-[10px] text-slate-500">Atomic $transaction</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Availability Accuracy</span>
              <div className="text-xl font-bold text-blue-400 mt-1 font-mono">
                {report.metrics.availabilityCorrectnessRate}%
              </div>
              <span className="text-[10px] text-slate-500">Real DB Slot Checks</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Zero Hallucination</span>
              <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
                {report.metrics.zeroHallucinationRate}%
              </div>
              <span className="text-[10px] text-slate-500">Strict Anti-Fabrication</span>
            </div>
          </div>

          {/* Toggle All Scenarios */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between transition"
          >
            <span>View All 20 Detailed Scenario Results & Audit Trail</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {report.results.map((res) => (
                <div
                  key={res.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{res.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {res.id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          {res.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{res.reason}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-500">{res.durationMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-500">
          No evaluation report found. Run <code className="text-purple-400">npm run eval</code> to generate.
        </div>
      )}
    </div>
  );
}
