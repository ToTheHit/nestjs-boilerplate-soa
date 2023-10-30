import User from '@srvAuth/models/user';

const sessionInCookies = new Map([
    [User, true]
]);

export {
    sessionInCookies
};
