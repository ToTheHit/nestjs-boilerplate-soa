import { Controller, Get } from '@nestjs/common';

interface IOptions {
  disabledMethods?: string[];
  haveListRequest?: boolean;
  haveInstanceRequest?: boolean;
}

export default (options:IOptions = {}) => {
    const {
        disabledMethods = [],
        haveListRequest = true,
        haveInstanceRequest = true
    } = options;

    @Controller()
    class PublicObject {
        @Get()
        requestHandler() {
            return 'PublicObject route';
        }
    }

    return PublicObject;
};
