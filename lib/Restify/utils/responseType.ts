import { SetMetadata } from '@nestjs/common';

export default (message: string) => SetMetadata('ResponseTypeKey', message);
