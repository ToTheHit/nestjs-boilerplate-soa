import { SwaggerScanner } from '@nestjs/swagger/dist/swagger-scanner';
import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerDocumentOptions } from '@nestjs/swagger/dist/interfaces';
import { assignTwoLevelsDeep } from '@nestjs/swagger/dist/utils/assign-two-levels-deep';
import { SwaggerExplorer } from '@nestjs/swagger/dist/swagger-explorer';
import { isUndefined, isString, addLeadingSlash } from '@nestjs/common/utils/shared.utils';
import {
    head
} from 'lodash';
import * as pathToRegexp from 'path-to-regexp';
import { SwaggerModule } from '@nestjs/swagger';

// @ts-ignore
class SwaggerExplorerCustom extends SwaggerExplorer {
    private validateRoutePath(path: string): string {
        if (isUndefined(path)) {
            return '';
        }
        if (Array.isArray(path)) {
            path = head(path);
        }
        let pathWithParams = '';

        for (const item of pathToRegexp.parse(path)) {
            if (isString(item)) {
                pathWithParams += item;
            } else if (item.name === 'collectionName') {
                pathWithParams += `${item.prefix}${item.pattern}`;
            } else {
                pathWithParams += `${item.prefix}{${item.name}}`;
            }
        }

        return pathWithParams === '/' ? '' : addLeadingSlash(pathWithParams);
    }
}

class SwaggerScannerCustom extends SwaggerScanner {
    constructor() {
        super();
        // @ts-ignore
        this.explorer = new SwaggerExplorerCustom(this.schemaObjectFactory);
    }
}

class SwaggerModuleCustom extends SwaggerModule {
    static createDocument(app: INestApplication, config: Omit<OpenAPIObject, 'paths'>, options?: SwaggerDocumentOptions): OpenAPIObject {
        const swaggerScanner = new SwaggerScannerCustom();
        const document = swaggerScanner.scanApplication(app, options || {});

        document.components = assignTwoLevelsDeep(
            {},
            config.components,
            document.components
        );

        return {
            openapi: '3.0.0', paths: {}, ...config, ...document
        };
    }
}

export default SwaggerModuleCustom;
