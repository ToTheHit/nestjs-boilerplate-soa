import {
    CallHandler, ExecutionContext, Injectable
} from '@nestjs/common';

import NoAuthRequestInterceptor from '../../../lib/Restify/Interceptors/NoAuthRequestInterceptor';

export default (userGetter: (req) => any, dropSession = false, registration = false, changePassword = false) => {
    if (registration) {
        @Injectable()
        class SignUpInterceptor<T> extends NoAuthRequestInterceptor(true)<T> {
            async intercept(_context: ExecutionContext, next: CallHandler) {
                console.log('SignUpInterceptor !!!!');
                const req = _context.switchToHttp().getRequest();

                console.error('SignUpInterceptor body', req.body, req.ctx?.body);

                return next.handle().pipe(data => {
                    return data;
                });
            }
        }

        return SignUpInterceptor;
    }
};
