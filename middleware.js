import { next, rewrite } from '@vercel/functions';

function unauthorized() {
  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="ELCON Arabia Private Presentation", charset="UTF-8"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}

export default function middleware(request) {
  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const encoded = authorization.slice(6);
    const decoded = atob(encoded);
    const separator = decoded.indexOf(':');

    if (separator === -1) {
      return unauthorized();
    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    const expectedUser = process.env.ELCON_USER;
    const expectedPassword = process.env.ELCON_PASSWORD;

    if (
      !expectedUser ||
      !expectedPassword ||
      username !== expectedUser ||
      password !== expectedPassword
    ) {
      return unauthorized();
    }

    const url = new URL(request.url);

    if (
      url.pathname === '/elcon-arabia-presentation' ||
      url.pathname === '/elcon-arabia-presentation/'
    ) {
      return rewrite(
        new URL(
          '/elcon-arabia-presentation/index.html',
          request.url
        )
      );
    }

    return next();

  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: [
    '/elcon-arabia-presentation',
    '/elcon-arabia-presentation/:path*'
  ]
};
