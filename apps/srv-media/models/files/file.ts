import MagicModel from '@models/MagicModel';
import MagicSchema from '@models/MagicSchema';
import MagicDocument from '@models/MagicDocument';
import ShortId, { IShortIdOptions, TShortId, TShortIdStatic } from '@plugins/ShortId';
import FileObject, { IFileObjectOptions, TFileObject, TFileObjectStatic } from '@srvMedia/plugins/FileObject';
import MagicObject, { IMagicObjectOptions } from '@plugins/MagicObject';
import { File } from '@srvMedia/index';
import FileStorageObject, { FileStorageObjectOptions } from '@srvMedia/plugins/FileStorageObject';

class FileClass extends MagicModel {
}

const FileSchema = new MagicSchema({});

FileSchema.plugin<IShortIdOptions>(ShortId, {});
FileSchema.plugin<IFileObjectOptions>(FileObject, { container: 'files' });
FileSchema.plugin<IMagicObjectOptions>(MagicObject, {});
FileSchema.plugin<FileStorageObjectOptions>(FileStorageObject, {
    API_NAME: 'Файлы'
});

FileSchema.loadClass(FileClass);

export default FileSchema.model('file', 'files');

export { FileSchema };
export type TFile = FileClass & TShortId & TFileObject & MagicDocument
export type TFileStatic = typeof FileClass & TShortIdStatic & TFileObjectStatic;
