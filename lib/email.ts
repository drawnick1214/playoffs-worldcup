/**
 * Sends the admin a notification when a new user registers, via Resend.
 * Best-effort: if RESEND_API_KEY / ADMIN_EMAIL are missing or the call fails,
 * it logs and returns false without breaking registration.
 */
export async function notifyAdminNewUser(name: string, phone: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return false;

  const appUrl = process.env.APP_URL || "https://playoffsworldcup.vercel.app";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Polla Playoffs <onboarding@resend.dev>",
        to: [to],
        subject: `🆕 Nuevo registro: ${name} (${phone})`,
        html: `
          <h2>Nuevo registro en la Polla Playoffs del Mundial</h2>
          <p>Una persona se registró y está <b>pendiente de tu aprobación</b>:</p>
          <ul>
            <li><b>Nombre:</b> ${name}</li>
            <li><b>Celular:</b> ${phone}</li>
          </ul>
          <p>Entra a <a href="${appUrl}/admin">${appUrl}/admin</a> para aprobar o rechazar.</p>
        `,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend exception:", e);
    return false;
  }
}
