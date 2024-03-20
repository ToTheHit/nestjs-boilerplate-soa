import MagicSchema, { TMagicSchema } from '@models/MagicSchema';
import { NotAcceptable } from '@lib/errors';
import MagicDocument from '@models/MagicDocument';
import MagicModel from '@models/MagicModel';

export type ProfileRelatedObjectOptions = {
    creatorRequired?: boolean;
    updaterRequired?: boolean;
}

class ProfileRelatedObjectClass extends MagicModel {

}
function ProfileRelatedObject(schema: TMagicSchema, options: ProfileRelatedObjectOptions) {
    const {
        creatorRequired = true,
        updaterRequired = true
    } = options;

    schema.add({
        _createdBy: {
            type: MagicSchema.Types.ObjectId,
            required: creatorRequired,
            description: 'Идентификатор профиля, создавшего объект',
            public: true,
            protected: true,
            in_filter: true
        },
        _creatorProfile: {
            type: String,
            protected: true,
            public: true,
            required: creatorRequired,
            enum: ['user'],
            default: 'user',
            description: 'Тип профиля, создавшего объект',
            in_filter: true
        },
        _updatedBy: {
            type: MagicSchema.Types.ObjectId,
            description: 'Идентификатор профиля, который внес последние обновления в объект',
            default: null,
            protected: true
        },
        _updaterProfile: {
            type: String,
            protected: true,
            enum: ['user'],
            default: 'user',
            description: 'Тип профиля, который внес последние обновления в объект'
        }
    });

    schema.loadClass(ProfileRelatedObjectClass);

    schema.onModelEvent('instance-validate', async function (profile, instance) {
        if (!instance.isNewObject() && updaterRequired && !instance._updatedBy) {
            throw new NotAcceptable('\'_updatedBy\' is required for update');
        }
    });

    schema.modifyIncomeData('create', (Model, profile: MagicDocument) => ({
        _createdBy: profile._id,
        _creatorProfile: (<MagicModel>profile.constructor).modelName
    }));
    schema.modifyIncomeData(['create', 'update'], (Model, profile: MagicDocument) => ({
        _updatedBy: profile._id,
        _updaterProfile: (<MagicModel>profile.constructor).modelName
    }));
}

export type TProfileRelatedObject = ProfileRelatedObjectClass;
export type TProfileRelatedObjectStatic = typeof ProfileRelatedObjectClass;

export default ProfileRelatedObject;
