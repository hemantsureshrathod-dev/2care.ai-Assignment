# CareBook AI — Voice-First Healthcare Appointment Scheduling Assistant

> **2Care Applied AI Engineer Internship — Take-Home Assignment Submission**  
> Complete implementation of **Part A** (Retell Voice Agent + Real Availability Database) and **Part B** (Automated Evaluation Harness with 20 Scenarios).  
> **Primary Runtime Database:** Neon PostgreSQL (Cloud-hosted serverless PostgreSQL)

[![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL-00E599)](#)
[![Evaluations](https://img.shields.io/badge/Agent%20Evals-20%2F20%20Passed%20(100%25)-purple)](#)
[![Tests](https://img.shields.io/badge/Unit%20Tests-10%2F10%20Passed-emerald)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black)](#)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-blue)](#)
[![Retell SDK](https://img.shields.io/badge/Voice-Retell%20AI%20SDK-cyan)](#)

---

## 1. Assignment Overview

CareBook AI is a production-grade, voice-enabled healthcare appointment scheduling system designed to eliminate hallucinated doctor availability and prevent double-booking.

### Part A: Voice Booking Agent Connected to Real Neon Availability
* **Primary Runtime Database:** Connected to **Neon PostgreSQL** via Prisma.
* **Voice Pipeline:** Powered by Retell AI with real-time WebRTC audio streams and low-latency turn-taking.
* **Real Backend Availability:** The agent queries active clinic schedules directly from the Neon PostgreSQL database via server-side custom functions (`get_doctors`, `check_availability`, `book_appointment`).
* **Zero-Hallucination Invariant:** Doctor availability is never invented by the LLM. Slots are strictly retrieved and verified against live Neon database records.
* **Transactional Booking:** Atomic database transactions (`prisma.$transaction`) guarantee race-condition protection and immediate slot status synchronization.

### Part B: Automated Evaluation Harness
* **20 Realistic Scenarios:** Testing successful bookings, doctor resolutions, unavailable slots, pre-booked slots, concurrency race conditions, malformed inputs, medical advice guardrails, and anti-hallucination boundary checks.
* **Objective Assertions:** Evaluates tool call correctness, input argument validation, database row mutations, and slot status transitions.
* **Measurable Metrics:** Automatically outputs a detailed CLI report, machine-readable `eval-results.json`, and an interactive UI status card with a **100% pass rate**.

---

## 2. Architecture

```mermaid
flowchart TD
    subgraph Client Layer
        Caller[Caller / Patient Phone or Browser]
        UI[CareBook Next.js Dashboard]
    end

    subgraph Voice Engine [Retell AI Platform]
        WebRTC[Retell WebRTC Audio Pipeline]
        AgentLLM[Retell Voice Agent LLM]
    end

    subgraph Backend Layer [Next.js App Router]
        WebCallRoute["/api/retell/create-web-call"]
        ToolsRoute["/api/retell/tools (Public Tunnel)"]
        DomainService["Booking & Availability Service Layer"]
        Zod["Zod Validation & Guardrails"]
    end

    subgraph Data Layer [Relational Persistence]
        Prisma["Prisma ORM ($transaction)"]
        DB[(Neon PostgreSQL Database)]
    end

    Caller <-->|Audio Stream| WebRTC
    WebRTC <--> AgentLLM
    UI -->|Start Web Call| WebCallRoute
    WebCallRoute -->|Issue Ephemeral Token| RetellAI
    AgentLLM -->|Tool Webhooks| ToolsRoute
    ToolsRoute --> Zod
    Zod --> DomainService
    DomainService <-->|ACID Transaction| Prisma
    Prisma <--> DB
```

---

## 3. Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Primary Database** | **Neon PostgreSQL** | Serverless relational cloud database with connection pooling, native enums, and ACID transactions |
| **ORM** | Prisma 6.19 | Relational models, schema migrations, and atomic `$transaction` blocks |
| **Framework** | Next.js 16 (App Router) | Server-side execution, route handlers, zero client secret exposure |
| **Language** | TypeScript (Strict mode) | Type safety across tool parameters, database entities, and evals |
| **Styling** | Tailwind CSS v4 | High-performance modern UI with glassmorphism and real-time state |
| **Voice Engine** | Retell AI (`retell-sdk` & `retell-client-js-sdk`) | Official SDKs for ephemeral WebRTC token minting and tool webhook handling |
| **Validation** | Zod 4 | Strict runtime schema enforcement for ISO dates, 24-hr times, and phone numbers |
| **Testing** | Vitest 5 | Unit and integration testing with isolated database seeding |
| **Evaluation** | Custom TypeScript Harness (`/evals`) | Deterministic scenario runner outputting structured audit metrics |

---

## 4. Database Schema (Neon PostgreSQL)

The database schema (`prisma/schema.prisma`) is deployed to Neon PostgreSQL with native enums and composite indexes:

```mermaid
erDiagram
    Doctor ||--o{ AvailabilitySlot : "offers"
    Doctor ||--o{ Appointment : "attends"
    AvailabilitySlot ||--o| Appointment : "booked_by"

    Doctor {
        string id PK
        string name
        string specialty
        string location
        boolean active
        datetime createdAt
    }

    AvailabilitySlot {
        string id PK
        string doctorId FK
        string date "YYYY-MM-DD"
        string startTime "HH:mm"
        string endTime "HH:mm"
        SlotStatus status "AVAILABLE | BOOKED | UNAVAILABLE"
        datetime createdAt
    }

    Appointment {
        string id PK
        string doctorId FK
        string slotId FK, UK
        string patientName
        string patientPhone
        string date "YYYY-MM-DD"
        string startTime "HH:mm"
        string endTime "HH:mm"
        AppointmentStatus status "CONFIRMED | CANCELLED"
        datetime createdAt
    }
```

*(Note: `prisma/schema.sqlite.prisma` is preserved strictly as an offline fallback schema).*

---

## 5. Voice Agent Integration & Zero-Hallucination Invariant

### Registered Retell Tools
1. **`get_doctors`**:
   * *Purpose:* Queries active doctors by medical specialty or returns the complete directory.
   * *Arguments:* `{ specialty?: string }`
2. **`check_availability`**:
   * *Purpose:* Fetches real database slots for a doctor on a specific date (`YYYY-MM-DD`).
   * *Arguments:* `{ doctorId: string, date: string }`
3. **`book_appointment`**:
   * *Purpose:* Atomically books an appointment after validating all parameters and re-checking slot availability in Neon.
   * *Arguments:* `{ doctorId: string, date: string, startTime: string, patientName: string, patientPhone: string }`

### Anti-Hallucination Architecture
The agent system prompt (`lib/retell/agent-config.ts`) establishes non-negotiable operational boundaries:
1. The agent has **no internal memory** of doctor schedules; it must call `check_availability` before suggesting any appointment times.
2. The agent is **strictly prohibited** from offering times outside of the array returned by `check_availability`.
3. If an appointment cannot be booked (e.g., slot claimed or doctor unavailable), the backend returns structured alternative slots, and the agent offers them naturally.
4. If a caller asks for medical advice or diagnosis, the agent refuses and directs them to emergency services.

---

## 6. Booking Safety & Concurrency Protection

CareBook AI enforces **two-tier transactional safety**:

1. **Pre-Validation:** Zod schemas validate phone format, ISO date format, and 24-hour time ranges.
2. **Atomic Database Transaction:**
   ```typescript
   await prisma.$transaction(async (tx) => {
     const currentSlot = await tx.availabilitySlot.findUnique({ where: { id: slot.id } });
     if (!currentSlot || currentSlot.status !== "AVAILABLE") {
       throw new Error("RACE_CONDITION_SLOT_TAKEN");
     }
     await tx.availabilitySlot.update({ where: { id: currentSlot.id }, data: { status: "BOOKED" } });
     return await tx.appointment.create({ ... });
   }, { maxWait: 15000, timeout: 30000 });
   ```
3. **Double-Booking Guarantee:** The `Appointment.slotId` field has a unique constraint. If two patients attempt to book the exact same slot concurrently, the transaction rolls back for the second caller, marks the slot as claimed, and offers alternative open slots.

---

## 7. Evaluation Harness (Part B)

The evaluation harness in `/evals` tests the system objectively against 20 comprehensive scenarios:

| ID | Scenario Name | Category | Objective Verification |
| :--- | :--- | :--- | :--- |
| **SCENARIO_01** | Standard End-to-End Booking | Booking Success | Neon DB appointment persisted, slot marked `BOOKED`, code generated |
| **SCENARIO_02** | Doctor Resolution by Surname | Doctor Resolution | Resolves "Dr. Mehta" to `doc_arjun_mehta` and queries real slots |
| **SCENARIO_03** | Specialty Search (Cardiology) | Doctor Resolution | Filters directory to Cardiology department |
| **SCENARIO_04** | Available Slot Verification | Availability Safety | Returns confirmed database slots |
| **SCENARIO_05** | Requested Unavailable Slot | Availability Safety | Correctly rejects slot marked `UNAVAILABLE` (doctor rounds) |
| **SCENARIO_06** | Alternative Slot Selection | Booking Success | Caller selects offered alternative slot (14:00) and completes booking |
| **SCENARIO_07** | Unknown Doctor Rejection | Doctor Resolution | Rejects "Dr. Gregory House" with 404 error |
| **SCENARIO_08** | Ambiguous Date Handling | Validation | Rejects non-ISO date string ("next week") |
| **SCENARIO_09** | Missing Patient Name | Validation | Zod rejects empty patient name |
| **SCENARIO_10** | Missing Contact Phone | Validation | Zod rejects empty contact phone |
| **SCENARIO_11** | Invalid Time Range (25:99) | Validation | Rejects out-of-bounds time string |
| **SCENARIO_12** | Already Booked Slot | Availability Safety | Rejects slot pre-booked in seed data (11:00 for Rahul Verma) |
| **SCENARIO_13** | Concurrency Race Condition | Concurrency | Fires 2 simultaneous requests; exactly 1 succeeds, 1 rejected |
| **SCENARIO_14** | Inactive Doctor Rejection | Validation | Rejects booking for inactive doctor |
| **SCENARIO_15** | Non-Existent Slot (03:00 AM) | Hallucination Prevention | Verifies agent refuses to book or fabricate off-hours slot |
| **SCENARIO_16** | Caller Changes Mind | Booking Success | Switches from 10:00 to 11:00 and books successfully |
| **SCENARIO_17** | Outside Clinic Operating Hours | Validation | Rejects 22:30 night slot |
| **SCENARIO_18** | Medical Advice Guardrail | Clinical Scope | Rejects emergency/prescription advice and redirects to clinic visit |
| **SCENARIO_19** | Specialty-Filtered Search | Doctor Resolution | Filters doctors by Dermatology |
| **SCENARIO_20** | Switching Doctors Mid-Call | Booking Success | Switches from General Medicine to Dr. Arjun Mehta and books |

---

## 8. Local Setup & Quickstart

Clone the repository and run:

```bash
# 1. Install dependencies
npm install

# 2. Synchronize Neon PostgreSQL Schema
npm run db:push
npm run db:generate

# 3. Seed deterministic demo data into Neon
npm run seed

# 4. Start local development server
npm run dev
```

Visit `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

---

## 9. Environment Variables

Create `.env` using `.env.example`:

```env
DATABASE_URL=postgresql://neondb_owner:***@ep-quiet-hall-b5z1yqha-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require
RETELL_API_KEY=your_retell_api_key_here
RETELL_AGENT_ID=your_retell_agent_id_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Retell AI Setup & Webhook Tunnel

### Option A: One-Command Automated Setup
With your `RETELL_API_KEY` set in `.env` (or passed as argument), run:
```bash
npx tsx scripts/setup-retell-agent.ts
```
This automatically:
1. Creates the CareBook Retell LLM Response Engine with the prompt from `lib/retell/agent-config.ts`.
2. Registers all 3 tools (`get_doctors`, `check_availability`, `book_appointment`) pointing to your live public webhook URL.
3. Creates the Voice Agent and automatically updates `.env` with `RETELL_AGENT_ID`.
4. Tests creating an ephemeral WebRTC web call session.

### Option B: Manual Retell Dashboard Setup
1. Log in to [beta.retellai.com](https://beta.retellai.com/).
2. Under **Agents**, click **Create Agent** -> Choose **Retell LLM**.
3. In **System Prompt**, paste the prompt from `lib/retell/agent-config.ts`.
4. Under **Custom Functions**, register the 3 tools with your public tunnel URL:
   `https://beige-spoons-shake.loca.lt/api/retell/tools`
5. Copy the Agent ID to `RETELL_AGENT_ID` in `.env`.

---

## 11. Running Automated Evaluations & Tests

### Run Agent Evaluation Harness (Part B)
```bash
npm run eval
```
* Colorized terminal audit table
* **20/20 scenarios passed (100% pass rate)** against Neon PostgreSQL
* Saves `eval-results.json`

### Run Unit & Integration Tests
```bash
npm test
```
* 10/10 Vitest tests passed with isolated database execution.

### Run Production Build
```bash
npm run build
```

---

## 12. 60-Second Reviewer Demo Flow

1. **Open Dashboard:** Navigate to `http://localhost:3001` (or `http://localhost:3000`).
2. **Inspect Clinic Availability in Neon:** Review the slots for **Dr. Ananya Sharma** on `2026-10-15`. Notice that `09:00` and `10:00` are **AVAILABLE**, `11:00` is **BOOKED** (pre-booked for Rahul Verma), and `15:00` is **UNAVAILABLE** (hospital rounds).
3. **Interact with the Voice Agent / Simulator:**
   * In the *Voice Booking Agent* card, click the preset: **"Book Dr. Sharma at 09:00 (Available)"** (or use the live voice call button).
   * Notice the agent executes `check_availability`, calls `book_appointment`, and confirms the visit with a code (`CB-XXXXXX`).
4. **Observe Instant Database Synchronization in Neon:** Look at the **Recent Confirmed Appointments** table; the new booking appears immediately with patient details and confirmation code. In the Availability Grid, the `09:00` slot changes to **BOOKED**.
5. **Verify Double-Booking Prevention:** Attempt to book `09:00` again. The system rejects the transaction and offers open alternative slots.
6. **Run Evaluation Suite:** Click **Re-Run Evaluation Suite** on the dashboard or run `npm run eval` in your terminal to see all 20 scenarios pass with 100% accuracy.
