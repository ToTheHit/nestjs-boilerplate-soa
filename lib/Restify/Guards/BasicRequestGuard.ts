import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

import { ValidationError } from '@lib/errors';

@Injectable()
export default class BasicRequestGuard implements CanActivate {
    async canActivate(context: ExecutionContext) {
        console.log('BasicRequestGuard');
        const req = context.switchToHttp().getRequest();

        if (req.method === 'DELETE' && req.body && Object.keys(req.body).length > 0) {
            throw new ValidationError('invalid body in request');
        }

        if (!req.sessionId) {
            req.sessionId = crypto.randomUUID();
        }

        return true;
    }
}
