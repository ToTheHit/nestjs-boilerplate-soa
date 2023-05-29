import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';

import loggerRaw from '../../logger';

const logger = loggerRaw('GetInstanceInfoInterceptor');

@Injectable()
export default class GetInstanceInfoInterceptor<T> implements NestInterceptor<T, Response> {
    constructor(public reflector: Reflector) {}

    async intercept(_context: ExecutionContext, next: CallHandler) {
        const req = _context.switchToHttp().getRequest();

        logger.debug('>>>> BEFORE GetInstanceInfoInterceptor');

        return next.handle().pipe(map(data => {
            logger.debug('### AFTER GetInstanceInfoInterceptor');

            return data.getObjectInfoPublic(req.profile, req.query && req.query.fields);
        }));
    }
}
