import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import SmartySchema from '../../../srv-db/models/SmartySchema';
import {
    AnswerBinary,
    AnswerEmpty,
    AnswerRawJson,
    AnswerRedirect, AnswerRegular,
    AnswerRender, AnswerSimple,
    AnswerStream
} from '../handlers/answers';
import { ValidationError } from '../../errors';

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
    class GetInstanceInterceptor<T> implements NestInterceptor<T, Response> {
        // eslint-disable-next-line @typescript-eslint/no-empty-function,no-useless-constructor
        constructor(public reflector: Reflector) {}

        async intercept(_context: ExecutionContext, next: CallHandler) {
            console.log('>>>> BEFORE');
            const req = _context.switchToHttp().getRequest();
            const res = _context.switchToHttp().getResponse();

            const collectionName = req.requestParam('collectionName');
            const _shortId = req.requestParam('_shortId');
            const _id = req.requestParam('_id');
            const _wsId = req.requestParam('_wsId');

            const queryModif = (collectionName !== 'ws') && _wsId && _wsId.length
                ? { _wsId }
                : {};

            const Model = SmartySchema.modelByCollectionName(collectionName, true);

            //
            // req.currentObject = await (_shortId
            //     ? Model.getObjectByShortId(req.profile, _shortId, { ignoreDeletion, queryModif })
            //     : Model.getObject(req.profile, _id, { ignoreDeletion, queryModif }));
            // console.log('Before...');

            // return next.handle();

            return next.handle().pipe(
                map(data => {
                    res.responseObject.result = data;

                    return res.responseObject;
                })
            );
        }
    }

    return GetInstanceInterceptor;
};
