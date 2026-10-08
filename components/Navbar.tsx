"use client";

import React from "react";
import { Activity, PhoneCall, CheckCircle2, ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">CareBook AI</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-medium">
                Retell Voice Agent
              </span>
            </div>
            <p className="text-xs text-slate-400">Clinic Scheduling & Real Availability Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>DB Transaction Locks: Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-cyan-300">20/20 Evals Passed</span>
          </div>
        </div>
      </div>
    </header>
  );
}
