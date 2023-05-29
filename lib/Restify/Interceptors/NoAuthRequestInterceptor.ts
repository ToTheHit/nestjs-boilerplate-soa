import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import { session as options } from 'config';

import BasicRequestInterceptor from './BasicRequestInterceptor';
import { BadRequest, ForbiddenError } from '../../errors';
import * as cookies from '../../utils/cookie';
import loggerRaw from '../../logger';
import { getAccountFromRequest } from '../getAccountFromRequest';

const logger = loggerRaw('NoAuthInterceptor');

export default (throwError = true) => {
    @Injectable()
    class NoAuthRequestInterceptor<T> extends BasicRequestInterceptor<T> {
        async intercept(_context: ExecutionContext, next: CallHandler) {
            await super.intercept(_context, next);
            logger.debug('>>> BEFORE NoAuthInterceptor');

            const req = _context.switchToHttp().getRequest();
            const result = await getAccountFromRequest(req.headers, options);

            if (result) {
                if (throwError) {
                    throw new ForbiddenError('api endpoint restricted for session requests');
                } else {
                    logger.warn('request passing with session requests');
                }
            }

            return next.handle().pipe(data => {
                logger.debug('### AFTER NoAuthInterceptor');

                return data;
            });
        }
    }

    return NoAuthRequestInterceptor;
};
