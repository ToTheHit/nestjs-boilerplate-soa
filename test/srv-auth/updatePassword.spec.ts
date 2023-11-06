import testAgent from '../../test-utils/testAgent';
import User from '../../apps/srv-auth/models/user';

const confirmUser = async _id => {
    await User.updateOne({ _id }, { $set: { emailConfirmedStatus: 'confirmed' } });
};

describe('/update-password', () => {
    let user1;
    let user2;

    describe('change password for "logged in" user', () => {
        beforeAll(async () => {
            user1 = await testAgent();
            user2 = await testAgent();

            const email = `test-test${Date.now() + Math.random()}@test.local`;

            const user1Result = await user1
                .post('/api/v1/user/signup')
                .set('X-USER-DEVICE', 'device1')
                .send({
                    email,
                    password: 'passwords.test1',
                    fullName: 'fullName'
                });

            user1Result.body.should.be.successResponse();

            await confirmUser(user1Result.body.result._id);

            const user2Result = await user2
                .post('/api/v1/user/login')
                .send({
                    login: email,
                    password: 'passwords.test1'
                });

            user2Result.body.should.be.successResponse();
        });

        it('should return error if old password is incorrect', async () => {
            const resIncorrectOldPassword = await user1
                .post('/api/v1/user/update-password')
                .send({
                    oldPassword: 'not password',
                    newPassword: '123456'
                });

            resIncorrectOldPassword.body.should.be.errorResponse(422, {
                message: 'Old password is incorrect',
                name: 'ValidationError'
            });
        });

        it('should return error if new password is incorrect', async () => {
            const resIncorrectOldPassword = await user1
                .post('/api/v1/user/update-password')
                .send({
                    oldPassword: 'passwords.test1',
                    newPassword: '1234'
                });

            resIncorrectOldPassword.body.should.be.errorResponse(422, {
                message: 'can not validate fields',
                name: 'ValidationError'
            });
        });

        it('should return error if new password is incorrect', async () => {
            const resIncorrectOldPassword = await user1
                .post('/api/v1/user/update-password')
                .send({
                    oldPassword: 'passwords.test1',
                    newPassword: 'passwords.test2'
                });

            resIncorrectOldPassword.body.should.be.successResponse();
        });
    });
});
