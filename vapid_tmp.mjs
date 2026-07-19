import { ApplicationServerKeys } from 'webpush-webcrypto';
const k = await ApplicationServerKeys.generate();
const exp = await k.export();
console.log(JSON.stringify(exp));
