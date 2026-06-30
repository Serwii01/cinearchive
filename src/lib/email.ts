/**
 * Envío de correo transaccional (SOLO SERVIDOR) vía Resend.
 *
 * Si RESEND_API_KEY no está configurada, no falla: simplemente no envía (y avisa en
 * el log). Así la app funciona sin email, y el día que pongas la clave + EMAIL_FROM
 * el reset de contraseña empieza a enviar correos sin tocar el código.
 *
 *   RESEND_API_KEY=...           (https://resend.com → API Keys)
 *   EMAIL_FROM="Cine Archive <no-reply@tu-dominio>"   (dominio verificado en Resend)
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Cine Archive <onboarding@resend.dev>';
  if (!key) {
    console.warn(`[email] RESEND_API_KEY no configurada; correo NO enviado: "${msg.subject}"`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Resend ${res.status} (from="${from}" to="${msg.to}"):`, body);
      return false;
    }
    console.log(`[email] enviado "${msg.subject}" → ${msg.to} (from="${from}")`);
    return true;
  } catch (e) {
    console.error('[email] error enviando:', e);
    return false;
  }
}
