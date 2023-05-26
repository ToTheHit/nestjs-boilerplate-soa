import { ArgumentsHost, Catch, NotFoundException } from '@nestjs/common';
import AllExceptionsFilter from './AllExceptionsFilter';
import { NotFoundError } from '../../errors';

@Catch(NotFoundException)
export default class NotFoundExceptionFilter extends AllExceptionsFilter {
    async catch(error: unknown, host: ArgumentsHost): Promise<void> {
        const req = host.switchToHttp().getRequest();

        await super.catch(
            new NotFoundError('route not found', { path: req.url }),
            host
        );
    }
}
