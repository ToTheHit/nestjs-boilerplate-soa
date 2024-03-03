import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { session as options } from 'config';

import { BadRequest, TooManyRequests } from '@lib/errors';
import * as cookies from '@lib/utils/cookie';
import loggerRaw from '@lib/logger';
import { getAccountFromRequest } from '@restify/getAccountFromRequest';
import { authorOverride } from '@dbLib/constants';
import { sessionInCookies } from '@restify/handlers/constants';
import BasicRequestGuard from '@restify/Guards/BasicRequestGuard';

const logger = loggerRaw('RequestWithTokenGuard');

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
export default class RequestWithTokenGuard extends BasicRequestGuard {
    public profiles: Set<string>;

    public checkRequestQuotaValues: boolean;

    async canActivate(_context: ExecutionContext) {
        await super.canActivate(_context);

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

        return true;
    }
}
