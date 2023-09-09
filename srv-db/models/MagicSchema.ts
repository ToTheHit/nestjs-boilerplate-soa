// eslint-disable-next-line max-classes-per-file
import mongoose, { Schema, Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { TMagicModel } from './MagicModel';

const _plugins = new WeakMap();
const _pluginsConnected = new WeakMap();
const _events = new WeakMap();
const _dataModif = new WeakMap();

const _models = new Map();

const _id = '[a-fA-F0-9]{24}';

const newObject = Symbol('new-object');

// Необходимо для валидации входящих запросов:
mongoose.Schema.Types.Boolean.convertToTrue.add('');
mongoose.Schema.Types.Boolean.convertToTrue.add('1');
mongoose.Schema.Types.Boolean.convertToTrue.add('true');
mongoose.Schema.Types.Boolean.convertToFalse.add('false');
mongoose.Schema.Types.Boolean.convertToFalse.add('0');
mongoose.Schema.Types.Boolean.convertToFalse.add('null');

class ObjectId extends Types.ObjectId {
    // eslint-disable-next-line no-shadow
    static isValidStrict(_id: Types.ObjectId | string): boolean {
        return mongoose.isObjectIdOrHexString(_id);
    }
}

const modelRef = field => {
    const { ref } = field.options || field;
    const referenced = ref ? _models.get(field.options.ref) : null;

    return {
        referenced:
      referenced && referenced.is('PublicInterface')
          ? referenced.getPublicName()
          : false
    };
};

const fieldParams = (field, calculated, noRef = false) => {
    if (typeof field === 'undefined') {
        return {};
    }

    const {
        protected: protection,
        public: publication,
        description = '',
        default: defaultValue
    } = field.options || field;

    return {
        required: field.isRequired === true,
        default: typeof defaultValue === 'function' ? 'Function' : defaultValue,
        protected:
      typeof protection !== 'object' ? protection === true : protection,
        public:
      typeof publication !== 'object' ? publication === true : publication,
        description
    };
};

const describer = {
    run: (schema, calculated, noRef = false) => {
        const result = {};

        const fieldNames = Object.keys(schema.paths).filter(
            path => !schema.paths[path].options.private ||
        schema.paths[path].options.search
        );

        for (const fieldName of fieldNames) {
            if (fieldName === '__v') {
                // FIXME: брать из параметров схемы
                continue;
            }

            result[fieldName] = {
                fieldName,
                ...describer.buildField(
                    schema.paths[fieldName],
                    calculated,
                    noRef,
                    fieldName === 'profiles'
                )
            };
        }

        return result;
    },
    buildField: (field, calculated, noRef = false, log = false) => {
        const { instance } = field;

        const ctx = {};

        if (field.schema) {
            Object.assign(ctx, {
                schema: describer.run(field.schema, calculated, noRef)
            });
        } else if (field.$embeddedSchemaType) {
            Object.assign(ctx, {
                schema: [
                    describer.buildField(field.$embeddedSchemaType, calculated, noRef)
                ]
            });
        }

        if (field.enumValues && field.enumValues.length > 0) {
            Object.assign(ctx, {
                enum: true,
                enumValues: field.enumValues
            });
        }

        return {
            type: instance === 'Embedded' ? 'Object' : instance,
            calculated,
            ...fieldParams(field, calculated, noRef),
            ...(noRef ? {} : modelRef(field)),
            ...ctx
        };
    }
};

/**
 *
 * @param {Model} Model
 * @returns {Model}
 */
const modelInit = Model => {
    _models.set(Model.modelName, Model);

    return Model;
};

// eslint-disable-next-line no-use-before-define
class MetaData {
    static async emitModelEvent(action, ...args) {
        // @ts-ignore
        for (const handler of this.schema.getEventsHandlers(action)) {
            const result = handler.call(this, ...args);

            if (result instanceof Promise) {
                await result;
            }
        }
    }

    static is(pluginName) {
        // @ts-ignore
        return this.schema.is(pluginName);
    }

    is(pluginName) {
        // @ts-ignore
        return this.constructor.schema.is(pluginName);
    }

    isNewObject(value = null) {
        if (typeof value === 'boolean') {
            this[newObject] = value;
        }

        return typeof this[newObject] === 'boolean' ? this[newObject] : true;
    }
}

class MagicSchema extends Schema {
    private Model: mongoose.Model<any>;

    private tree: any;

    constructor(obj, options = {}) {
        super(obj, {
            ...options, minimize: false, _id: true, id: false
        });

        this.set('toJSON', { getters: true, virtuals: true });

        this.loadClass(MetaData, false);
        this.statics.incomeDataModifiers = this.incomeDataModifiers.bind(this);

        this.Model = null;

        this.post('init', doc => doc.isNewObject(false));

        _plugins.set(this, []);
        _pluginsConnected.set(this, []);
        _events.set(this, {});
        _dataModif.set(this, {});
    }

    static get _id() {
        return _id;
    }

    is(plugin): boolean {
        const connectedPlugins = _pluginsConnected.get(this);
        const pluginName = typeof plugin === 'function'
            ? plugin.name
            : plugin;

        return connectedPlugins.includes(pluginName);
    }

    plugin(fn, options = {}) {
        const connectedPlugins = _pluginsConnected.get(this);
        const firstPlugin = !connectedPlugins.includes(fn.name);
        const plugins = _plugins.get(this);

        _pluginsConnected.set(this, connectedPlugins.concat(fn.name));
        _plugins.set(this, (plugins || []).concat({ fn, options, firstPlugin }));

        super.plugin(fn, { ...options, firstPlugin });

        return this;
    }

    loadClass(cls: TMagicModel, virtualsOnly?: boolean) {
        return super.loadClass(cls, virtualsOnly);
    }

    static model(modelName: string) {
        const Model = _models.get(modelName);

        if (!Model) {
            throw Error(`model ${modelName} not found`);
        }

        return Model;
    }

    static get models() {
        return mongoose.models;
    }

    static modelByCollectionName(collectionName: string, useApiPrefix = false) {
        if (!collectionName) {
            throw new ForbiddenError('collectionName required');
        }

        if (collectionName === 'ws' || collectionName === 'workspaces') {
            return MagicSchema.model('workspace');
        }

        const prefixed = useApiPrefix === true;

        for (const modelName of Object.keys(MagicSchema.models)) {
            const Model = MagicSchema.model(modelName);

            const modelIsCorrect = !prefixed
                ? Model.collection.name === collectionName
                : Model.is('PublicInterface') && collectionName === Model.getPublicName();

            if (modelIsCorrect) {
                return Model;
            }
        }
        throw new NotFoundError(`Model for collection ${collectionName} not found`);
    }

    model(modelName, collectionName) {
        const Model = mongoose.model(modelName, this, collectionName);

        this.Model = Model;

        return modelInit.call(this, Model);
    }

    incomeDataModifiers(action) {
        const idm = _dataModif.get(this);

        return idm[action] || [];
    }

    modifyIncomeData(actionType, modifier) {
        const actionList = Array.isArray(actionType) ? actionType : [actionType];

        const idm = _dataModif.get(this);

        for (const action of actionList) {
            if (!Array.isArray(idm[action])) {
                idm[action] = [];
            }

            idm[action].push(modifier);
        }

        _dataModif.set(this, idm);
    }

    describe(calculated = true, noRef = false) {
        return describer.run(this, calculated, noRef);
    }

    getEventsHandlers(action) {
        const eventsHandlers = _events.get(this);

        return eventsHandlers[action] || [];
    }

    onModelEvent(action, handler) {
        const eventsHandlers = _events.get(this);

        if (!Array.isArray(eventsHandlers[action])) {
            eventsHandlers[action] = [handler];
        } else {
            eventsHandlers[action].push(handler);
        }

        _events.set(this, eventsHandlers);
    }

    defaultSchemaData() {
        return Object.keys(this.tree).reduce((result, key) => {
            const { [key]: value } = this.tree;

            if (key !== '_id' && typeof value.default !== 'undefined') {
                const def =
          typeof value.default === 'function' ? value.default() : value.default;

                Object.assign(result, {
                    [key]: def instanceof MagicSchema ? def.defaultSchemaData() : def
                });
            }

            return result;
        }, {});
    }

    static ObjectId = ObjectId;
}

export default MagicSchema;
export type TMagicSchemaStatic = typeof MetaData & typeof MagicSchema;
export type TMagicSchema = MagicSchema & MetaData;
export type TObjectId = ObjectId;
