// Benachrichtigt den Administrator per E-Mail ueber Resend (https://resend.com).
// Benoetigt die Umgebungsvariablen RESEND_API_KEY und ADMIN_NOTIFY_EMAIL.
// Ohne eigene Domain darf Resend nur an die E-Mail des Resend-Kontos senden -
// ADMIN_NOTIFY_EMAIL muss dann genau diese Adresse sein.
export async function notifyAdmin(subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!apiKey || !to) {
    console.warn("notifyAdmin: RESEND_API_KEY oder ADMIN_NOTIFY_EMAIL fehlt - keine E-Mail gesendet");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.ADMIN_NOTIFY_FROM ?? "Kaderstatistik-App <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    }),
  });
  if (!response.ok) {
    console.error("notifyAdmin: Versand fehlgeschlagen", response.status, await response.text());
  }
}
