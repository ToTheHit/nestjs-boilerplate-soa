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
import { SwaggerTransformer } from '@nestjs/swagger/dist/swagger-transformer';
import {
    filter, groupBy, keyBy, mapValues, omit
} from '@lib/utils/fn';

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

class SwaggerTransformerCustom extends SwaggerTransformer {
    public normalizePaths(
        denormalizedDoc: (Partial<OpenAPIObject> & Record<'root', any>)[]
    ): Record<'paths', OpenAPIObject['paths']> {
        const roots = filter(denormalizedDoc, r => r.root);
        const groupedByPath = groupBy(
            roots,
            ({ root }: Record<'root', any>) => root.path
        );

        const paths = mapValues(groupedByPath, routes => {
            const methods = {};

            routes.forEach((route, index) => {
                if (methods[route.root.method]) {
                    routes.splice(index, 1);
                } else {
                    methods[route.root.method] = true;
                }
            });

            const keyByMethod = keyBy(
                routes,
                ({ root }: Record<'root', any>) => root.method
            );

            return mapValues(keyByMethod, (route: any) => {
                return {
                    ...omit(route.root, ['method', 'path']),
                    ...omit(route, 'root')
                };
            });
        });

        return {
            paths
        };
    }
}

class SwaggerScannerCustom extends SwaggerScanner {
    constructor() {
        super();
        // @ts-ignore
        this.explorer = new SwaggerExplorerCustom(this.schemaObjectFactory);
        // @ts-ignore
        this.transformer = new SwaggerTransformerCustom();
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
