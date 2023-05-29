import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import { session as options } from 'config';

import BasicRequestInterceptor from './BasicRequestInterceptor';
import { BadRequest, TooManyRequests } from '../../errors';
import * as cookies from '../../utils/cookie';
import { getAccountFromRequest } from '../getAccountFromRequest';
import { authorOverride } from '../../../srv-db/lib/constants';
import { sessionInCookies } from '../handlers/constants';
import loggerRaw from '../../logger';

const logger = loggerRaw('RequestWithTokenInterceptor');

const getProfile = async (req, checkRequestQuotaValues = true) => {
    const result = await getAccountFromRequest(req.headers, options);

    if (result) {
        const { account, sid, fakeId } = result;

        req.user = account;
        req.sessionId = sid;
        req.profile = account;
        req.fakeId = fakeId;

        if (req.profile.allowCreateFromCustomProfile) {
            const {
                author_type_override: profileType,
                author_id_override: profileId
            } = req.headers;

            authorOverride.set(req.profile, { profileType, profileId });
        }

        req.profile.setMeta(req.requestInfo);

        if (checkRequestQuotaValues && !(await req.profile.checkRequestQuotas(sid))) {
            if (sessionInCookies.get(req.profile.constructor)) {
                await req.dropSession('request quotas reached');
            }

            throw new TooManyRequests('request quotas reached');
        }
    }
};

@Injectable()
class RequestWithTokenInterceptor<T> extends BasicRequestInterceptor<T> {
    public profiles: Set<string>;

    public checkRequestQuotaValues: boolean;

    async intercept(_context: ExecutionContext, next: CallHandler) {
        await super.intercept(_context, next);
        logger.debug('>>> BEFORE RequestWithTokenInterceptor');

        const req = _context.switchToHttp().getRequest();
        const res = _context.switchToHttp().getResponse();

        this.profiles = new Set();
        this.checkRequestQuotaValues = true;

        try {
            await getProfile(req, this.checkRequestQuotaValues);
        } catch (e) {
            if (e instanceof BadRequest) {
                res.append('Set-Cookie', cookies.clear(options.cookieKey));
                throw e;
            }
        }

        return next.handle().pipe(data => {
            logger.debug('### AFTER RequestWithTokenInterceptor');

            return data;
        });
    }
}

export default RequestWithTokenInterceptor;
