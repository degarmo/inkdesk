import { hash } from "bcryptjs";
import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TZ = "America/Los_Angeles";

function at(dayOffset: number, time: string) {
  const day = format(addDays(new Date(), dayOffset), "yyyy-MM-dd");
  return fromZonedTime(`${day}T${time}:00`, TZ);
}

async function main() {
  await prisma.sessionNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();

  const shop = await prisma.shop.create({
    data: {
      name: "Blackbird Ink",
      timezone: TZ,
      hoursOpen: "11:00",
      hoursClose: "20:00",
    },
  });

  await prisma.user.create({
    data: {
      email: "demo@blackbird.ink",
      name: "Maya Chen",
      passwordHash: await hash("parlor-demo", 12),
      shopId: shop.id,
    },
  });

  const [maya, diego] = await Promise.all([
    prisma.artist.create({
      data: {
        shopId: shop.id,
        name: "Maya Chen",
        specialty: "Fine line & botanical",
        active: true,
      },
    }),
    prisma.artist.create({
      data: {
        shopId: shop.id,
        name: "Diego Reyes",
        specialty: "American traditional",
        active: true,
      },
    }),
  ]);

  const clientData = [
    {
      name: "Jordan Hale",
      phone: "5035550142",
      email: "jordan.hale@example.com",
      notes: "Prefers late afternoon. Fine-line sleeve in progress.",
      tags: ["regular"],
    },
    {
      name: "Priya Nair",
      phone: "5035550198",
      email: "priya.nair@example.com",
      notes: "Botanical work on the shoulder. Sensitive to nitrile — use vinyl.",
      tags: ["regular"],
    },
    {
      name: "Sam Ortiz",
      phone: "9715550104",
      email: "",
      notes: "Walked in Saturday asking about flash.",
      tags: ["walk-in", "first-timer"],
    },
    {
      name: "Ellis Quinn",
      phone: "5035550177",
      email: "ellis.q@example.com",
      notes: "Referred by Priya. Wants a small script piece.",
      tags: ["referral"],
    },
    {
      name: "Noah Kim",
      phone: "2065550133",
      email: "noah.kim@example.com",
      notes: "Cover-up over a faded tribal band. Bring extra stencil time.",
      tags: ["cover-up"],
    },
    {
      name: "Riley Brooks",
      phone: "5035550160",
      email: "",
      notes: "First tattoo. Nervous but decided. Keep the session short.",
      tags: ["walk-in", "first-timer"],
    },
    {
      name: "Ava Moretti",
      phone: "4155550188",
      email: "ava.moretti@example.com",
      notes: "Traveling from Oakland. Traditional flash collector.",
      tags: ["regular"],
    },
    {
      name: "Chris Lang",
      phone: "5035550112",
      email: "chris.lang@example.com",
      notes: "Friend of Diego's. Wants a moth on the calf.",
      tags: ["referral"],
    },
  ];

  const clients = [];
  for (const data of clientData) {
    clients.push(
      await prisma.client.create({
        data: {
          shopId: shop.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          notes: data.notes,
          tags: JSON.stringify(data.tags),
        },
      }),
    );
  }

  const [jordan, priya, sam, ellis, noah, riley, ava, chris] = clients;

  const appointments = [
    {
      clientId: jordan.id,
      artistId: maya.id,
      startAt: at(-2, "13:00"),
      durationMin: 180,
      serviceType: "tattoo",
      status: "completed",
      depositCents: 15000,
      depositPaid: true,
    },
    {
      clientId: noah.id,
      artistId: diego.id,
      startAt: at(-1, "14:00"),
      durationMin: 120,
      serviceType: "consult",
      status: "completed",
      depositCents: 5000,
      depositPaid: true,
    },
    {
      clientId: priya.id,
      artistId: maya.id,
      startAt: at(0, "12:00"),
      durationMin: 180,
      serviceType: "tattoo",
      status: "scheduled",
      depositCents: 15000,
      depositPaid: true,
    },
    {
      clientId: sam.id,
      artistId: diego.id,
      startAt: at(0, "16:00"),
      durationMin: 60,
      serviceType: "consult",
      status: "scheduled",
      depositCents: 5000,
      depositPaid: false,
    },
    {
      clientId: ellis.id,
      artistId: maya.id,
      startAt: at(1, "11:00"),
      durationMin: 90,
      serviceType: "tattoo",
      status: "scheduled",
      depositCents: 10000,
      depositPaid: false,
    },
    {
      clientId: riley.id,
      artistId: diego.id,
      startAt: at(1, "15:00"),
      durationMin: 60,
      serviceType: "tattoo",
      status: "scheduled",
      depositCents: 8000,
      depositPaid: true,
    },
    {
      clientId: ava.id,
      artistId: diego.id,
      startAt: at(2, "13:00"),
      durationMin: 240,
      serviceType: "tattoo",
      status: "scheduled",
      depositCents: 20000,
      depositPaid: true,
    },
    {
      clientId: chris.id,
      artistId: maya.id,
      startAt: at(3, "14:00"),
      durationMin: 150,
      serviceType: "tattoo",
      status: "scheduled",
      depositCents: 12000,
      depositPaid: false,
    },
    {
      clientId: jordan.id,
      artistId: maya.id,
      startAt: at(4, "12:00"),
      durationMin: 180,
      serviceType: "touch-up",
      status: "scheduled",
      depositCents: 0,
      depositPaid: true,
    },
    {
      clientId: noah.id,
      artistId: diego.id,
      startAt: at(5, "11:00"),
      durationMin: 240,
      serviceType: "tattoo",
      status: "scheduled",
      depositCents: 20000,
      depositPaid: false,
    },
  ];

  const createdAppointments = [];
  for (const data of appointments) {
    createdAppointments.push(await prisma.appointment.create({ data: { ...data, shopId: shop.id } }));
  }

  await prisma.client.update({
    where: { id: jordan.id },
    data: { lastVisit: at(-2, "13:00") },
  });
  await prisma.client.update({
    where: { id: noah.id },
    data: { lastVisit: at(-1, "14:00") },
  });

  await prisma.sessionNote.create({
    data: {
      shopId: shop.id,
      clientId: jordan.id,
      appointmentId: createdAppointments[0].id,
      designNotes: "Continued olive branch on the outer forearm. Tightened the leaf veins and added a second sprig near the wrist.",
      placement: "Right outer forearm",
      inkColors: "Black, muted olive, warm grey",
      aftercareGiven: true,
    },
  });
  await prisma.sessionNote.create({
    data: {
      shopId: shop.id,
      clientId: noah.id,
      appointmentId: createdAppointments[1].id,
      designNotes: "Cover-up consult. Existing band is too dark for a light floral. Leaning toward a traditional eagle wrap.",
      placement: "Left bicep",
      inkColors: "Bold black, red, mustard",
      aftercareGiven: false,
    },
  });

  console.log("Seeded Blackbird Ink.");
  console.log("  Sign in: demo@blackbird.ink / parlor-demo");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
