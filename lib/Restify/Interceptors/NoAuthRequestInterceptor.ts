import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import { session as options } from 'config';

import { ForbiddenError } from '@lib/errors';
import BasicRequestInterceptor from './BasicRequestInterceptor';
import loggerRaw from '../../logger';
import { getAccountFromRequest } from '../getAccountFromRequest';

const logger = loggerRaw('NoAuthInterceptor');

export default (throwError = true) => {
    @Injectable()
    class NoAuthRequestInterceptor<T> extends BasicRequestInterceptor<T> {
        async intercept(_context: ExecutionContext, next: CallHandler) {
            logger.debug('### BEFORE NoAuthInterceptor');

            const interceptorsContext = await super.intercept(_context, next);

            logger.debug('### ----');

            const req = _context.switchToHttp().getRequest();
            const result = await getAccountFromRequest(req.headers, options);

            req.profile = { _id: 'test' };

            if (result) {
                if (throwError) {
                    throw new ForbiddenError('api endpoint restricted for session requests');
                } else {
                    logger.warn('request passing with session requests');
                }
            }

            return interceptorsContext.pipe(data => {
                logger.debug('### AFTER NoAuthInterceptor');

                return data;
            });
        }
    }

    return NoAuthRequestInterceptor;
};
