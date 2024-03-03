import { userRegister } from '@testUtils/objectsCreator';
import User from '@srvAuth/user';

describe('rootFsAndCatalog', () => {
    let user;
    let userDataRaw;

    let userDataRaw2;

    beforeAll(async () => {
        ({ user, userData: userDataRaw } = await userRegister());
        ({ userData: userDataRaw2 } = await userRegister());
    });

    it('should upload file', async () => {
        const userData = await User.findById(userDataRaw._id);

        const res = await user
            .post('/api/v1/files')
            .field('catalog', `${userData._catalogId}`)
            .attach('file', `${__dirname}/../../test-utils/mock/preview_test.png`);

        res.body.should.be.successResponse();

        res.body.result.length.should.equal(1);
        expect(res.body.result[0]).toMatchObject({
            type: 'image/png',
            meta: {
                filename: 'preview_test.png',
                image: true,
                audio: false,
                video: false,
                ext: 'png'
            }
        });
    });

    it('should get error for upload without catalog', async () => {
        const res = await user
            .post('/api/v1/files')
            .attach('file', `${__dirname}/../../test-utils/mock/preview_test.png`);

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            name: 'ValidationError',
            message: 'param required'
        });
    });

    it('should get error for upload to someone else\'s catalog', async () => {
        const userData2 = await User.findById(userDataRaw2._id);

        const res = await user
            .post('/api/v1/files')
            .field('catalog', `${userData2._catalogId}`)
            .attach('file', `${__dirname}/../../test-utils/mock/preview_test.png`);

        expect(res.body.status).toBe(403);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            name: 'AccessDenied',
            message: 'no access to catalog'
        });
    });
});
