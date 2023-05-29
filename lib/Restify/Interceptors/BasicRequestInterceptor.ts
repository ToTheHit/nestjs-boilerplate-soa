import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

import { ValidationError } from '../../errors';
import loggerRaw from '../../logger';

const logger = loggerRaw('BasicRequestInterceptor');

@Injectable()
export default class BasicRequestInterceptor<T> implements NestInterceptor<T, Response> {
    constructor(public reflector: Reflector) {}

    async intercept(_context: ExecutionContext, next: CallHandler) {
        logger.debug('>>>> BEFORE BasicRequestInterceptor');

        const req = _context.switchToHttp().getRequest();

        if (req.method === 'DELETE' && req.body && Object.keys(req.body).length > 0) {
            throw new ValidationError('invalid body in request');
        }

        req.sessionId = crypto.randomUUID();

        return next.handle().pipe(data => {
            logger.debug('### AFTER BasicRequestInterceptor');

            return data;
        });
    }
}
