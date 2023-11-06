import {
    Body,
    Controller, Delete,
    Get,
    Param, Patch, Post, Req,
    UseInterceptors, UsePipes
} from '@nestjs/common';
import { removeObject } from '@restify/utils/removeMethod';
import RequestValidator from '@restify/validators/RequestValidator';
import getInstanceInfo from '@restify/utils/getInstanceInfo';
import buildSchema from '@restify/utils/buildSchema';
import GetInstanceInterceptor from '../../../Interceptors/getInstanceObject';

export default Model => {
    @Controller()
    class PublicObjectGetInstance {
        @Get(':_id')
        @UseInterceptors(GetInstanceInterceptor(true))
        @UsePipes(RequestValidator({
            fields: {
                type: [String],
                default: undefined,
                validate: {
                    async validator(valueRaw) {
                        const { profile } = this.ctx();

                        if (!Array.isArray(valueRaw) || valueRaw.length === 0) {
                            return false;
                        }

                        const editableFields = await Model.getEditableFields(profile, 'read');

                        return valueRaw.every(field => editableFields.includes(field));
                    }
                }
            }
        }, null))
        getHandler(
            @Req() req,
            @Param('_id') _id
        ) {
            return getInstanceInfo(req);
        }

        @Post(':_id')
        @UseInterceptors(GetInstanceInterceptor(true))
        @UsePipes(RequestValidator(null, buildSchema(Model, 'create')))
        async createHandler(
            @Req() req,
            @Body() body,
            @Param('_id') _id
        ) {
            const answer = await Model.createObjectsHandler(req.profile, body, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, answer, req.baseObject);
        }

        @Patch(':_id')
        @UseInterceptors(GetInstanceInterceptor(true))
        @UsePipes(RequestValidator(null, buildSchema(Model, 'update')))
        async updateHandler(
            @Req() req,
            @Body() body,
            @Param('_id') _id
        ) {
            await req.currentObject.updateObject(req.profile, body, req.baseObject);

            return getInstanceInfo(req);
        }

        @Delete(':_id')
        @UseInterceptors(GetInstanceInterceptor(true))
        @UsePipes(RequestValidator({}, null))
        deleteHandler(
            @Req() req,
            @Param('_id') _id
        ) {
            return removeObject(Model, req);
        }
    }

    return PublicObjectGetInstance;
};
