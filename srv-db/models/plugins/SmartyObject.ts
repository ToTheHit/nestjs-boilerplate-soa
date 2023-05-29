import mongoose from 'mongoose';

import SmartySchema from '../SmartySchema';
import emitBgEvent from '../../lib/emitBgEvent';

const _affectedFields = new WeakMap();
const SYS_KEYS = 'System:keys_ids';

async function dbCollectionAffectedEmitter(
    _ids,
    action: string,
    params: NonNullable<unknown> = {},
    targetProfilesIds: Array<string | mongoose.Types.ObjectId> = []
) {
    if (!Array.isArray(_ids) || (Array.isArray(_ids) && _ids.length > 0)) {
        const list = Array.isArray(_ids) ? _ids : [_ids];

        // logger.debug(`DBCA ${action} ${this.modelName} ${list.join(',')}`);

        await emitBgEvent.sendEvent(
            action,
            {
                _id: list,
                modelName: this.modelName,
                params,
                targetProfilesIds
            },
            'dbca-broker'
        );
    }
}

class SmartyObjectClass extends mongoose.Model {
    static linkKey(obj) {
        return `${obj._id}_${this.collection.name}`;
    }

    static linkKeyParse(linkKey: string) {
        const [_id, ...cName] = linkKey.split('_');

        return {
            _id,
            collectionName: cName.join('_')
        };
    }

    static basicDataBuilder(profile, method, baseObject = null, clearedData = {}) {
        const self = this as unknown as SmartySchema;

        return self
            .incomeDataModifiers(method)
            .reduce((query, fn) => Object.assign(query, fn(this, profile, baseObject, clearedData)), {});
    }

    static async dbcaCreate(_id, customData = {}, targetProfilesIds = []) {
        await dbCollectionAffectedEmitter.call(this, _id, 'create', { customData }, targetProfilesIds);
    }

    static async dbcaUpdate(_id, affectedFields = [], customData = {}, targetProfilesIds = []) {
        if (affectedFields.length > 0) {
            await dbCollectionAffectedEmitter.call(this, _id, 'update', { affectedFields, customData }, targetProfilesIds);
        }
    }

    static async dbcaDelete(_id, customData = {}, targetProfilesIds = []) {
        await dbCollectionAffectedEmitter.call(this, _id, 'delete', { customData }, targetProfilesIds);
    }

    static getPublicName(): string {
        const self = this as unknown as SmartySchema;

        return this.collection.name;

        // FIXME: !!! PublicInterface
        // return self.is('PublicInterface') ? self.getApiPrefix() : this.collection.name;
    }

    addAffectedField(...affected: string[]) {
        const fields = _affectedFields.get(this);

        _affectedFields.set(this, new Set([...(fields || []), ...affected]));
    }

    getAffectedFields() {
        const fields = _affectedFields.get(this);

        return Array.from(new Set(this.modifiedPaths().concat(Array.from(fields || []))));
    }

    wasModified(field) {
        return this.getAffectedFields().includes(field);
    }

    model() {
        return this.constructor;
    }

    async updateField<T extends SmartyObjectClass>(idsList, profile, action, field, custom = {}, sendDbca = true) {
        if (idsList.length > 0) {
            const fields = Array.isArray(field) ? field : [field];

            const query = {
                $set: {
                    _updatedOn: Date.now(),
                    _updatedBy: profile._id,
                    _updaterProfile: profile.constructor.modelName
                }
            };

            if (action === 'add') {
                Object.assign(query, {
                    $addToSet: fields.reduce(
                        (chank, field) => Object.assign(chank, {
                            [field]: idsList
                        }),
                        {}
                    )
                });
            } else {
                Object.assign(query, {
                    $pullAll: fields.reduce(
                        (chank, field) => Object.assign(chank, {
                            [field]: idsList
                        }),
                        {}
                    )
                });
            }

            await this.updateOne(query);
            const Model = this.constructor as unknown as T;

            // TODO: заменить на алгоритм с использованием lodash
            const [data] = await Model.find({ _id: this._id }).limit(1).select(fields.join(' ')).lean();

            for (const fieldName of fields) {
                this.set({ [fieldName]: data[fieldName] });
                this.addAffectedField(fieldName);
            }

            this.set(query.$set);
            this.addAffectedField(...Object.keys(query.$set));

            if (sendDbca) {
                await Model.dbcaUpdate(this._id, this.getAffectedFields(), custom);
            }
        }
    }

