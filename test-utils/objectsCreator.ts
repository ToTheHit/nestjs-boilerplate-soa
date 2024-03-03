import testAgent from '@testUtils/testAgent';
import User, { TUser } from '@srvAuth/user';

const confirmUser = async _userId => {
    const user: TUser = await User.findById(_userId);

    await user.confirmEmail(user.email);
};

const userRegister = async (confirmed = true) => {
    const user = await testAgent();

    const res = await user.post('/api/v1/user/signup')
        .set('X-USER-DEVICE', 'webDebug')
        .send({
            email: `test-test${Date.now() + Math.random()}@test.local`,
            password: '123456',
            fullName: 'fullName'
        });

    res.body.should.be.successResponse();

    if (confirmed) {
        await confirmUser(res.body.result._id);
    }

    return { user, userData: res.body.result };
};

export {
    userRegister,
    confirmUser
};
