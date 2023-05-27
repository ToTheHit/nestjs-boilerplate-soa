import {
    Controller,
    Get,
    Param,
    UseInterceptors
} from '@nestjs/common';
import GetInstanceInterceptor from '../../../Interceptors/getInstanceObject';

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
