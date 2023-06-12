import mongoose from 'mongoose';
import SmartySchema from '../SmartySchema';
import { get } from '../../../lib/utils/fn';
import { ValidationError } from '../../../lib/errors';

const PT_MOBILE = 0;
const PT_WORK = 1;
const PT_HOME = 2;
const PT_FAX = 3;
const PT_OTHER = 4;

const defaults = { type: PT_MOBILE, number: '' };

const PhoneSchema = new SmartySchema({
    type: {
        $type: Number,
        description: 'Тип телефона, 0 - Mobile, 1 - Work, 2 - Home, 3 - Fax, 4 - Other',
        validate: {
            validator(phoneType) {
                return [
                    PT_OTHER,
                    PT_MOBILE,
                    PT_WORK,
                    PT_HOME,
                    PT_FAX
                ].includes(phoneType);
            },
            message: 'not supported phone type'
        },
        default: defaults.type
    },
    number: {
        $type: String,
        description: 'Номер телефона.',
        default: defaults.number,
        maxlength: 250
    }
}, { _id: false, id: false, typeKey: '$type' });

// eslint-disable-next-line no-use-before-define
class WithPhoneClass extends mongoose.Model<WithPhoneClass> {
    static PHONE_TYPES = {
        [PT_OTHER]: 'other',
        [PT_MOBILE]: 'mobile',
        [PT_WORK]: 'work',
        [PT_HOME]: 'home',
        [PT_FAX]: 'fax'
    };

    getPhoneValue(field) {
        const phone = get(this.toJSON(), field);

        if (!phone) {
            throw new ValidationError('no phone in field', { field });
        }

        return phone.number;
    }
}
interface IOptions {
    haveAdditional?: boolean;
    isPhoneProtected?: boolean;
    trim?: boolean
}
const WithPhone = (schema: SmartySchema, options: IOptions = {}) => {
    const { haveAdditional = true, isPhoneProtected = false, trim = true } = options;

    schema.add({
        phone: {
            type: PhoneSchema,
            default: defaults,
            description: 'Телефон',
            trim,
            check_param: 'phone',
            protected: isPhoneProtected
        }
    });

    if (haveAdditional) {
        schema.add({
            additionalPhones: {
                type: [PhoneSchema],
                default: [],
                description: 'Телефон (доп. информация).',
                public: true,
                check_param: 'phone'
            }
        });
    }

    schema.loadClass(WithPhoneClass, false);
};

export default WithPhone;
export type TWithPhone = WithPhoneClass;
export type TWithPhoneStatic = typeof WithPhoneClass;
