import {
    CallHandler,
    Controller, ExecutionContext,
    Get, Injectable, NestInterceptor,
    Param, Req, SetMetadata, UseInterceptors
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import GetInstanceInterceptor from '../../../../lib/Restify/Interceptors/getInstanceObject';
import ResponseType from '../../../../lib/Restify/utils/responseType';

@Controller()
export default class PublicObjectGetInstance {
    @Get(':_id')
    @UseInterceptors(GetInstanceInterceptor(true))
    // @ResponseType('simple')
    getHandler(
        @Param('_id') _id
    ) {
        return { res: `PublicObject INSTANCE ${_id} route` };
    }
}
