import PublicObjectGetList from './handlers/GetListHandler.controller';
import PublicObjectGetInstance from './handlers/GetInstanceHandler.controller';

interface IOptions {
  disabledMethods?: string[];
  haveListRequest?: boolean;
  haveInstanceRequest?: boolean;
}

export default (options: IOptions | undefined = {}) => {
    const {
        disabledMethods = [],
        haveListRequest = true,
        haveInstanceRequest = true
    } = options;

    const controllers = [];

    if (!disabledMethods.includes('get')) {
        if (haveListRequest) {
            controllers.push(PublicObjectGetList);
        }
        if (haveInstanceRequest) {
            controllers.push(PublicObjectGetInstance);
        }
    }

    return controllers;
};
