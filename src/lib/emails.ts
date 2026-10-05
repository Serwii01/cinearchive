import { languages, defaultLang, type Lang } from '../i18n/ui';

/**
 * Textos y maquetación de los correos transaccionales (verificar la cuenta,
 * restablecer la contraseña). SOLO SERVIDOR.
 *
 * Los correos se escriben en el idioma desde el que se pidieron: Better Auth nos
 * pasa la petición original, y de ahí sale el idioma (primero el prefijo de la
 * URL de la página, que es el que el usuario eligió de verdad; si no, el
 * Accept-Language del navegador).
 */

const LANGS = Object.keys(languages) as Lang[];

/** Idioma de un correo a partir de la petición que lo provocó. */
export function langFromRequest(request?: Request | null): Lang {
  if (!request) return defaultLang;
  // 1. El prefijo de la página desde la que se envió el formulario (/eu/register).
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const seg = new URL(referer).pathname.split('/').filter(Boolean)[0];
      if (seg && (LANGS as string[]).includes(seg)) return seg as Lang;
      // Sin prefijo = castellano, que es el idioma por defecto y no lo lleva.
      if (new URL(referer).pathname.startsWith('/')) return defaultLang;
    } catch {
      /* referer ilegible: seguimos con el Accept-Language */
    }
  }
  // 2. El idioma del navegador, si coincide con alguno de los nuestros.
  const accept = request.headers.get('accept-language') ?? '';
  for (const trozo of accept.split(',')) {
    const code = trozo.split(';')[0].trim().toLowerCase().slice(0, 2);
    if ((LANGS as string[]).includes(code)) return code as Lang;
  }
  return defaultLang;
}

/**
 * Cambia a dónde vuelve el usuario tras pulsar el enlace de confirmación.
 *
 * Better Auth arma el enlace apuntando a «/» salvo que el cliente diga otra
 * cosa; aquí lo redirigimos a la página /verify del idioma del correo, que es la
 * que sabe explicar tanto el «listo» como el «este enlace ha caducado».
 */
export function withCallback(url: string, path: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('callbackURL', path);
    return u.toString();
  } catch {
    return url;
  }
}

interface Copy {
  /** Asunto del correo. */
  subject: string;
  /** Titular dentro del correo. */
  title: string;
  /** Párrafo de entrada. */
  intro: string;
  /** Texto del botón. */
  cta: string;
  /** Aviso bajo el botón (caducidad). */
  note: string;
  /** Qué hacer si no fue el usuario quien lo pidió. */
  ignore: string;
  /** Pie: el enlace en texto, por si el botón no funciona. */
  fallback: string;
}

const VERIFY: Record<Lang, Copy> = {
  es: {
    subject: 'Confirma tu correo — Cine Archive',
    title: 'Confirma tu correo',
    intro: 'Ya casi está. Pulsa el botón para confirmar que este correo es tuyo y terminar de crear tu cuenta en Cine Archive.',
    cta: 'Confirmar mi correo',
    note: 'El enlace caduca en 24 horas.',
    ignore: 'Si no has creado ninguna cuenta, ignora este correo: sin confirmar, la cuenta no sirve para nada.',
    fallback: 'Si el botón no funciona, copia esta dirección en tu navegador:',
  },
  en: {
    subject: 'Confirm your email — Cine Archive',
    title: 'Confirm your email',
    intro: 'Almost there. Press the button to confirm this address is yours and finish creating your Cine Archive account.',
    cta: 'Confirm my email',
    note: 'The link expires in 24 hours.',
    ignore: 'If you did not create an account, ignore this message: without confirmation the account is useless.',
    fallback: 'If the button does not work, copy this address into your browser:',
  },
  gl: {
    subject: 'Confirma o teu correo — Cine Archive',
    title: 'Confirma o teu correo',
    intro: 'Xa case está. Preme o botón para confirmar que este correo é teu e rematar de crear a túa conta en Cine Archive.',
    cta: 'Confirmar o meu correo',
    note: 'A ligazón caduca en 24 horas.',
    ignore: 'Se non creaches ningunha conta, ignora este correo: sen confirmar, a conta non serve para nada.',
    fallback: 'Se o botón non funciona, copia este enderezo no teu navegador:',
  },
  eu: {
    subject: 'Berretsi zure helbide elektronikoa — Cine Archive',
    title: 'Berretsi zure helbide elektronikoa',
    intro: 'Ia amaitu duzu. Sakatu botoia helbide hau zurea dela berresteko eta Cine Archiveko kontua sortzen amaitzeko.',
    cta: 'Berretsi nire helbidea',
    note: 'Esteka 24 orduan iraungitzen da.',
    ignore: 'Konturik sortu ez baduzu, ez ikusi egin mezu honi: berretsi gabe, kontuak ez du ezertarako balio.',
    fallback: 'Botoiak funtzionatzen ez badu, kopiatu helbide hau nabigatzailean:',
  },
  ca: {
    subject: 'Confirma el teu correu — Cine Archive',
    title: 'Confirma el teu correu',
    intro: 'Ja gairebé hi som. Prem el botó per confirmar que aquest correu és teu i acabar de crear el teu compte a Cine Archive.',
    cta: 'Confirmar el meu correu',
    note: "L'enllaç caduca al cap de 24 hores.",
    ignore: 'Si no has creat cap compte, ignora aquest correu: sense confirmar, el compte no serveix de res.',
    fallback: 'Si el botó no funciona, copia aquesta adreça al teu navegador:',
  },
};

