import {
    Body,
    Controller, Delete,
    Get,
    Param, Patch, Post, Req,
    UseInterceptors
} from '@nestjs/common';
import { removeObject } from '@restify/utils/removeMethod';
import { RequestValidatorDecorator } from '@restify/validators/RequestValidator';
import getInstanceInfo from '@restify/utils/getInstanceInfo';
import buildSchema from '@restify/utils/buildSchema';
import { ApiTags } from '@nestjs/swagger';
import MagicModel from '@models/MagicModel';
import GetInstanceInterceptor from '../../../Interceptors/getInstanceObject';

export default (Model: MagicModel) => {
    @Controller()
    @ApiTags(Model.getPublicName())
    class PublicObjectGetInstance {
        @Get(':_id')
        @UseInterceptors(GetInstanceInterceptor(Model, true))
        @RequestValidatorDecorator(
            {
                additionalValidation: {
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
                }
            },
            {}
        )
        getHandler(
            @Req() req,
            @Param('_id') _id
        ) {
            return getInstanceInfo(req);
        }

        @Post(':_id')
        @UseInterceptors(GetInstanceInterceptor(Model, true))
        @RequestValidatorDecorator({}, { additionalValidation: buildSchema(Model, 'create') })
        async createHandler(
            @Req() req,
            @Body() body,
            @Param('_id') _id
        ) {
            const answer = await Model.createObjectsHandler(req.profile, body, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, answer, req.baseObject);
        }

        @Patch(':_id')
        @UseInterceptors(GetInstanceInterceptor(Model, true))
        @RequestValidatorDecorator({}, { additionalValidation: buildSchema(Model, 'update') })
        async updateHandler(
            @Req() req,
            @Body() body,
            @Param('_id') _id
        ) {
            await req.currentObject.updateObject(req.profile, body, req.baseObject);

            return getInstanceInfo(req);
        }

        @Delete(':_id')
        @UseInterceptors(GetInstanceInterceptor(Model, true))
        deleteHandler(
            @Req() req,
            @Param('_id') _id
        ) {
            return removeObject(Model, req);
        }
    }

    return PublicObjectGetInstance;
};
