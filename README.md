# oklch-palette-engine

A seeded palette generator. One 32-bit integer in, nine sRGB tokens out, every
informational pair solved to a contrast target rather than sampled and hoped
over. Written in OKLCH, no dependencies, ~610 lines.

```
npm test        # 43 tests, nothing to install
```

It was extracted from my personal site, where it powers a "roll me a theme"
button. This repo is a **snapshot of the pure half** — see
[What stayed behind](#what-stayed-behind) and [This is a snapshot](#this-is-a-snapshot-not-a-package).

---

## Why this exists

Honest version: I wanted to pull it out and poke at it. The thing had grown
inside a site over a few weeks, and it had reached the point where I could tell
you what every constant did but not really *why the shape of it was right* —
which is an uncomfortable thing to not know about code you wrote. Lifting it
somewhere with no Next.js, no stylesheet and no DOM around it was the way to
find out what was actually load-bearing and what was just scar tissue from the
site it grew in.

It is also, and I'd rather say so plainly than have you guess: **AI-assisted
work.** I drove it, I made the calls, and the measurements below are real and
reproducible — but I didn't type all of it, and the extensive commenting style
throughout is a product of how it was built. Take the evidence at face value and
the authorship with that context.

So: this is a thing I made to understand, not a library I'm offering you to
depend on. The difference shows up everywhere below.

---

## The calibration story

This is the part worth reading. The constants in here are not taste — they were
each measured off a palette that already existed and already worked, and the
fixtures in `src/__tests__/fixtures.ts` are the evidence, not decoration.

The site had three hand-designed palettes over its life: an electric-yellow one,
and two achromatic ones at opposite ends (accent pure `#ffffff` and pure
`#000000`). All three are kept as fixtures, and `calibration.test.ts` runs all
three through the same gate table the generator targets. **If a hand-designed
palette fails a gate, the gate is wrong — not the palette.** That inversion is
the whole method.

Two constants came directly out of that, and both would look arbitrary without it:

**`CHROMA_CEIL = 0.24`, set just above the yellow.** That colour was `#e8ff00`,
and measuring it in OKLCH put it at `C/maxC = 1.00` for its hue — sitting
*exactly* on the sRGB gamut edge. So the rule the generator encodes is "as vivid
as the gamut allows", and the gamut itself is the cap. A ceiling tighter than
that would have rejected a colour that demonstrably worked in production for
months.

**The accent rule is a chroma floor, not a contrast gate.** The obvious way to
say "the accent must not collapse into the body text" is to require contrast
between them. That same yellow measures **1.02:1 against its own off-white
text** — near-identical in luminance, obviously distinct to look at, because the
distinction is carried by *hue*. A luminance test there would have rejected the
brand's own palette. So `CHROMA_FLOOR = 0.055` asks for chromaticity instead,
and never for luminance separation.

There's a consequence I like, because it shows the rule is scoped rather than
universal: the achromatic palette that eventually shipped as the site's default
**fails the chroma floor on purpose**, and the test asserts that it fails. It
solves the same problem a different way — by taking the pure endpoint, 21:1
against its own background. The floor exists so a *generated* accent can't land
on a near-text grey. It is a generator-only rule, and `validate()` takes an
option to turn it off for exactly that reason.

---

## Three design choices that earn their keep

**OKLCH, not HSL.** OKLCH is perceptually uniform, so one lightness ramp looks
like the same ramp at every hue — in HSL, `L: 50%` is a very different apparent
brightness at yellow than at blue, and a generator built on it produces palettes
that are "correct" and visibly inconsistent. Reaching the gamut is done by
reducing chroma along the hue ray; clipping RGB channels instead shifts the hue,
which is how you end up with a "blue" that arrives green.

**Contrast is solved, not sampled.** `solveL` and `solveNear` bisect to the
target. The tempting alternative — generate a candidate, test it, retry on
failure — has two problems that are easy to miss until they bite: it can fail to
terminate when no candidate in the region satisfies the constraint, and more
insidiously it **biases the hue distribution** toward whatever hues happen to
pass, so your "random" palettes quietly cluster. Bisection is fixed-iteration
(30, 90 and 24 steps in the three solvers) and hue-neutral.

**`border` and `grid-dot` get contrast *windows*, not floors.** Every other pair
in the gate table is `min` only. These two carry a `max` as well — 2.0 and 1.55
— because a floor alone is a one-sided requirement and these elements want to be
*only just* perceptible. Give a divider a generous contrast minimum and no
ceiling, and the solver happily hands you a stripe; the hero's dot texture
becomes noise. "Visible enough, and no more" needs two numbers.

---

## What this does NOT guarantee

**Read this bit before using any of it.** This is a generator, not a theming
system, and the gap between those two is where someone could get hurt.

The gate table bounds pairs of **solid** tokens. It says nothing about what
happens at partial opacity — and at partial opacity the guarantees simply stop.
Measured over 20,000 seeds, reproducible via `npm run test:sweep`:

| composite | result |
|---|---|
| a generated accent at **40% alpha** over its own background | under the 3:1 non-text UI floor on **78.7%** of palettes — worst case **1.75:1** |
| accent text at 80% on a 10%-accent-tinted chip | misses **WCAG AA** on **58.9%** of palettes |

The reason this hid for so long in the original site is instructive: that site's
accent was hand-picked and enormous (21:1 against the background), so 40% alpha
still cleared the floor comfortably. A *generated* accent only has to clear the
gate table's 4.5–6.5:1, and the same utility collapses.

**Those were fixed in the site's stylesheet, not in this engine**, with
per-utility alpha overrides, and that was the right place: the engine picks
colours, and these are composites of one. Nothing in here will stop you
compositing your way below AA. `src/__tests__/limitations.test.ts` measures the
failure rates rather than asserting they're fine — it passes when the numbers
are bad, which is an odd test to write and the honest one.

The supported route is to not composite: `accent`-on-`surface` **is** in the
gate table, so dropping the tint makes the same chip AA by construction.

---

## The nine token names are one site's structure

```
bg  surface  border  text  muted  accent  accent-dim  grid-dot  success
```

That is not a general-purpose design-token vocabulary. It is the set of things
*one* site needed, and it shows:

- **`grid-dot`** is a hero background texture. Most sites do not have a hero
  background texture. It is in the gate table with a contrast window because
  that site had one.
- **`success`** is pinned to a fixed hue of **152°** and never takes the key
  hue. It carries meaning rather than brand: an "open to work" status chip must
  not turn red because the seed happened to land on red. If you have no status
  colour, it is a token you are carrying for nothing.
- There is no `warning`, no `error`, no `info`, no scale of greys — because that
  site didn't use them.

Adapting this to another project means rewriting that list and the gate table
beside it. That is not a small edit; the gate table is where the design lives.

---

## What stayed behind

The site keeps the half that touches the browser, and it is a real seam rather
than a tidy-up:

| stayed in the site | why |
|---|---|
| `apply.ts` | the only file in the whole engine that touches `document` — writes the tokens as inline custom properties, manages a `localStorage` cache under site-specific keys |
| `favicon.ts` | fetches one specific SVG and tints it |
| the pre-paint `<script>` | inlined into the site's root layout to set the theme before first paint |
| the stylesheet cross-check | `calibration.test.ts` ended by parsing the site's `globals.css` to prove the fixtures match the shipped design — there is no stylesheet here to agree with |

That last one is the most valuable test in the original suite and it could not
come. The cost is stated in the file: these fixtures are evidence for the gate
table, but nothing in this repo proves they're still the colours a real design
used.

---

## This is a snapshot, not a package

The site has its own copy and is not consuming this one. **The two will drift,
and that is expected rather than neglect** — if the site's design changes, its
copy changes and this one won't. It is not on npm and won't be. There is no
versioning policy because there is nothing here to depend on.

If something in here is useful to you, the useful thing is probably the *method*
— calibrate your constants against a design that already works, and let the
hand-made palette be the thing that judges the gate, not the other way round.
Copy the file, don't install it.

---

## Running it

```bash
npm test             # 43 tests. No install. Needs Node >= 22.6 for --experimental-strip-types.
npm run test:sweep   # the same tests over 20,000 seeds instead of 2,000
npm run typecheck    # needs `npm install` (TypeScript + @types/node) or the nix dev shell
nix develop          # Node 22 + tsc, if you're on Nix
```

There is no build step. The tests run straight off the TypeScript sources
through Node's type stripping, which is why `npm test` needs nothing installed
and why the flake provides a dev shell but no derivation for the library — there
is nothing to compile.

`src/__tests__/public-surface.test.ts` is the one test that imports through
`src/index.ts` rather than reaching for a leaf module, so a dropped export fails
loudly instead of quietly narrowing what this offers. Every other test imports
leaves directly, which is how they were written in the site, where `index.ts`
was a barrel nothing imported at all.
