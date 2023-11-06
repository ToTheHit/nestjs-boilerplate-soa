import testAgent from '../../test-utils/testAgent';
import User from '../../apps/srv-auth/models/user';

let agent;
let userAfter;
let userid;

const confirmUser = async _id => {
    await User.updateOne({ _id }, { $set: { emailConfirmedStatus: 'confirmed' } });
};

describe('/me', () => {
    let email;

    beforeEach(async function () {
        email = `test-test4${Date.now()}@test.local`;
        agent = await testAgent();

        const res = await agent.post('/api/v1/user/signup')
            .send({
                email,
                password: 'passwords.test4',
                fullName: 'fullName'
            });

        res.body.should.be.successResponse();

        userid = res.body.result._id;
    });

    describe('#{GET}', () => {
        it('Auth API should not be blocked for not confirmed account', async () => {
            const res = await agent.get('/api/v1/user/me');

            res.body.should.be.a.successResponse();
        });

        it('Should return user object for confirmed account', async () => {
            await confirmUser(userid);

            const res = await agent.get('/api/v1/user/me');

            res.body.should.be.successResponse();
            res.body.result.should.have.properties({ email });
        });
    });

    describe.skip('#{PATCH}', () => {
        beforeEach(async () => confirmUser(userid));

        it('Should apply changes from request', async () => {
            const res = await agent
                .patch('/api/v1/user/me')
                .send({ fullName: 'testName' });

            res.body.should.be.successResponse();
            res.body.result.fullName.should.be.equal('testName');
        });

        it('Should not apply changes from request with restricted fields', async () => {
            const userBefore = await User.findById(userid);
            const res = await agent
                .patch('/api/v1/user/me')
                .send({ _id: null, salt: null });

            res.body.should.be.successResponse();

            userAfter = await User.findById(userid);

            userBefore._id.should.be.deepEqual(userAfter._id);
            userBefore.salt.should.be.equal(userAfter.salt);
        });

        it('Should not apply changes from request with protected fields _createdOn _updatedOn', async () => {
            const res = await agent
                .patch('/api/v1/user/me')
                .send({ _createdOn: null, _updatedOn: null });

            res.body.should.be.successResponse();

            userAfter = await User.findById(userid);

            userAfter._createdOn.should.be.a.Number();
            userAfter._updatedOn.should.be.a.Number();
        });

        it('Should merge with filed contain null', async () => {
            const additionalBirthday = Date.now();
            const res = await agent
                .patch('/api/v1/user/me')
                .send({ additionalBirthday });

            res.body.should.be.successResponse();

            res.body.result.additionalBirthday.should.be.equal(additionalBirthday);
        });
    });
});
