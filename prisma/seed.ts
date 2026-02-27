import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@campusgrid.edu" },
    update: {},
    create: {
      email: "admin@campusgrid.edu",
      password,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      department: "Administration",
    },
  });

  const deptOfficer = await prisma.user.upsert({
    where: { email: "officer@campusgrid.edu" },
    update: {},
    create: {
      email: "officer@campusgrid.edu",
      password,
      name: "Dr. Smith",
      role: "DEPARTMENT_OFFICER",
      department: "Computer Science",
    },
  });

  const clubAdmin = await prisma.user.upsert({
    where: { email: "clubadmin@campusgrid.edu" },
    update: {},
    create: {
      email: "clubadmin@campusgrid.edu",
      password,
      name: "Jane Wilson",
      role: "CLUB_ADMIN",
      department: "Technical Club",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@campusgrid.edu" },
    update: {},
    create: {
      email: "student@campusgrid.edu",
      password,
      name: "Alex Johnson",
      role: "STUDENT",
      department: "Computer Science",
    },
  });

  const rooms = [
    {
      name: "LHC 101",
      type: "ROOM" as const,
      description: "Small lecture room",
      location: "LHC Ground Floor",
      capacity: 100,
      ownerId: deptOfficer.id,
      maxBookingHours: 4,
    },
    {
      name: "LHC 102",
      type: "ROOM" as const,
      description: "Small lecture room",
      location: "LHC Ground Floor",
      capacity: 100,
      ownerId: deptOfficer.id,
      maxBookingHours: 4,
    },
    {
      name: "LHC 103",
      type: "ROOM" as const,
      description: "Small lecture room",
      location: "LHC Ground Floor",
      capacity: 100,
      ownerId: deptOfficer.id,
      maxBookingHours: 4,
    },
    {
      name: "LHC 104",
      type: "ROOM" as const,
      description: "Small lecture room",
      location: "LHC Ground Floor",
      capacity: 100,
      ownerId: deptOfficer.id,
      maxBookingHours: 4,
    },
    {
      name: "LHC 110",
      type: "ROOM" as const,
      description: "Big lecture seminar hall",
      location: "LHC Ground Floor",
      capacity: 600,
      ownerId: deptOfficer.id,
      maxBookingHours: 4,
    },
    {
      name: "LHC 308",
      type: "ROOM" as const,
      description: "Medium lecture seminar hall",
      location: "LHC Second Floor",
      capacity: 300,
      ownerId: deptOfficer.id,
      maxBookingHours: 4,
    },
  ];

  const resources = [
    {
      name: "Camera",
      type: "EQUIPMENT" as const,
      description: "DSLR351 — Equipment item",
      location: "Equipment Room, BERMS",
      capacity: null,
      ownerId: clubAdmin.id,
      maxBookingHours: 24,
    },
    {
      name: "Tripod",
      type: "EQUIPMENT" as const,
      description: "T335 — Equipment item",
      location: "Equipment Room, BERMS",
      capacity: null,
      ownerId: clubAdmin.id,
      maxBookingHours: 24,
    },
    {
      name: "Sound System",
      type: "EQUIPMENT" as const,
      description: "Sony Bass 2 Speaker System — Equipment item",
      location: "Equipment Room, BERMS",
      capacity: null,
      ownerId: clubAdmin.id,
      maxBookingHours: 24,
    },
    {
      name: "3D Printer",
      type: "EQUIPMENT" as const,
      description: "Latest Printer — Equipment item",
      location: "Equipment Room, BERMS",
      capacity: null,
      ownerId: clubAdmin.id,
      maxBookingHours: 24,
    },
    {
      name: "Raspberry Pi",
      type: "EQUIPMENT" as const,
      description: "Latest Circuit — Equipment item",
      location: "Equipment Room, BERMS",
      capacity: null,
      ownerId: clubAdmin.id,
      maxBookingHours: 24,
    },
  ];

  const allItems = [...rooms, ...resources];

  for (const item of allItems) {
    const id = `seed-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;
    await prisma.resource.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: item.name,
        type: item.type,
        description: item.description,
        location: item.location,
        capacity: item.capacity,
        ownerId: item.ownerId,
        requiresApproval: true,
        maxBookingHours: item.maxBookingHours,
        availableFrom: "08:00",
        availableTo: "22:00",
        availableDays: item.type === "ROOM" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
      },
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const bookingSeeds = [
    {
      id: "seed-booking-1",
      title: "CS Club Weekly Meeting",
      description: "Weekly team sync for the CS club",
      userId: clubAdmin.id,
      resourceId: "seed-lhc-101",
      startTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "seed-booking-2",
      title: "Algorithm Study Group",
      description: "Final exam prep session",
      userId: student.id,
      resourceId: "seed-lhc-103",
      startTime: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "seed-booking-3",
      title: "Project Presentation Practice",
      description: "Dry run for semester project demo",
      userId: student.id,
      resourceId: "seed-lhc-110",
      startTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "seed-booking-4",
      title: "Equipment Pickup — Camera",
      description: "Collecting camera for the hackathon event",
      userId: clubAdmin.id,
      resourceId: "seed-camera",
      startTime: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
  ];

  for (const b of bookingSeeds) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: b,
    });
  }

  console.log("Seed completed!");
  console.log("\nTest accounts (all passwords: password123):");
  console.log("  Super Admin:         admin@campusgrid.edu");
  console.log("  Department Officer:  officer@campusgrid.edu");
  console.log("  Club Admin:          clubadmin@campusgrid.edu");
  console.log("  Student:             student@campusgrid.edu");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
