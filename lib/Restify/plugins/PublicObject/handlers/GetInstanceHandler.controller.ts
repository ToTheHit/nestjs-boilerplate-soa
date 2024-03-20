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
import autoDocs from '@srvDoc/decorators/autoDoc';
import GetInstanceInterceptor from '../../../Interceptors/getInstanceObject';

export default (Model: MagicModel) => {
    @Controller()
    @ApiTags(Model.getPublicName())
    class PublicObjectGetInstance {
        @Get(':_id')
        @autoDocs({
            apiOperation: { summary: 'Get instance' },
            apiOkResponse: { Model }
        })
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

        @Patch(':_id')
        @autoDocs({
            apiOperation: { summary: 'Update instance' },
            apiOkResponse: { Model }
        })
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
        @autoDocs({
            apiOperation: { summary: 'Delete instance' },
            apiOkResponse: { Model }
        })
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
