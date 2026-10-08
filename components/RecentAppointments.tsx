"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, Calendar, Clock, RefreshCw, CheckCircle2, Shield } from "lucide-react";

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  doctor: {
    name: string;
    specialty: string;
    location: string;
  };
}

interface RecentAppointmentsProps {
  refreshTrigger?: number;
}

export function RecentAppointments({ refreshTrigger }: RecentAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments?limit=15");
      const json = await res.json();
      if (json.success) {
        setAppointments(json.data.appointments);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [refreshTrigger]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Recent Confirmed Appointments
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Confirmed appointments written directly into the database by the booking engine.
          </p>
        </div>

        <button
          onClick={fetchAppointments}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700/60 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          Loading recent appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No appointments recorded yet. Use the Voice Agent to book your first visit.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Patient</th>
                <th className="py-2.5 px-3 font-medium">Doctor & Specialty</th>
                <th className="py-2.5 px-3 font-medium">Date & Time</th>
                <th className="py-2.5 px-3 font-medium">Confirmation Code</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {appointments.map((appt) => {
                const confCode = `CB-${appt.id.slice(-6).toUpperCase()}`;
                return (
                  <tr key={appt.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{appt.patientName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-cyan-400" />
                        {appt.patientPhone}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200">{appt.doctor.name}</div>
                      <div className="text-[11px] text-cyan-400">{appt.doctor.specialty}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-300 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {appt.date}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {appt.startTime} – {appt.endTime}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded text-[11px]">
                        {confCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
