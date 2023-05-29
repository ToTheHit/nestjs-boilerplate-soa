import {
    ArgumentsHost, Catch, ExceptionFilter, HttpStatus
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { errorParse } from '../../errors';
import loggerRaw from '../../logger';

const logger = loggerRaw('AllExceptionsFilter');

@Catch()
export default class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    async catch(error: unknown, host: ArgumentsHost): Promise<void> {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();

        const err = errorParse(error);
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const parsedError = err.toJSON();

        if (process.env.NODE_ENV !== 'production') {
            parsedError.stack = await err.getStack();
        }

        logger.error(err, 'error while request processing', { url: req.url, method: req.method });

        if (!res.responseObject) {
            res.responseObject = {};
        }
        Object.assign(res.responseObject, {
            handle_status: 'failure',
            status,
            error: parsedError
        });

        httpAdapter.reply(ctx.getResponse(), res.responseObject, status);
    }
}
