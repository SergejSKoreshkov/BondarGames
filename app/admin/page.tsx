import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";
import { AdminEventsTable, type AdminEvent } from "@/components/AdminEventsTable";
import { AdminPendingList } from "@/components/AdminPendingList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/");

  const [events, settings] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startsAt: "asc" },
      include: {
        reservations: {
          include: { user: { select: { name: true, email: true } } },
        },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    getSettings(),
  ]);

  const data: AdminEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    gameName: e.gameName,
    startsAt: e.startsAt.toISOString(),
    durationMinutes: e.durationMinutes,
    maxPeople: e.maxPeople,
    location: e.location,
    isPrivate: e.isPrivate,
    status: e.status,
    createdBy: e.createdBy,
    reservations: e.reservations.map((r) => ({
      id: r.id,
      people: r.people,
      user: { name: r.user.name, email: r.user.email },
    })),
    seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
  }));

  const pending = data.filter((e) => e.status === "PENDING");

  return (
    <div className="space-y-10">
      <section className="space-y-2.5">
        <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.05]">
          Admin
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Approve pending events, set pricing, oversee every booking.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Pending approval
          {pending.length > 0 && (
            <span className="glass-warn ml-2 inline-flex h-6 px-2 items-center rounded-full text-xs font-medium">
              {pending.length}
            </span>
          )}
        </h2>
        <AdminPendingList events={pending} />
      </section>

      <section className="glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold mb-4">Pricing</h2>
        <AdminSettingsForm
          initialPublic={settings.publicPricePerPerson}
          initialPrivate={settings.privatePricePerEvent}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All events</h2>
        <AdminEventsTable
          events={data}
          publicPricePerPerson={settings.publicPricePerPerson}
          privatePricePerEvent={settings.privatePricePerEvent}
        />
      </section>
    </div>
  );
}
