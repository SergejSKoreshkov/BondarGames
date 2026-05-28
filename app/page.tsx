import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ScheduleList } from "@/components/ScheduleList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { reservations: { select: { userId: true, people: true } } },
  });

  const userId = session?.user?.id;
  const data = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    gameName: e.gameName,
    startsAt: e.startsAt.toISOString(),
    durationMinutes: e.durationMinutes,
    maxPeople: e.maxPeople,
    pricePerPerson: e.pricePerPerson,
    location: e.location,
    seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
    bookedByMe: userId ? e.reservations.some((r) => r.userId === userId) : false,
  }));

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Board game nights</h1>
        <p className="text-[var(--muted)] max-w-xl">
          Pick a session, grab a seat, and show up. Coffee, snacks and rulebooks included.
        </p>
      </section>

      <ScheduleList
        events={data}
        canBook={!!session?.user}
        emailVerified={!!session?.user?.emailVerified}
      />
    </div>
  );
}
