import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { switchMap } from 'rxjs/operators';

import loggerRaw from '../../logger';

const logger = loggerRaw('GetInstanceInfoInterceptor');

@Injectable()
export default class GetInstanceInfoInterceptor<T> implements NestInterceptor<T, Response> {
    constructor(public reflector: Reflector) {}

    async intercept(_context: ExecutionContext, next: CallHandler) {
        const req = _context.switchToHttp().getRequest();
        const res = _context.switchToHttp().getResponse();

        logger.debug('>>>> BEFORE GetInstanceInfoInterceptor');

        return next.handle().pipe(
            switchMap(async data => {
                // TODO resp data === null
                if (!data) {
                    return null;
                }

                res.responseObject.result = await data.getObjectInfoPublic(req.profile, req.query && req.query.fields);

                return res.responseObject;
            })
        );
    }
}
