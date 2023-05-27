import WithPhone from './WithPhone';

function ProfilePlugin(schema, options = {}) {
    schema.plugin(WithPhone, options);
}

export default ProfilePlugin;
