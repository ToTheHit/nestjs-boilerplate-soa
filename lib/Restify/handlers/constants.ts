import User from '../../../apps/srv-auth/models/user';

const sessionInCookies = new Map([
    [User, true]
]);

export {
    sessionInCookies
};
