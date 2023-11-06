import {
    ApiOkResponse, ApiOperation
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import MagicModel from '@models/MagicModel';
import formatModelToSwagger from './lib/formatModelToSwagger';

interface IMagicModel {
    Model: MagicModel | [MagicModel]
}

interface IApiOperation {
    summary?: string,
    description?: string
}

interface IParams {
    apiOperation?: IApiOperation,
    apiOkResponse?: IMagicModel
}

const autoDocs = (params: IParams) => {
    const { apiOperation, apiOkResponse } = params;

    const swaggerSchema = formatModelToSwagger(apiOkResponse?.Model);

    return applyDecorators(
        ApiOperation(apiOperation),
        ApiOkResponse({ schema: swaggerSchema })
        // SetMetadata('roles', roles),
        // UseGuards(AuthGuard, RolesGuard),
        // ApiBearerAuth(),
        // ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    );
};

export default autoDocs;
