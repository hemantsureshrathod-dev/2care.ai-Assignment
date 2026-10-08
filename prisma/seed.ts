import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seed() {
  console.log("Seeding CareBook AI database...");

  // Clean existing records in correct foreign key order
  await prisma.appointment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.doctor.deleteMany();

  // 1. Create Doctors
  const drAnanya = await prisma.doctor.create({
    data: {
      id: "doc_ananya_sharma",
      name: "Dr. Ananya Sharma",
      specialty: "General Medicine",
      location: "CareBook Central Clinic, Room 101",
      active: true,
    },
  });

  const drArjun = await prisma.doctor.create({
    data: {
      id: "doc_arjun_mehta",
      name: "Dr. Arjun Mehta",
      specialty: "Cardiology",
      location: "CareBook Heart Institute, Suite 204",
      active: true,
    },
  });

  const drPriya = await prisma.doctor.create({
    data: {
      id: "doc_priya_nair",
      name: "Dr. Priya Nair",
      specialty: "Dermatology",
      location: "CareBook Skin & Wellness, Suite 310",
      active: true,
    },
  });

  const drInactive = await prisma.doctor.create({
    data: {
      id: "doc_robert_chen",
      name: "Dr. Robert Chen",
      specialty: "Neurology",
      location: "CareBook Central Clinic, Room 402",
      active: false, // Inactive doctor for boundary tests
    },
  });

  console.log("Seeded 4 doctors (3 active, 1 inactive).");

  // Fixed deterministic test dates
  const fixedDates = ["2026-10-15", "2026-10-16", "2026-10-17"];

  // Also include today + next 3 days formatted as YYYY-MM-DD
  const now = new Date();
  const dynamicDates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    if (!fixedDates.includes(iso) && !dynamicDates.includes(iso)) {
      dynamicDates.push(iso);
    }
  }

  const allDates = [...fixedDates, ...dynamicDates];

  // Seed Slots and Pre-booked Appointments
  for (const date of allDates) {
    // Dr. Ananya Sharma slots
    const slotA1 = await prisma.availabilitySlot.create({
      data: {
        doctorId: drAnanya.id,
        date,
        startTime: "09:00",
        endTime: "09:30",
        status: "AVAILABLE",
      },
    });

    const slotA2 = await prisma.availabilitySlot.create({
      data: {
        doctorId: drAnanya.id,
        date,
        startTime: "10:00",
        endTime: "10:30",
        status: "AVAILABLE",
      },
    });

    const slotA3 = await prisma.availabilitySlot.create({
      data: {
        doctorId: drAnanya.id,
        date,
        startTime: "11:00",
        endTime: "11:30",
        status: "BOOKED", // Deliberately pre-booked
      },
    });

    // Create existing pre-booked appointment for slotA3
    await prisma.appointment.create({
      data: {
        doctorId: drAnanya.id,
        slotId: slotA3.id,
        patientName: "Rahul Verma",
        patientPhone: "+15551234567",
        date,
        startTime: "11:00",
        endTime: "11:30",
        status: "CONFIRMED",
      },
    });

    const slotA4 = await prisma.availabilitySlot.create({
      data: {
        doctorId: drAnanya.id,
        date,
        startTime: "14:00",
        endTime: "14:30",
        status: "AVAILABLE",
      },
    });

    await prisma.availabilitySlot.create({
      data: {
        doctorId: drAnanya.id,
        date,
        startTime: "15:00",
        endTime: "15:30",
        status: "UNAVAILABLE", // Doctor unavailable / clinic closed
      },
    });

    // Dr. Arjun Mehta slots (Cardiology)
    await prisma.availabilitySlot.create({
      data: {
        doctorId: drArjun.id,
        date,
        startTime: "10:00",
        endTime: "10:30",
        status: "AVAILABLE",
      },
    });

    await prisma.availabilitySlot.create({
      data: {
        doctorId: drArjun.id,
        date,
        startTime: "11:00",
        endTime: "11:30",
        status: "AVAILABLE",
      },
    });

    const slotB3 = await prisma.availabilitySlot.create({
      data: {
        doctorId: drArjun.id,
        date,
        startTime: "14:00",
        endTime: "14:30",
        status: "BOOKED",
      },
    });

    await prisma.appointment.create({
      data: {
        doctorId: drArjun.id,
        slotId: slotB3.id,
        patientName: "Meera Patel",
        patientPhone: "+15559876543",
        date,
        startTime: "14:00",
        endTime: "14:30",
        status: "CONFIRMED",
      },
    });

    // Dr. Priya Nair slots (Dermatology)
    await prisma.availabilitySlot.create({
      data: {
        doctorId: drPriya.id,
        date,
        startTime: "11:00",
        endTime: "11:30",
        status: "AVAILABLE",
      },
    });

    await prisma.availabilitySlot.create({
      data: {
        doctorId: drPriya.id,
        date,
        startTime: "14:00",
        endTime: "14:30",
        status: "AVAILABLE",
      },
    });

    await prisma.availabilitySlot.create({
      data: {
        doctorId: drPriya.id,
        date,
        startTime: "16:00",
        endTime: "16:30",
        status: "UNAVAILABLE",
      },
    });
  }

  const slotCount = await prisma.availabilitySlot.count();
  const apptCount = await prisma.appointment.count();
  console.log(`Seeding complete: ${slotCount} slots and ${apptCount} appointments created.`);
}

if (require.main === module || process.argv[1]?.includes("seed")) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
