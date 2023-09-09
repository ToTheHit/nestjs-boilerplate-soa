import WithPhone, { TWithPhone, TWithPhoneStatic } from './WithPhone';
import { TMagicSchema } from '../MagicSchema';

function ProfilePlugin(schema: TMagicSchema, options = {}) {
    schema.plugin(WithPhone, options);
}

export default ProfilePlugin;
export type TProfilePlugin = TWithPhone;
export type TProfilePluginStatic = TWithPhoneStatic;
