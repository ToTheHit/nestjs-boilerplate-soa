import {
    Body,
    Controller, Delete, Get, Param, Patch, Post, Query, Req, UseInterceptors, UsePipes
} from '@nestjs/common';
import GetListObjects from '@restify/getListObjects';
import RequestValidator from '@restify/validators/RequestValidator';
import { removeObjectsList } from '@restify/utils/removeMethod';
import buildSchema from '@restify/utils/buildSchema';

export default Model => {
    @Controller()
    class PublicObjectGetList {
        @Get('/')
        @UseInterceptors(GetListObjects(false))
        @UsePipes(RequestValidator({
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
        }, null))
        async getHandler(
            @Req() req,
            @Query() query
        ) {
            const objects = await Model.getObjectsList(req.profile, query, req.queryModif, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, objects, req.baseObject, query);
        }

        @Get('/random')
        @UseInterceptors(GetListObjects(false))
        @UsePipes(RequestValidator({
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
        }, null))
        async getRandomHandler(
            @Req() req,
            @Query() query
        ) {
            const objects = await Model.getObjectsListRandom(req.profile, query, {}, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, objects, req.baseObject, query);
        }

        @Get('/filter')
        @UseInterceptors(GetListObjects(false))
        getFilterHandler(
            @Param('collectionName') collectionName
        ) {
            return `PublicObject FILTER ${collectionName} route`;
        }

        @Get('/count')
        @UseInterceptors(GetListObjects(false))
        @UsePipes(RequestValidator({}, null))
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
        @UseInterceptors(GetListObjects(false))
        @UsePipes(RequestValidator(null, buildSchema(Model, 'create')))
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
        @UseInterceptors(GetListObjects(false))
        @UsePipes(RequestValidator(null, buildSchema(Model, 'update')))
        async updateHandler(
            @Req() req,
            @Body() body,
            @Query() query
        ) {
            const objects = await Model.updateObjectsList(req.profile, query, body, req.baseObject);

            return Model.getObjectsInfoPublic(req.profile, objects, req.baseObject);
        }

        @Delete('/')
        @UseInterceptors(GetListObjects(false))
        @UsePipes(RequestValidator({}, null))
        async deleteHandler(
            @Req() req
        ) {
            return removeObjectsList(Model, req);
        }
    }

    return PublicObjectGetList;
};
