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
      where: { id: `seed-${room.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${room.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...room,
        requiresApproval: true,
        maxBookingHours: room.type === "ROOM" ? 4 : 24,
        availableFrom: "08:00",
        availableTo: "22:00",
        availableDays: [1, 2, 3, 4, 5],
      },
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
