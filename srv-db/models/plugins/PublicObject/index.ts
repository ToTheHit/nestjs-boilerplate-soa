import PublicInterface, { TPublicInterface, IOptions as IOptionsPublicInterface } from './PublicInterface';
import CheckAccessRights, { TCheckAccessRights, IOptions as IOptionsCheckAccessRights } from './CheckAccessRights';

export type IOptions = IOptionsPublicInterface & IOptionsCheckAccessRights;
function PublicObject(schema, options: IOptions) {
    schema.plugin(PublicInterface, options);
    schema.plugin(CheckAccessRights, options);
}

export default PublicObject;
export type TPublicObject = TPublicInterface & TCheckAccessRights;
