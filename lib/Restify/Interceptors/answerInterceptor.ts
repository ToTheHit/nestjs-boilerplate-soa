import { Reflector } from '@nestjs/core';
import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import * as crypto from 'crypto';

import prepareRequestParams from '../utils/prepareRequestParams';
import loggerRaw from '../../logger';

const logger = loggerRaw('AnswerInterceptor');

const getIp = req => {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'].split(',')[0];
    }
    if (req.connection && req.connection.remoteAddress) {
        return req.connection.remoteAddress;
    }

    return req.ip;
};

@Injectable()
export default class AnswerInterceptor<T> implements NestInterceptor<T, Response> {
    constructor(private reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<any> {
        logger.debug('>>> BEFORE GLOBAL AnswerInterceptor');
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        prepareRequestParams(req);

        req.requestInfo.ip = getIp(req);

        const responseMessage = this.reflector.get<string>(
            'ResponseMessageKey',
            context.getHandler()
        ) ?? '';

        res.responseObject = {
            method: req.method.toUpperCase(),
            serverVersion: '0.0.1', // packageJson.version
            path: req.originalUrl,
            requestId: crypto.randomUUID(), // crypto.randomUUID()
            handle_status: 'success',
            result: null,
            status: 200,
            error: null
        };
        logger.info('incoming %j', {
            method: req.method.toUpperCase(),
            path: req.originalUrl,
            requestId: res.responseObject.requestId
        });

        return next.handle().pipe(
            map(data => {
                return data;
            })
        );
    }
}
