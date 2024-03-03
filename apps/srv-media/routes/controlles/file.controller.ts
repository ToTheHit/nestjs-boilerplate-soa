import {
    Controller, Module, Post, Req, UseGuards, UseInterceptors
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import File from '@srvMedia/files/file';
import GetInstanceHandlerController from '@restify/plugins/PublicObject/handlers/GetInstanceHandler.controller';
import GetListHandlerController from '@restify/plugins/PublicObject/handlers/GetListHandler.controller';
import autoDocs from '@srvDoc/decorators/autoDoc';
import AuthRequestGuard from '@restify/Guards/AuthRequestGuard';
import fileUploadByRequest from '@srvMedia/lib/uploader/fileUploadByRequest';
import { IMG_PROC, TFileSaver, TUploadResult } from '@srvMedia/lib/constants';
import processUploadedFiles from '@srvMedia/lib/processUploadedFiles';
import GetListObjects from '@restify/getListObjects';
import fileUploadByLink from '@srvMedia/lib/uploader/fileUploadByLink';
import { getContainer } from '@srvMedia/lib';
import { RequestValidatorDecorator } from '@restify/validators/RequestValidator';
import { AccessDenied, ValidationError } from '@lib/errors';
import { Catalog } from '@srvMedia/index';
import { TUser } from '@srvAuth/user';

type TUploadHandler = (
    req: any,
    fileSaver: TFileSaver,
    limits: Record<string, any>, // TODO: it's should be almost the same as the limits of Busboy
    allowedMimes: string[]
) => Promise<TUploadResult>;

const validateCatalogsList = async (profile: TUser, catalogsIds: string[]) => {
    if (!Array.isArray(catalogsIds)) {
        throw new ValidationError('param required', { param: 'catalog' });
    }

    const uniqueCatalogIds = Array.from(new Set(catalogsIds));

    const catalogsList = await Catalog.getObjectsListByIds(profile, uniqueCatalogIds);

    if (catalogsList.length !== uniqueCatalogIds.length) {
        throw new AccessDenied('no access to catalog', {});
    }

    const catalogs = {};

    for (const { _id, _fsId } of catalogsList) {
        catalogs[_id] = { catalog: _id, _fsId };
    }

    return catalogs;
};

const validateUploadRequest = async (profile, { files, fields }) => {
    for (const paramName of Object.keys(fields)) {
        if (fields[paramName].length !== files.length) {
            throw new ValidationError('no param for file', { param: paramName });
        }
    }

    return validateCatalogsList(profile, fields.catalog);
};

const creationRequestHandler = async (req, uploadHandler: TUploadHandler, allowedMimes: string[] = null) => {
    const container = File.container();

    const uploadResult = await uploadHandler(
        req,
        getContainer(container),
        {},
        allowedMimes
    );
    const catalogInfoById = await validateUploadRequest(req.profile, uploadResult);

    // const catalogInfoById = await validateUploadRequest(req.profile, result);
    const { files } = await processUploadedFiles(
        container,
        uploadResult,
        [IMG_PROC.PREVIEW]
    );

    const filesToCreate = [];

    for (let index = 0; index < files.length; index += 1) {
        filesToCreate.push({
            ...File.normalizeUploadData(files[index]),
            ...catalogInfoById[uploadResult.fields.catalog[index]]
        });
    }

    const answer = await File.createObjectsHandler(
        req.profile,
        filesToCreate.length === 1
            ? filesToCreate[0]
            : filesToCreate
    );

    return Array.isArray(answer) ? answer : [answer];
};

@Controller()
@ApiTags(File.getPublicName())
class FileController {
    @Post('/')
    @autoDocs({
        apiOperation: { summary: 'Upload a file' },
        apiOkResponse: { Model: File }
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                },
                catalog: {
                    type: 'string'
                }
            },
            required: ['file', 'catalog']
        }
    })
    @UseGuards(AuthRequestGuard())
    @UseInterceptors(GetListObjects(File, false))
    async uploadFile(@Req() req) {
        return creationRequestHandler(req, fileUploadByRequest);
    }

    @Post('/image/url')
    @autoDocs({
        apiOperation: { summary: 'Upload an image by url' },
        apiOkResponse: { Model: File }
    })
    @RequestValidatorDecorator(
        {},
        {
            additionalValidation: {
                file: {
                    type: [String],
                    required: true
                }
            }
        }
    )
    @UseGuards(AuthRequestGuard())
    @UseInterceptors(GetListObjects(File, false))
    async uploadFileByLink(@Req() req) {
        return creationRequestHandler(req, fileUploadByLink);
    }
}

@Module({
    controllers: [
        FileController,
        GetInstanceHandlerController(File),
        GetListHandlerController(File)
    ]
})
export default class FileModule {}
