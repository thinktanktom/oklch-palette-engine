/**
 * WHAT THIS ENGINE DOES NOT GUARANTEE — measured, not asserted in prose.
 *
 * Every other test here checks that the generator keeps a promise. This one
 * exists to put a number on a promise it does NOT make, because that is the
 * thing most likely to hurt somebody reading the README and reaching for the
 * code.
 *
 * The gate table in validate.ts bounds pairs of SOLID tokens. It cannot bound
 * `border-accent/40`, or accent text on an accent-tinted chip, because those are
 * composites of a token against another token — and an alpha on the accent is
 * only ever as strong as the accent's own contrast.
 *
 * In the site this came from, the gap hid for a long time because that site's
 * accent was hand-picked and enormous: dark-mono's is pure white at 21:1 against
 * bg, and the yellow before it was 17-21:1. Either survives 40% alpha. A
 * GENERATED accent only has to clear the gate table's 4.5-6.5:1, so the same
 * 40% collapses. The fix lives in that site's stylesheet, as per-utility alpha
 * overrides, and deliberately NOT in this engine: the engine picks colours, and
 * these are composites of one.
 *
 * So these tests pass when the numbers are BAD. A failure here means the
 * generator got better and the README is now overstating the problem — which
 * would be good news, and should be checked rather than silenced.
 */
import { describe, it } from 'node:test'
import { expect } from './expect.ts'

import { generate } from '../generate.ts'
import { contrast } from '../contrast.ts'
import type { Rgb } from '../oklch.ts'
import { CALIBRATION_PALETTES } from './fixtures.ts'

/** How a browser composites a translucent colour: non-premultiplied, gamma space. */
const over = (fg: Rgb, bg: Rgb, alpha: number): Rgb =>
  fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as unknown as Rgb

const SEEDS = Number(process.env.PALETTE_SWEEP_SEEDS ?? 2000)

/* Generated once for the file. generate() costs ~0.46ms, so a per-test sweep of
   20,000 seeds would take ~10s apiece for no extra information. */
const palettes = Array.from({ length: SEEDS }, (_, i) => generate(i + 1))

const rateFailing = (predicate: (p: (typeof palettes)[number]) => boolean): number =>
  palettes.filter(predicate).length / palettes.length

describe('alpha composites are outside the gate table', () => {
  it('a generated accent at 40% misses the 3:1 UI floor on most palettes', () => {
    const rate = rateFailing(
      (p) => contrast(over(p.tokens.accent, p.tokens.bg, 0.4), p.tokens.bg) < 3,
    )
    /* ~78.7% over the site's 20,000-seed sweep. Asserted as a wide band rather
       than a point, because the exact figure moves with the seed count and the
       claim being protected is "most", not "78.7". */
    expect(rate, `measured ${(rate * 100).toFixed(1)}% over ${SEEDS} seeds`).toBeGreaterThan(0.5)
  })

  it('an accent-tinted chip misses WCAG AA on a large share of palettes', () => {
    /* text-accent/80 over bg-accent/10, as Tailwind composites it. Both sides
       move toward the accent, which is what makes this worse than a plain
       border: the background rises as the text falls. ~58.9% in the site. */
    const rate = rateFailing((p) => {
      const chipBg = over(p.tokens.accent, p.tokens.bg, 0.1)
      return contrast(over(p.tokens.accent, chipBg, 0.8), chipBg) < 4.5
    })
    expect(rate, `measured ${(rate * 100).toFixed(1)}% over ${SEEDS} seeds`).toBeGreaterThan(0.25)
  })

  it('a hand-picked accent survives the same alpha — which is why the gap hid', () => {
    /* Both of these clear 3:1 at 40%, so a site whose accent is chosen by a
       human can ship the same utility for years and never see the problem. */
    for (const name of ['funky', 'dark'] as const) {
      const theme = CALIBRATION_PALETTES[name]
      expect(contrast(over(theme.accent, theme.bg, 0.4), theme.bg), name).toBeGreaterThanOrEqual(3)
    }
  })

  it('...but not always: the light reference fails it with a hand-picked accent too', () => {
    /* Pure black accent at 40% over white composites to #999999, under the
       floor. The same failure mode as a generated accent, reached by hand —
       which is the clearest argument that this is a property of alpha
       compositing rather than of the generator. */
    const { accent, bg } = CALIBRATION_PALETTES.light
    expect(contrast(over(accent, bg, 0.4), bg)).toBeLessThan(3)
  })

  it('the SOLID pair the chip reduces to IS gated, which is the supported route', () => {
    /* accent-on-surface is in the gate table at 4.5 because the accent renders
       as small text directly on surface. Dropping the tint and using the solid
       pair is therefore AA by construction — the fix is to stop compositing,
       not to pick different colours. */
    for (const p of palettes) {
      if (contrast(p.tokens.accent, p.tokens.surface) < 4.5) {
        throw new Error(`seed ${p.seed}: accent/surface below AA, which the gate table forbids`)
      }
    }
  })
})
