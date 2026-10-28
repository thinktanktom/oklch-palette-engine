/**
 * A ~60-line `expect` built on node:assert, so the tests can stay BYTE-FOR-BYTE
 * the ones the site runs under vitest.
 *
 * This repo is a snapshot, and the most useful thing a snapshot can say is "the
 * assertions here are the assertions there". Rewriting ~700 lines of test bodies
 * into assert.equal calls would have quietly become a different suite, and any
 * porting slip would look like a passing test. A shim keeps the diff against the
 * origin readable and keeps the dependency count at zero, which is the other
 * thing this repo is demonstrating.
 *
 * Only the eleven matchers those tests actually use are implemented — plus
 * `.not` and the two-argument `expect(value, message)` form, both of which they
 * also use. Anything else throws rather than silently passing: an unimplemented
 * matcher must fail loudly, or the shim becomes a way to not test things.
 */
import assert from 'node:assert/strict'

type Matchers = {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toBeCloseTo(expected: number, digits?: number): void
  toBeGreaterThan(n: number): void
  toBeGreaterThanOrEqual(n: number): void
  toBeLessThan(n: number): void
  toBeLessThanOrEqual(n: number): void
  toContain(needle: unknown): void
  toHaveLength(n: number): void
  toMatch(re: RegExp | string): void
  toBeUndefined(): void
  toBeNull(): void
}

function build(value: any, message: string | undefined, negated: boolean): Matchers {
  /* One place decides pass/fail, so `.not` cannot drift from its positive twin
     and the message is attached identically either way. */
  const check = (ok: boolean, detail: string) =>
    assert.ok(negated ? !ok : ok, message ?? (negated ? `NOT ${detail}` : detail))

  const show = (v: unknown) => {
    try { return typeof v === 'string' ? JSON.stringify(v) : String(v) } catch { return '[unprintable]' }
  }

  return {
    toBe: (e) => check(Object.is(value, e), `expected ${show(value)} to be ${show(e)}`),
    toEqual: (e) => {
      let same = true
      try { assert.deepStrictEqual(value, e) } catch { same = false }
      check(same, `expected ${show(value)} to equal ${show(e)}`)
    },
    /* vitest's default precision: |a - b| < 10 ** -digits / 2, digits = 2. */
    toBeCloseTo: (e, digits = 2) =>
      check(Math.abs(value - e) < 10 ** -digits / 2,
        `expected ${show(value)} to be close to ${show(e)} (${digits} digits)`),
    toBeGreaterThan: (n) => check(value > n, `expected ${show(value)} > ${show(n)}`),
    toBeGreaterThanOrEqual: (n) => check(value >= n, `expected ${show(value)} >= ${show(n)}`),
    toBeLessThan: (n) => check(value < n, `expected ${show(value)} < ${show(n)}`),
    toBeLessThanOrEqual: (n) => check(value <= n, `expected ${show(value)} <= ${show(n)}`),
    toContain: (needle) =>
      check(typeof value === 'string'
        ? value.includes(needle as string)
        : Array.from(value as Iterable<unknown>).includes(needle),
        `expected ${show(value)} to contain ${show(needle)}`),
    toHaveLength: (n) => check(value?.length === n,
      `expected length ${show(value?.length)} to be ${show(n)}`),
    toMatch: (re) => check(typeof re === 'string' ? String(value).includes(re) : re.test(String(value)),
      `expected ${show(value)} to match ${show(re)}`),
    toBeUndefined: () => check(value === undefined, `expected ${show(value)} to be undefined`),
    toBeNull: () => check(value === null, `expected ${show(value)} to be null`),
  }
}

export function expect(value: unknown, message?: string) {
  return Object.assign(build(value, message, false), { not: build(value, message, true) })
}
