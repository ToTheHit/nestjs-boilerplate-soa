import {
    CallHandler, ExecutionContext, Injectable
} from '@nestjs/common';
import { map } from 'rxjs';

import MagicSchema from '../../../srv-db/models/MagicSchema';
import RequestWithTokenInterceptor from './RequestWithTokenInterceptor';

export default fromInstance => {
    @Injectable()
    class GetInstanceTopLevelObject<T> extends RequestWithTokenInterceptor<T> {
        async intercept(_context:ExecutionContext, next: CallHandler) {
            await super.intercept(_context, next);
            const req = _context.switchToHttp().getRequest();
            const res = _context.switchToHttp().getResponse();

            if (req.useBaseObject) {
                const collectionName = req.requestParam('collectionName');
                const collectionNameBase = req.requestParam('collectionName', 1);
                const _shortId = req.requestParam('_shortId', fromInstance ? 1 : 0);
                const _id = req.requestParam('_id', fromInstance ? 1 : 0);
                const _wsId = req.requestParam('_wsId');
                const queryModif = (collectionName !== 'ws') && _wsId && _wsId.length
                    ? { _wsId }
                    : {};

                const BaseModel = MagicSchema.modelByCollectionName(collectionNameBase, true);

                req.baseObject = req.useBaseObject === 'model'
                    ? BaseModel
                    : await (_shortId
                        ? BaseModel.getObjectByShortId(req.profile, _shortId, { queryModif })
                        : BaseModel.getObject(req.profile, _id, { queryModif }));

                if (req.useBaseObject !== 'model') {
                    await req.profile.checkAccessRights(req.baseObject, 'read');
                }
            }

            return next.handle().pipe(
                map(data => {
                    res.responseObject.result = data;

                    return res.responseObject;
                })
            );
        }
    }

    return GetInstanceTopLevelObject;
};
