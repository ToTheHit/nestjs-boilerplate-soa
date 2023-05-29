import mongoose from 'mongoose';
import { NotFoundError } from 'rxjs';

import { TSmartyObject } from '../SmartyObject';
import SmartySchema, { TSmartySchemaStatic, TObjectId } from '../../SmartySchema';
import securedFieldsList from '../../../lib/securedFieldsList';
import {
    getObjectKeysWithValuesByObject, getObjectsDiff, omit, pick, reduceToObject
} from '../../../../lib/utils/fn';
import { TFilterValidator } from '../../../../lib/Restify/validators/plugins/FilterValidator';
import { BadRequest, ForbiddenError, ValidationError } from '../../../../lib/errors';
import isDeleted from '../../../lib/isDeleted';
import { TShortId } from '../ShortId';
import { IGetterQuery, IRequest } from '../../../../lib/interface';
import SmartyDocument from '../../SmartyDocument';
import CheckAccessRights, { TCheckAccessRights } from './CheckAccessRights';

const disableGlobalId = Symbol('disableGlobalId');
const defaultSortOrder = Symbol('defaultSortOrder');
const defaultIdField = Symbol('defaultIdField');
const apiPrefix = Symbol('API_PREFIX');
const sortFieldVariants = Symbol('sortFieldVariants');
const sortFieldsFromOtherCollections = Symbol('sortFieldsFromOtherCollections');
const serializedSortFieldsFromOtherCollections = Symbol('serializedSortFieldsFromOtherCollections');
const defaultSortField = Symbol('defaultSortField');
const disableGetWholeCollection = Symbol('disableGetWholeCollection');
const allowedAttachedFilesType = Symbol('allowedAttachedFilesType');

const buildSortQuery = (sortField, sortDirection) => {
    const sortQuery = {};

    if (!Array.isArray(sortField)) {
        sortField = [sortField];
    }
    const isGlobalSortDirection = !Array.isArray(sortDirection);

    sortField.forEach((field, index) => {
        let direction = 1;

        if (isGlobalSortDirection) {
            direction = sortDirection === 'asc' ? 1 : -1;
        } else {
            direction = sortDirection[index] === 'asc' ? 1 : -1;
        }

        sortQuery[field] = direction;
    });

    return sortQuery;
};

const getCollectionsForAggregate = (sortQuery, fieldsFromOtherCollection) => {
    const collections = {};

    if (!fieldsFromOtherCollection) {
        return null;
    }

    for (const field in sortQuery) {
        if (fieldsFromOtherCollection[field]) {
            if (collections[fieldsFromOtherCollection[field]]) {
                collections[fieldsFromOtherCollection[field]].push(field);
            } else {
                collections[fieldsFromOtherCollection[field]] = [field];
            }
            // collections[field].add(fieldsFromOtherCollection[field]);
        }
    }
    if (Object.keys(collections).length) {
        return collections;
    }

    return null;
};

const getAggregationQuery = (dbQuery, collectionsForAggregate, sortQuery, fieldsFromOtherCollections, project = []) => {
    const aggregateQuery = [];
    const sortQueryForAggregation = {};

    for (const collection in collectionsForAggregate) {
        const $project = {};

        for (const field of collectionsForAggregate[collection]) {
            $project[field] = 1;
            sortQueryForAggregation[`additionalFields_${collection}.${field}`] = sortQuery[field];
        }
        const { localField } = fieldsFromOtherCollections[collection];

        aggregateQuery.push({
            $match: dbQuery
        });
        aggregateQuery.push({
            $lookup: {
                from: collection,
                localField,
                foreignField: '_id',
                pipeline: [
                    {
                        $limit: 1
                    },
                    {
                        $project
                    }
                ],
                as: `additionalFields_${collection}`
            }
        });
        aggregateQuery.push({
            $unwind: `$additionalFields_${collection}`
        });
    }
    aggregateQuery.push({ $sort: sortQueryForAggregation });

    const projectQuery = {};

    for (const field of project) {
        projectQuery[field] = 1;
    }

    if (Object.keys(projectQuery).length) {
        aggregateQuery.push({ $project: projectQuery });
    }

    return aggregateQuery;
};

