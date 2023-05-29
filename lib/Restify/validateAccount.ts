import { AccessDenied, NoAuthError } from '../errors';

const validateAccount = (account, confirmedEmailOnly = true, ignoreBlock = false) => {
    if (!account) {
        throw new NoAuthError('session not found');
    }

    if (!ignoreBlock && account.isBlocked) {
        throw new AccessDenied('you are blocked', {});
    }

    if (account.is('AccountWithConfirmation') && confirmedEmailOnly && !account.checkAllConfirm()) {
        throw new AccessDenied('account not confirmed', {});
    }
};

export default validateAccount;
