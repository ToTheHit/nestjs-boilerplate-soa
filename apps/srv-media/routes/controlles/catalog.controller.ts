import { Controller, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Catalog } from '@srvMedia/index';
import GetListHandlerController from '@restify/plugins/PublicObject/handlers/GetListHandler.controller';
import GetInstanceHandlerController from '@restify/plugins/PublicObject/handlers/GetInstanceHandler.controller';

@Controller()
@ApiTags(Catalog.getPublicName())
class CatalogController {

}

@Module({
    controllers: [
        CatalogController,
        GetInstanceHandlerController(Catalog),
        GetListHandlerController(Catalog)
    ]
})
export default class CatalogModule {}
