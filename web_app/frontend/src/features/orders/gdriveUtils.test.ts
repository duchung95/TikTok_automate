import { describe, it, expect } from 'vitest'
import { extractGdriveId, gdriveThumbnailUrl } from './gdriveUtils'

// ── extractGdriveId ───────────────────────────────────────────────────────────

describe('extractGdriveId', () => {
  it('extracts ID from /file/d/{ID}/view format', () => {
    expect(extractGdriveId('https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuV/view'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuV')
  })

  it('extracts ID from /file/d/{ID}/view?usp=sharing format', () => {
    expect(extractGdriveId('https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuV/view?usp=sharing'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuV')
  })

  it('extracts ID from open?id={ID} format', () => {
    expect(extractGdriveId('https://drive.google.com/open?id=1aBcDeFgHiJkLmNoPqRsTuV'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuV')
  })

  it('extracts ID from uc?id={ID} format', () => {
    expect(extractGdriveId('https://drive.google.com/uc?id=1aBcDeFgHiJkLmNoPqRsTuV'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuV')
  })

  it('extracts ID from uc?export=download&id={ID} format', () => {
    expect(extractGdriveId('https://drive.google.com/uc?export=download&id=1aBcDeFgHiJkLmNoPqRsTuV'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuV')
  })

  it('returns null for empty string', () => {
    expect(extractGdriveId('')).toBeNull()
  })

  it('returns null for a non-Google-Drive URL', () => {
    expect(extractGdriveId('https://example.com/image.png')).toBeNull()
  })

  it('returns null for a URL with a too-short ID segment', () => {
    expect(extractGdriveId('https://drive.google.com/file/d/shortid/view')).toBeNull()
  })
})

// ── gdriveThumbnailUrl ────────────────────────────────────────────────────────

describe('gdriveThumbnailUrl', () => {
  it('returns thumbnail URL with default size 200', () => {
    expect(gdriveThumbnailUrl('1aBcDeFgHiJkLmNoPqRsTuV'))
      .toBe('https://drive.google.com/thumbnail?id=1aBcDeFgHiJkLmNoPqRsTuV&sz=w200')
  })

  it('returns thumbnail URL with custom size', () => {
    expect(gdriveThumbnailUrl('1aBcDeFgHiJkLmNoPqRsTuV', 400))
      .toBe('https://drive.google.com/thumbnail?id=1aBcDeFgHiJkLmNoPqRsTuV&sz=w400')
  })
})
