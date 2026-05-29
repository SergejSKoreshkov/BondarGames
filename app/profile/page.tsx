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

  const isAdmin = session.user.role === "ADMIN";
  const data = reservations.map((r) => {
    const isHost = r.event.createdById === session.user.id;
    return {
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
        // Host (and admins) can retrieve the invite link from their bookings.
        shareToken: r.event.isPrivate && (isHost || isAdmin) ? r.event.shareToken : null,
      },
    };
  });

  return (
    <div className="space-y-8">
      <section className="space-y-2.5">
        <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.05]">
          My bookings
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Signed in as <span className="text-[var(--foreground)]/80">{session.user.email}</span>
          {!session.user.emailVerified && (
            <span className="ml-2 text-amber-700">· email not verified</span>
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
