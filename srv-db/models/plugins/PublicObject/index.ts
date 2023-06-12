import PublicInterface, {
    TPublicInterface,
    IOptions as IOptionsPublicInterface,
    TPublicInterfaceStatic
} from './PublicInterface';
import CheckAccessRights, {
    TCheckAccessRights,
    IOptions as IOptionsCheckAccessRights,
    TCheckAccessRightsStatic
} from './CheckAccessRights';

export type IOptions = IOptionsPublicInterface & IOptionsCheckAccessRights;
function PublicObject(schema, options: IOptions) {
    schema.plugin(PublicInterface, options);
    schema.plugin(CheckAccessRights, options);
}

export default PublicObject;
export type TPublicObject = TPublicInterface & TCheckAccessRights;
export type TPublicObjectStatic = TPublicInterfaceStatic & TCheckAccessRightsStatic;
