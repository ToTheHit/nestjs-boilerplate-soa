const emailRegexp = new RegExp('[a-zA-Z0-9\\+\\.\\_\\%\\-\\+]{1,256}' +
    '\\@' +
    '[a-zA-Z0-9][a-zA-Z0-9\\-]{0,64}' +
    '(' +
    '\\.' +
    '[a-zA-Z0-9][a-zA-Z0-9\\-]{0,25}' +
    ')+');

const colorRegexp = /^#(?:[0-9a-f]{3}){1,2}$/i;

const innRegexp = /^\d+$ или ^[\d+]{10,12}$/;

const fullNameRegexp = /^[a-zA-Zа-яёА-ЯЁ\s\-]+$/igm;

export {
    emailRegexp,
    colorRegexp,
    innRegexp,
    fullNameRegexp
};
