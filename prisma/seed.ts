import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  const deptElectrical = await prisma.department.upsert({
    where: { slug: "electrical" },
    update: {},
    create: { slug: "electrical", name: "Electrical" },
  });
  const deptBio = await prisma.department.upsert({
    where: { slug: "bio" },
    update: {},
    create: { slug: "bio", name: "Bio" },
  });
  const clubRobotics = await prisma.club.upsert({
    where: { slug: "robotics" },
    update: {},
    create: { slug: "robotics", name: "Robotics" },
  });
  const clubShutterbugs = await prisma.club.upsert({
    where: { slug: "shutterbugs" },
    update: {},
    create: { slug: "shutterbugs", name: "Shutterbugs" },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@campusgrid.edu" },
    update: {},
    create: {
      email: "admin@campusgrid.edu",
      password,
      name: "Super Admin",
      role: "ADMIN",
      department: "Administration",
    },
  });

  const lhc = await prisma.user.upsert({
    where: { email: "lhc@campusgrid.edu" },
    update: {},
    create: {
      email: "lhc@campusgrid.edu",
      password,
      name: "LHC Manager",
      role: "LHC",
      department: "LHC",
    },
  });

  const professor = await prisma.user.upsert({
    where: { email: "professor@campusgrid.edu" },
    update: { departmentId: deptElectrical.id, department: "Electrical" },
    create: {
      email: "professor@campusgrid.edu",
      password,
      name: "Dr. Jane Doe",
      role: "PROFESSOR",
      department: "Electrical",
      departmentId: deptElectrical.id,
    },
  });

  const deptOfficer = await prisma.user.upsert({
    where: { email: "officer@campusgrid.edu" },
    update: { departmentId: deptElectrical.id, department: "Electrical" },
    create: {
      email: "officer@campusgrid.edu",
      password,
      name: "Dr. Smith",
      role: "DEPARTMENT_OFFICER",
      department: "Electrical",
      departmentId: deptElectrical.id,
    },
  });

  const clubAdmin = await prisma.user.upsert({
    where: { email: "clubadmin@campusgrid.edu" },
    update: { clubId: clubRobotics.id, department: "Robotics Club" },
    create: {
      email: "clubadmin@campusgrid.edu",
      password,
      name: "Jane Wilson",
      role: "CLUB_ADMIN",
      department: "Robotics Club",
      clubId: clubRobotics.id,
    },
  });

  const clubShutterbugsManager = await prisma.user.upsert({
    where: { email: "shutterbugs@campusgrid.edu" },
    update: { clubId: clubShutterbugs.id },
    create: {
      email: "shutterbugs@campusgrid.edu",
      password,
      name: "Sam Photo",
      role: "CLUB_MANAGER",
      department: "Shutterbugs Club",
      clubId: clubShutterbugs.id,
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
      rollNumber: "CS2024001",
      department: "Computer Science",
    },
  });

  const rooms = [
    { name: "LHC 101", type: "ROOM" as const, description: "Small lecture room", location: "LHC Ground Floor", capacity: 100, ownerId: lhc.id, maxBookingHours: 4 },
    { name: "LHC 102", type: "ROOM" as const, description: "Small lecture room", location: "LHC Ground Floor", capacity: 100, ownerId: lhc.id, maxBookingHours: 4 },
    { name: "LHC 103", type: "ROOM" as const, description: "Small lecture room", location: "LHC Ground Floor", capacity: 100, ownerId: lhc.id, maxBookingHours: 4 },
    { name: "LHC 104", type: "ROOM" as const, description: "Small lecture room", location: "LHC Ground Floor", capacity: 100, ownerId: lhc.id, maxBookingHours: 4 },
    { name: "LHC 110", type: "ROOM" as const, description: "Big lecture seminar hall", location: "LHC Ground Floor", capacity: 600, ownerId: lhc.id, maxBookingHours: 4 },
    { name: "LHC 308", type: "ROOM" as const, description: "Medium lecture seminar hall", location: "LHC Second Floor", capacity: 300, ownerId: lhc.id, maxBookingHours: 4 },
  ];

  for (const item of rooms) {
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
        availableDays: [1, 2, 3, 4, 5],
      },
    });
  }

  const clubResources = [
    { id: "seed-camera", name: "Camera", type: "EQUIPMENT" as const, description: "DSLR351", location: "Equipment Room, BERMS", ownerId: clubShutterbugsManager.id, clubId: clubShutterbugs.id, maxBookingHours: 24, maxCount: 2 },
    { id: "seed-tripod", name: "Tripod", type: "EQUIPMENT" as const, description: "T335", location: "Equipment Room, BERMS", ownerId: clubShutterbugsManager.id, clubId: clubShutterbugs.id, maxBookingHours: 24, maxCount: 8 },
    { id: "seed-sound-system", name: "Sound System", type: "EQUIPMENT" as const, description: "Sony Bass 2 Speaker System", location: "Equipment Room, BERMS", ownerId: clubShutterbugsManager.id, clubId: clubShutterbugs.id, maxBookingHours: 24, maxCount: 4 },
    { id: "seed-3d-printer", name: "3D Printer", type: "EQUIPMENT" as const, description: "Latest Printer", location: "Robotics Lab", ownerId: clubAdmin.id, clubId: clubRobotics.id, maxBookingHours: 24, maxCount: 2 },
    { id: "seed-raspberry-pi", name: "Raspberry Pi", type: "EQUIPMENT" as const, description: "Latest Circuit", location: "Robotics Lab", ownerId: clubAdmin.id, clubId: clubRobotics.id, maxBookingHours: 24, maxCount: 4 },
    { id: "seed-soldering-kit", name: "Soldering Kit", type: "EQUIPMENT" as const, description: "Portable soldering station", location: "Robotics Lab", ownerId: clubAdmin.id, clubId: clubRobotics.id, maxBookingHours: 12, maxCount: 5 },
    { id: "seed-drone", name: "Drone", type: "EQUIPMENT" as const, description: "Quadcopter for filming", location: "Shutterbugs Store", ownerId: clubShutterbugsManager.id, clubId: clubShutterbugs.id, maxBookingHours: 24, maxCount: 2 },
  ];

  for (const item of clubResources) {
    await prisma.resource.upsert({
      where: { id: item.id },
      update: { clubId: item.clubId, ownerId: item.ownerId, maxCount: item.maxCount },
      create: {
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.description,
        location: item.location,
        capacity: null,
        ownerId: item.ownerId,
        clubId: item.clubId,
        requiresApproval: true,
        maxBookingHours: item.maxBookingHours,
        maxCount: item.maxCount,
        availableFrom: "08:00",
        availableTo: "22:00",
        availableDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
  }

  const deptResources = [
    { id: "seed-oscilloscope", name: "Oscilloscope", type: "EQUIPMENT" as const, description: "Digital oscilloscope", location: "Electrical Lab", ownerId: deptOfficer.id, departmentId: deptElectrical.id, maxBookingHours: 8, maxCount: 4 },
    { id: "seed-multimeter", name: "Multimeter", type: "EQUIPMENT" as const, description: "Digital multimeter", location: "Electrical Lab", ownerId: deptOfficer.id, departmentId: deptElectrical.id, maxBookingHours: 8, maxCount: 10 },
    { id: "seed-power-supply", name: "Power Supply", type: "EQUIPMENT" as const, description: "Variable DC power supply", location: "Electrical Lab", ownerId: deptOfficer.id, departmentId: deptElectrical.id, maxBookingHours: 8, maxCount: 3 },
    { id: "seed-microscope", name: "Microscope", type: "EQUIPMENT" as const, description: "Compound microscope", location: "Bio Lab", ownerId: deptOfficer.id, departmentId: deptBio.id, maxBookingHours: 4, maxCount: 7 },
    { id: "seed-centrifuge", name: "Centrifuge", type: "EQUIPMENT" as const, description: "Lab centrifuge", location: "Bio Lab", ownerId: deptOfficer.id, departmentId: deptBio.id, maxBookingHours: 4, maxCount: 5 },
  ];

  const deptBioOfficer = await prisma.user.upsert({
    where: { email: "bio-officer@campusgrid.edu" },
    update: { departmentId: deptBio.id },
    create: {
      email: "bio-officer@campusgrid.edu",
      password,
      name: "Dr. Bio Officer",
      role: "LAB_TECH",
      department: "Bio",
      departmentId: deptBio.id,
    },
  });

  for (const item of deptResources) {
    const ownerId = item.departmentId === deptBio.id ? deptBioOfficer.id : deptOfficer.id;
    await prisma.resource.upsert({
      where: { id: item.id },
      update: { departmentId: item.departmentId, ownerId, maxCount: item.maxCount },
      create: {
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.description,
        location: item.location,
        capacity: null,
        ownerId,
        departmentId: item.departmentId,
        requiresApproval: true,
        maxBookingHours: item.maxBookingHours,
        maxCount: item.maxCount,
        availableFrom: "08:00",
        availableTo: "22:00",
        availableDays: [1, 2, 3, 4, 5],
      },
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const bookingSeeds = [
    { id: "seed-booking-1", title: "Robotics Club Weekly Meeting", userId: clubAdmin.id, resourceId: "seed-lhc-101", startTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000), endTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000), status: "PENDING" as const },
    { id: "seed-booking-2", title: "Algorithm Study Group", userId: professor.id, resourceId: "seed-lhc-103", startTime: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000), endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000), status: "PENDING" as const },
    { id: "seed-booking-3", title: "Project Presentation Practice", userId: professor.id, resourceId: "seed-lhc-110", startTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000), endTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000), status: "PENDING" as const },
    { id: "seed-booking-4", title: "Equipment Pickup — Camera", userId: student.id, resourceId: "seed-camera", startTime: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000), endTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000), status: "PENDING" as const },
  ];

  for (const b of bookingSeeds) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: { ...b, description: null },
    });
  }

  console.log("Seed completed!");
  console.log("\nDepartments: Electrical (electrical), Bio (bio)");
  console.log("Clubs: Robotics (robotics), Shutterbugs (shutterbugs)");
  console.log("\nTest accounts (all passwords: password123):");
  console.log("  Admin:               admin@campusgrid.edu");
  console.log("  LHC (room approval): lhc@campusgrid.edu");
  console.log("  Professor (Electrical): professor@campusgrid.edu");
  console.log("  Dept Officer (Electrical): officer@campusgrid.edu");
  console.log("  Bio Lab Tech:        bio-officer@campusgrid.edu");
  console.log("  Club Admin (Robotics): clubadmin@campusgrid.edu");
  console.log("  Club Manager (Shutterbugs): shutterbugs@campusgrid.edu");
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
