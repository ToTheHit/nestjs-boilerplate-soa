import User from '../models/user';
import MQHandler from '../../../srv-db/db/RabbitMQ/MQHandler';
import Device from '../models/device';
import { TObjectId } from '../../../srv-db/models/MagicSchema';

export interface IDropSessionData {
    reason: string;
    sessionId: string;
    _user: TObjectId;
}

const dropSession = async ({ data }: {data: IDropSessionData}) => {
    const { _user, sessionId, reason } = data;

    const user = await User.findById(_user).select('_id');

    if (user) {
        await Device.removeDevice(user, sessionId);

        await MQHandler.publish('socket-commands', 'disconnect-session', {
            sessionId,
            _user,
            reason
        });
    }
};

export default dropSession;
