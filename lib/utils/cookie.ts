import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { sign as encodeCookie, unsign as decodeCookie } from 'cookie-signature';

const parse = (header, key, secret) => {
    const plainCookie = parseCookie(header)[key];

    return plainCookie
        ? decodeCookie(plainCookie, secret)
        : null;
};

const defaults = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'none'
};

const build = (key, value, secret, ttl = null) => serializeCookie(key, encodeCookie(value, secret), {
    ...defaults,
    ...(ttl
        ? { expires: new Date(Date.now() + ttl), maxAge: Math.ceil(ttl / 1000) }
        : {})
});

const clear = key => serializeCookie(key, '', {
    ...defaults,
    expires: new Date(1)
});

export { parse, build, clear };
