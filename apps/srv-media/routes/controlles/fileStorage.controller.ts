import { Controller, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import FileStorage from '@srvMedia/files/fileStorage';

@Controller()
@ApiTags(FileStorage.getPublicName())
class FileStorageController {

}

@Module({
    controllers: [
        FileStorageController
    ]
})
export default class FileStorageModule {}
