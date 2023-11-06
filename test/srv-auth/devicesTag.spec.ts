import testAgent from '../../test-utils/testAgent';
import Device from '../../apps/srv-auth/models/device';
import User from '../../apps/srv-auth/models/user';

let request;

let USER_ID;

describe('Вариации добавления тэгов устройств', () => {
    beforeAll(async () => {
        request = await testAgent();

        const res = await request.post('/api/v1/user/signup')
            .set('X-USER-DEVICE', 'androidDebug')
            .send({
                email: `test-test${Date.now() + Math.random()}@test.local`,
                password: '123456',
                fullName: 'fullName'
            });

        res.body.should.be.successResponse();

        USER_ID = res.body.result._id;
    });

    it('Должен добавить юзеру новый девайс', async () => {
        const res = await request
            .get('/api/v1/user/me')
            .set('X-USER-DEVICE', 'androidDebug');

        res.body.should.be.successResponse();

        const user = await User.findById(USER_ID);
        const devices = await Device.getDevices(user);

        devices.pop().deviceName.should.be.equal('androidDebug');
    });

    it('Не должен добавить юзеру уже имеющийся девайс', async () => {
        const res = await request
            .get('/api/v1/user/me')
            .set('X-USER-DEVICE', 'androidDebug');

        res.body.should.be.successResponse();

        const user = await User.findById(USER_ID);
        const devices = await Device.getDevices(user);

        devices.should.have.lengthOf(3);
    });
});
