// Sound effects were removed from the product (see the frontend overhaul contract:
// "Cut: sound, confetti, the 2.0 badge, emoji in product copy").
//
// This module is kept as an inert no-op ONLY so the remaining call sites that have
// not been converted yet still compile. Do not add behavior back here. Once the last
// `import { sound } from '.../utils/sound'` is gone, delete this file.
const noop = () => {};

export const sound = {
  enabled: false,
  init: noop,
  playPop: noop,
  playSuccess: noop,
  playAlert: noop,
};

export default sound;
