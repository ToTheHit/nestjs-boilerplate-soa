import memoizee from 'memoizee/weak';

export default (fn, profileName, promise = true) => fn;
// export default (fn, profileName, promise = true) => (process.env.NO_MEMO
//     ? fn
//     : memoizee(fn, {
//         profileName,
//         promise,
//         maxAge: 5000
//     }));
