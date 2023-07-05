import RequestResult from './RequestResult';
import MagicSchema from '../../../../srv-db/models/MagicSchema';

class AnswerWithSchema extends RequestResult {
    private discriminator: any;

    private schemas: any;

    constructor(fields, discriminator = null) {
        if (!fields) {
            throw new Error('schema fields required');
        }

        super();

        this.discriminator = discriminator;

        this.schemas = (!Array.isArray(fields) ? [fields] : fields).map(schema => (schema instanceof MagicSchema
            ? schema
            : new MagicSchema(typeof fields === 'object' && fields !== null && !Array.isArray(fields)
                ? fields
                : {}, { _id: false, id: false, versionKey: false })));
    }

    describe() {
        return {
            discriminator: this.discriminator,
            result: this.schemas.length > 1
                ? this.schemas.map(schema => schema.describe())
                : this.schemas[0].describe()
        };
    }
}

export default AnswerWithSchema;