const RESET: Record<Lang, Copy> = {
  es: {
    subject: 'Restablecer tu contraseña — Cine Archive',
    title: 'Nueva contraseña',
    intro: 'Has pedido restablecer la contraseña de tu cuenta en Cine Archive. Pulsa el botón para crear una nueva.',
    cta: 'Crear una contraseña nueva',
    note: 'El enlace caduca en 1 hora y solo sirve una vez.',
    ignore: 'Si no has sido tú, ignora este correo: tu contraseña sigue siendo la misma.',
    fallback: 'Si el botón no funciona, copia esta dirección en tu navegador:',
  },
  en: {
    subject: 'Reset your password — Cine Archive',
    title: 'New password',
    intro: 'You asked to reset the password of your Cine Archive account. Press the button to create a new one.',
    cta: 'Create a new password',
    note: 'The link expires in 1 hour and works only once.',
    ignore: 'If this was not you, ignore this message: your password has not changed.',
    fallback: 'If the button does not work, copy this address into your browser:',
  },
  gl: {
    subject: 'Restablecer o teu contrasinal — Cine Archive',
    title: 'Novo contrasinal',
    intro: 'Pediches restablecer o contrasinal da túa conta en Cine Archive. Preme o botón para crear un novo.',
    cta: 'Crear un contrasinal novo',
    note: 'A ligazón caduca nunha hora e só serve unha vez.',
    ignore: 'Se non fuches ti, ignora este correo: o teu contrasinal segue sendo o mesmo.',
    fallback: 'Se o botón non funciona, copia este enderezo no teu navegador:',
  },
  eu: {
    subject: 'Berrezarri zure pasahitza — Cine Archive',
    title: 'Pasahitz berria',
    intro: 'Cine Archiveko zure kontuaren pasahitza berrezartzeko eskatu duzu. Sakatu botoia berri bat sortzeko.',
    cta: 'Sortu pasahitz berria',
    note: 'Esteka ordubetean iraungitzen da eta behin bakarrik balio du.',
    ignore: 'Zu izan ez bazara, ez ikusi egin mezu honi: zure pasahitza berdin jarraitzen du.',
    fallback: 'Botoiak funtzionatzen ez badu, kopiatu helbide hau nabigatzailean:',
  },
  ca: {
    subject: 'Restablir la teva contrasenya — Cine Archive',
    title: 'Nova contrasenya',
    intro: 'Has demanat restablir la contrasenya del teu compte a Cine Archive. Prem el botó per crear-ne una de nova.',
    cta: 'Crear una contrasenya nova',
    note: "L'enllaç caduca al cap d'una hora i només serveix una vegada.",
    ignore: 'Si no has estat tu, ignora aquest correu: la teva contrasenya continua sent la mateixa.',
    fallback: 'Si el botó no funciona, copia aquesta adreça al teu navegador:',
  },
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Maqueta el correo con la misma cara que la web (tinta, ocre, tipografía de
 * sistema con serif). Todo en estilos en línea y tablas: es lo único que
 * respetan los clientes de correo. Colores fijos, sin modo oscuro: Gmail y
 * Outlook no entienden las variables CSS.
 */
function layout(c: Copy, url: string): string {
  const u = esc(url);
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f9f9f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border:1px solid #000;background:#fff">
    <tr><td style="border-bottom:1px solid #000;padding:16px 24px">
      <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:.01em">Cine Archive</span>
    </td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;line-height:1.2">${esc(c.title)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${esc(c.intro)}</p>
      <p style="margin:0 0 20px">
        <a href="${u}" style="display:inline-block;background:#eab308;color:#1a1a1a;text-decoration:none;padding:12px 20px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;border:1px solid #000">${esc(c.cta)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#555">${esc(c.note)}</p>
      <p style="margin:0;font-size:13px;color:#555">${esc(c.ignore)}</p>
    </td></tr>
    <tr><td style="border-top:1px solid #000;padding:16px 24px;font-size:12px;color:#666;word-break:break-all">
      ${esc(c.fallback)}<br /><a href="${u}" style="color:#6b4e07">${u}</a>
    </td></tr>
  </table>
</body></html>`;
}

function plain(c: Copy, url: string): string {
  return `${c.title}\n\n${c.intro}\n\n${url}\n\n${c.note}\n${c.ignore}`;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

const build = (c: Copy, url: string): BuiltEmail => ({ subject: c.subject, html: layout(c, url), text: plain(c, url) });

/** Correo de confirmación de la cuenta. */
export const verificationEmail = (lang: Lang, url: string): BuiltEmail => build(VERIFY[lang] ?? VERIFY[defaultLang], url);

/** Correo de restablecimiento de contraseña. */
export const resetEmail = (lang: Lang, url: string): BuiltEmail => build(RESET[lang] ?? RESET[defaultLang], url);

/** Correo de prueba del panel: confirma que Resend y el remitente funcionan. */
export function testEmail(siteUrl: string): BuiltEmail {
  const c: Copy = {
    subject: 'Prueba de envío — Cine Archive',
    title: 'El correo funciona',
    intro: 'Si lees esto, la clave de Resend y el remitente están bien configurados: los correos de confirmación de cuenta y de contraseña saldrán sin problema.',
    cta: 'Ir a Cine Archive',
    note: `Enviado desde ${siteUrl}.`,
    ignore: 'Este correo lo ha pedido un administrador desde el panel.',
    fallback: 'Dirección del sitio:',
  };
  return build(c, siteUrl);
}
