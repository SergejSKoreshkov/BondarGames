import nodemailer from "nodemailer";

let cached: nodemailer.Transporter | null = null;

function getTransport() {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return cached;
}

export async function sendVerificationEmail(to: string, link: string) {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: "Confirm your BondarGames account",
    text: `Welcome to BondarGames!\n\nConfirm your email by opening this link:\n${link}\n\nIf you didn't sign up, ignore this message.`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0a0a0a">
        <h1 style="font-size:24px;font-weight:600;margin:0 0 16px">Welcome to BondarGames</h1>
        <p style="font-size:15px;line-height:1.6;color:#525252;margin:0 0 24px">Confirm your email to start booking board game nights.</p>
        <a href="${link}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Confirm email</a>
        <p style="font-size:13px;color:#a3a3a3;margin:32px 0 0">If the button doesn't work, paste this URL into your browser:<br/><span style="color:#525252">${link}</span></p>
      </div>
    `,
  });
}

export async function sendReservationEmail(
  to: string,
  event: { title: string; startsAt: Date; location: string | null },
  people: number,
  price: number,
  isPrivate: boolean,
) {
  const transport = getTransport();
  const total = isPrivate ? price : people * price;
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `Booking confirmed — ${event.title}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0a0a0a">
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px">Booking confirmed</h1>
        <p style="font-size:15px;color:#525252;margin:0 0 8px">${event.title}</p>
        <p style="font-size:14px;color:#525252;margin:0 0 4px">${event.startsAt.toUTCString()}</p>
        ${event.location ? `<p style="font-size:14px;color:#525252;margin:0 0 4px">${event.location}</p>` : ""}
        <p style="font-size:14px;color:#525252;margin:16px 0 0">Seats: <b>${people}</b></p>
        <p style="font-size:14px;color:#525252;margin:0 0 0">Total: <b>${total}€</b></p>
      </div>
    `,
  });
}
