import MQHandler from '@db/RabbitMQ/MQHandler';
import { TObjectId } from '@models/MagicSchema';
import User from '../models/user';
import Device from '../models/device';

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