interface IGetObjectsInfoQuery {
  skipInner?: boolean;
  fields?: string[];
  publicInfo?: boolean;
}

// eslint-disable-next-line no-use-before-define
class PublicInterfaceObject extends mongoose.Model<PublicInterfaceObject> {
    private Model: TSmartySchemaStatic & mongoose.Model<any>;

    // FIXME: !!! Прокинуть схему юзера
    static async findObjectByUser(user, _id: TObjectId) {
        const instance = await this.findOne({ [this.idField()]: _id });

        if (!instance) {
            throw new NotFoundError(`${(<TSmartyObject><unknown> this).getPublicName()} not found`);
        }

        const employee = await user.getWsAccess(instance._wsId);

        return { employee, instance };
    }

    static async getEditableFields(profile, method) {
        const self = this as unknown as SmartySchema;
        const securedFields = await securedFieldsList(this.schema.paths, profile, method, false);

        return (
            Object.keys(this.schema.paths)
                .filter(field => !securedFields.includes(field))
            // .concat(self.is('CalculatedFields') ? this.calculatedFields() : []); // FIXME: !!! CalculatedFields
                .concat(self.is('CalculatedFields') ? [] : [])
        );
    }

    static async getObjectsInfo(profile, objectsList, baseObject = null, query: IGetObjectsInfoQuery = {}) {
        if (objectsList.list) {
            // если у нас пагинация, то данные придут в таком виде. TODO: перенести на верхний уровень!
            return {
                ...objectsList,
                list: await this.getObjectsInfo(profile, objectsList.list, baseObject, query)
            };
        }

        if (objectsList.length === 0) {
            return [];
        }

        const { skipInner = false, fields: fieldsToGet, publicInfo = false } = query || {};

        const self = this as unknown as TSmartySchemaStatic;
        const securedFields = await securedFieldsList(
            self.describe(false, false),
            profile,
            'read',
            false,
            true,
            publicInfo
        );

        const filteredFields = Array.isArray(fieldsToGet) && fieldsToGet.length > 0 ? ['_id', ...fieldsToGet] : null;

        const result = reduceToObject(objectsList, (res, obj) => {
            res[obj._id] = filteredFields ? pick(obj, filteredFields) : obj;

            return res;
        });

        await self.emitModelEvent('pre-info', profile);

        await self.emitModelEvent('objects-info', profile, result, objectsList, skipInner, baseObject, fieldsToGet);
        for (const id of Object.keys(result)) {
            result[id] = omit(result[id], securedFields);
        }

        return Object.values(result);
    }

    static async getObjectsInfoPublic(profile, objectsList, baseObject = null, query = {}) {
        const self = this as unknown as TSmartySchemaStatic;

        // TODO: Сделать логику флага publicInfo более адекватной и понятной...
        const answer = await this.getObjectsInfo(profile, objectsList, baseObject, { publicInfo: true, ...query });

        await self.emitModelEvent('pre-answer', profile);

        return answer;
    }

