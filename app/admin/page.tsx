import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminEventForm } from "@/components/AdminEventForm";
import { AdminEventsTable } from "@/components/AdminEventsTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/");

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      reservations: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  const data = events.map((e) => ({
    id: e.id,
    title: e.title,
    gameName: e.gameName,
    startsAt: e.startsAt.toISOString(),
    maxPeople: e.maxPeople,
    pricePerPerson: e.pricePerPerson,
    location: e.location,
    reservations: e.reservations.map((r) => ({
      id: r.id,
      people: r.people,
      user: { name: r.user.name, email: r.user.email },
    })),
    seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
  }));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-[var(--muted)] mt-1 text-sm">Add, view, and remove events.</p>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold mb-4">New event</h2>
        <AdminEventForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All events</h2>
        <AdminEventsTable events={data} />
      </section>
    </div>
  );
}
