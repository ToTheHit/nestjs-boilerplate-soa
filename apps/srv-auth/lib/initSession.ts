import * as crypto from 'crypto';
import MQHandler from '../../../srv-db/db/RabbitMQ/MQHandler';
import { initSessionCookies } from '../../../lib/Restify/lib';

import Login from '../models/login';

const initSession = async (req, res, userGetter, dropSessions = false, registration = false) => {
    req.user = await userGetter(req, res);

    if (dropSessions) {
        await req.user.resetSessions();
        await MQHandler.publish('socket-commands', 'disconnect-other-sessions', {
            sessionId: req.sessionId,
            _user: req.user._id,
            reason: 'password was changed'
        });
    } else {
        req.sessionId = crypto.randomUUID();
    }

    initSessionCookies(req, res, req.user);

    // TODO --->
    req.profile = req.user;

    await Login.handleLogin(req.user, req);
    await req.user.bumpActivity(req.sessionId, registration);

    // .getObjectInfoPublic(req.user);
    return req.user;
};

export default initSession;
