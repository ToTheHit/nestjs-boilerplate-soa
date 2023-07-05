import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { muteUnknownFieldsError } from 'config';

import * as mongoose from 'mongoose/browser';
import MagicSchema from '../../../srv-db/models/MagicSchema';
import {
    AccessDenied, GenericError, NotFoundError, ValidationError
} from '../../errors';

import MagicDocument from '../../../srv-db/models/MagicDocument';
import loggerRaw from '../../logger';

const logger = loggerRaw('RequestValidator');

const ctxKey = Symbol('ctx');

const cache = new WeakMap();

class RequestObject extends mongoose.Document {
    ctx() {
        return this.getCache(ctxKey);
    }

    setCtx(ctxData) {
        this.setCache(ctxKey, ctxData);
    }

    setCache(key, data) {
        const requestCache = cache.get(this) || {};

        cache.set(this, Object.assign(requestCache, { [key]: data }));
    }

    getCache(key) {
        const requestCache = cache.get(this) || {};

        return requestCache[key];
    }

    async validateRequest(source) {
        return new Promise((resolve, reject) => {
            (<mongoose.Document> this).validate()
                .then(() => resolve(this))
                .catch(errors => {
                    if (errors instanceof GenericError) {
                        return reject(errors);
                    }

                    const misc = {};

                    for (const field of Object.keys(errors.errors)) {
                        const { [field]: info } = errors.errors;

                        const errorData = info.properties || info;

                        if (errorData.reason instanceof Error) {
                            return reject(errorData.reason);
                        }

                        Object.assign(misc, { [field]: errorData.message });
                    }

                    return reject(new ValidationError(`invalid ${source} in request`, misc));
                });
        });
    }
}

const buildSchema = fields => {
    if (!fields) {
        return null;
    }

    const schema = fields instanceof MagicSchema
        ? fields
        : new MagicSchema(typeof fields === 'object' && fields !== null && !Array.isArray(fields)
            ? fields
            : {}, { _id: false, id: false, versionKey: false });

    schema.add({
        opId: {
            type: String,
            default: undefined
        }
    });

    schema.loadClass(RequestObject, false);

    return schema;
};

interface IData {
    [key: string]: NonNullable<unknown>; // TODO: Привести к монгусовскому типу поля
}
export default (query: IData, body: IData) => {
    const schemaCache = {
        query: null,
        body: null
    };

    schemaCache.query = buildSchema(query);
    schemaCache.body = buildSchema(body);

    const validateSchema = async (source, data) => {
        const schema = schemaCache[source];

        if (!schema) {
            return null;
        }

        const schemaFields = [];

        schema.eachPath(fieldName => schemaFields.push(fieldName));

        const unknownFields = Object.keys(data).filter(fieldName => !schemaFields.includes(fieldName));

        if (unknownFields.length > 0) {
            if (muteUnknownFieldsError) {
                logger.warn('unknown fields in request', unknownFields);
            } else {
                throw new ValidationError('unknown fields provided', { fields: unknownFields });
            }
        }

        let document;

        try {
            document = await (new mongoose.Document(data, schema)).validateRequest(source);
        } catch (err) {
            if (err.code === 404 || err.status === 404) {
                throw new NotFoundError(err.message, err.misc);
            }
            if (err.code === 403 || err.status === 403) {
                throw new AccessDenied(err.message, err.misc);
            }
            throw new ValidationError('can not validate fields', { code: err.code || err.status, ...err.misc });
        }

        return document;
    };

    @Injectable()
    class SignUpValidationPipe implements PipeTransform {
        async transform(value: any, metadata: ArgumentMetadata) {
            return validateSchema(metadata.type, value);
        }
    }

    return SignUpValidationPipe;
};
