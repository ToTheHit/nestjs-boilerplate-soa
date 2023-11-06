import User from '../models/user';
import Token from '../models/token';
// const { emailToUser } = require('../../smarty-notification/lib/mailSender');
// const buildLink = require('../../smarty-notification/lib/buildLink');
// TODO: добавить emailToUser
/**
 * Функция для отправки уведомления о смене пароля со ссылкой на смену пароля
 * Получатель: Пользователь, отправивший запрос на смену пароля
 */

const changePasswordRequest = async msg => {
    const { toId, tld } = msg.data;

    const user = await User.findById(toId).select('_id fullName email language auth_email');

    const token = await Token.createPasswordToken(user);

    /* await emailToUser('restorePassword', user, {
        username: user.fullName || user.email
       restorePasswordLink: buildLink('restore-pass', user, token, tld)
    }); */
};

export default changePasswordRequest;
