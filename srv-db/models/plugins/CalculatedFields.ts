import mongoose from 'mongoose';
import { chunkify } from '../../../lib/utils/fn';
import { ServerError } from '../../../lib/errors';
import MagicSchema, { TMagicSchema } from '../MagicSchema';
import MagicModel from '../MagicModel';

const fieldsHandler = Symbol('calculating-fields-handlers');
const fieldsHandlerInner = Symbol('calculating-fields-handlers-inner');
const fieldsSet = Symbol('calculating-fields-set');
const calcCache = Symbol('calculating-fields-cache');

const chunkSize = 500;

const calcHandlersExec =
  (ctx, handlersList, handlerType, profile) => (fieldsToGet, ...args) => {
      const promises = [];

      if (handlersList.length > 0) {
          for (const { fields, handler } of handlersList) {
              const fieldNames = Object.keys(fields.tree);
              const needToCall =
          !Array.isArray(fieldsToGet) ||
          fieldsToGet.length === 0 ||
          fieldsToGet.some(field => fieldNames.includes(field));

              if (handler[handlerType] && needToCall) {
                  promises.push(handler[handlerType].call(ctx, profile, ...args));
              }
          }
      }

      return promises;
  };

class CalculatedFieldsHandler extends MagicModel {
    static calculatedFields(returnSchemas = false) {
        if (!returnSchemas) {
            return Array.from(this.schema[fieldsSet]);
        }

        const fieldsSchemas = [];

        for (const { fields } of this.schema[fieldsHandler]) {
            fieldsSchemas.push(fields);
        }

        return fieldsSchemas;
    }

    static async calculatedFieldsGetStatic(profile, merger, handlers, objectsListFull, fieldsToGet, baseObject) {
        const getter = calcHandlersExec(this, handlers, 'getStatic', profile);

        const result = {};

        for (const list of chunkify(objectsListFull, chunkSize)) {
            merger(
                await Promise.all(
                    getter(
                        fieldsToGet,
                        list,
                        list.map(({ _id }) => _id),
                        baseObject
                    )
                )
            );
        }

        return result;
    }

    async calculatedFieldsGetInstance(profile, merger, fieldsToGet = null) {
        const constructor = (<CalculatedFieldsHandler><unknown> this.constructor);
        const handlers = constructor.schema[fieldsHandler].concat(constructor.schema[fieldsHandlerInner]);
        const getter = calcHandlersExec(this, handlers, 'getInstance', profile);

        merger(await Promise.all(getter(fieldsToGet)));
    }
}

const cacheSubObjectsCalc = async (profile, store, answer, objectsList, handler) => {
    const cached = store.get(profile) || {};

    const nocacheList = [];

    for (const obj of objectsList) {
        if (cached[obj._id]) {
            answer[obj._id] = cached[obj._id];
        } else {
            nocacheList.push(obj);
        }
    }

    if (nocacheList.length > 0) {
        await handler(nocacheList);
    }

    store.set(profile, { ...cached, ...answer });
};

interface IOptions {
  fields: {
    [key: string]: {
      type: any;
      description?: string;
      default: any;
      protected?: boolean;
      in_request?: boolean;
    };
  };
  handler: {
    getInstance?: (profile, answer, instance, fieldsToGet) => Promise<void>;
    getStatic?: (profile, answer, objectsList, fieldsToGet, baseObject) => Promise<void>;
  };
  customFieldsList?: symbol;
  inner?: boolean;
  firstPlugin: boolean;
}
const CalculatedFields = (schema: TMagicSchema, options: IOptions) => {
    schema[calcCache] = new WeakMap();

    if (!schema[fieldsHandler]) {
        schema[fieldsHandler] = [];
        schema[fieldsHandlerInner] = [];
    }

    if (!schema[fieldsSet]) {
        schema[fieldsSet] = new Set();
    }

    if (!options.fields || !options.handler) {
        throw new ServerError('calculated fields not declared');
    }

    const {
        getInstance = null, // async (profile)
        getStatic = null // async (profile, objectsList)
    } = options.handler;

    const fields =
    options.fields instanceof MagicSchema
        ? options.fields
        : new MagicSchema(options.fields, { _id: false, id: false });

    if (options.customFieldsList && !schema[options.customFieldsList]) {
        schema[options.customFieldsList] = new Set();
    }

    for (const field of Object.keys(fields.paths)) {
        if (!options[field]?.in_request) {
            schema[fieldsSet].add(field);

            if (options.customFieldsList) {
                schema[options.customFieldsList].add(field);
            }
        }
    }

    schema[options.inner ? fieldsHandlerInner : fieldsHandler].push({
        fields,
        handler: {
            getInstance,
            getStatic
        }
    });

    if (options.firstPlugin) {
        schema.onModelEvent('instance-info', async function (profile, answer, instance, fieldsToGet) {
            const merger = result => {
                for (const obj of result) {
                    Object.assign(answer, obj);
                }
            };

            await instance.calculatedFieldsGetInstance(profile, merger, fieldsToGet);
        });

        schema.onModelEvent(
            'objects-info',
            async function (profile, answer, objectsList, recursionBlock = false, baseObject = null, fieldsToGet) {
                const merger = result => {
                    for (const obj of result) {
                        for (const id of Object.keys(obj)) {
                            if (answer[id]) {
                                Object.assign(answer[id], obj[id]);
                            }
                        }
                    }
                };

                await this.calculatedFieldsGetStatic(
                    profile,
                    merger,
                    this.schema[fieldsHandler],
                    objectsList,
                    fieldsToGet,
                    baseObject
                );

                if (!recursionBlock) {
                    await this.calculatedFieldsGetStatic(
                        profile,
                        merger,
                        this.schema[fieldsHandlerInner],
                        objectsList,
                        fieldsToGet,
                        baseObject
                    );
                }
            }
        );
    }

    schema.loadClass(CalculatedFieldsHandler);
};

export default CalculatedFields;
export type TCalculatedFields = CalculatedFieldsHandler;
export type TCalculatedFieldsStatic = typeof CalculatedFieldsHandler;
