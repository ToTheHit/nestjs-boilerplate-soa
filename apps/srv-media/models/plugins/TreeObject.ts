import MagicSchema from '@models/MagicSchema';

class TreeObjectClass {

}

export type TreeObjectOptions = {
    idField: string
}
const TreeObject = (schema: MagicSchema, options: TreeObjectOptions) => {
    const {
        idField
    } = options;

    const removeNestedObjects = async (profile, ids) => {
        const File = MagicSchema.model('file');
        const CatalogModel = MagicSchema.model('catalog');

        const _deletedBy = profile._id;
        const _deletedOn = Date.now();

        await Promise.all([
            File.updateMany(
                { [idField]: { $in: ids } },
                { $set: { isDeleted: true, _deletedOn, _deletedBy } },
                { multi: true }
            ),
            CatalogModel.updateMany(
                { [idField]: { $in: ids } },
                { $set: { isDeleted: true, _deletedOn, _deletedBy } },
                { multi: true }
            )
        ]);
    };

    schema.loadClass(TreeObjectClass);

    schema.onModelEvent('collection-post-remove', async function (profile, ids) {
        await removeNestedObjects(profile, ids);
    });

    schema.onModelEvent('instance-post-remove', async function (profile, object) {
        await removeNestedObjects(profile, [object._id]);
    });
};

export default TreeObject;
export type TTreeObject = TreeObjectClass;
export type TTreeObjectStatic = typeof TreeObjectClass;
