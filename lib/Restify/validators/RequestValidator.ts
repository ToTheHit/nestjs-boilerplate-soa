import {
    applyDecorators, ArgumentMetadata, Injectable, PipeTransform, UsePipes
} from '@nestjs/common';
import { muteUnknownFieldsError } from 'config';
import * as mongoose from 'mongoose/browser';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import formatModelToSwagger from '@srvDoc/decorators/lib/formatModelToSwagger';
import {
    AccessDenied, GenericError, NotFoundError, ValidationError
} from '@lib/errors';
import MagicSchema from '../../../srv-db/models/MagicSchema';

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
    const schema = fields instanceof MagicSchema
        ? fields
        : new MagicSchema(
            typeof fields === 'object' && fields !== null && !Array.isArray(fields)
                ? fields
                : {},
            { _id: false, id: false, versionKey: false }
        );

    schema.loadClass(RequestObject, false);

    return schema;
};

interface IData {
    [key: string]: NonNullable<unknown>; // TODO: Привести к монгусовскому типу поля
}

const RequestValidator = (query: IData | MagicSchema, body: IData | MagicSchema) => {
    const schemaCache: { query: MagicSchema, body: MagicSchema } = {
        query: buildSchema(query),
        body: buildSchema(body)
    };

    const validateSchema = async (source, data) => {
        const schema = schemaCache[source];

        if (!schema) {
            return null;
        }

        const schemaFields: string[] = [];

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
    class RequestValidatorPipe implements PipeTransform {
        async transform(value: any, metadata: ArgumentMetadata) {
            return validateSchema(metadata.type, value);
        }
    }

    return { RequestValidatorPipe, schema: schemaCache };
};

type TValidator = {
    validator: (schema: MagicSchema, options: { [key: string]: any }) => void,
    options?: { [key: string]: any }
}

type TRequestValidator = {
    validators?: TValidator[],
    additionalValidation?: { [key: string]: any } | MagicSchema
}

const RequestValidatorDecorator = (query: TRequestValidator, body: TRequestValidator) => {
    const { validators: queryValidators = [], additionalValidation: additionalQueryValidation } = query;
    const { validators: bodyValidators = [], additionalValidation: additionalBodyValidation } = body;

    const { RequestValidatorPipe, schema } = RequestValidator(additionalQueryValidation, additionalBodyValidation);

    const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
        UsePipes(RequestValidatorPipe)
    ];

    queryValidators.forEach(({ validator, options }) => {
        // TODO: add pipes
        schema.query.plugin(validator, options);
    });

    bodyValidators.forEach(({ validator, options }) => {
        schema.body.plugin(validator, options);
    });

    if (Object.keys(schema.query.paths).length) {
        const querySwaggerSchema = formatModelToSwagger(schema.query);

        for (const field in querySwaggerSchema.properties) {
            const fieldSchema = querySwaggerSchema.properties[field] as SchemaObject;

            decorators.push(
                ApiQuery({
                    name: field,
                    schema: {
                        type: fieldSchema.type,
                        items: fieldSchema.items,
                        properties: fieldSchema.properties,
                        required: fieldSchema.required
                    },
                    enum: fieldSchema.enum?.length ? fieldSchema.enum : undefined,
                    description: fieldSchema.description,
                    isArray: fieldSchema.type === 'array',
                    required: !!fieldSchema.required?.length
                })
            );
        }
    }
    if (Object.keys(schema.body.paths).length) {
        const bodySwaggerSchema = formatModelToSwagger(schema.body);

        decorators.push(
            ApiBody({ schema: bodySwaggerSchema })
        );
    }

    return applyDecorators(...decorators);
};

export { RequestValidatorDecorator };

export default RequestValidator;
