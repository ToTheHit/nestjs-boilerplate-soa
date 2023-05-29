import { session as options } from 'config';

import * as cookies from '../utils/cookie';

const answerSchemaFromModel = Model => Model.schema;

const initSessionCookies = (req, res, profile) => {
    const token = profile.getAuthToken(req.sessionId, options.ttl, { fakeId: req.fakeId });
    const cookie = cookies.build(options.cookieKey, token, options.secret, options.ttl);

    res.append('Set-Cookie', cookie);
};

export {
    initSessionCookies,
    answerSchemaFromModel
};
