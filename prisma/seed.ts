import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { hash } from "bcryptjs";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TZ = "America/Los_Angeles";
const STORAGE_ROOT = path.join(process.cwd(), "storage");

function atIn(tz: string, dayOffset: number, time: string) {
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  return fromZonedTime(`${format(addDays(parseISO(today), dayOffset), "yyyy-MM-dd")}T${time}:00`, tz);
}

function at(dayOffset: number, time: string) {
  return atIn(TZ, dayOffset, time);
}

async function main() {
  await prisma.payment.deleteMany();
  await prisma.clientImage.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformUser.deleteMany();
  await prisma.shop.deleteMany();
  await rm(path.join(STORAGE_ROOT, "shops"), { recursive: true, force: true });

  const shop = await prisma.shop.create({
    data: {
      name: "Blackbird Ink",
      timezone: TZ,
      hoursOpen: "11:00",
      hoursClose: "20:00",
    },
  });

  const mayaUser = await prisma.user.create({
    data: {
      email: "demo@blackbird.ink",
      name: "Maya Chen",
      passwordHash: await hash("parlor-demo", 12),
      shopId: shop.id,
      role: "owner",
      active: true,
      lastSeenAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@blackbird.ink",
      name: "Kim Alvarez",
      passwordHash: await hash("parlor-admin", 12),
      shopId: shop.id,
      role: "admin",
      active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "artist@blackbird.ink",
      name: "Diego Reyes",
      passwordHash: await hash("parlor-staff", 12),
      shopId: shop.id,
      role: "staff",
      active: true,
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

  const priyaToday = createdAppointments[2];
  const fixtures = path.join(process.cwd(), "prisma", "fixtures");

  async function seedImage(opts: {
    clientId: string;
    appointmentId?: string;
    kind: string;
    caption: string;
    prepForVisit: boolean;
    file: string;
    mimeType: string;
    ext: string;
    width: number;
    height: number;
  }) {
    const id = crypto.randomUUID();
    const key = path.join("shops", shop.id, "clients", opts.clientId, `${id}.${opts.ext}`);
    const abs = path.join(STORAGE_ROOT, key);
    await mkdir(path.dirname(abs), { recursive: true });
    await copyFile(path.join(fixtures, opts.file), abs);
    const info = await stat(abs);
    await prisma.clientImage.create({
      data: {
        id,
        shopId: shop.id,
        clientId: opts.clientId,
        appointmentId: opts.appointmentId ?? null,
        kind: opts.kind,
        prepForVisit: opts.prepForVisit,
        caption: opts.caption,
        storageKey: key,
        mimeType: opts.mimeType,
        byteSize: info.size,
        width: opts.width,
        height: opts.height,
        uploadedById: mayaUser.id,
      },
    });
  }

  await seedImage({
    clientId: priya.id,
    appointmentId: priyaToday.id,
    kind: "reference",
    caption: "Shoulder botanical — client’s phone pic",
    prepForVisit: true,
    file: "priya-reference.jpg",
    mimeType: "image/jpeg",
    ext: "jpg",
    width: 240,
    height: 160,
  });
  await seedImage({
    clientId: priya.id,
    appointmentId: priyaToday.id,
    kind: "design",
    caption: "Stencil pass, olive linework",
    prepForVisit: true,
    file: "priya-design.png",
    mimeType: "image/png",
    ext: "png",
    width: 240,
    height: 160,
  });

  await prisma.payment.createMany({
    data: [
      {
        shopId: shop.id,
        appointmentId: createdAppointments[0].id,
        clientId: jordan.id,
        amountCents: 15000,
        status: "succeeded",
        type: "deposit",
        createdAt: at(-2, "13:20"),
      },
      {
        shopId: shop.id,
        appointmentId: createdAppointments[1].id,
        clientId: noah.id,
        amountCents: 5000,
        status: "succeeded",
        type: "deposit",
        createdAt: at(-1, "14:10"),
      },
      {
        shopId: shop.id,
        appointmentId: createdAppointments[3].id,
        clientId: sam.id,
        amountCents: 5000,
        status: "pending",
        type: "deposit",
        createdAt: at(0, "10:00"),
      },
    ],
  });

  const harborTz = "America/New_York";
  const harbor = await prisma.shop.create({
    data: {
      name: "Harbor Needle",
      timezone: harborTz,
      hoursOpen: "12:00",
      hoursClose: "21:00",
    },
  });
  await prisma.user.create({
    data: {
      email: "owner@harborneedle.ink",
      name: "Lena Park",
      passwordHash: await hash("parlor-harbor", 12),
      shopId: harbor.id,
      role: "owner",
      active: true,
      lastSeenAt: new Date(),
    },
  });
  await prisma.user.create({
    data: {
      email: "staff@harborneedle.ink",
      name: "Theo Brooks",
      passwordHash: await hash("parlor-harbor-staff", 12),
      shopId: harbor.id,
      role: "staff",
      active: true,
    },
  });
  const lena = await prisma.artist.create({
    data: { shopId: harbor.id, name: "Lena Park", specialty: "Blackwork & script", active: true },
  });
  const [mina, cole, june] = await Promise.all([
    prisma.client.create({
      data: {
        shopId: harbor.id,
        name: "Mina Solis",
        phone: "2125550144",
        email: "mina.solis@example.com",
        notes: "Script along the collarbone.",
        tags: JSON.stringify(["regular"]),
      },
    }),
    prisma.client.create({
      data: {
        shopId: harbor.id,
        name: "Cole Bennett",
        phone: "9175550180",
        notes: "Walk-in flash, first tattoo.",
        tags: JSON.stringify(["walk-in", "first-timer"]),
      },
    }),
    prisma.client.create({
      data: {
        shopId: harbor.id,
        name: "June Hart",
        email: "june.hart@example.com",
        notes: "Cover-up consult next month.",
        tags: JSON.stringify(["cover-up"]),
      },
    }),
  ]);
  const harborBookings = await Promise.all([
    prisma.appointment.create({
      data: {
        shopId: harbor.id,
        clientId: mina.id,
        artistId: lena.id,
        startAt: atIn(harborTz, -3, "13:00"),
        durationMin: 120,
        serviceType: "tattoo",
        status: "completed",
        depositCents: 10000,
        depositPaid: true,
      },
    }),
    prisma.appointment.create({
      data: {
        shopId: harbor.id,
        clientId: cole.id,
        artistId: lena.id,
        startAt: atIn(harborTz, 0, "15:00"),
        durationMin: 60,
        serviceType: "tattoo",
        status: "scheduled",
        depositCents: 8000,
        depositPaid: true,
      },
    }),
    prisma.appointment.create({
      data: {
        shopId: harbor.id,
        clientId: june.id,
        artistId: lena.id,
        startAt: atIn(harborTz, 2, "11:00"),
        durationMin: 90,
        serviceType: "consult",
        status: "scheduled",
        depositCents: 5000,
        depositPaid: false,
      },
    }),
  ]);
  await prisma.payment.createMany({
    data: [
      {
        shopId: harbor.id,
        appointmentId: harborBookings[0].id,
        clientId: mina.id,
        amountCents: 10000,
        status: "succeeded",
        type: "deposit",
        createdAt: atIn(harborTz, -3, "13:15"),
      },
      {
        shopId: harbor.id,
        appointmentId: harborBookings[1].id,
        clientId: cole.id,
        amountCents: 8000,
        status: "succeeded",
        type: "deposit",
        createdAt: atIn(harborTz, -1, "09:00"),
      },
    ],
  });

  const quietTz = "America/Chicago";
  const quiet = await prisma.shop.create({
    data: {
      name: "Ash & Ivy",
      timezone: quietTz,
      hoursOpen: "10:00",
      hoursClose: "18:00",
      createdAt: atIn(quietTz, -80, "10:00"),
    },
  });
  await prisma.user.create({
    data: {
      email: "ivy@ashandivy.ink",
      name: "Ivy Shaw",
      passwordHash: await hash("parlor-quiet", 12),
      shopId: quiet.id,
      role: "owner",
      active: true,
    },
  });
  const ivyArtist = await prisma.artist.create({
    data: { shopId: quiet.id, name: "Ivy Shaw", specialty: "Floral", active: true },
  });
  const reed = await prisma.client.create({
    data: {
      shopId: quiet.id,
      name: "Reed Collins",
      notes: "Last sat 45 days ago. Has not rebooked.",
      tags: JSON.stringify(["regular"]),
    },
  });
  await prisma.appointment.create({
    data: {
      shopId: quiet.id,
      clientId: reed.id,
      artistId: ivyArtist.id,
      startAt: atIn(quietTz, -45, "14:00"),
      durationMin: 90,
      serviceType: "tattoo",
      status: "completed",
      depositCents: 6000,
      depositPaid: true,
    },
  });

  await prisma.platformUser.create({
    data: {
      email: "platform@inkdesk.app",
      name: "Casey Drummond",
      passwordHash: await hash("platform-admin", 12),
      active: true,
    },
  });

  console.log("Seeded shops + platform operator.");
  console.log("  Blackbird owner:  demo@blackbird.ink / parlor-demo");
  console.log("  Blackbird admin:  admin@blackbird.ink / parlor-admin");
  console.log("  Blackbird staff:  artist@blackbird.ink / parlor-staff");
  console.log("  Harbor owner:     owner@harborneedle.ink / parlor-harbor");
  console.log("  Platform:         platform@inkdesk.app / platform-admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