    static async buildGetterQuery(
        profile,
        baseObject = null,
        request = {} as IRequest,
        method = 'read',
        ignoreAccessQuery = false,
        queryModif: IGetterQuery = {}
    ): Promise<IGetterQuery> {
        const filterQuery =
      request && request instanceof SmartyDocument && request.buildFilterQuery ? request.buildFilterQuery(this) : null;

        const accessQuery = !ignoreAccessQuery
            ? await (this as unknown as TCheckAccessRights).buildAccessQuery(profile, method, baseObject)
            : {};
        const basicQuery = getObjectKeysWithValuesByObject(
            (this as unknown as TSmartyObject).basicDataBuilder(profile, method, baseObject)
        );
        const query: IGetterQuery = {};

        if (accessQuery.$or) {
            query.$or = [];
            if (queryModif.$or) {
                const $or = [];

                accessQuery.$or.forEach(dbQueryOr => {
                    queryModif.$or.forEach(queryModifOr => {
                        const orObj = { ...dbQueryOr, ...basicQuery, ...queryModifOr };

                        for (const field in filterQuery) {
                            if (orObj[field]) {
                                const orObjFieldValue = orObj[field];

                                delete orObj[field];

                                if (!orObj.$and) {
                                    orObj.$and = [];
                                }

                                orObj.$and.push(
                                    {
                                        [field]: filterQuery[field]
                                    },
                                    {
                                        [field]: orObjFieldValue
                                    }
                                );

                                Object.assign(orObj, { [field]: filterQuery[field] });
                            } else {
                                Object.assign(orObj, { [field]: filterQuery[field] });
                            }
                        }

                        $or.push(orObj);
                    });
                });

                // eslint-disable-next-line no-param-reassign
                delete queryModif.$or;
                for (let orQuery of accessQuery.$or) {
                    orQuery = Object.assign(orQuery, queryModif);
                }
                Object.assign(query, { $or });
            } else {
                const additionalAccessQuery: IGetterQuery = {};

                Object.assign(additionalAccessQuery, accessQuery);

                delete additionalAccessQuery.$or;

                accessQuery.$or.forEach(dbQueryOr => {
                    const orObj = {
                        ...dbQueryOr,
                        ...basicQuery,
                        ...additionalAccessQuery,
                        ...queryModif,
                        ...(request.ids ? { _id: { $in: request.ids } } : {})
                    };

                    for (const field in filterQuery) {
                        if (orObj[field]) {
                            const orObjFieldValue = orObj[field];

                            delete orObj[field];

                            if (!orObj.$and) {
                                orObj.$and = [];
                            }

                            orObj.$and.push(
                                {
                                    [field]: filterQuery[field]
                                },
                                {
                                    [field]: orObjFieldValue
                                }
                            );
                        } else {
                            Object.assign(orObj, { [field]: filterQuery[field] });
                        }
                    }

                    query.$or.push(orObj);
                });
            }
        } else {
            Object.assign(query, accessQuery, basicQuery, filterQuery || {}, queryModif);
        }

        return query;
    }

    static idField() {
        return this.schema[defaultIdField];
    }

    static sortField() {
        return this.schema[defaultSortField];
    }

    static sortFieldVariants() {
        const fields = [...(this.schema[sortFieldVariants] || []), this.schema[defaultSortField]];

        if (this.schema[serializedSortFieldsFromOtherCollections]) {
            fields.push(...Object.keys(this.schema[serializedSortFieldsFromOtherCollections]));
        }

        return fields;
    }

    static allowedAttachedFilesType() {
        return this.schema[allowedAttachedFilesType];
    }

    async toAnswer(profile) {
        const constructor = this.constructor as unknown as mongoose.Model<PublicInterfaceObject>;
        const securedFields = await securedFieldsList(constructor.schema.paths, profile, 'read', false);

        const data = this.toJSON();

        return omit(data, securedFields);
    }

    async getObjectInfo(profile, fieldsToGet = []) {
        const answer = await this.toAnswer(profile);
        const constructor = this.constructor as unknown as TSmartySchemaStatic;

        // TODO: Понятия не имею сработает ли вариант для pre-info. Нужно будет проверить.
        await constructor.emitModelEvent('pre-info', profile);
        await constructor.emitModelEvent('instance-info', profile, answer, this, fieldsToGet);

        return Array.isArray(fieldsToGet) && fieldsToGet.length > 0 ? pick(answer, fieldsToGet) : answer;
    }

    async getObjectInfoPublic(profile, fieldsToGet = [], ignoreRights = false) {
        if (!ignoreRights) {
            await profile.checkAccessRights(this, 'read');
        }

        const constructor = this.constructor as unknown as TSmartySchemaStatic;

        const answer = await this.getObjectInfo(profile, fieldsToGet);

        await constructor.emitModelEvent('pre-answer', profile);

        return answer;
    }

