import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { session as options } from 'config';

import { getAccountFromRequest } from '@restify/getAccountFromRequest';
import { ForbiddenError } from '@lib/errors';
import loggerRaw from '@lib/logger';
import BasicRequestGuard from '@restify/Guards/BasicRequestGuard';

const logger = loggerRaw('NoAuthGuard');

export default (throwError = true) => {
    @Injectable()
    class NoAuthRequestGuard extends BasicRequestGuard {
        async canActivate(_context: ExecutionContext) {
            await super.canActivate(_context);
            console.log('NoAuthRequestGuard');

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

            return true;
        }
    }

    return NoAuthRequestGuard;
};
