import { next, rewrite } from '@vercel/functions';

const protectedPresentations = [
  {
    prefix: '/elcon-arabia-presentation',
    userEnv: 'ELCON_USER',
    passwordEnv: 'ELCON_PASSWORD',
    realm: 'ELCON Arabia Private Presentation'
  },
  {
    prefix: '/silla-hall-presentation',
    userEnv: 'SILLA_HALL_USER',
    passwordEnv: 'SILLA_HALL_PASSWORD',
    realm: 'Silla Hall Private Presentation'
  }
];

function unauthorized(realm) {
  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}

export default function middleware(request) {
  const url = new URL(request.url);

  const presentation = protectedPresentations.find(({ prefix }) =>
    url.pathname === prefix ||
    url.pathname === `${prefix}/` ||
    url.pathname.startsWith(`${prefix}/`)
  );

  if (!presentation) {
    return next();
  }

  const expectedUser = process.env[presentation.userEnv];
  const expectedPassword = process.env[presentation.passwordEnv];

  if (!expectedUser || !expectedPassword) {
    return new Response('Presentation access is not configured.', {
      status: 503,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }

  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Basic ')) {
    return unauthorized(presentation.realm);
  }

  try {
    const encoded = authorization.slice(6);
    const decoded = atob(encoded);

    const separator = decoded.indexOf(':');

    if (separator === -1) {
      return unauthorized(presentation.realm);
    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    if (
      username !== expectedUser ||
      password !== expectedPassword
    ) {
      return unauthorized(presentation.realm);
    }

    if (
      url.pathname === presentation.prefix ||
      url.pathname === `${presentation.prefix}/`
    ) {
      return rewrite(
        new URL(
          `${presentation.prefix}/index`,
          request.url
        )
      );
    }

    return next();

  } catch {
    return unauthorized(presentation.realm);
  }
}

export const config = {
  matcher: [
    '/elcon-arabia-presentation',
    '/elcon-arabia-presentation/:path*',
    '/silla-hall-presentation',
    '/silla-hall-presentation/:path*'
  ]
};