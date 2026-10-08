# CareBook AI — Engineering Design Decisions & Defense Document

This document records the foundational architectural decisions, tradeoffs, security boundaries, and engineering justifications behind **CareBook AI**. It is prepared specifically for technical defense and reviewer evaluation.

---

## 1. Why Retell AI?
* **Low-Latency Conversational Audio:** Retell AI is purpose-built for real-time human voice interactions. Its ultra-low latency audio pipeline (<800ms time-to-first-word) and built-in turn-taking / interruption handling make it far superior to general text chat models paired with ad-hoc TTS/STT wrappers.
* **Server-Side Function Invocation (Custom Tools):** Retell supports declarative custom tool definitions executed as webhook calls against our trusted Next.js backend, allowing strict parameter validation before any state mutation occurs.
* **Separation of Voice Media vs. Business Logic:** Retell manages WebRTC voice streams and telephony signaling, while our application maintains 100% control over database integrity, doctor scheduling, and concurrency locks.

---

## 2. Why PostgreSQL (Neon Cloud PostgreSQL)?
* **Relational ACID Consistency:** Appointment scheduling is inherently relational—doctors have availability slots, slots map to appointments, and patients hold reservations. Neon PostgreSQL provides real relational foreign key constraints, atomic multi-row updates, and row-level locking.
* **Serverless Scale with Connection Pooling:** Neon provides serverless PostgreSQL with built-in connection pooling (`-pooler.c-7.us-east-2.aws.neon.tech`), handling bursty concurrent calls from voice agents without exhausting database socket limits.
* **Production Schema Enforcement:** Defined in `prisma/schema.prisma` with native PostgreSQL enums (`SlotStatus`, `AppointmentStatus`), foreign keys, and indexes. (A fallback schema is archived in `prisma/schema.sqlite.prisma` purely for disconnected offline development).

---

## 3. Why Server-Side Tools?
* **Zero Client Secret Exposure:** The browser or external voice clients never communicate with internal databases or possess privileged API credentials.
* **Centralized Authorization & Sanitization:** All incoming tool invocations pass through server-side Zod validation, verifying date formats (`YYYY-MM-DD`), 24-hour time ranges (`HH:mm`), and phone numbers before querying the persistence layer.
* **Auditability & Observability:** Every tool call generates structured logs, enabling immediate debugging and audit trails for compliance.

---

## 4. Why Availability is Database-Backed (Anti-Hallucination)
* **The Core Vulnerability of LLMs:** LLMs operate on statistical token probability. Left to themselves, an agent will cheerfully promise a patient an appointment at 3:00 AM on a Sunday with a doctor who does not work there.
* **Architectural Invariant:** The Retell system prompt explicitly forbids the model from proposing any slot not returned by the `check_availability` tool. The agent possesses zero internal memory of doctor schedules; schedules are solely read dynamically from verified database records.
* **Pre-Booking Verification:** Even if the voice agent offers a valid slot, the backend re-verifies that the slot has not been claimed before creating the appointment.

---

## 5. How Double-Booking is Prevented
Double-booking is prevented using **two-tier transactional isolation**:
1. **Pessimistic Re-Check in Atomic Transaction:**
   ```typescript
   await prisma.$transaction(async (tx) => {
     const currentSlot = await tx.availabilitySlot.findUnique({ where: { id: slotId } });
     if (!currentSlot || currentSlot.status !== "AVAILABLE") {
       throw new Error("RACE_CONDITION_SLOT_TAKEN");
     }
     await tx.availabilitySlot.update({ where: { id: slotId }, data: { status: "BOOKED" } });
     return await tx.appointment.create({ ... });
   });
   ```
2. **Relational Constraints:**
   The `Appointment` entity enforces a unique constraint on `slotId` (`@unique`), and `AvailabilitySlot` enforces a unique constraint on `[doctorId, date, startTime]`. Even under extreme database concurrency, a duplicate insert will throw a unique constraint violation rather than corrupt clinic state.

---

## 6. Why the Agent Cannot Directly Manipulate the Database
* **Principle of Least Privilege:** An LLM should never receive direct database connection credentials (e.g. raw SQL or Prisma client access).
* **Malicious or Erratic Input Mitigation:** Prompt injection attacks, accidental token drift, or audio transcription artifacts (e.g. mishearing "cancel" as "confirm") cannot execute unauthorized database deletes or updates.
* **Controlled API Surface:** The agent can only call predefined, strongly-typed tools (`get_doctors`, `check_availability`, `book_appointment`). Each tool validates preconditions and returns predictable responses.

---

## 7. Why Evaluation Uses Objective Assertions Rather Than Solely an LLM Judge
* **Non-Determinism of LLM Judges:** Using an LLM to evaluate another LLM introduces subjectivity, temperature variance, and prompt sensitivity.
* **Concrete Health Informatics Ground Truth:** In healthcare booking, an appointment is either booked in the database or it is not. A slot is either marked `BOOKED` or it is corrupted.
* **Deterministic Verification Pipeline:** Our evaluation harness verifies:
  1. Did the agent invoke the correct tool?
  2. Were the arguments properly formatted?
  3. Did the database persist the exact appointment record?
  4. Was the slot status updated atomically?
  5. Was hallucinated availability prevented?
* This yields reproducible, measurable metrics (e.g., 100% pass rate across 20 scenarios) that can run in any standard CI pipeline in under 5 seconds.

---

## 8. Where LLM Judgment is Useful vs. Where It is Dangerous
* **Useful For:**
  * Measuring conversational empathy, natural pacing, and warmth.
  * Detecting if an explanation of an unavailable slot sounded polite rather than robotic.
  * Analyzing linguistic sentiment of the caller.
* **Dangerous For:**
  * Verifying database transactions and consistency.
  * Ensuring zero double-booking.
  * Assessing HIPAA / PII compliance and slot availability.
  * Any safety-critical decision where a false positive can lead to medical liability.

---

## 9. What Would Change for High-Scale Enterprise Production?
1. **SMS & Email Confirmation Pipeline:** Dispatch instant Twilio SMS confirmations with calendar `.ics` invites upon successful transaction commit.
2. **Redis Distributed Locks / Row-Level Locks:** For clinic networks with tens of thousands of simultaneous callers, use Redis distributed redlocks or PostgreSQL `SELECT ... FOR UPDATE` row locks to minimize transaction rollback overhead.
3. **HIPAA / BAA & PII Anonymization:** Implement end-to-end voice redaction for PHI (Protected Health Information), encrypted at rest with AWS KMS / GCP Cloud KMS, with signed Business Associate Agreements (BAAs) from Retell AI and hosting providers.
4. **EHR / EMR Integration:** Integrate standard HL7 / FHIR APIs (Epic, Cerner, AthenaHealth) for real-time clinic master schedules instead of standalone tables.
5. **Caller Authentication:** Caller phone number lookup to pre-populate verified patient charts and prevent spoofing.
