import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatPrice } from "@/lib/format";
import { PrivateEventBooking } from "@/components/PrivateEventBooking";
import { Glass } from "@/components/Glass";

export const dynamic = "force-dynamic";

export default async function PrivateEventPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      reservations: { select: { userId: true, people: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!event) notFound();

  const session = await auth();
  const settings = await getSettings();
  const userId = session?.user?.id;

  const seatsTaken = event.reservations.reduce((acc, r) => acc + r.people, 0);
  const bookedByMe = !!(userId && event.reservations.some((r) => r.userId === userId));
  const endsAt = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="space-y-1">
        <div className="text-xs text-[var(--muted)] uppercase tracking-wide">Private event</div>
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
      </div>

      <Glass cornerRadius={28} padding="24px" displacementScale={70}>
      <div className="space-y-3">
        <dl className="text-sm grid grid-cols-3 gap-y-2">
          <dt className="text-[var(--muted)] col-span-1">When</dt>
          <dd className="col-span-2">
            {formatDate(event.startsAt)} – {endsAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </dd>
          <dt className="text-[var(--muted)]">Game</dt>
          <dd className="col-span-2">{event.gameName}</dd>
          {event.location && (
            <>
              <dt className="text-[var(--muted)]">Where</dt>
              <dd className="col-span-2">{event.location}</dd>
            </>
          )}
          <dt className="text-[var(--muted)]">Host</dt>
          <dd className="col-span-2 truncate">
            {event.createdBy.name ?? event.createdBy.email}
          </dd>
          <dt className="text-[var(--muted)]">Seats</dt>
          <dd className="col-span-2">
            {seatsTaken}/{event.maxPeople}
          </dd>
          <dt className="text-[var(--muted)]">Price</dt>
          <dd className="col-span-2">
            {formatPrice(settings.privatePricePerEvent)} flat (paid by the host)
          </dd>
        </dl>
        {event.description && (
          <p className="text-sm text-[var(--muted)] pt-2 border-t border-white/40">
            {event.description}
          </p>
        )}
      </div>
      </Glass>

      {event.status === "PENDING" ? (
        <div className="glass-warn rounded-2xl px-5 py-4 text-sm text-center">
          This event is waiting for admin approval. Bookings open once it's confirmed.
        </div>
      ) : !session?.user ? (
        <Link
          href={`/auth/signin?callbackUrl=/event/${token}`}
          className="btn w-full glass-accent"
        >
          Sign in to join
        </Link>
      ) : !session.user.emailVerified ? (
        <div className="glass-warn rounded-2xl px-5 py-4 text-sm text-center">
          Verify your email to join this event.
        </div>
      ) : (
        <PrivateEventBooking
          eventId={event.id}
          token={token}
          maxPeople={event.maxPeople}
          seatsTaken={seatsTaken}
          alreadyBooked={bookedByMe}
        />
      )}
    </div>
  );
}
