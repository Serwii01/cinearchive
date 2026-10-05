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

/**
 * ¿Hay forma de enviar correo? De esto depende que se pueda exigir confirmar la
 * dirección al crear la cuenta: sin remitente, exigirlo dejaría a los nuevos
 * usuarios registrados y sin poder entrar nunca.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Cine Archive <onboarding@resend.dev>';
  if (!key) {
    console.warn(`[email] RESEND_API_KEY no configurada; correo NO enviado: "${msg.subject}"`);
    // En desarrollo, el enlace a la consola: es la única forma de probar el
    // registro o el cambio de contraseña sin montar un remitente. En producción
    // nunca se imprime (allí hay clave, y un enlace en los logs es una llave).
    if (process.env.NODE_ENV !== 'production') {
      const enlace = msg.text.match(/https?:\/\/\S+/)?.[0];
      if (enlace) console.warn(`[email] enlace para ${msg.to}: ${enlace}`);
    }
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
