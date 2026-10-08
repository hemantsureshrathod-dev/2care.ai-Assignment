"use client";

import React, { useState } from "react";
import { Mic, Phone, PhoneOff, Play, CheckCircle2, AlertCircle, Terminal, Copy, Check, MessageSquare, RefreshCw } from "lucide-react";
import { RETELL_SYSTEM_PROMPT, RETELL_TOOL_DEFINITIONS } from "@/lib/retell/agent-config";

interface VoiceAgentCardProps {
  onAppointmentBooked?: () => void;
}

interface Message {
  sender: "caller" | "agent" | "tool";
  text: string;
  toolDetails?: {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    error?: unknown;
  };
}

export function VoiceAgentCard({ onAppointmentBooked }: VoiceAgentCardProps) {
  // Live Retell WebRTC state
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("");
  const [retellError, setRetellError] = useState<string | null>(null);

  // Simulator state
  const [simMessages, setSimMessages] = useState<Message[]>([
    {
      sender: "agent",
      text: "Hello! Welcome to CareBook Clinic. How can I help you today?",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Quick scenario presets for reviewer
  const presets = [
    {
      label: "Book Dr. Sharma at 09:00 (Available)",
      text: "I want to book Dr. Ananya Sharma on 2026-10-15 at 09:00. Name: Alice Walker, Phone: +15551234567.",
    },
    {
      label: "Try 11:00 (Already Booked)",
      text: "Can I book Dr. Sharma at 11:00 AM on 2026-10-15? My name is Mark Davis, phone +15552345678.",
    },
    {
      label: "Try 15:00 (Hospital Rounds)",
      text: "Is Dr. Ananya Sharma available at 15:00 on 2026-10-15? Name: Sarah Connor, phone +15553456789.",
    },
    {
      label: "Specialist Inquiry (Cardiology)",
      text: "Do you have any heart specialists or cardiologists available on 2026-10-15?",
    },
  ];

  // Live Retell Web Call Launcher
  const handleStartLiveCall = async () => {
    try {
      setIsCalling(true);
      setCallStatus("Requesting ephemeral web call session from CareBook backend...");
      setRetellError(null);

      const res = await fetch("/api/retell/create-web-call", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create Retell call session.");
      }

      setCallStatus("Connecting to Retell WebRTC media stream...");

      // Dynamic import to avoid SSR errors with browser WebRTC
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const client = new RetellWebClient();

      client.on("call_started", () => {
        setCallStatus("Call active! Speak naturally into your microphone.");
      });

      client.on("call_ended", () => {
        setCallStatus("Call concluded.");
        setIsCalling(false);
        if (onAppointmentBooked) onAppointmentBooked();
      });

      client.on("error", (err: unknown) => {
        console.error("Retell SDK error:", err);
        setRetellError(String(err));
        setIsCalling(false);
      });

      await client.startCall({
        accessToken: data.data.accessToken,
      });
    } catch (err) {
      setRetellError(err instanceof Error ? err.message : String(err));
      setIsCalling(false);
      setCallStatus("");
    }
  };

  // Conversational Simulator Execution
  const handleSendSimulatorMessage = async (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim() || isSimulating) return;

    setUserInput("");
    setIsSimulating(true);

    const newMessages: Message[] = [
      ...simMessages,
      { sender: "caller", text },
    ];
    setSimMessages(newMessages);

    try {
      // Natural language parser & tool dispatcher for simulator
      const lower = text.toLowerCase();

      // Check if asking for cardiology / specialty
      if (lower.includes("cardio") || lower.includes("specialist") || lower.includes("skin") || lower.includes("derma")) {
        const specialty = lower.includes("cardio") ? "Cardiology" : lower.includes("derma") || lower.includes("skin") ? "Dermatology" : undefined;
        
        // Dispatch tool
        const toolRes = await fetch("/api/retell/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "get_doctors",
            args: { specialty },
          }),
        }).then((r) => r.json());

        const docList = toolRes.result?.doctors?.map((d: any) => `${d.name} (${d.specialty})`).join(", ");

        setSimMessages([
          ...newMessages,
          {
            sender: "tool",
            text: `Executed Tool: get_doctors`,
            toolDetails: { name: "get_doctors", args: { specialty }, result: toolRes },
          },
          {
            sender: "agent",
            text: `We have ${docList}. Which doctor or date would you like to check?`,
          },
        ]);
        setIsSimulating(false);
        return;
      }

      // Check if user specifies booking details or availability
      const isBooking = lower.includes("book") || lower.includes("name:") || lower.includes("phone");
      const doctorName = lower.includes("mehta") ? "Dr. Arjun Mehta" : lower.includes("nair") ? "Dr. Priya Nair" : "Dr. Ananya Sharma";
      const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
      const date = dateMatch ? dateMatch[0] : "2026-10-15";

      // Time match (09:00, 11:00, 15:00, etc.)
      const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      const time = timeMatch ? (timeMatch[0].length === 4 ? `0${timeMatch[0]}` : timeMatch[0]) : "09:00";

      // Name & Phone extraction
      const nameMatch = text.match(/name[:\s]+([A-Za-z\s]+?)(?:,|phone|$)/i);
      const patientName = nameMatch ? nameMatch[1].trim() : "Alice Walker";

      const phoneMatch = text.match(/(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{10,14}/);
      const patientPhone = phoneMatch ? phoneMatch[0].trim() : "+15551234567";

      if (isBooking) {
        // Step 1: Check real availability tool first
        const availRes = await fetch("/api/retell/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "check_availability",
            args: { doctor_name: doctorName, date },
          }),
        }).then((r) => r.json());

        // Step 2: Book appointment tool
        const bookRes = await fetch("/api/retell/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "book_appointment",
            args: {
              doctor_name: doctorName,
              date,
              startTime: time,
              patientName,
              patientPhone,
            },
          }),
        }).then((r) => r.json());

        if (bookRes.success) {
          setSimMessages([
            ...newMessages,
            {
              sender: "tool",
              text: `Executed Tool: book_appointment`,
              toolDetails: {
                name: "book_appointment",
                args: { doctorName, date, time, patientName, patientPhone },
                result: bookRes,
              },
            },
            {
              sender: "agent",
              text: `Your appointment with ${doctorName} on ${date} at ${time} is confirmed! Your confirmation code is ${bookRes.result.confirmationCode}. We look forward to seeing you.`,
            },
          ]);
          if (onAppointmentBooked) onAppointmentBooked();
        } else {
          // Booking rejected by database
          const altTimes = bookRes.error?.alternativeSlots?.map((s: any) => s.startTime).join(", ") || "none";
          setSimMessages([
            ...newMessages,
            {
              sender: "tool",
              text: `Executed Tool: book_appointment [REJECTED: ${bookRes.error?.code}]`,
              toolDetails: {
                name: "book_appointment",
                args: { doctorName, date, time },
                error: bookRes.error,
              },
            },
            {
              sender: "agent",
              text: `I'm sorry, that slot at ${time} on ${date} is not available (${bookRes.error?.message}). However, I have openings at ${altTimes}. Would one of those work for you?`,
            },
          ]);
        }
      } else {
        // Simple availability check
        const availRes = await fetch("/api/retell/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "check_availability",
            args: { doctor_name: doctorName, date },
          }),
        }).then((r) => r.json());

        setSimMessages([
          ...newMessages,
          {
            sender: "tool",
            text: `Executed Tool: check_availability`,
            toolDetails: { name: "check_availability", args: { doctorName, date }, result: availRes },
          },
          {
            sender: "agent",
            text: availRes.result?.message || "I checked the schedule for you.",
          },
        ]);
      }
    } catch (err) {
      setSimMessages([
        ...newMessages,
        {
          sender: "agent",
          text: "I encountered an error connecting to our clinic scheduling server. Please try again.",
        },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(RETELL_SYSTEM_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Voice Booking Agent</h2>
              <p className="text-xs text-slate-400">Retell AI WebRTC Voice & Database Integration</p>
            </div>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700/60 flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            {showConfig ? "Hide Agent Spec" : "View Agent Spec & Tools"}
          </button>
        </div>

        {/* Live Call Button Box */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">Browser Voice Call (WebRTC)</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                  Official Retell SDK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Launches real microphone WebRTC conversation with Retell AI voice agent.
              </p>
            </div>

            <button
              onClick={handleStartLiveCall}
              disabled={isCalling}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 transition shadow-lg ${
                isCalling
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500 animate-pulse"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20"
              }`}
            >
              {isCalling ? (
                <>
                  <PhoneOff className="w-4 h-4" />
                  In Call...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Start Live Voice Call
                </>
              )}
            </button>
          </div>

          {callStatus && (
            <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {callStatus}
            </div>
          )}

          {retellError && (
            <div className="mt-3 p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">Live Voice Setup Note: </span>
                  {retellError}
                  <p className="mt-1 text-slate-400">
                    To activate live WebRTC audio, configure <code className="text-amber-300">RETELL_API_KEY</code> and <code className="text-amber-300">RETELL_AGENT_ID</code> in <code className="text-white">.env</code>. You can also test the full conversation and real database tools below using the interactive agent simulator!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Retell Prompt & Schema Drawer (Collapsible) */}
        {showConfig && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Retell AI Agent System Prompt
              </span>
              <button
                onClick={copyPrompt}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 text-[11px]"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPrompt ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
            <pre className="bg-slate-900 p-3 rounded-lg text-slate-300 overflow-x-auto max-h-48 text-[11px] leading-relaxed whitespace-pre-wrap font-mono">
              {RETELL_SYSTEM_PROMPT}
            </pre>

            <div className="mt-3 pt-3 border-t border-slate-800">
              <span className="font-semibold text-white">Registered Retell Tools ({RETELL_TOOL_DEFINITIONS.length}):</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {RETELL_TOOL_DEFINITIONS.map((tool) => (
                  <span
                    key={tool.name}
                    className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px]"
                  >
                    {tool.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Conversational Simulator */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white text-xs">Interactive Voice Agent Simulator</span>
            </div>
            <span className="text-[11px] text-slate-400">Real Backend Tool Execution</span>
          </div>

          {/* Quick Scenario Pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendSimulatorMessage(preset.text)}
                disabled={isSimulating}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition text-left"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 h-52 overflow-y-auto space-y-2.5 text-xs">
            {simMessages.map((msg, idx) => (
              <div key={idx}>
                {msg.sender === "tool" ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[10px] text-cyan-400">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      {msg.text}
                    </div>
                    {msg.toolDetails?.result !== undefined && (
                      <div className="text-slate-400 mt-1 truncate">
                        Result: {JSON.stringify(msg.toolDetails.result)}
                      </div>
                    )}
                    {msg.toolDetails?.error !== undefined && (
                      <div className="text-amber-400 mt-1">
                        Error: {JSON.stringify(msg.toolDetails.error)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex flex-col ${
                      msg.sender === "caller" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      {msg.sender === "caller" ? "Caller" : "CareBook AI"}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-xl max-w-[85%] leading-relaxed ${
                        msg.sender === "caller"
                          ? "bg-cyan-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isSimulating && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Agent checking database & executing tools...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendSimulatorMessage()}
              placeholder="e.g. Book Dr. Sharma on 2026-10-15 at 09:00 for Alice..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleSendSimulatorMessage()}
              disabled={isSimulating || !userInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
