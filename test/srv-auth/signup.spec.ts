import testAgent from '../../test-utils/testAgent';

let agent;

describe('#{POST} /signup', () => {
    beforeAll(async function () {
        agent = await testAgent();
    }, 60000);

    afterEach(async () => {
        // const res = await agent
        //     .post('/api/v1/user/logout');

        // res.body.should.be.successResponse();
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
    });
});
