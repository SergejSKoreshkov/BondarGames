import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ReservationsList } from "@/components/ReservationsList";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [reservations, settings] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: session.user.id },
      include: { event: true },
      orderBy: { event: { startsAt: "asc" } },
    }),
    getSettings(),
  ]);

  const data = reservations.map((r) => ({
    id: r.id,
    people: r.people,
    event: {
      id: r.event.id,
      title: r.event.title,
      gameName: r.event.gameName,
      startsAt: r.event.startsAt.toISOString(),
      location: r.event.location,
      isPrivate: r.event.isPrivate,
      status: r.event.status,
    },
  }));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">My bookings</h1>
        <p className="text-[var(--muted)] mt-1 text-sm">
          Signed in as {session.user.email}
          {!session.user.emailVerified && (
            <span className="ml-2 text-amber-600">· email not verified</span>
          )}
        </p>
      </section>
      <ReservationsList
        reservations={data}
        publicPricePerPerson={settings.publicPricePerPerson}
        privatePricePerEvent={settings.privatePricePerEvent}
      />
    </div>
  );
}
