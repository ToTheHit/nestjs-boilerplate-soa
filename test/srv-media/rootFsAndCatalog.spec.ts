import { Catalog, FileStorage } from '@srvMedia/index';
import MagicSchema from '@models/MagicSchema';
import { userRegister } from '@testUtils/objectsCreator';

describe('rootFsAndCatalog', () => {
    let userData;

    beforeAll(async () => {
        ({ userData } = await userRegister());
    });

    it('Should create default fileStorage and catalog after registration', async () => {
        const fileStoragesCount = await FileStorage.countDocuments();

        fileStoragesCount.should.be.equal(1);
        const CatalogsCount = await Catalog.countDocuments();

        CatalogsCount.should.be.equal(1);

        const fileStorage = await FileStorage.findOne()
            .select('_userId rootCatalogId').lean();
        const catalog = await Catalog.findOne().lean();

        expect(fileStorage).toMatchObject({
            _userId: new MagicSchema.ObjectId(userData._id),
            rootCatalogId: catalog._id
        });
        expect(catalog).toMatchObject({
            _fsId: fileStorage._id,
            _createdBy: new MagicSchema.ObjectId(userData._id)
        });
    });
});