    getPublicInfo() {
        const constructor = this.constructor as unknown as mongoose.Model<PublicInterfaceObject>;

        const schemaPaths = constructor.schema.paths;
        const publicFields = Object.keys(schemaPaths).filter(key => schemaPaths[key].options.public);

        const data = this.toJSON();

        return pick(data, Array.from(publicFields));
    }
}

interface IGetObjectOptions {
  ignoreDeletion?: boolean;
  queryModif?: object;
}
class PublicInterfaceController extends PublicInterfaceObject {
    static async getPublicObjectByUser(user, _id) {
        if (this.schema[disableGlobalId]) {
            throw new ForbiddenError('global instance getter disabled');
        }

        if (!SmartySchema.ObjectId.isValid(_id)) {
            throw new ValidationError('invalid id', { _id });
        }

        const { employee, instance } = await this.findObjectByUser(user, _id);

        return {
            employee,
            instance: await instance.getObjectInfo(employee)
        };
    }

    static async getObjectLowLevel(profile, queryModif = {}, ignoreDeletion = false) {
        const query = {};

        Object.assign(query, queryModif, isDeleted(this, ignoreDeletion));
        const instance = await this.findOne(query);

        if (!instance) {
            throw new NotFoundError(`${(this as unknown as TSmartyObject).getPublicName()} not found`);
        }

        return instance;
    }

    static async getObject(profile, _id, options: IGetObjectOptions = {}) {
        const { ignoreDeletion = false, queryModif = {} } = options;

        if (profile instanceof this && !_id && profile._id.equals(_id)) {
            return profile;
        }

        if (!SmartySchema.ObjectId.isValid(_id)) {
            throw new ValidationError('invalid id', { _id });
        }

        Object.assign(queryModif, { [this.idField()]: _id });

        return this.getObjectLowLevel(profile, queryModif, ignoreDeletion);
    }

    static async getObjectByShortId(profile, shortId, options: IGetObjectOptions = {}) {
        const { ignoreDeletion = false, queryModif = {} } = options;

        if (profile instanceof this && (!shortId || `${profile.shortId}` === `${shortId}`)) {
            return profile;
        }

        if (!Number.isInteger(+shortId)) {
            throw new ValidationError('invalid shortId', { shortId });
        }

        Object.assign(queryModif, { [(this as TShortId).shortIdField()]: parseInt(shortId, 10) });

        return this.getObjectLowLevel(profile, queryModif, ignoreDeletion);
    }

    static async getObjectsListLowLevel(
        profile,
        request = {} as IRequest,
        queryModif = {},
        baseObject = null,
        sort = false,
        plain = true,
        ignoreDeletion = false,
        method = 'read'
    ) {
        const query = await this.buildGetterQuery(profile, baseObject, request, method, false, {
            ...queryModif,
            ...isDeleted(this, ignoreDeletion)
        });

        let cursor = this.find(query);

        const sortKey = { [this.sortField()]: this.schema[defaultSortOrder] };

        if (sort !== false) {
            cursor = cursor.sort(sortKey);
        }

        const result = await (plain ? cursor.lean() : cursor);

        return result;
    }

    static async getObjectsListByIds(
        profile,
        ids = [],
        request = {} as IRequest,
        queryModif = {},
        baseObject = null,
        sort = false,
        plain = true,
        ignoreDeletion = false,
        method
    ) {
        return !Array.isArray(ids) || ids.length === 0
            ? []
            : this.getObjectsListLowLevel(
                profile,
                request,
                {
                    ...queryModif,
                    [this.idField()]: { $in: ids }
                },
                baseObject,
                sort,
                plain,
                ignoreDeletion,
                method
            );
    }

