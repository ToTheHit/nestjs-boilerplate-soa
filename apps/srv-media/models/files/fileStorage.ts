import MagicSchema from '@models/MagicSchema';
import ShortId, { IShortIdOptions, TShortId, TShortIdStatic } from '@plugins/ShortId';
import FilesPublicInterface, { FilesPublicInterfaceOptions } from '@srvMedia/plugins/FilesPublicInterface';
import TreeObject, { TreeObjectOptions, TTreeObject, TTreeObjectStatic } from '@srvMedia/plugins/TreeObject';
import MagicDocument from '@models/MagicDocument';
import MagicModel from '@models/MagicModel';
import { AccessDenied } from '@lib/errors';
import MagicObject, { IMagicObjectOptions } from '@plugins/MagicObject';
import { TUser } from '@srvAuth/user';

class FileStorageClass extends MagicModel {
    static async getFsList(profile) {
        const fsList = [];

        if (profile._fsId !== null) {
            fsList.push(profile._fsId);
        }

        if (fsList.length === 0) {
            throw new AccessDenied('no fs allowed', {});
        }

        return fsList;
    }

    // eslint-disable-next-line no-use-before-define
    static async createRootCatalog(fileStorage: TFileStorage, profile: TUser) {
        const Catalog = MagicSchema.model('catalog');

        const baseInfo = {
            _id: new MagicSchema.ObjectId(),
            _fsId: fileStorage._id,
            _createdBy: profile._id,
            _creatorProfile: (<MagicModel> profile.constructor).modelName,
            title: null,
            isRootCatalog: true
        };

        const rootCatalog = await Catalog.create({ ...baseInfo });

        fileStorage.set({
            rootCatalogId: rootCatalog._id,
            _updatedBy: profile._id
        });

        await fileStorage.save();

        return rootCatalog;
    }
}

const FileStorageSchema = new MagicSchema({
    _userId: {
        type: MagicSchema.Types.ObjectId,
        ref: 'user',
        default: null,
        protected: true
    },
    rootCatalogId: {
        type: MagicSchema.Types.ObjectId,
        ref: 'catalog',
        description: 'Ид. корневого каталога.',
        default: null,
        protected: true
    },

    systemType: {
        type: String,
        default: 'regular',
        enum: ['regular'],
        protected: true
    }
});

type TQuery = {
    _id?: string | {$in: string[]}
    _employeeId?: string | {$in: string[]}
}
FileStorageSchema.plugin<FilesPublicInterfaceOptions>(FilesPublicInterface, {
    API_PREFIX: 'fs',
    API_NAME: 'Файловое хранилище',
    async queryModifier(employee, rights, method) {
        const query: TQuery = {
            _employeeId: employee._id
        };

        return query;

        /*
        const fsList = await this.getFsList(employee, rights, method);

        query._id = fsList.length > 1
            ? { $in: fsList }
            : fsList[0];

        return query;
         */
    }
});
FileStorageSchema.plugin<TreeObjectOptions>(TreeObject, { idField: '_fsId' });
FileStorageSchema.plugin<IShortIdOptions>(ShortId, {});
FileStorageSchema.plugin<IMagicObjectOptions>(MagicObject, {});

FileStorageSchema.onModelEvent('instance-post-create', async function (profile, instance) {
    if (!instance.rootCatalogId) {
        await this.createRootCatalog(instance, profile);
    }
});

FileStorageSchema.loadClass(FileStorageClass);

export default FileStorageSchema.model('fs', 'file_storage');
export type TFileStorage = FileStorageClass & TShortId & TTreeObject & MagicDocument;
export type TFileStatic = typeof FileStorageClass & TShortIdStatic & TTreeObjectStatic;
