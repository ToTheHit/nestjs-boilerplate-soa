import WithPhone, { IWithPhoneOptions, TWithPhone, TWithPhoneStatic } from './WithPhone';
import MagicSchema, { TMagicSchema } from '../MagicSchema';

function ProfilePlugin(schema: MagicSchema, options: IWithPhoneOptions) {
    schema.plugin<IWithPhoneOptions>(WithPhone, options);
}

export default ProfilePlugin;
export type TProfilePlugin = TWithPhone;
export type TProfilePluginStatic = TWithPhoneStatic;