    static async getObjectsCount(
        profile,
        request = {} as IRequest,
        queryModif: IGetterQuery = {},
        baseObject = null,
        method
    ) {
        if (queryModif._id && (queryModif._id.length === 0 || queryModif._id.$in?.length === 0)) {
            return 0;
        }
        const dbQuery = await this.buildGetterQuery(profile, baseObject, request, method, false, queryModif);

        return this.countDocuments(dbQuery);
    }

    static async getObjectsListByPage(
        profile,
        request,
        queryModif = {},
        baseObject = null,
        ignoreDeletion = false,
        method,
        ignoreAccessQuery = false
    ) {
        const { pagination } = request;

        let { anchor } = pagination;
        const {
            anchor_direction: anchorDirection, limit, page, sort, order_by: sortField = this.sortField()
        } = pagination;
        const sortQuery = buildSortQuery(sortField, sort);

        let objects = [];

        const customQuery = {};

        Object.assign(customQuery, queryModif, isDeleted(this, ignoreDeletion));

        const dbQuery = await this.buildGetterQuery(profile, baseObject, request, method, ignoreAccessQuery, customQuery);

        const collectionsForAggregate = getCollectionsForAggregate(
            sortQuery,
            this.schema[serializedSortFieldsFromOtherCollections]
        );

        if (!anchor && anchor !== 0 && page > 1) {
            let firstObject;

            if (collectionsForAggregate) {
                const aggregateQuery = getAggregationQuery(
                    dbQuery,
                    collectionsForAggregate,
                    sortQuery,
                    this.schema[sortFieldsFromOtherCollections],
                    ['objIndex']
                );

                aggregateQuery.push(...[{ $limit: 1 }]);
                firstObject = await this.aggregate(aggregateQuery)[0];
            } else {
                firstObject = await this.findOne(dbQuery).sort(sortQuery).select('objIndex').lean();
            }

            if (firstObject) {
                anchor = firstObject.objIndex || 0;
            }
        }

        if (anchor) {
            Object.assign(dbQuery, { objIndex: { [anchorDirection === 'asc' ? '$lte' : '$gte']: anchor } });
        }

        const totalObjects = await this.countDocuments(dbQuery);

        if (totalObjects > 0) {
            // TODO: !!! Проверить и Оптимизировать !!! Набросал на скорую руку сортировку по полям,
            //  которые находятся в другой коллекции. Работает, но чувствую, что есть какие-то граничные кейсы,
            //  на которых что-то отвалится/перетрётся
            if (collectionsForAggregate) {
                const aggregateQuery = getAggregationQuery(
                    dbQuery,
                    collectionsForAggregate,
                    sortQuery,
                    this.schema[sortFieldsFromOtherCollections]
                );

                aggregateQuery.push(...[{ $skip: (page - 1) * limit }, { $limit: limit }]);

                objects = await this.aggregate(aggregateQuery);
                // Удаляем системные поля, которые были нужны для сортировки
                for (const object of objects) {
                    for (const collection in collectionsForAggregate) {
                        delete object[`additionalFields_${collection}`];
                    }
                }
            } else {
                objects = await this.find(dbQuery)
                    .sort(sortQuery)
                    .skip((page - 1) * limit)
                    .limit(+limit)
                    .lean();
            }

            if (page > 1 && objects.length === 0) {
                throw new NotFoundError('page not found');
            }

            if (page === 1 && !anchor) {
                anchor = objects[0].objIndex;
            }
        }

        return {
            page,
            pages: Math.ceil(totalObjects / limit),
            anchor: (anchor || 0).toString(),
            totalObjects,
            objects
        };
    }

