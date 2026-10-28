/**
 * CALIBRATION — the load-bearing test in this suite.
 *
 * The gate table in validate.ts claims to encode *this site's* design rather
 * than a generic WCAG wishlist. The only way to check that claim is to run the
 * three hand-designed palettes through it: if funky, dark or light fails a gate,
 * the gate is wrong, not the palette.
 *
 * `dark` is the one that SHIPPED in the origin site as of 2026-10-16: the
 * dark-mono palette held by `:root` in its globals.css. The stylesheet
 * cross-check that used to sit at the foot of this file did not come with the
 * extraction -- see the note there. `funky` shipped as the default until that date and
 * `light` long before; both are kept as REFERENCE palettes because they are the
 * calibration evidence, not history.
 *
 * Which of the three is shipping does not change what this file is for. funky in
 * particular must stay: its #e8ff00 sits at the exact sRGB gamut edge for its
 * hue (C/maxC = 1.00) and is the ONLY evidence for CHROMA_CEIL, and its accent
 * measures 1.02:1 against its own text, which is why "the accent must not
 * collapse into the text" is a chroma floor and not a contrast gate. Running all
 * three is what shows the gates are not merely tuned to whichever one ships.
 * See fixtures.ts.
 *
 * `checkChroma` is deliberately NOT passed. dark and light are achromatic by
 * design (accent is pure #ffffff / #000000), so the chroma floor is a
 * generator-only rule — see the comment on ValidateOptions in validate.ts. Note
 * this now applies to the SHIPPING default: dark-mono fails the chroma floor on
 * purpose, and solves the same problem the floor exists for by taking the pure
 * endpoint instead (21:1 against its own bg). That is not a contradiction, it is
 * why the rule is scoped to the generator.
 */

import { describe, it } from 'node:test'
import { expect } from './expect.ts'

import { contrast } from '../contrast.ts'
import { toOklch } from '../oklch.ts'
import { TOKEN_NAMES, type Palette, type TokenName } from '../tokens.ts'
import { CHROMA_FLOOR, GATES, validate } from '../validate.ts'
import { CALIBRATION_PALETTES } from './fixtures.ts'

const PALETTE_NAMES = ['funky', 'dark', 'light'] as const

describe('the three calibration palettes pass the generator gate table', () => {
  for (const name of PALETTE_NAMES) {
    it(`${name} clears every gate`, () => {
      // The failure objects are readable, so assert on them rather than a
      // boolean: a regression prints which pair missed and by how much.
      expect(validate(CALIBRATION_PALETTES[name])).toEqual([])
    })
  }

  it('reports the gate each palette comes closest to missing', () => {
    // Not an assertion about a number — it pins the *identity* of the binding
    // constraint. validate.ts says muted/surface is the tightest pair on the
    // site; if that stops being true the comments there are stale.
    const tightest = (tokens: Palette): string => {
      let best = { pair: '', slack: Infinity }
      for (const gate of GATES) {
        const value = contrast(tokens[gate.a], tokens[gate.b])
        const slack = Math.min(
          value - gate.min,
          gate.max === Infinity ? Infinity : gate.max - value,
        )
        if (slack < best.slack) best = { pair: `${gate.a}/${gate.b}`, slack }
      }
      return best.pair
    }

    expect(tightest(CALIBRATION_PALETTES.funky)).toBe('border/bg')
    expect(tightest(CALIBRATION_PALETTES.dark)).toBe('grid-dot/bg')
    expect(tightest(CALIBRATION_PALETTES.light)).toBe('grid-dot/bg')

    // muted/surface is the tightest *informational text* pair, which is the
    // claim validate.ts actually makes; the two window gates sit closer to
    // their bounds but a divider being slightly off is not a legibility bug.
    expect(
      contrast(CALIBRATION_PALETTES.funky.muted, CALIBRATION_PALETTES.funky.surface),
    ).toBeCloseTo(4.78, 2)
  })
})

describe('the chroma floor is generator-only', () => {
  it('passes funky, whose accent is a real hue', () => {
    expect(validate(CALIBRATION_PALETTES.funky, { checkChroma: true })).toEqual([])
    expect(toOklch(CALIBRATION_PALETTES.funky.accent).C).toBeGreaterThan(CHROMA_FLOOR)
  })

  for (const name of ['dark', 'light'] as const) {
    it(`fails ${name}, which is achromatic on purpose`, () => {
      // Documents *why* the calibration test above must not pass checkChroma,
      // and why these two palettes are still worth keeping: they are the reason
      // "the accent must not collapse into the text" is a chroma FLOOR and not a
      // contrast gate — as a contrast gate it would reject them outright.
      expect(toOklch(CALIBRATION_PALETTES[name].accent).C).toBeCloseTo(0, 6)
      expect(validate(CALIBRATION_PALETTES[name], { checkChroma: true })).toEqual([
        { pair: 'accent chroma', value: 0, min: CHROMA_FLOOR, max: Infinity },
      ])
    })
  }
})

/* THE STYLESHEET CROSS-CHECK WAS LEFT BEHIND, deliberately.
 *
 * In the site this file ends with a block that parses src/app/globals.css and
 * asserts the `dark` fixture equals the `:root` token block the site actually
 * ships -- so the calibration table cannot drift from the design it claims to
 * encode. That is arguably the most valuable check in the original suite, and it
 * is the one thing that could not come with it: there is no stylesheet here to
 * agree with, and shipping a copy of one would only be asserting against itself.
 *
 * What that costs this repo, stated plainly: the three fixtures are the evidence
 * for the gate table, but nothing here proves they are still the colours a real
 * design used. They were, on 2026-10-16. Check against the site if it matters.
 */
