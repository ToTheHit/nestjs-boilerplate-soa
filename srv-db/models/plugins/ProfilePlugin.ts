import WithPhone, { TWithPhone, TWithPhoneStatic } from './WithPhone';

function ProfilePlugin(schema, options = {}) {
    schema.plugin(WithPhone, options);
}

export default ProfilePlugin;
export type TProfilePlugin = TWithPhone;
export type TProfilePluginStatic = TWithPhoneStatic;
