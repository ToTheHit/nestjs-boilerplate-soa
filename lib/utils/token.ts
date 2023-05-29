import crypto from 'crypto';
import * as jwtoken from 'jsonwebtoken';
import { decode } from 'jsonwebtoken';
import { BadRequest } from '../errors';

const { JsonWebTokenError, TokenExpiredError, ...jwt } = jwtoken;

const randKey = async (length = 6) => new Promise((resolve, reject) => (
    // eslint-disable-next-line no-promise-executor-return
    crypto.randomBytes(length, (err, bytes) => (
        err ? reject(err) : resolve(bytes.toString('hex'))
    ))
));

const extractData = token => {
    try {
        return decode(token, { json: true });
    } catch (e) {
        throw new BadRequest('invalid token');
    }
};

const verify = (token, secret) => {
    try {
        return jwt.verify(token, secret);
    } catch (e) {
        if (e instanceof TokenExpiredError) {
            throw new BadRequest('session expired');
        }

        throw new BadRequest('invalid token');
    }
};

const sign = (payload, secret, ttl = null) => jwt.sign(payload, secret, ttl
    ? { expiresIn: Math.ceil(ttl / 1000) }
    : {});

export {
    randKey,
    extractData,
    verify,
    sign
};
