import 'source-map-support/register';

import { Injectable } from '@nestjs/common';
import { Model, HydratedDocument } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UserDocument } from './models/user';

@Injectable()
export class AppService {
    constructor(
    @InjectModel('User')
    private collectionModel: Model<UserDocument>
    ) {}

    async getHello(): Promise<string> {
        // eslint-disable-next-line new-cap
        const createdEvent: HydratedDocument<UserDocument> = new this.collectionModel({
            kind: 'ClickedLinkEvent',
            url: 'test',
            time: 123
        });

        console.log('## createdEvent', createdEvent);

        // console.log(this.collectionModel.getPublicName());
        return 'Hello World!';
    }
}
