import MagicSchema from '@models/MagicSchema';
import type {
    TPublicInterface,
    IPublicInterfaceOptions as IOptionsPublicInterface,
    TPublicInterfaceStatic
} from './PublicInterface';
import PublicInterface from './PublicInterface';
import CheckAccessRights, {
    TCheckAccessRights,
    ICheckAccessRightsOptions as IOptionsCheckAccessRights,
    TCheckAccessRightsStatic
} from './CheckAccessRights';

export type PublicObjectOptions = IOptionsPublicInterface & IOptionsCheckAccessRights;
function PublicObject(schema: MagicSchema, options: PublicObjectOptions) {
    schema.plugin(PublicInterface, options);
    schema.plugin(CheckAccessRights, options);
}

export default PublicObject;
export type TPublicObject = TPublicInterface & TCheckAccessRights;
export type TPublicObjectStatic = TPublicInterfaceStatic & TCheckAccessRightsStatic;
