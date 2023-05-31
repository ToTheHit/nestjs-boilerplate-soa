import SmartyModel from '../../../srv-db/models/SmartyModel';
import SmartySchema from '../../../srv-db/models/SmartySchema';
import SmartyObject, { TSmartyObject } from '../../../srv-db/models/plugins/SmartyObject';
import SmartyDocument from '../../../srv-db/models/SmartyDocument';

class Device extends SmartyModel {
    static async getUserDevices(user, platforms) {
        return this.find({
            _user: user._id,
            pushToken: { $exists: true, $ne: null },
            platform: { $in: platforms }
        })
            .select('pushToken platform')
            .lean();
    }

    static async addDevice(user, sessionId, platform, deviceName = 'unknown', isRegDevice = false) {
        const $set = {
            platform,
            deviceName,
            _lastActivity: Date.now(),
            _updatedOn: Date.now()
        };

        const updateResult = await this.updateOne(
            {
                sessionId,
                platform,
                _user: user._id,
                isDeleted: { $exists: true }
            },
            {
                $set
            }
        );

        if (updateResult.matchedCount === 0) {
            await this.create({
                _id: new SmartySchema.ObjectId(),
                sessionId,
                platform,
                deviceName,
                isRegDevice,
                _user: user._id,
                _lastActivity: Date.now(),
                _updatedOn: Date.now()
            });
        }

        if (!user.platforms.includes(platform)) {
            await user.constructor.updateOne({ _id: user._id }, { $addToSet: { platforms: platform } });
        }
    }

    static async removeDevice(user, sessionId) {
        await this.updateOne(
            { sessionId, _user: user._id },
            { $set: { _deletedOn: Date.now(), isDeleted: true, _deletedBy: user._id } }
        );
    }

    static async purgeDevices(user, exceptedSessionId) {
        const query = { _user: user._id };

        if (exceptedSessionId) {
            Object.assign(query, {
                sessionId: { $ne: exceptedSessionId }
            });
        }

        await this.updateMany(
            query,
            { $set: { _deletedOn: Date.now(), isDeleted: true, _deletedBy: user._id } }
        );

        const platforms = [];

        if (exceptedSessionId) {
            const { deviceName } = await this.findOne({ sessionId: exceptedSessionId }).select('deviceName').lean();

            platforms.push(deviceName);
        }

        await user.constructor.updateOne({ _id: user._id }, { $set: { platforms } });
    }

    static async getDevices(user) {
        return this.find({ _user: user._id })
            .sort({ _createdOn: 1 });
    }
}

const DeviceSchema = new SmartySchema({
    sessionId: {
        type: String,
        default: null
    },
    platform: {
        type: String,
        default: null
    },
    deviceName: {
        type: String,
        required: true
    },
    pushToken: {
        type: String,
        default: null
    },
    isRegDevice: {
        type: Boolean,
        default: false
    },
    _user: {
        type: SmartySchema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    _lastActivity: {
        type: Number,
        default: Date.now
    }
});

DeviceSchema.plugin(SmartyObject);

DeviceSchema.loadClass(Device, false);

export default DeviceSchema.model('device', 'devices');

export { DeviceSchema };
export type TDevice = Device & TSmartyObject & SmartyDocument;
export type TDeviceDocument = TDevice & SmartyDocument;
