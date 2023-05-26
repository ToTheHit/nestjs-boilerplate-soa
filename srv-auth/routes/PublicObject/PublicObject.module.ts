import { Module } from '@nestjs/common';
import PublicObjectGetList from './handlers/GetListHandler.controller';
import PublicObjectGetInstance from './handlers/GetInstanceHandler.controller';

export default () => {
    const controllers = [
        PublicObjectGetList,
        PublicObjectGetInstance
    ];

    @Module({
        controllers
    })
    class PublicObjectModule {}

    return PublicObjectModule;
};
