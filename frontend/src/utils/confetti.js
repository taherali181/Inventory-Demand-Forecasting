// Confetti was removed from the product (see the frontend overhaul contract:
// "Cut: sound, confetti, the 2.0 badge, emoji in product copy").
//
// This module is kept as an inert no-op ONLY so the remaining call sites that have
// not been converted yet still compile. Do not add behavior back here. Once the last
// `import { fireConfetti } from '.../utils/confetti'` is gone, delete this file (and
// drop the `canvas-confetti` dependency from package.json).
export function fireConfetti() {}

export default fireConfetti;
