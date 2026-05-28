import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Schedule } from "@/components/Schedule";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const [events, settings] = await Promise.all([
    prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: {
        reservations: { select: { userId: true, people: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    getSettings(),
  ]);

  const userId = session?.user?.id;
  const data = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    gameName: e.gameName,
    startsAt: e.startsAt.toISOString(),
    durationMinutes: e.durationMinutes,
    maxPeople: e.maxPeople,
    location: e.location,
    createdBy: e.createdBy,
    seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
    bookedByMe: userId ? e.reservations.some((r) => r.userId === userId) : false,
    isMine: userId ? e.createdBy.id === userId : false,
  }));

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Board game nights</h1>
        <p className="text-[var(--muted)] max-w-xl">
          See who's playing, grab a seat, or host your own session.{" "}
          <span className="text-[var(--foreground)] font-medium">
            {settings.pricePerPerson}€ per person.
          </span>
        </p>
      </section>

      <Schedule
        events={data}
        canBook={!!session?.user}
        emailVerified={!!session?.user?.emailVerified}
        pricePerPerson={settings.pricePerPerson}
        isAdmin={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
