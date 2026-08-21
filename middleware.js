import { next, rewrite } from '@vercel/functions';
import { PRIVATE_RESOURCES, readCookie, scopeForPath, verifySession } from './lib/private-access.js';

function accessRedirect(request, scope, url) {
  const destination = new URL('/access/', request.url);
  destination.searchParams.set('resource', scope);
  destination.searchParams.set('next', `${url.pathname}${url.search}`);
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.toString(),
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache'
    }
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const scope = scopeForPath(url.pathname);
  if (!scope) return next();

  const cookieName = PRIVATE_RESOURCES[scope].cookieName;
  const token = readCookie(request.headers.get('cookie'), cookieName);
  const authenticated = await verifySession(token, scope, process.env.PRIVATE_ACCESS_SESSION_SECRET);
  if (!authenticated) return accessRedirect(request, scope, url);

  if ((scope === 'silla' || scope === 'elcon') && (url.pathname === '/silla-hall-presentation' || url.pathname === '/elcon-arabia-presentation' || url.pathname === '/silla-hall-presentation/' || url.pathname === '/elcon-arabia-presentation/')) {
    return rewrite(new URL(`${url.pathname.replace(/\/$/, '')}/index`, request.url));
  }
  return next();
}

export const config = {
  matcher: [
    '/silla-hall-presentation',
    '/silla-hall-presentation/:path*',
    '/elcon-arabia-presentation',
    '/elcon-arabia-presentation/:path*',
    '/strategic-blueprint',
    '/strategic-blueprint/:path*',
    '/tawjihi-english-quotation',
    '/tawjihi-english-quotation/:path*',
    '/oman-market-partnership',
    '/oman-market-partnership/:path*',
    '/api/private-documents/blueprint'
  ]
};
