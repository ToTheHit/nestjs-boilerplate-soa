import testAgent from '../../test-utils/testAgent';
import User from '../../apps/srv-auth/models/user';

let agent;
let agent1;
let agent2;

describe('#{POST} /signup', () => {
    beforeAll(async function () {
        agent = await testAgent();
        agent1 = await testAgent();
        agent2 = await testAgent();
    });

    it('Should create new user', async () => {
        const res = await agent
            .post('/api/v1/user/signup')
            .send({
                email: 'test-signup@test.local',
                password: '123456',
                fullName: 'Test User'
            });

        res.body.should.be.successResponse();
        expect(res.body.result).toMatchObject({
            confirmed: false,
            email: 'test-signup@test.local'
        });

        // TODO confirmed email
        await User.updateOne({ _id: res.body.result._id }, { $set: { emailConfirmedStatus: 'confirmed' } });

        await agent
            .post('/api/v1/user/logout')
            .send({});
    });

    it('Shouldn\'t create new user with invalid $email', async () => {
        const res = await agent
            .post('/api/v1/user/signup')
            .send({ email: 'exactly not email', fullName: 'fullName', password: '123456' });

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'can not validate fields',
            name: 'ValidationError'
        });
    });

    it('Shouldn\'t create new user with invalid $fullName', async () => {
        const res = await agent
            .post('/api/v1/user/signup')
            .send({ email: 'test-signup3@test.local', fullName: 'full----!!!34234Name', password: '123456' });

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'can not validate fields',
            name: 'ValidationError'
        });
    });

    it('Shouldn\'t create new user with invalid $password', async () => {
        const res = await agent
            .post('/api/v1/user/signup')
            .send({ email: 'test-signup3@test.local', fullName: 'fullName', password: '' });

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'can not validate fields',
            name: 'ValidationError'
        });
    });

    it('Shouldn\'t create new user with existed $email', async () => {
        const res0 = await agent1
            .post('/api/v1/user/signup')
            .send({ email: 'test-signup4@test.local', fullName: 'fullName', password: '123456' });

        res0.body.should.be.successResponse();

        const res = await agent2
            .post('/api/v1/user/signup')
            .send({ email: 'test-signup4@test.local', fullName: 'fullName', password: '123456' });

        expect(res.body.status).toBe(422);
        expect(res.body.handle_status).toBe('failure');

        expect(res.body.error).toMatchObject({
            message: 'emailAlreadyRegistered',
            name: 'ValidationError'
        });
    });
});
