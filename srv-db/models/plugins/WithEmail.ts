import MagicSchema, { TMagicSchema } from '../MagicSchema';
import MagicModel from '../MagicModel';
import { emailRegexp } from '../../lib/regexps';

const defaults = Symbol('defaults');

class EmailController extends MagicModel {
    static get needConfirmationEmail() {
        return this.schema[defaults].needConfirmation;
    }

    async confirmEmail(email: string) {
        const Employee = MagicSchema.model('employee');
        const employee = await Employee.findOne({ _user: this._id });

        const promises: Promise<any>[] = [];

        promises.push(this.model().updateOne({ _id: this._id }, { $set: { email } }));
        promises.push(employee.updateObjectLowLevel(employee, {}, { email }));

        await Promise.all(promises);
    }
}

interface IOptions {
    validateEmail?: boolean;
    needConfirmation?: boolean;
    isProtected?: boolean;
    required?: boolean;
    trim?: boolean;
    lowercase?: boolean;
    haveController?: boolean;
    haveAdditional?: boolean;
}
const WithEmail = (schema: TMagicSchema, options: IOptions = {}) => {
    const {
        validateEmail = true,
        needConfirmation = false,
        isProtected = false,
        required = false,
        trim = true,
        lowercase = true,
        haveController = true,
        haveAdditional = true
    } = options;

    schema[defaults] = {
        needConfirmation
    };
    const emailParam = {
        type: String,
        description: 'Электронный адрес',
        default: null,
        public: true,
        search: { index: ['query', 'sort'] },
        maxlength: 254,
        check_email: true,
        lowercase,
        trim,
        required,
        protected: isProtected,
        check_param: 'email'
    };

    if (validateEmail) {
        Object.assign(emailParam, { match: emailRegexp });
    }

    schema.add({
        email: emailParam,
        lastEmail: {
            type: String,
            default: null,
            description: 'Последний введенный email',
            protected: true,
            private: true
        }
    });

    if (haveAdditional) {
        schema.add({
            additionalEmails: {
                type: [emailParam],
                default: [],
                description: 'Email (доп. информация).',
                public: true,
                check_param: 'email'
            }
        });
    }

    if (haveController) {
        schema.loadClass(EmailController, false);
    }
};

export default WithEmail;

export type TWithEmail = EmailController;
export type TWithEmailStatic = typeof EmailController;
