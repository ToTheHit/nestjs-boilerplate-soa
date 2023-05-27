import mongoose from 'mongoose';
import SmartySchema from '../SmartySchema';
import ProfilePlugin from './ProfilePlugin';

// eslint-disable-next-line no-use-before-define
class ProfileHumanClass extends mongoose.Model<ProfileHumanClass> {
    static async clearSocketSessions() {
        await this.updateMany(
            {},
            { $set: { activeSocketSessions: [], isOnline: false } }
        );
    }
}
function ProfileHuman(schema: SmartySchema, options = {}) {
    Object.assign(options, { validateEmail: true });

    schema.plugin(ProfilePlugin, options);
    // schema.plugin(WithAvatar);

    schema.add({
        isOnline: {
            type: Boolean,
            description: 'Признак текущей активности.',
            default: false,
            protected: true
        },
        activeSocketSessions: {
            type: [String],
            default: [],
            private: true,
            protected: true
        },
        fullName: {
            type: String,
            description: 'ФИО',
            default: '',
            public: true,
            maxlength: 250,
            search: { index: ['query', 'sort'] }
        }
    });

    schema.loadClass(ProfileHumanClass, false);
}

export default ProfileHuman;