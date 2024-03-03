import MagicSchema, { TObjectId } from '@models/MagicSchema';
import FilesPublicInterface, {
    FilesPublicInterfaceOptions,
    TFilesPublicInterface, TFilesPublicInterfaceStatic
} from '@srvMedia/plugins/FilesPublicInterface';
import MagicModel from '@models/MagicModel';

class FileStorageObjectClass extends MagicModel {
    static async addParentsToTree(parentId: TObjectId, parentsIds: TObjectId[]) {
        await this.updateMany(
            { parentsList: parentId },
            {
                $push: {
                    parentsList: {
                        $each: parentsIds, $position: 1
                    }
                }
            }
        );
    }

    static async removeParentsFromTree(parentId: TObjectId, parentsIds: TObjectId[]) {
        await this.updateMany(
            { parentsList: parentId },
            { $pullAll: { parentsList: parentsIds } }
        );
    }

    async getRootCatalog(fields: string[]) {
        const Catalog = MagicSchema.model('catalog');

        if (fields.length > 0) {
            return Catalog.findById(this.catalog)
                .select(fields.join(' '));
        }

        return Catalog.findById(this.catalog);
    }
}

export type FileStorageObjectOptions = Omit<FilesPublicInterfaceOptions, 'queryModifier'>;

const FileStorageObject = (schema: MagicSchema, options: FileStorageObjectOptions) => {
    schema.add({
        _fsId: {
            type: MagicSchema.Types.ObjectId,
            description: 'Идентификатор ФХ, которому принадлежит объект.',
            ref: 'file_storage',
            default: null,
            search: { index: 'inner' }
        },
        parentsList: {
            type: [MagicSchema.Types.ObjectId],
            description: 'Идентификаторы родительских объектов.',
            ref: 'catalog',
            protected: true,
            default: []
        },
        catalog: {
            type: MagicSchema.Types.ObjectId,
            description: 'Идентификатор родительского каталога.',
            ref: 'catalog',
            default: null,
            required: false,
            in_filter: true
        }
    });

    schema.plugin<FilesPublicInterfaceOptions>(FilesPublicInterface, {
        ...options,
        async queryModifier(profile, rights, method, baseObject): Promise<unknown> {
            const FileStorage = MagicSchema.model('fs');

            // Если запрос с учётом ФХ, то проверяем доступ на чтение этого ФХ - этого достаточно
            if (baseObject && baseObject instanceof FileStorage) {
                await profile.checkAccessRights(baseObject, 'read');

                return { _fsId: baseObject._id };
            }

            // Получаем список доступных ФХ
            const fsList = await FileStorage.getFsList(profile);

            return {
                _fsId: fsList.length > 1
                    ? { $in: fsList }
                    : fsList[0]
            };
        }
    });

    schema.loadClass(FileStorageObjectClass);
};

export default FileStorageObject;
export type TFileStorageObject = FileStorageObjectClass & TFilesPublicInterface;
export type TFileStorageObjectStatic = typeof FileStorageObjectClass & TFilesPublicInterfaceStatic;
