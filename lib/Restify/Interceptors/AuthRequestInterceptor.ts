import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import { session as options } from 'config';

import RequestWithTokenInterceptor from './RequestWithTokenInterceptor';
import { sessionInCookies } from '../handlers/constants';
import * as cookies from '../../utils/cookie';
import validateAccount from '../validateAccount';
import { initSessionCookies } from '../lib';

export default (confirmedEmailOnly = true, ignoreBlock = false) => {
    @Injectable()
    class AuthRequestInterceptor<T> extends RequestWithTokenInterceptor<T> {
        async intercept(_context: ExecutionContext, next: CallHandler) {
            await super.intercept(_context, next);
            this.profiles.add('user');

            const req = _context.switchToHttp().getRequest();
            const res = _context.switchToHttp().getResponse();

            req.dropSession = async reason => {
                if (req.sessionId && req.user && sessionInCookies.get(req.user.constructor)) {
                    // FIXME: !!! RABBIT
                    // await mq.publish('auth-events', 'dropSession', {
                    //     sessionId: req.sessionId,
                    //     _user: req.user._id,
                    //     reason
                    // });
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

            return next.handle();
        }
    }

    return AuthRequestInterceptor;
};