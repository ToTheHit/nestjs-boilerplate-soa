import { Module } from '@nestjs/common';
import PublicObjectGetList from './handlers/GetListHandler.controller';
import PublicObjectGetInstance from './handlers/GetInstanceHandler.controller';

export default Model => {
    const controllers = [
        PublicObjectGetList(Model),
        PublicObjectGetInstance(Model)
    ];

    @Module({
        controllers
    })
    class PublicObjectModule {}

    return PublicObjectModule;
};
