import { session as options } from 'config';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { BadRequest } from '@lib/errors';
import RequestWithTokenGuard from '@restify/Guards/RequestWithTokenGuard';
import { sessionInCookies } from '@restify/handlers/constants';
import emitBgEvent from '@dbLib/emitBgEvent';
import validateAccount from '@restify/validateAccount';
import { initSessionCookies } from '@restify/lib';
import * as cookies from '../../utils/cookie';

export default (confirmedEmailOnly = true, ignoreBlock = false) => {
    @Injectable()
    class AuthGuard extends RequestWithTokenGuard {
        async canActivate(_context: ExecutionContext) {
            await super.canActivate(_context);

            this.profiles.add('user');

            const req = _context.switchToHttp().getRequest();
            const res = _context.switchToHttp().getResponse();

            req.dropSession = async reason => {
                if (req.sessionId && req.user && sessionInCookies.get(req.user.constructor)) {
                    await emitBgEvent.sendEvent('dropSession', {
                        sessionId: req.sessionId,
                        _user: req.user._id,
                        reason
                    }, 'auth-events');
                }

                res.append('Set-Cookie', cookies.clear(options.cookieKey));
            };

            if (!req.user) {
                await req.dropSession('user not found');
            }

            validateAccount(req.user, confirmedEmailOnly, ignoreBlock);

            if (sessionInCookies.get(req.user.constructor)) {
                initSessionCookies(req, res, req.user);
            }

            const promises = [req.user.bumpActivity(req.sessionId)];

            await Promise.all(promises);

            return true;
        }
    }

    return AuthGuard;
};
