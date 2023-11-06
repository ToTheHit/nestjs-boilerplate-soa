import testAgent from '../../test-utils/testAgent';
import User from '../../apps/srv-auth/models/user';

let agent;

describe('#{POST} /logout', () => {
    let USER_ID;

    beforeAll(async function () {
        agent = await testAgent();
        const res = await agent
            .post('/api/v1/user/signup')
            .set('X-USER-DEVICE', 'testDev')
            .send({
                email: `test-test.${Date.now() + Math.random()}4@test.local`,
                password: 'password',
                fullName: 'fullName'
            });

        res.body.should.be.successResponse();

        // TODO confirmed email
        await User.updateOne({ _id: res.body.result._id }, { $set: { emailConfirmedStatus: 'confirmed' } });

        USER_ID = res.body.result._id;
    }, 60000);

    it('Should destroy current session', async () => {
        const res = await agent
            .post('/api/v1/user/logout')
            .send({});

        expect(res.body).toStrictEqual({});

        const login = await agent
            .get('/api/v1/user/me');

        expect(login.body.status).toBe(401);
        expect(login.body.handle_status).toBe('failure');

        expect(login.body.error).toMatchObject({
            message: 'session not found',
            name: 'NoAuthError'
        });
    });
});