    static async getObjectsListByCount(
        profile,
        request: IRequest,
        queryModif: IGetterQuery = {},
        baseObject = null,
        ignoreDeletion = false
    ) {
        const { pagination } = request;

        const {
            skip, limit, order_by: sortField = this.sortField(), sort
        } = pagination;
        const sortQuery = buildSortQuery(sortField, sort);
        const collectionsForAggregate = getCollectionsForAggregate(
            sortQuery,
            this.schema[serializedSortFieldsFromOtherCollections]
        );

        let objects = [];

        const customQuery = {};

        Object.assign(customQuery, queryModif, isDeleted(this, ignoreDeletion));

        const query = await this.buildGetterQuery(profile, baseObject, request, 'read', false, customQuery);

        const totalObjects = await this.countDocuments(query);

        if (totalObjects > 0) {
            if (collectionsForAggregate) {
                const aggregateQuery = getAggregationQuery(
                    query,
                    collectionsForAggregate,
                    sortQuery,
                    this.schema[sortFieldsFromOtherCollections]
                );

                aggregateQuery.push(...[{ $skip: skip }, { $limit: limit }]);

                objects = await this.aggregate(aggregateQuery);
                // Удаляем системные поля, которые были нужны для сортировки
                for (const object of objects) {
                    for (const collection in collectionsForAggregate) {
                        delete object[`additionalFields_${collection}`];
                    }
                }
            } else {
                objects = await this.find(query).sort(sortQuery).skip(skip).limit(limit)
                    .lean();
            }

            if (skip > 1 && objects.length === 0) {
                throw new NotFoundError('page not found');
            }
        }

        return {
            skip,
            totalObjects,
            objects
        };
    }

    static async getObjectsListPageable(
        profile,
        request: IRequest,
        queryModif: IGetterQuery = {},
        baseObject = null,
        ignoreDeletion = false,
        method,
        ignoreAccessQuery = false
    ) {
        const { pagination } = request;

        const { totalObjects, objects, ...answer } = await (pagination.page
            ? this.getObjectsListByPage(profile, request, queryModif, baseObject, ignoreDeletion, method, ignoreAccessQuery)
            : this.getObjectsListByCount(profile, request, queryModif, baseObject, ignoreDeletion));

        return {
            ...answer,
            objects: totalObjects,
            total: totalObjects,
            list: objects
        };
    }

    static async getObjectsList(
        profile,
        query: IRequest,
        queryModif: IGetterQuery = {},
        baseObject = null,
        ignoreDeletion = false,
        method
    ) {
        if (query) {
            if (query.pagination) {
                return this.getObjectsListPageable(profile, query, queryModif, baseObject, ignoreDeletion, method);
            }

            if (Array.isArray(query.ids)) {
                return this.getObjectsListByIds(
                    profile,
                    query.ids,
                    query,
                    queryModif,
                    baseObject,
                    true,
                    true,
                    ignoreDeletion,
                    method
                );
            }
        }

        if (this.schema[disableGetWholeCollection] && ['production', 'test'].includes(process.env.NODE_ENV)) {
            throw new BadRequest('Getting the whole collection is disabled');
        }

        return this.getObjectsListLowLevel(profile, query, queryModif, baseObject, true, true, ignoreDeletion, method);
    }

    static async getObjectsListRandom(profile, query: IRequest, queryModif: IGetterQuery = {}, baseObject = null) {
        const dbquery: IGetterQuery = {};
        const betterQuery = await this.buildGetterQuery(profile, baseObject, query);

        Object.assign(dbquery, betterQuery, queryModif);

        return this.aggregate().match(dbquery).sample(query.limit);
    }

    static async saveInstanceLowLevel(profile, dataCleared, instance, options = {}) {
        const self = this as unknown as TSmartySchemaStatic;

        await self.emitModelEvent('instance-pre-save', profile, instance, dataCleared);

        instance.set(dataCleared);
        if (!instance._id) {
            instance.set({ _id: new SmartySchema.ObjectId() });
        }
        await instance.save(options);

        await self.emitModelEvent('instance-post-save', profile, instance, dataCleared);

        return instance;
    }

    static async saveInstance(profile, dataCleared, instance, options = {}) {
        return this.saveInstanceLowLevel(profile, dataCleared, instance, options);
    }

    static async createObjectLowLevel(profile, instance, rawData = {}, baseObject = null) {
        const self = this as unknown as TSmartySchemaStatic;

        await self.emitModelEvent('instance-pre-create', profile, instance, baseObject, rawData);

        await this.saveInstance(profile, rawData, instance);

        await self.emitModelEvent('instance-post-create', profile, instance, baseObject, rawData);

        instance.isNewObject(false);

        return instance;
    }

