import User from '../models/user';
import Device from '../models/device';

const bumpUserActivity = async ({ data }) => {
    const {
        sessionId,
        platform,
        deviceName,
        registration,
        _user
    } = data;

    const user = await User.findById(_user)
        .select('_id platforms');

    if (user) {
        await User.updateOne({ _id: user._id }, { $set: { lastActivityDate: Date.now() } });
        await Device.addDevice(user, sessionId, platform, deviceName, registration);
    }
};

export default bumpUserActivity;
