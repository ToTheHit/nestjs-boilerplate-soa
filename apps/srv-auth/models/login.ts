import MagicSchema from '@models/MagicSchema';
import MagicObject from '@plugins/MagicObject';
import MagicModel from '@models/MagicModel';
import { formatDateTime } from '@lib/utils/daytime';
import { TUser } from './user';

const LoginSchema = new MagicSchema({
    _userId: {
        type: MagicSchema.Types.ObjectId
    },

    // TODO add validator
    ip_address: {
        type: String
        // validate: {
        // validator: ip => validator.isIP(ip),
        // message: 'invalid ip'
        // }
    },

    country: {
        type: String
    },

    region: {
        type: String
    },

    city: {
        type: String
    },

    coordinates: {
        lat: {
            type: String
        },

        lon: {
            type: String
        }
    }
});

class LoginClass extends MagicModel {
    static handleLogin(user: TUser, req: any) {
        const {
            geoip_city_country_name,
            geoip_city,
            geoip_latitude,
            geoip_longitude,
            geoip_region_name
        } = req.headers;

        return this.create({
            _id: new MagicSchema.ObjectId(),
            ip_address: req.requestInfo.ip,
            _userId: user._id,
            country: geoip_city_country_name,
            region: geoip_region_name,
            city: geoip_city,
            coordinates: {
                lat: geoip_latitude,
                lon: geoip_longitude
            }
        });
    }

    get coordinatesLink() {
        return this.coordinates
            ? `https://yandex.ru/maps?text=${this.coordinates.lat},${this.coordinates.lon}`
            : null;
    }

    get time() {
        return formatDateTime(this._createdOn, 'datetime');
    }
}

LoginSchema.plugin(MagicObject);
LoginSchema.loadClass(LoginClass);

const Login = LoginSchema.model('login', 'logins');

export default Login;