    public static async createObject(profile, rawData = {}, baseObject = null) {
        const instance = new this();

        await instance.validateRawData(profile, rawData, 'create', baseObject);

        return this.createObjectLowLevel(profile, instance, rawData, baseObject);
    }

    static async createObjectsList(profile, request, baseObject = null) {
    // TODO: если в запросе участвует один объект, вызывать метод для обработки одного объекта
        const instancesRaw = new Map();
        const instances = [];

        for (const rawData of request) {
            const instance = new this();

            await instance.validateRawData(profile, rawData, 'create', baseObject);

            instancesRaw.set(instance, rawData);
        }
        const self = this as unknown as TSmartySchemaStatic;

        await self.emitModelEvent('collection-pre-create', profile, instancesRaw);

        for (const [instance, rawData] of instancesRaw) {
            const result = await this.createObjectLowLevel(profile, instance, rawData, baseObject);

            instances.push(result.toJSON());
        }

        await self.emitModelEvent('collection-post-create', profile, instances, baseObject);

        return instances;
    }

    static createObjectsHandler(profile, request, baseObject = null) {
        return Array.isArray(request)
            ? this.createObjectsList(profile, request, baseObject)
            : this.createObject(profile, request, baseObject);
    }

    static async updateObjectsList(profile, query, request, baseObject = null) {
    // TODO: если в запросе участвует один объект, вызывать метод для обработки одного объекта

        // массовый патчинг объектов с одинаковыми данными
        const instancesRaw = await (Array.isArray(query.ids)
            ? this.getObjectsListByIds(profile, query.ids, query, {}, baseObject, false, false, false, 'update')
            : this.getObjectsListLowLevel(profile, query, {}, baseObject, false, false));

        const instancesMap = new Map();
        const instances = [];

        for (const instance of instancesRaw) {
            const dataCleared = await instance.validateRawData(profile, request, 'update', baseObject);

            instancesMap.set(instance, dataCleared);
        }

        for (const [instance, dataCleared] of instancesMap) {
            await instance.updateObjectLowLevel(profile, request, dataCleared, baseObject);

            instances.push(instance);
        }

        return instances;
    }

    static getApiPrefix() {
        return this.schema[apiPrefix] || this.collection.name;
    }

    async validateRawData(profile, request, method, baseObject = null) {
        const requestData = request instanceof SmartyDocument ? request.toObject() : { ...request };

        if (Object.keys(requestData).length === 0) {
            throw new ValidationError('request data is empty');
        }

        const constructor = this.constructor as unknown as mongoose.Model<PublicInterfaceObject>;

        const securedFields = await securedFieldsList(constructor.schema.paths, profile, method, method !== 'read');

        if ((this.constructor as unknown as SmartySchema).is('CalculatedFields')) {
            // FIXME: !!! calculatedFields
            // securedFields.push(...this.constructor.calculatedFields());
        }

        const schemaKeys = Object.keys(constructor.schema.paths);

        const allowedData = pick(omit(requestData, securedFields), schemaKeys);
        const clearedData = method === 'update' ? getObjectsDiff(this.toJSON(), allowedData) : allowedData;

        const basicData = (this.constructor as unknown as TSmartyObject).basicDataBuilder(
            profile,
            method,
            baseObject,
            clearedData
        );

        Object.assign(clearedData, basicData);

        if (method === 'create') {
            this.set(clearedData);
        }
        const self = this.constructor as unknown as TSmartySchemaStatic;

        await self.emitModelEvent('instance-pre-validate', profile, this, request, method, clearedData);

        try {
            await (this.constructor as unknown as SmartyDocument).validate(clearedData, Object.keys(clearedData));
        } catch ({ errors }) {
            const misc = {};

            for (const field of Object.keys(errors)) {
                const { [field]: info } = errors;

                const errorData = info.properties || info;

                Object.assign(misc, { [field]: errorData.message });
            }

            throw new ValidationError('invalid incoming data', misc);
        }

        await self.emitModelEvent('instance-validate', profile, this, request, method, clearedData);

        this.addAffectedField(...this.getAffectedFields());

        return clearedData;
    }

