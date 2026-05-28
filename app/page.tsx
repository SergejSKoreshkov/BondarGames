import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Schedule, type ScheduleEvent } from "@/components/Schedule";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

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

  const data: ScheduleEvent[] = events.map((e) => {
    const canSeePrivate = isAdmin || (userId && e.createdById === userId);
    const sanitised = e.isPrivate && !canSeePrivate;
    return {
      id: e.id,
      title: sanitised ? null : e.title,
      description: sanitised ? null : e.description,
      gameName: sanitised ? null : e.gameName,
      startsAt: e.startsAt.toISOString(),
      durationMinutes: e.durationMinutes,
      maxPeople: e.maxPeople,
      location: sanitised ? null : e.location,
      isPrivate: e.isPrivate,
      shareToken: canSeePrivate ? e.shareToken : null,
      createdBy: sanitised ? null : e.createdBy,
      seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
      bookedByMe: userId ? e.reservations.some((r) => r.userId === userId) : false,
      isMine: userId ? e.createdById === userId : false,
    };
  });

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Board game nights</h1>
        <p className="text-[var(--muted)] max-w-xl text-sm sm:text-base">
          See who's playing, grab a seat, or host your own session — public or private.
        </p>
      </section>

      <Schedule
        events={data}
        canBook={!!session?.user}
        emailVerified={!!session?.user?.emailVerified}
        publicPricePerPerson={settings.publicPricePerPerson}
        privatePricePerEvent={settings.privatePricePerEvent}
        isAdmin={isAdmin}
        appUrl={process.env.APP_URL ?? "http://localhost:3000"}
      />
    </div>
  );
}
