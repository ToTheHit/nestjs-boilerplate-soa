import MagicSchema from '@models/MagicSchema';
import MagicDocument from '@models/MagicDocument';
import TreeObject, { TreeObjectOptions, TTreeObject, TTreeObjectStatic } from '@srvMedia/plugins/TreeObject';
import ShortId, { IShortIdOptions, TShortId, TShortIdStatic } from '@plugins/ShortId';
import FileStorageObject, {
    FileStorageObjectOptions,
    TFileStorageObject,
    TFileStorageObjectStatic
} from '@srvMedia/plugins/FileStorageObject';
import MagicObject, { IMagicObjectOptions } from '@plugins/MagicObject';
import ProfileRelatedObject, { ProfileRelatedObjectOptions } from '@plugins/ProfileRelatedObject';

class CatalogClass extends MagicDocument {}

const CatalogSchema = new MagicSchema({
    isRootCatalog: {
        type: Boolean,
        description: 'Признак корневого каталога',
        default: false,
        protected: true,
        in_filter: true
    }
});

CatalogSchema.plugin<TreeObjectOptions>(TreeObject, { idField: 'parentsList' });
CatalogSchema.plugin<IShortIdOptions>(ShortId, {});
CatalogSchema.plugin<FileStorageObjectOptions>(FileStorageObject, {
    API_NAME: 'Каталог'
});
CatalogSchema.plugin<ProfileRelatedObjectOptions>(ProfileRelatedObject, {});
CatalogSchema.plugin<IMagicObjectOptions>(MagicObject, {});
CatalogSchema.loadClass(CatalogClass);

export default CatalogSchema.model('catalog', 'catalogs');

export { CatalogSchema };
export type TCatalog = CatalogClass & TTreeObject & TShortId & TFileStorageObject & MagicDocument;
export type TCatalogStatic = typeof CatalogClass & TTreeObjectStatic & TShortIdStatic & TFileStorageObjectStatic;
