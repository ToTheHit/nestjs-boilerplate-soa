import mongoose from 'mongoose';
import { ServerError, ValidationError } from '../../../lib/errors';
import { TMagicSchema } from '../MagicSchema';

const uniqIds = new Set();
const defaults = Symbol('defaults');

// eslint-disable-next-line no-use-before-define
class ShortIdClass extends mongoose.Model<ShortIdClass> {
    static getShortIdPrefix() {
        return this.schema[defaults].prefix;
    }

    static findByShortId(shortIdRaw: string, ignoreDeletion = false) {
        const shortId = parseInt(shortIdRaw, 10);
        const { idField } = this.schema[defaults];

        if (!Number.isInteger(shortId)) {
            throw new ValidationError(`invalid ${idField}`, { [idField]: shortIdRaw });
        }

        return this.findOne({
            [idField]: shortId,
            isDeleted: ignoreDeletion ? { $exists: true } : false
        });
    }

    static shortIdField() {
        return this.schema[defaults].idField;
    }

    static idBuilder() {
        return this.schema[defaults].idBuilder;
    }
}

export interface IShortIdOptions {
    idField?: string;
    idBuilder?: (instance) => number;
    description?: string;
    privateField?: boolean;
}
function ShortId(schema: TMagicSchema, options: IShortIdOptions) {
    const {
        idField = 'shortId',
        idBuilder = instance => instance.objIndex,
        description = 'Порядковый номер объекта данного типа.',
        privateField = false
    } = options;

    schema.add({
        [idField]: {
            search: { index: 'query' },
            type: Number,
            default: null,
            description,
            protected: true,
            public: true,
            private: privateField
        }
    });

    schema[defaults] = {
        idField,
        idBuilder
    };

    schema.loadClass(ShortIdClass);

    const bindShortId = async (profile, instance) => {
        await instance.incrementObjectIndex();

        instance.set({ [idField]: idBuilder(instance) });
    };

    schema.onModelEvent('instance-pre-create', bindShortId);
}

export default ShortId;
export type TShortId = ShortIdClass;
export type TShortIdStatic = typeof ShortIdClass;
