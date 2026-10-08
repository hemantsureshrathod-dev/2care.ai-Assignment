"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, RefreshCw, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  location: string;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface AvailabilityGridProps {
  refreshTrigger?: number;
}

export function AvailabilityGrid({ refreshTrigger }: AvailabilityGridProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-15");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load doctors list
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch("/api/doctors");
        const json = await res.json();
        if (json.success && json.data.doctors.length > 0) {
          setDoctors(json.data.doctors);
          setSelectedDoctorId(json.data.doctors[0].id);
        }
      } catch (err) {
        setError("Failed to fetch doctors list.");
      }
    }
    loadDoctors();
  }, []);

  // Fetch slots whenever doctor, date, or refreshTrigger changes
  const fetchAvailability = async () => {
    if (!selectedDoctorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/availability?doctorId=${selectedDoctorId}&date=${selectedDate}`
      );
      const json = await res.json();
      if (json.success) {
        setSlots(json.data.allSlots || []);
      } else {
        setError(json.error?.message || "Failed to load slots.");
        setSlots([]);
      }
    } catch {
      setError("Failed to query availability.");
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedDoctorId, selectedDate, refreshTrigger]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Live Clinic Availability & Slot Status
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real database records queried by the voice agent during calls.
          </p>
        </div>

        <button
          onClick={fetchAvailability}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700/60 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Select Physician
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} — {doc.specialty}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Select Date
          </label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="2026-10-15">2026-10-15 (Deterministic Test Day 1)</option>
            <option value="2026-10-16">2026-10-16 (Deterministic Test Day 2)</option>
            <option value="2026-10-17">2026-10-17 (Deterministic Test Day 3)</option>
          </select>
        </div>
      </div>

      {selectedDoctor && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-white">{selectedDoctor.name}</span>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-cyan-400 font-medium">{selectedDoctor.specialty}</span>
          </div>
          <span className="text-slate-400 text-[11px]">{selectedDoctor.location}</span>
        </div>
      )}

      {/* Slots Grid */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          Querying PostgreSQL / SQLite availability slots...
        </div>
      ) : error ? (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : slots.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No slots registered for this date.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {slots.map((slot) => {
            const isAvailable = slot.status === "AVAILABLE";
            const isBooked = slot.status === "BOOKED";
            const isUnavailable = slot.status === "UNAVAILABLE";

            return (
              <div
                key={slot.id}
                className={`p-3 rounded-xl border text-center transition flex flex-col justify-between ${
                  isAvailable
                    ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300 hover:border-emerald-500"
                    : isBooked
                    ? "bg-rose-950/30 border-rose-800/60 text-rose-300"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 font-mono text-sm font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {slot.startTime}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  until {slot.endTime}
                </div>
                <div
                  className={`mt-2 py-0.5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider mx-auto ${
                    isAvailable
                      ? "bg-emerald-900/60 text-emerald-200"
                      : isBooked
                      ? "bg-rose-900/60 text-rose-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isAvailable ? "Available" : isBooked ? "Booked" : "Unavailable"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
