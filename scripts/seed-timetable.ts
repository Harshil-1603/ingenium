import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOM_IDS: Record<string, string> = {
  "LHC 101": "seed-lhc-101",
  "LHC 102": "seed-lhc-102",
  "LHC 103": "seed-lhc-103",
  "LHC 104": "seed-lhc-104",
  "LHC 110": "seed-lhc-110",
  "LHC 308": "seed-lhc-308",
};

// Day index: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
interface ClassSlot {
  day: number;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  subject: string;
  room: string;
}

const TIMETABLE: ClassSlot[] = [
  // Monday
  { day: 1, startH: 8,  startM: 0, endH: 8,  endM: 50, subject: "K",              room: "LHC 101" },
  { day: 1, startH: 9,  startM: 0, endH: 9,  endM: 50, subject: "MoS",            room: "LHC 102" },
  { day: 1, startH: 10, startM: 0, endH: 10, endM: 50, subject: "Fractal (C1)",   room: "LHC 103" },
  { day: 1, startH: 11, startM: 0, endH: 11, endM: 50, subject: "Fluid",          room: "LHC 104" },
  // Tuesday
  { day: 2, startH: 8,  startM: 0, endH: 8,  endM: 50, subject: "N",              room: "LHC 101" },
  { day: 2, startH: 9,  startM: 0, endH: 9,  endM: 50, subject: "MoS",            room: "LHC 102" },
  { day: 2, startH: 10, startM: 0, endH: 10, endM: 50, subject: "DSA",            room: "LHC 110" },
  { day: 2, startH: 11, startM: 0, endH: 11, endM: 50, subject: "SnS",            room: "LHC 103" },
  { day: 2, startH: 13, startM: 0, endH: 14, endM: 50, subject: "Lab Block",      room: "LHC 308" },
  // Wednesday
  { day: 3, startH: 8,  startM: 0, endH: 8,  endM: 50, subject: "K",              room: "LHC 101" },
  { day: 3, startH: 9,  startM: 0, endH: 9,  endM: 50, subject: "DSA",            room: "LHC 110" },
  { day: 3, startH: 10, startM: 0, endH: 10, endM: 50, subject: "Fractal (C1)",   room: "LHC 103" },
  { day: 3, startH: 11, startM: 0, endH: 11, endM: 50, subject: "Fluid",          room: "LHC 104" },
  { day: 3, startH: 13, startM: 0, endH: 14, endM: 50, subject: "DSA (Extended)", room: "LHC 110" },
  { day: 3, startH: 17, startM: 0, endH: 17, endM: 50, subject: "Slot Activity",  room: "LHC 308" },
  // Thursday
  { day: 4, startH: 8,  startM: 0, endH: 8,  endM: 50, subject: "N",              room: "LHC 101" },
  { day: 4, startH: 9,  startM: 0, endH: 9,  endM: 50, subject: "MoS",            room: "LHC 102" },
  { day: 4, startH: 10, startM: 0, endH: 10, endM: 50, subject: "Fractal (C1)",   room: "LHC 103" },
  { day: 4, startH: 11, startM: 0, endH: 11, endM: 50, subject: "SnS",            room: "LHC 104" },
  // Friday
  { day: 5, startH: 8,  startM: 0, endH: 8,  endM: 50, subject: "K",              room: "LHC 101" },
  { day: 5, startH: 9,  startM: 0, endH: 9,  endM: 50, subject: "DSA",            room: "LHC 110" },
  { day: 5, startH: 10, startM: 0, endH: 10, endM: 50, subject: "Fluid",          room: "LHC 104" },
  { day: 5, startH: 11, startM: 0, endH: 11, endM: 50, subject: "SnS",            room: "LHC 103" },
  { day: 5, startH: 17, startM: 0, endH: 17, endM: 50, subject: "N",              room: "LHC 102" },
];

function getNextNWeekDates(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((currentDay + 6) % 7));

  const mondays: Date[] = [];
  for (let w = 0; w < n; w++) {
    const m = new Date(monday);
    m.setDate(monday.getDate() + w * 7);
    mondays.push(m);
  }
  return mondays;
}

async function main() {
  const lhcUser = await prisma.user.findFirst({ where: { role: "LHC" } });
  if (!lhcUser) {
    console.error("No LHC user found. Run db:seed first.");
    process.exit(1);
  }

  // Delete old timetable bookings
  const deleted = await prisma.booking.deleteMany({
    where: { id: { startsWith: "tt-" } },
  });
  console.log(`Cleared ${deleted.count} old timetable bookings.`);

  const weeks = getNextNWeekDates(4); // seed 4 weeks: current + next 3
  let created = 0;
  const clashes: string[] = [];

  for (const weekMonday of weeks) {
    for (const slot of TIMETABLE) {
      const roomId = ROOM_IDS[slot.room];
      if (!roomId) {
        console.warn(`Unknown room: ${slot.room}`);
        continue;
      }

      const slotDate = new Date(weekMonday);
      slotDate.setDate(weekMonday.getDate() + (slot.day - 1));

      const startTime = new Date(slotDate);
      startTime.setHours(slot.startH, slot.startM, 0, 0);

      const endTime = new Date(slotDate);
      endTime.setHours(slot.endH, slot.endM, 0, 0);

      // Check for clashes with non-timetable bookings
      const overlap = await prisma.booking.count({
        where: {
          resourceId: roomId,
          id: { not: { startsWith: "tt-" } },
          status: { in: ["PENDING", "APPROVED"] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (overlap > 0) {
        const dateStr = slotDate.toISOString().split("T")[0];
        clashes.push(
          `  CLASH: ${slot.subject} @ ${slot.room} on ${dateStr} ${slot.startH}:${String(slot.startM).padStart(2, "0")}–${slot.endH}:${String(slot.endM).padStart(2, "0")} (${overlap} existing booking(s) — skipped)`
        );
        continue;
      }

      const dateStr = slotDate.toISOString().split("T")[0].replace(/-/g, "");
      const bookingId = `tt-${roomId}-${dateStr}-${slot.startH}${String(slot.startM).padStart(2, "0")}`;

      await prisma.booking.upsert({
        where: { id: bookingId },
        update: {
          title: slot.subject,
          startTime,
          endTime,
          status: "APPROVED",
        },
        create: {
          id: bookingId,
          title: slot.subject,
          description: `Scheduled class: ${slot.subject}`,
          resourceId: roomId,
          userId: lhcUser.id,
          startTime,
          endTime,
          status: "APPROVED",
        },
      });
      created++;
    }
  }

  console.log(`\nCreated/updated ${created} timetable bookings across ${weeks.length} weeks.`);
  if (clashes.length > 0) {
    console.log(`\n${clashes.length} clash(es) detected and skipped:`);
    clashes.forEach((c) => console.log(c));
  } else {
    console.log("No clashes detected.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
