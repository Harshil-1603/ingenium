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
      name: "LHC Room 101",
      type: "ROOM" as const,
      description: "Large lecture hall with projector and AC",
      location: "Lecture Hall Complex, Ground Floor",
      capacity: 120,
      ownerId: deptOfficer.id,
    },
    {
      name: "LHC Room 202",
      type: "ROOM" as const,
      description: "Medium-sized seminar room",
      location: "Lecture Hall Complex, 2nd Floor",
      capacity: 60,
      ownerId: deptOfficer.id,
    },
    {
      name: "CS Lab A",
      type: "ROOM" as const,
      description: "Computer lab with 40 workstations",
      location: "CS Building, Ground Floor",
      capacity: 40,
      ownerId: deptOfficer.id,
    },
    {
      name: "Conference Room B",
      type: "ROOM" as const,
      description: "Small meeting room with video conferencing",
      location: "Admin Block, 3rd Floor",
      capacity: 15,
      ownerId: admin.id,
    },
    {
      name: "Projector Unit #1",
      type: "EQUIPMENT" as const,
      description: "Portable projector with HDMI and VGA",
      location: "Equipment Store, Ground Floor",
      capacity: null,
      ownerId: clubAdmin.id,
    },
    {
      name: "Sound System Kit",
      type: "EQUIPMENT" as const,
      description: "Portable PA system with 2 wireless mics",
      location: "Equipment Store, Ground Floor",
      capacity: null,
      ownerId: clubAdmin.id,
    },
    {
      name: "Open Auditorium",
      type: "ASSET" as const,
      description: "Outdoor auditorium for events and gatherings",
      location: "Central Campus",
      capacity: 500,
      ownerId: admin.id,
    },
  ];

  for (const room of rooms) {
    await prisma.resource.upsert({
      where: { id: `seed-${room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}` },
      update: {},
      create: {
        id: `seed-${room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`,
        ...room,
        requiresApproval: true,
        maxBookingHours: room.type === "ROOM" ? 4 : 24,
        availableFrom: "08:00",
        availableTo: "22:00",
        availableDays: room.type === "ROOM" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
      },
    });
  }

  // Sample pending bookings so the Approvals tab is populated from the start
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const bookingSeeds = [
    {
      id: "seed-booking-1",
      title: "CS Club Weekly Meeting",
      description: "Weekly team sync for the CS club",
      userId: clubAdmin.id,
      resourceId: "seed-lhc-room-101",
      startTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "seed-booking-2",
      title: "Algorithm Study Group",
      description: "Final exam prep session",
      userId: student.id,
      resourceId: "seed-cs-lab-a",
      startTime: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "seed-booking-3",
      title: "Project Presentation Practice",
      description: "Dry run for semester project demo",
      userId: student.id,
      resourceId: "seed-conference-room-b",
      startTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "seed-booking-4",
      title: "Hackathon Equipment Pickup",
      description: "Collecting projector for the hackathon event",
      userId: clubAdmin.id,
      resourceId: "seed-projector-unit-1",
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
