import SmartyObject from './SmartyObject';

function AccountPlugin(schema) {
    schema.plugin(SmartyObject);

    schema.add({
        timeZone: {
            type: Number,
            default: 0
        },
        confirmed: {
            type: Boolean,
            default: false,
            protected: true
        },
        lastActivityDate: {
            type: Number,
            default: Date.now
        },
        hashedPassword: {
            type: String,
            required: true,
            private: true
        },
        _passwordUpdatedOn: {
            type: Number,
            default: Date.now(),
            protected: true,
            private: true
        },
        platforms: {
            type: [String],
            default: [],
            private: true,
            protected: true
        }
    });
}

export default AccountPlugin;
