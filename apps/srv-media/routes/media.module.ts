import { rest } from 'config';
import { RouterModule } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { FileStorage, File, Catalog } from '@srvMedia/index';
import FileModule from '@srvMedia/routes/controlles/file.controller';
import FileStorageModule from '@srvMedia/routes/controlles/fileStorage.controller';
import CatalogModule from '@srvMedia/routes/controlles/catalog.controller';

@Module({
    imports: [
        FileModule,
        FileStorageModule,
        CatalogModule,
        RouterModule.register([
            {
                path: `${rest.api}/:collectionName(${File.getPublicName()})`,
                module: FileModule
            },
            {
                path: `${rest.api}/:collectionName(${FileStorage.getPublicName()})`,
                module: FileStorageModule
            },
            {
                path: `${rest.api}/:collectionName(${Catalog.getPublicName()})`,
                module: CatalogModule
            }
        ])],
    exports: [RouterModule]
})
class MediaRoutingModule {}

export default MediaRoutingModule;
