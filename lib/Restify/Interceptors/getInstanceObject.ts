import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { map } from 'rxjs';
import getListObjects from '@restify/getListObjects';
import MagicModel from '@models/MagicModel';
import MagicSchema from '../../../srv-db/models/MagicSchema';

export default (Model: MagicModel, ignoreDeletion: boolean) => {
    @Injectable()
    class GetInstanceInterceptor<T> extends getListObjects(Model, true)<T> {
        async intercept(_context: ExecutionContext, next: CallHandler) {
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

            const targetModel = MagicSchema.modelByCollectionName(collectionName, true);

            req.currentObject = await (_shortId
                ? targetModel.getObjectByShortId(req.profile, _shortId, { ignoreDeletion, queryModif })
                : targetModel.getObject(req.profile, _id, { ignoreDeletion, queryModif }));

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
