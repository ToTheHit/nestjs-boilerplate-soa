import testAgent from '../../test-utils/testAgent';
import Token from '../../apps/srv-auth/models/token';

describe('/change-password', () => {
    let agent;
    let noAuth;
    let user1Data;

    beforeEach(async () => {
        agent = await testAgent();
        noAuth = await testAgent();

        const user1Result = await agent
            .post('/api/v1/user/signup')
            .set('X-USER-DEVICE', 'device1')
            .send({
                email: `test-${Date.now() + Math.random()}@test.local`,
                password: 'passwords.test1',
                fullName: 'fullName'
            });

        user1Result.body.should.be.successResponse();

        user1Data = user1Result.body.result;
    });

    it('Should return 403 if login is wrong', async () => {
        const res = await noAuth
            .post('/api/v1/user/change-password')
            .send({ login: 'test-abracadabra@test.local' });

        expect(res.body.status).toBe(403);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'userIsNotRegistered',
            name: 'ForbiddenError'
        });
    });

    it('Should return 422 if login type wrong', async () => {
        const res = await noAuth
            .post('/api/v1/user/change-password')
            .send({ login: null });

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'can not validate fields',
            name: 'ValidationError'
        });
    });

    it('Should return 422 if request body is empty', async () => {
        const res = await noAuth
            .post('/api/v1/user/change-password');

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'can not validate fields',
            name: 'ValidationError'
        });
    });

    it('Should return error if token is incorrect', async () => {
        const resIncorrectToken = await noAuth
            .post('/api/v1/user/change-password')
            .send({
                oldPassword: 'passwords.test2',
                newPassword: '123456',
                token: 'exactly not token'
            });

        expect(resIncorrectToken.body.status).toBe(422);
        expect(resIncorrectToken.body.handle_status).toBe('failure');

        expect(resIncorrectToken.body.error).toMatchObject({
            message: 'can not validate fields',
            name: 'ValidationError'
        });
    });

    it('Should return user if all is ok', async () => {
        const res0 = await noAuth
            .post('/api/v1/user/change-password')
            .send({ login: user1Data.email });

        expect(res0.body).toStrictEqual({});

        const token = await Token.findOne({ _owner: user1Data._id, type: Token.RESET_PASSWORD_TYPE });

        token.should.have.properties({
            type: Token.RESET_PASSWORD_TYPE
        });

        const res = await noAuth
            .post('/api/v1/user/change-password')
            .send({
                oldPassword: '123456',
                newPassword: '123456',
                login: user1Data.email
            });

        expect(res.body).toStrictEqual({});

        const noAuthRequest = await agent
            .get('/api/v1/user/me');

        noAuthRequest.body.should.be.successResponse();
    });
});
