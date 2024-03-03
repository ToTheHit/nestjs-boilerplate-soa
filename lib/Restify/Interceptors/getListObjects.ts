import {
    CallHandler, ExecutionContext, Injectable
} from '@nestjs/common';
import { map } from 'rxjs';

import MagicModel from '@models/MagicModel';
import MagicSchema from '../../../srv-db/models/MagicSchema';
import RequestWithTokenInterceptor from './RequestWithTokenInterceptor';

const collectionNameRegExp = /:collectionName\((.*?)\)/ig;
const shortIdRegExp = /:shortId\((.*?)\)/ig;
const idRegExp = /:_id\((.*?)\)/ig;

export default (Model: MagicModel, fromInstance: boolean) => {
    @Injectable()
    class GetInstanceTopLevelObject<T> extends RequestWithTokenInterceptor<T> {
        async intercept(_context:ExecutionContext, next: CallHandler) {
            await super.intercept(_context, next);
            const req = _context.switchToHttp().getRequest();
            const res = _context.switchToHttp().getResponse();

            if (Model.useBaseObject()) {
                const collectionName = req.requestParam('collectionName');
                const collectionNames = [...req.route.path.matchAll(collectionNameRegExp)]
                    .map(match => match[1]);
                const collectionNameBase = collectionNames[collectionNames.length - (fromInstance ? 2 : 1)];
                const _shortIds = [...req.route.path.matchAll(shortIdRegExp)]
                    .map(match => match[1]);
                const _shortId = _shortIds[_shortIds.length - (fromInstance ? 2 : 1)];
                const _ids = [...req.route.path.matchAll(idRegExp)]
                    .map(match => match[1]);
                const _id = _ids[_ids.length - (fromInstance ? 2 : 1)];
                const _wsId = req.requestParam('_wsId');
                const queryModif = (collectionName !== 'ws') && _wsId && _wsId.length
                    ? { _wsId }
                    : {};

                const BaseModel = MagicSchema.modelByCollectionName(collectionNameBase, true);

                req.baseObject = Model.useBaseObject === 'model'
                    ? BaseModel
                    : await (_shortId
                        ? BaseModel.getObjectByShortId(req.profile, _shortId, { queryModif })
                        : BaseModel.getObject(req.profile, _id, { queryModif }));

                if (Model.useBaseObject !== 'model') {
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
