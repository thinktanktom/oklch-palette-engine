/**
 * The public surface of the engine.
 *
 * In the site this was extracted from, this file was a barrel nothing imported
 * — every consumer reached for the leaf modules directly. Here it is the entry
 * point, and __tests__/public-surface.test.ts imports ONLY through it, so an
 * export dropped from this list fails loudly instead of silently narrowing what
 * the repo claims to offer.
 *
 * Nothing below touches the DOM and nothing has a dependency. The half that did
 * — writing tokens onto an element, the localStorage cache, the favicon tint —
 * stayed in the site, because it encodes that site identity rather than this
 * engine. See the README on where the seam is and why.
 */

export { oklch, maxChroma, toOklch, hex, type Rgb } from './oklch.ts'
export { contrast, luminance, solveL, solveNear, type ChromaAt } from './contrast.ts'
export { rng, pickHarmony, HARMONIES, type Harmony, type HarmonyName } from './harmony.ts'
export { TOKEN_NAMES, type TokenName, type Palette, type Polarity } from './tokens.ts'
export { generate, CHROMA_CEIL, type GeneratedPalette } from './generate.ts'
export {
  validate,
  isValid,
  GATES,
  CHROMA_FLOOR,
  type Gate,
  type Failure,
  type ValidateOptions,
} from './validate.ts'
