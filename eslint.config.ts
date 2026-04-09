import { resolve } from 'presetter';

const assets = await resolve(import.meta.url);

export default assets.default;