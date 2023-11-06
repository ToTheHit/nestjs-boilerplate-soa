import testAgent from '../../test-utils/testAgent';

describe('#{POST} /login', () => {
    let userId;
    let email;

    beforeEach(async function () {
        const agent = await testAgent();

        email = `test-test${Date.now() + Math.random()}@test.local`;

        const res = await agent
            .post('/api/v1/user/signup')
            .set('X-USER-DEVICE', 'test')
            .send({
                email, password: 'passwords.test1', fullName: 'fullName'
            });

        res.body.should.be.successResponse();

        userId = res.body.result._id;
    });

    describe('login validation', () => {
        let noAuth;

        beforeEach(async () => {
            noAuth = await testAgent();
        });

        it('Should return 403 if we try to login with wrong email', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: 'test-test-test@test.local', password: 'passwords.test1' });

            expect(res.body.status).toBe(403);
            expect(res.body.handle_status).toBe('failure');

            expect(res.body.error).toMatchObject({
                message: 'userIsNotRegistered',
                name: 'AccessDenied'
            });
        });

        it('Should return 403 if password is incorrect', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: email, password: '-------' });

            expect(res.body.status).toBe(403);
            expect(res.body.handle_status).toBe('failure');

            expect(res.body.error).toMatchObject({
                message: 'blockGuardPasswordIncorrect',
                name: 'AccessDenied'
            });
        });

        it('Should return 403 if password is too short', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: email, password: '123' });

            expect(res.body.status).toBe(422);
            expect(res.body.handle_status).toBe('failure');

            expect(res.body.error).toMatchObject({
                message: 'can not validate fields',
                name: 'ValidationError'
            });
        });

        it('Should login with valid data', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: email, password: 'passwords.test1' });

            res.body.should.be.successResponse();

            res.body.result.should.have.properties({ email });
        });

        it.skip('Should change locale, if we use lang field', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: email, password: 'passwords.test1', lang: 'ru' });

            res.body.should.be.successResponse();

            res.body.result.should.have.properties({
                email,
                locale: 'ru_RU'
            });
        });

        it.skip('Shouldn\'t approve incorrect timeZone', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: email, password: 'passwords.test1', timeZone: null });

            res.body.should.be.a.Errors.with.valuesErr([{
                message: 'must be of number type',
                name: 'ValidationError'
            }], 'failure', 422);
        });

        it.skip('Should approve correct timeZone', async () => {
            const res = await noAuth
                .post('/api/v1/user/login')
                .send({ login: email, password: 'passwords.test1', timeZone: 60 * 60 * 3 });

            res.body.should.be.successResponse();

            res.body.result.should.have.properties({
                timeZone: 60 * 60 * 3
            });
        });
    });
});
