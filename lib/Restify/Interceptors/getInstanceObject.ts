import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import MagicSchema from '../../../srv-db/models/MagicSchema';
import {
    AnswerBinary,
    AnswerEmpty,
    AnswerRawJson,
    AnswerRedirect, AnswerRegular,
    AnswerRender, AnswerSimple,
    AnswerStream
} from '../handlers/answers';
import { ValidationError } from '../../errors';
import BasicRequestInterceptor from './BasicRequestInterceptor';
import RequestWithTokenInterceptor from './RequestWithTokenInterceptor';

const supportedAnswers = {
    stream: AnswerStream,
    binary: AnswerBinary,
    empty: AnswerEmpty,
    json: AnswerRawJson,
    redirect: AnswerRedirect,
    regular: AnswerRegular,
    simple: AnswerSimple,
    render: AnswerRender
};

export default ignoreDeletion => {
    @Injectable()
    class GetInstanceInterceptor<T> extends RequestWithTokenInterceptor<T> {
        async intercept(_context: ExecutionContext, next: CallHandler) {
            console.log('>>>> BEFORE GetInstanceInterceptor');
            await super.intercept(_context, next);
            const req = _context.switchToHttp().getRequest();
            const res = _context.switchToHttp().getResponse();

            const collectionName = req.requestParam('collectionName');
            const _shortId = req.requestParam('_shortId');
            const _id = req.requestParam('_id');
            const _wsId = req.requestParam('_wsId');

            const queryModif = (collectionName !== 'ws') && _wsId && _wsId.length
                ? { _wsId }
                : {};

            const Model = MagicSchema.modelByCollectionName(collectionName, true);

            req.currentObject = await (_shortId
                ? Model.getObjectByShortId(req.profile, _shortId, { ignoreDeletion, queryModif })
                : Model.getObject(req.profile, _id, { ignoreDeletion, queryModif }));

            return next.handle().pipe(
                map(data => {
                    res.responseObject.result = data;
                    console.log('>>> AFTER  GetInstanceInterceptor', res.responseObject);

                    return res.responseObject;
                })
            );
        }
    }

    return GetInstanceInterceptor;
};
