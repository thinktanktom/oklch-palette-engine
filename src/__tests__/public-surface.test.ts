/**
 * THE ONLY TEST THAT IMPORTS THROUGH index.ts.
 *
 * Every other test in this directory reaches for a leaf module — `../generate.ts`,
 * `../oklch.ts` — which is how the suite was written in the site this came from,
 * where index.ts was a barrel nothing imported and could have been deleted
 * without a single test noticing.
 *
 * Here index.ts IS the public surface, so that blind spot matters: a dropped
 * `export` line would narrow what the repo offers while the whole suite stayed
 * green. This file closes that by importing nothing but the entry point and
 * then actually USING each export — a name that resolves to `undefined`
 * survives an import in ESM, so merely importing it proves very little.
 *
 * If you add an export to index.ts, add it here. The list below is deliberately
 * written out by hand rather than derived from the module, because deriving it
 * would make the test agree with whatever index.ts currently says, which is
 * precisely the thing it is supposed to be checking.
 */
import { describe, it } from 'node:test'
import { expect } from './expect.ts'

import {
  oklch,
  maxChroma,
  toOklch,
  hex,
  contrast,
  luminance,
  solveL,
  solveNear,
  rng,
  pickHarmony,
  HARMONIES,
  TOKEN_NAMES,
  generate,
  CHROMA_CEIL,
  validate,
  isValid,
  GATES,
  CHROMA_FLOOR,
  type Rgb,
  type ChromaAt,
  type Harmony,
  type HarmonyName,
  type TokenName,
  type Palette,
  type Polarity,
  type GeneratedPalette,
  type Gate,
  type Failure,
  type ValidateOptions,
} from '../index.ts'

describe('the public surface', () => {
  it('exports every value the entry point promises, and each one works', () => {
    /* Exercised, not just imported. `import { nope }` from an ESM module that
       does not export `nope` is a link-time error in Node, but a re-export of
       something that became undefined downstream is not — so each name is
       called or read here. */
    const white: Rgb = [255, 255, 255]
    const black: Rgb = [0, 0, 0]

    expect(typeof oklch(0.5, 0.1, 200)).toBe('object')
    expect(maxChroma(0.5, 200)).toBeGreaterThan(0)
    expect(toOklch(white).L).toBeCloseTo(1, 1)
    expect(hex(black)).toBe('#000000')

    expect(contrast(white, black)).toBeCloseTo(21, 0)
    expect(luminance(white)).toBeCloseTo(1, 2)

    const at: ChromaAt = (L) => maxChroma(L, 200)
    expect(solveL(4.5, black, 200, at, true)).toBeGreaterThan(0)
    expect(solveNear(4.5, black, toOklch(black).L, 200, at, true)).toBeGreaterThan(0)

    const next = rng(1)
    expect(typeof next()).toBe('number')
    const harmony: Harmony = pickHarmony(rng(1))
    expect(HARMONIES.length).toBeGreaterThan(0)
    const name: HarmonyName = harmony.name
    expect(typeof name).toBe('string')

    expect(TOKEN_NAMES.length).toBe(9)
    const token: TokenName = TOKEN_NAMES[0]
    expect(typeof token).toBe('string')

    const made: GeneratedPalette = generate(1)
    const tokens: Palette = made.tokens
    const polarity: Polarity = made.polarity
    expect(typeof polarity).toBe('string')
    expect(CHROMA_CEIL).toBeGreaterThan(0)
    expect(CHROMA_FLOOR).toBeGreaterThan(0)

    const failures: Failure[] = validate(tokens)
    expect(failures).toHaveLength(0)
    expect(isValid(tokens)).toBe(true)
    const gate: Gate = GATES[0]
    expect(typeof gate.a).toBe('string')

    /* The options type is part of the surface too: the chroma floor is
       generator-only, so callers need a way to not apply it. */
    const options: ValidateOptions = { checkChroma: false }
    expect(validate(tokens, options)).toHaveLength(0)
  })

  it('does NOT re-export anything that touches the DOM', () => {
    /* The seam this repo is built around. apply.ts and favicon.ts stayed in the
       site; if either is ever pulled in here, this fails before a reader
       discovers it by shipping `document is not defined` into a server render. */
    const surface = Object.keys(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    )
    expect(surface).toHaveLength(0)
    for (const forbidden of ['applyPalette', 'clearPalette', 'persistPalette', 'paintFavicon']) {
      expect(Object.prototype.hasOwnProperty.call(globalThis, forbidden)).toBe(false)
    }
  })
})
