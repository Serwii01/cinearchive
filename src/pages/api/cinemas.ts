import type { APIRoute } from 'astro';
import { check, clientIp, tooMany } from '../../lib/ratelimit';
import { geocode, findCinemas, inSpain, type GeoPoint } from '../../lib/cinemas';

export const prerender = false;

/**
 * Proxy de "Encuentra tu cine": recibe una ciudad (`?q=`) o coordenadas
 * (`?lat=&lon=`) y devuelve salas de cine cercanas (OpenStreetMap). El proxy
 * protege la clave de identificación ante Nominatim/Overpass, cachea y limita
 * las peticiones. Los errores externos nunca se propagan como 500 al cliente.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const limit = check(`cinemas:${clientIp(request)}`, 20, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const q = url.searchParams.get('q')?.trim() ?? '';
  const latRaw = url.searchParams.get('lat');
  const lonRaw = url.searchParams.get('lon');

  // Radio opcional (para "ampliar la zona" desde el mapa). Acotado por seguridad.
  const radiusRaw = Number(url.searchParams.get('radius'));
  const radius = Number.isFinite(radiusRaw)
    ? Math.min(50000, Math.max(1000, radiusRaw))
    : 25000;

  let center: GeoPoint | null = null;

  if (latRaw != null && lonRaw != null) {
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    if (!inSpain(lat, lon)) return Response.json({ error: 'out_of_area' });
    center = { lat, lon, label: '' };
  } else if (q.length >= 2) {
    const geo = await geocode(q);
    if (!geo) return Response.json({ error: 'not_found' });
    if (!inSpain(geo.lat, geo.lon)) return Response.json({ error: 'out_of_area' });
    center = geo;
  } else {
    return Response.json({ error: 'invalid' }, { status: 400 });
  }

  const cinemas = await findCinemas(center.lat, center.lon, radius);
  return Response.json({ center, cinemas });
};
