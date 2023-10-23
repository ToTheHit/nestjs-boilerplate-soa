import { session } from 'config';
import * as supertest from 'supertest';

import localModule from './localModule';

import('./assertions');

export default async (authToken = null) => {
    const app = await localModule();

    const agent = supertest.agent(app.getHttpServer());

    agent.use(request => {
        request
            .set('X-USER-DEVICE', 'test')
            .set('Content-Type', 'application/json');

        if (authToken) {
            request.set('Authorization', `${session.headerKey} ${authToken}`);
        }

        return request;
    });

    return agent;
};
