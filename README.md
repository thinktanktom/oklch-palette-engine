# oklch-palette-engine

A machine that invents colour schemes for a website. You give it one number,
the "seed", and it gives back nine named colours: background, text, borders, a
highlight colour and so on. The same number always produces the same scheme.

Its main promise is that every scheme is readable. Text is always dark or light
enough against its background.

```
npm test        # 43 tests, nothing to install
```

It came out of my personal site, where it powers a "roll me a theme" button.
This repo is a frozen copy of the half that only does maths.

---

## Why this exists

Honest version: I wanted to pull it out and poke at it. The thing had grown
inside a site over a few weeks, and it had reached the point where I could tell
you what every constant did but not really *why the shape of it was right*. 


This is the result of it being: **AI-assisted work.** I drove it, I made the 
calls, and the measurements below are real and reproducible.

---

## How the rules were set

The engine works by rules, such as "text must contrast with the background at
least this much" or "the highlight colour must be at least this vivid". I didn't
pick those numbers by taste. I had AI measure them off colour schemes I had 
already designed and knew worked.

There were three: a vivid electric yellow, an all-white scheme for dark mode,
and an all-black scheme for light mode. All three are saved in
`src/__tests__/fixtures.ts`, and `calibration.test.ts` runs them through the
same rules the engine uses. **If a good design fails a rule, the AI treats the rule as
wrong, not the design.**

Two rules came straight out of it.

**How vivid a colour may be (`CHROMA_CEIL = 0.24`).** Ordinary screens can only
show colours up to a certain vividness. The yellow (`#e8ff00`) sat exactly at
that limit: as vivid as a yellow on a normal screen can get. So the engine's
rule is simply "as vivid as the screen allows", and I set the cap just above the
yellow. A tighter cap would have rejected a colour that worked on the live site
for months.

**The highlight must be colourful, not just different in brightness
(`CHROMA_FLOOR = 0.055`).** The obvious way to stop the highlight colour
blending into the body text is to demand a brightness difference between them.
But the yellow and its off-white text are almost identical in brightness
(1.02:1, where 1:1 means identical). They're still obviously different to the
eye, because one is yellow. A brightness rule would have rejected my own
design. So the rule asks for vividness instead.

I like a side effect of this. The all-white and all-black schemes have no colour
at all, so they **fail the vividness rule on purpose**, and the test checks that
they fail. They stay readable another way: pure white on black is the strongest
contrast possible (21:1). The rule only exists so a *generated* highlight can't
land on a grey that looks like the text. `validate()` lets you switch it off for
hand-made schemes for exactly that reason.

---

## Three choices that matter

**Describing colour the way eyes see it.** There are several ways to describe a
colour with numbers. The common one, HSL, has a flaw: a yellow and a blue at the
"same" brightness setting don't look equally bright. The engine uses OKLCH
instead, which is designed so that equal numbers look equal. For a generator,
that decides whether every scheme looks balanced or some come out lopsided.

When a colour is too vivid for the screen, the engine tones it down while
keeping it the same colour. The crude alternative, chopping off whichever red,
green or blue value is too high, changes the colour itself. That's how a "blue"
ends up slightly green.

**Calculating over guessing.** A lazy generator picks random colours and retries
until one passes. That can loop forever when nothing nearby passes. Worse, it
quietly favours whichever colours pass most easily, so your "random" schemes
stop being random. This engine homes in on the answer by repeatedly halving the
range, like guessing a number between 1 and 100 by always guessing the middle.
It always finishes in a fixed number of steps (30, 90 and 24 in the three
places it does this) and treats every colour family equally.

**Borders get a maximum and a minimum.** Every other rule says "at least
this much contrast". Borders and the faint dot pattern behind the page header
also have an upper limit (2.0 and 1.55). A divider should be only just visible.
Give it a minimum and no maximum, and the engine happily hands you a thick
stripe, and the dot pattern turns into noise.

---

## What this does NOT guarantee

**Read this before using any of it.** This picks colours. It doesn't manage how
a site uses them.

The rules only cover solid colours. Measured over 
20,000 seeds (run `npm run test:sweep` to reproduce):

| what was tested | result |
|---|---|
| the highlight colour at 40% strength over its own background | below the accessibility minimum for buttons and icons (3:1) in **78.7%** of schemes, worst case **1.75:1** |
| highlight-coloured text at 80% strength on a label lightly tinted with the same colour | below the standard accessibility level for text (4.5:1) in **58.9%** of schemes |

Why this went unnoticed on the original site: its highlight was hand-picked and
extremely strong (21:1 against the background), so even at 40% strength it was
fine. A *generated* highlight only has to reach 4.5–6.5:1, and the same effect
falls apart.

**I fixed those in the site's styling, not in this engine**, the engine picks colours, and these are blends of them. 
Nothing in here will stop you blending your way into unreadable text.
`src/__tests__/limitations.test.ts` measures how often it fails and only passes when the numbers are bad.

The safe route is not to blend. Highlight colour on a solid panel *is* covered by
the rules, so dropping the tint makes the same label readable by design.

---

## The nine colours suit one site

```
bg  surface  border  text  muted  accent  accent-dim  grid-dot  success
```

That's background, panels, borders, main text, quieter text, the highlight
colour, a softer highlight, a dot pattern, and a status green. It isn't a
general-purpose set. It's what *one* site needed:

- **`grid-dot`** is the faint dot pattern behind that site's page header. Most
  sites don't have one.
- **`success`** is always green and never follows the seed. 

- There's no warning, error or info colour, and no range of greys.

---

## What stayed behind

| stayed in the site | why |
|---|---|
| `apply.ts` | the only file that touches the live page: it puts the colours on it and remembers your chosen theme in your browser between visits |
| `favicon.ts` | recolours the site's small browser-tab icon |
| a small script at the top of every page | sets the theme before the page first appears, so you never see a flash of the wrong colours |
| the styling cross-check | `calibration.test.ts` finished by reading the site's stylesheet to prove the saved schemes matched the live design|

---

## This is a frozen copy, not a library

The site has its own copy and doesn't use this one. **The two might drift apart.** 
Although I will do my best to update this repo in case I decide to make changes.

