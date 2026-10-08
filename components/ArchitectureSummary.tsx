"use client";

import React from "react";
import { Mic, Server, Database, CheckSquare, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export function ArchitectureSummary() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            System Architecture & Zero-Hallucination Flow
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            End-to-end integration between Retell AI voice streams, transactional PostgreSQL/SQLite backend, and automated eval harness.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-full w-fit">
          <ShieldCheck className="w-4 h-4" />
          Strict ACID Isolation
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative items-stretch">
        {/* Step 1: Voice */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mb-3">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm">1. Caller / Voice Stream</h3>
            <p className="text-xs text-slate-400 mt-1">
              Natural speech audio over WebRTC handled by Retell AI voice pipeline.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-cyan-400 font-mono">
            Retell WebRTC SDK
          </div>
        </div>

        {/* Step 2: Agent LLM & Tools */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mb-3">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm">2. Retell Agent & Tools</h3>
            <p className="text-xs text-slate-400 mt-1">
              Dispatches typed tools: <code className="text-blue-300">get_doctors</code>, <code className="text-blue-300">check_availability</code>, <code className="text-blue-300">book_appointment</code>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-blue-400 font-mono">
            Strict Zero-Hallucination
          </div>
        </div>

        {/* Step 3: Next.js API / Validation */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center mb-3">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm">3. Next.js Validation</h3>
            <p className="text-xs text-slate-400 mt-1">
              Zod schemas enforce phone, ISO date, 24-hr time, and doctor validation.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-indigo-400 font-mono">
            Zod Validation Layer
          </div>
        </div>

        {/* Step 4: Database Transactions */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm">4. Transaction Engine</h3>
            <p className="text-xs text-slate-400 mt-1">
              Prisma atomic transaction re-checks slot availability, marks BOOKED, and prevents race conditions.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-mono">
            Prisma $transaction
          </div>
        </div>

        {/* Step 5: Eval Harness */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/50 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center mb-3">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm">5. Eval Harness (Part B)</h3>
            <p className="text-xs text-slate-400 mt-1">
              20 automated scenarios verifying tool calls, DB assertions, and guardrails.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-400 font-mono">
            eval-results.json
          </div>
        </div>
      </div>
    </div>
  );
}
