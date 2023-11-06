import MagicSchema from '@models/MagicSchema';
import { extractData } from '../utils/token';
import { BadRequest } from '../errors';
import { parse as parseCookies } from '../utils/cookie';

const availableModels = new Map([
    [MagicSchema.model('user').modelName, MagicSchema.model('user')]
]);

const getTokenFromCookies = (headers, key, secret) => (headers && headers.cookie
    ? parseCookies(headers.cookie, key, secret)
    : null);

const getTokenFromHeaders = (headers, key) => {
    if (headers && headers.authorization) {
        const parts = headers.authorization.split(' ');

        if (parts.length === 2 && parts[0] === key) {
            return parts[1];
        }
    }

    return null;
};

const getAccountFromRequest = async (headers, { headerKey, cookieKey, secret }) => {
    const tokenFromCookies = getTokenFromCookies(headers, cookieKey, secret);
    const tokenFromHeaders = getTokenFromHeaders(headers, headerKey);

    if (tokenFromCookies && tokenFromHeaders) {
        throw new BadRequest('multiple tokens provided');
    }

    const tokenValue = tokenFromCookies || tokenFromHeaders;

    if (tokenValue) {
        const {
            sid,
            id,
            t,
            fakeId
        } = extractData(tokenValue);

        const Model = availableModels.get(t);

        if (Model) {
            const account = await Model.findById(id);

            const isSidExists = await MagicSchema.model('device').exists({
                _user: id,
                sessionId: sid
            });

            if (account && account.verifyToken(tokenValue) && isSidExists) {
                return { account, sid, fakeId };
            }
        }
    }

    return null;
};

const getRawDataFromRequest = (headers, { headerKey, cookieKey, secret }) => {
    const tokenFromCookies = getTokenFromCookies(headers, cookieKey, secret);
    const tokenFromHeaders = getTokenFromHeaders(headers, headerKey);

    if (tokenFromCookies && tokenFromHeaders) {
        throw new BadRequest('multiple tokens provided');
    }

    const tokenValue = tokenFromCookies || tokenFromHeaders;

    if (tokenValue) {
        return extractData(tokenValue);
    }

    return null;
};

export {
    getAccountFromRequest,
    getTokenFromHeaders,
    getTokenFromCookies,
    getRawDataFromRequest
};
