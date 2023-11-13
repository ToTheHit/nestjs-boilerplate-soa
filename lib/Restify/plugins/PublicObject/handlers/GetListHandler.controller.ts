import {
    Body,
    Controller, Delete, Get, Param, Patch, Post, Query, Req, UseInterceptors
} from '@nestjs/common';
import GetListObjects from '@restify/getListObjects';
import { RequestValidatorDecorator } from '@restify/validators/RequestValidator';
import MagicModel from '@models/MagicModel';
import { ApiTags } from '@nestjs/swagger';
import autoDocs from '@srvDoc/decorators/autoDoc';
import buildSchema from '@restify/utils/buildSchema';
import { removeObjectsList } from '@restify/utils/removeMethod';

export default (Model: MagicModel) => {
    @Controller()
    @ApiTags(Model.getPublicName())
    class PublicObjectGetList {
        @Get('/')
        @UseInterceptors(GetListObjects(Model, false))
        @RequestValidatorDecorator(
            {
                additionalValidation: {
                    test33: {
                        type: [{
                            sessionIdTTT: {
                                type: String,
                                default: null
                            }
                        }]
                    },
                    skipInner: {
                        type: Boolean
                    },
                    fields: {
                        type: [String],
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
        async getHandler(
            @Req() req,
            @Query() query
        ) {
            const objects = await Model.getObjectsList(req.profile, query, req.queryModif, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, objects, req.baseObject, query);
        }

        @Get('/random')
        @UseInterceptors(GetListObjects(Model, false))
        @RequestValidatorDecorator(
            {
                additionalValidation: {
                    limit: {
                        type: Number,
                        default: 1,
                        min: 1,
                        max: 100
                    },
                    skipInner: {
                        type: Boolean,
                        default: false
                    },
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
        async getRandomHandler(
            @Req() req,
            @Query() query
        ) {
            const objects = await Model.getObjectsListRandom(req.profile, query, {}, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, objects, req.baseObject, query);
        }

        @Get('/filter')
        @UseInterceptors(GetListObjects(Model, false))
        getFilterHandler(
            @Param('collectionName') collectionName
        ) {
            return `PublicObject FILTER ${collectionName} route`;
        }

        @Get('/count')
        @UseInterceptors(GetListObjects(Model, false))
        getCountHandler(
            @Req() req
        ) {
            return Model.getObjectsCount(
                req.profile,
                req.query,
                {},
                req.baseObject
            );
        }

        @Post('/')
        @autoDocs({
            apiOperation: { summary: 'Create', description: 'create object' },
            apiOkResponse: { Model }
        })
        @UseInterceptors(GetListObjects(Model, false))
        @RequestValidatorDecorator({}, { additionalValidation: buildSchema(Model, 'create') })
        async createHandler(
            @Req() req,
            @Body() body
        ) {
            const answer = await Model.createObjectsHandler(req.profile, body, req.baseObject);

            return Array.isArray(answer)
                ? Model.getObjectsInfoPublic(req.profile, answer, req.baseObject)
                : answer.getObjectInfoPublic(req.profile);
        }

        @Patch('/')
        @UseInterceptors(GetListObjects(Model, false))
        @RequestValidatorDecorator({}, { additionalValidation: buildSchema(Model, 'update') })
        async updateHandler(
            @Req() req,
            @Body() body,
            @Query() query
        ) {
            const objects = await Model.updateObjectsList(req.profile, query, body, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, objects, req.baseObject);
        }

        @Delete('/')
        @UseInterceptors(GetListObjects(Model, false))
        async deleteHandler(
            @Req() req
        ) {
            return removeObjectsList(Model, req);
        }
    }

    return PublicObjectGetList;
};