    // FIXME: !!! Add redis
    static async incrementObjectIndex(_wsId, value = 1) {
        const fieldName = `${this.modelName}_${_wsId || 'nows'}`;

        return 1;
    // const isExists = await redis.hexists(
    //     SYS_KEYS,
    //     fieldName
    // );
    //
    // if (!isExists) {
    //     const instance = await this.findOne(
    //         (_wsId
    //                 ? {
    //                     isDeleted: 'ignore',
    //                     _wsId
    //                 }
    //                 : { isDeleted: 'ignore' }
    //         )
    //     )
    //         .sort({ objIndex: -1 })
    //         .select('objIndex')
    //         .lean();
    //
    //     await redis.hset(
    //         SYS_KEYS,
    //         fieldName,
    //         ((instance && instance.objIndex)
    //                 ? instance.objIndex + 1
    //                 : 0
    //         )
    //     );
    // }
    //
    // return redis.hincrby(
    //     SYS_KEYS,
    //     fieldName,
    //     value
    // );
    }

    async incrementObjectIndex() {
        if (this.objIndex === null) {
            this.set({
                objIndex: await SmartyObjectClass.incrementObjectIndex(this.is('WsId') ? this._wsId : null, 1)
            });
        }

        return this.objIndex;
    }
}

enum dbca {
  'create',
  'update',
  'delete',
}
interface IOptions {
  emitDbca?: Array<keyof typeof dbca>;
  hideOnRemove?: boolean;
}
interface IRawData {
  opId?: string;
}

const SmartyObject = (schema: SmartySchema, options: IOptions = {}) => {
    const { emitDbca = ['create', 'update', 'delete'], hideOnRemove = true } = options;

    schema.loadClass(SmartyObjectClass, false);

    schema.add({
        _id: {
            type: SmartySchema.Types.ObjectId,
            default: SmartySchema.ObjectId,
            description: 'Идентификатор объекта в коллекции.',
            protected: true,
            public: true,
            search: { index: ['inner', 'query'] }
        },
        _createdOn: {
            type: Number,
            default: Date.now,
            description: 'Время создания данного объекта в милисекундах.',
            protected: true,
            public: true,
            search: { index: ['filter', 'sort'] },
            in_filter: true
        },
        _updatedOn: {
            type: Number,
            default: null,
            description: 'Время последнего изменения данного объекта в милисекундах.',
            protected: true,
            search: { index: ['filter', 'sort'] },
            in_filter: true
        },
        __rev: {
            type: Number,
            default: 0,
            description:
        'Кастомное поле, обозначающее версию объекта.' +
        'В дальнейшем будет использоваться для синхронизации данных из оффлайн работы.',
            protected: true
        },
        objIndex: {
            type: Number,
            default: null,
            description: 'Порядковый номер объекта данного типа.',
            protected: true,
            public: true,
            search: { index: 'inner' }
        }
    });

    schema.onModelEvent('instance-pre-save', async function (profile, instance: SmartyObjectClass) {
        const time = Date.now();

        if (!instance.isNewObject()) {
            // Инкрементируем версию для синхронизации.
            instance.__rev += 1;
            instance.set({ _updatedOn: time });
            instance.addAffectedField(...this.modifiedPaths());
        } else {
            instance.set({
                _createdOn: this._createdOn || time,
                _updatedOn: time + 1
            });
        }

        instance.set({ objIndex: await instance.incrementObjectIndex() });
    });

    if (emitDbca.includes('create')) {
        schema.onModelEvent('instance-post-create', async function (profile, instance, baseObject, rawData: IRawData = {}) {
            return this.dbcaCreate(instance._id, { opId: rawData.opId });
        });
    }
    if (emitDbca.includes('update')) {
        schema.onModelEvent('instance-post-update', (profile, instance, baseObject, rawData: IRawData = {}) => instance.constructor.dbcaUpdate(instance._id, instance.getAffectedFields(), { opId: rawData.opId }));
    }
    if (emitDbca.includes('delete')) {
        schema.onModelEvent('collection-post-remove', async function (profile, ids) {
            return this.dbcaDelete(ids, { reason: 'request' });
        });

        schema.onModelEvent('instance-post-remove', async function (profile, instance) {
            return this.dbcaDelete(
                instance._id,
                this.modelName === 'group' ? { reason: 'request', groupType: instance.collectionName } : { reason: 'request' }
            );
        });
    }

    if (hideOnRemove) {
    // schema.plugin(Deletable);
    }
};

export type TSmartyObject = SmartyObjectClass;

export default SmartyObject;