    async updateObjectLowLevel(profile, rawData, dataCleared, baseObject = null, options = {}) {
        const oldData = pick(this, Object.keys(dataCleared));
        const self = this.constructor as unknown as TSmartySchemaStatic;

        await self.emitModelEvent('instance-pre-update', profile, this, dataCleared, oldData, options);

        await (this.constructor as unknown as PublicInterfaceController).saveInstance(profile, dataCleared, this, options);

        await self.emitModelEvent('instance-post-update', profile, this, baseObject, dataCleared, oldData);

        return this;
    }

    async updateObject(profile, rawData, baseObject = null, method = 'update') {
        const dataCleared = await this.validateRawData(profile, rawData, method, baseObject);

        if (
            (this.constructor as unknown as SmartySchema).is('ObjectChangesConfirmation') &&
      this.needConfirmation(profile, [dataCleared])
        ) {
            return this.saveChanges(profile, dataCleared);
        }

        // Так как данные уже прошли валидацию, то повторно её не делаем
        return this.updateObjectLowLevel(profile, rawData, dataCleared, baseObject, { validateBeforeSave: false });
    }
}

const getSortFieldsFromOtherCollections = fieldsObject => {
    if (fieldsObject) {
        const fields = {};

        for (const collection in fieldsObject) {
            for (const field of fieldsObject[collection].fields) {
                fields[field] = collection;
            }
        }

        return fields;
    }

    return null;

    // return this.schema[sortFieldsFromOtherCollections] || null;
};

export interface IOptions {
  disableGlobalId?: boolean;
  _idField?: string;
  defaultSortOrder: 1 | -1;
  API_PREFIX: string | null;
  API_NAME: string;
  sortFieldVariants?: string[];
  defaultSortField?: string;
  sortFieldsFromOtherCollections?: string[] | null;
  blockDeleteArchivedFiles?: boolean;
  allowedAttachedFilesType?: string[];
}

const PublicInterface = (schema: mongoose.Schema, options: IOptions) => {
    const defaults = {
        disableGlobalId: false,
        _idField: '_id',
        defaultSortOrder: -1,
        API_PREFIX: null,
        API_NAME: '',
        sortFieldVariants: [],
        defaultSortField: 'objIndex',
        sortFieldsFromOtherCollections: null,
        disableGetWholeCollection: false,
        blockDeleteArchivedFiles: false,
        allowedAttachedFilesType: [],
        ...options
    };

    const serializedSortFields = getSortFieldsFromOtherCollections(defaults.sortFieldsFromOtherCollections);

    Object.assign(schema, {
        [disableGlobalId]: defaults.disableGlobalId,
        [defaultSortOrder]: defaults.defaultSortOrder,
        [defaultIdField]: defaults._idField,
        [apiPrefix]: defaults.API_PREFIX,
        [sortFieldVariants]: defaults.sortFieldVariants,
        [sortFieldsFromOtherCollections]: defaults.sortFieldsFromOtherCollections,
        [serializedSortFieldsFromOtherCollections]: serializedSortFields,
        [defaultSortField]: defaults.defaultSortField,
        [disableGetWholeCollection]: defaults.disableGetWholeCollection,
        [allowedAttachedFilesType]: defaults.allowedAttachedFilesType,
        // Добавляем без Symbol, так как к этому полю нужен будет доступ из других мест
        blockDeleteArchivedFiles: false
    });

    schema.loadClass(PublicInterfaceObject);
    schema.loadClass(PublicInterfaceController);
};

export type TPublicInterface = PublicInterfaceObject & PublicInterfaceController;
export { PublicInterfaceObject, PublicInterfaceController };

export default PublicInterface;
