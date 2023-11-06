import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
import advancedFormat from 'dayjs/plugin/advancedFormat'; // https://day.js.org/docs/en/plugin/advanced-format

// dayjs.extend(customParseFormat);
// dayjs.extend(advancedFormat);

const timeObject = (timestamp, formatIn, strict = false) => dayjs(timestamp, formatIn, strict);

const format = (formatOut, timestamp = Date.now(), formatIn) => timeObject(timestamp, formatIn).format(formatOut);
const startOf = (period, timestamp = Date.now(), formatIn) => timeObject(timestamp, formatIn).startOf(period).valueOf();
const endOf = (period, timestamp = Date.now(), formatIn) => timeObject(timestamp, formatIn).endOf(period).valueOf();
const valueOf = (timestamp, formatIn, strict = false) => timeObject(timestamp, formatIn, strict).valueOf();
const isValid = (timestamp, formatIn, strict = false) => timeObject(timestamp, formatIn, strict).isValid();

const DATE_FORMAT = 'DD.MM.YYYY';
const DATE_TIME_FORMAT = 'DD.MM.YYYY, HH:mm';
const TIME_FORMAT = 'HH:mm';

// eslint-disable-next-line no-nested-ternary
const checkFormat = formatIn => (formatIn === 'datetime' ? DATE_TIME_FORMAT : (formatIn === 'time' ? TIME_FORMAT : DATE_FORMAT));

const isValidDateTime = (timestamp, formatIn) => isValid(timestamp, checkFormat(formatIn));
const formatDate = (timestamp = Date.now(), formatIn) => format(DATE_FORMAT, timestamp, formatIn);
const formatDateTime = (timestamp:number = Date.now(), formatIn: any) => format(DATE_TIME_FORMAT, timestamp, formatIn);
const formatTime = (timestamp = Date.now(), formatIn) => format(TIME_FORMAT, timestamp, formatIn);
const valueOfDate = (timestamp, strict = false) => valueOf(timestamp, DATE_FORMAT, strict);
const valueOfDateTime = (timestamp, strict = false) => valueOf(timestamp, DATE_TIME_FORMAT, strict);
const valueOfTime = (timestamp, strict = false) => valueOf(timestamp, TIME_FORMAT, strict);

export {
    format,
    startOf,
    endOf,
    valueOf,
    isValid,
    isValidDateTime,
    formatDate,
    formatDateTime,
    formatTime,
    valueOfDate,
    valueOfDateTime,
    valueOfTime
};
