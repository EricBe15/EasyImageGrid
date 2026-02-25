import { describe, it, expect } from 'vitest'
import { buildArgs, type GenerateParams } from '../sidecar'

function baseParams(overrides: Partial<GenerateParams> = {}): GenerateParams {
  return {
    inputDir: '/path/to/images',
    outputPath: '/path/to/output.pdf',
    cols: 2,
    rows: 3,
    landscape: false,
    quality: 100,
    ...overrides
  }
}

describe('buildArgs', () => {
  it('includes all required args', () => {
    const args = buildArgs(baseParams())
    expect(args).toContain('--input-dir')
    expect(args).toContain('/path/to/images')
    expect(args).toContain('--output')
    expect(args).toContain('/path/to/output.pdf')
    expect(args).toContain('--cols')
    expect(args).toContain('2')
    expect(args).toContain('--rows')
    expect(args).toContain('3')
    expect(args).toContain('--quality')
    expect(args).toContain('100')
  })

  it('does not include --landscape when false', () => {
    const args = buildArgs(baseParams({ landscape: false }))
    expect(args).not.toContain('--landscape')
  })

  it('includes --landscape when true', () => {
    const args = buildArgs(baseParams({ landscape: true }))
    expect(args).toContain('--landscape')
  })

  it('includes --no-title when showTitle is false', () => {
    const args = buildArgs(baseParams({ showTitle: false }))
    expect(args).toContain('--no-title')
    expect(args).not.toContain('--title')
  })

  it('includes --title when provided and showTitle is not false', () => {
    const args = buildArgs(baseParams({ title: 'My Photos' }))
    expect(args).toContain('--title')
    expect(args).toContain('My Photos')
  })

  it('prefers --no-title over --title when showTitle is false', () => {
    const args = buildArgs(baseParams({ showTitle: false, title: 'Ignored' }))
    expect(args).toContain('--no-title')
    expect(args).not.toContain('Ignored')
  })

  it('includes --no-page-numbers when pageNumbers is false', () => {
    const args = buildArgs(baseParams({ pageNumbers: false }))
    expect(args).toContain('--no-page-numbers')
  })

  it('does not include --no-page-numbers when pageNumbers is undefined', () => {
    const args = buildArgs(baseParams())
    expect(args).not.toContain('--no-page-numbers')
  })

  it('includes --recursive when true', () => {
    const args = buildArgs(baseParams({ recursive: true }))
    expect(args).toContain('--recursive')
  })

  it('does not include --recursive when false/undefined', () => {
    const args = buildArgs(baseParams())
    expect(args).not.toContain('--recursive')
  })

  it('includes --border when provided', () => {
    const args = buildArgs(baseParams({ border: 20 }))
    expect(args).toContain('--border')
    expect(args).toContain('20')
  })

  it('does not include --border when undefined', () => {
    const args = buildArgs(baseParams())
    expect(args).not.toContain('--border')
  })

  it('includes --header-space when provided', () => {
    const args = buildArgs(baseParams({ headerSpace: 50 }))
    expect(args).toContain('--header-space')
    expect(args).toContain('50')
  })

  it('does not include --header-space when undefined', () => {
    const args = buildArgs(baseParams())
    expect(args).not.toContain('--header-space')
  })

  it('includes --filename-font-size when provided', () => {
    const args = buildArgs(baseParams({ filenameFontSize: 10 }))
    expect(args).toContain('--filename-font-size')
    expect(args).toContain('10')
  })

  it('includes --title-font-size when provided', () => {
    const args = buildArgs(baseParams({ titleFontSize: 18 }))
    expect(args).toContain('--title-font-size')
    expect(args).toContain('18')
  })

  it('includes --sections-from-stdin when sections has > 1 entry', () => {
    const args = buildArgs(baseParams({
      sections: [
        { folderPath: '/a', displayName: 'A', imageCount: 5 },
        { folderPath: '/b', displayName: 'B', imageCount: 3 }
      ]
    }))
    expect(args).toContain('--sections-from-stdin')
  })

  it('includes --per-folder with sections when perFolder is true', () => {
    const args = buildArgs(baseParams({
      sections: [
        { folderPath: '/a', displayName: 'A', imageCount: 5 },
        { folderPath: '/b', displayName: 'B', imageCount: 3 }
      ],
      perFolder: true
    }))
    expect(args).toContain('--sections-from-stdin')
    expect(args).toContain('--per-folder')
  })

  it('does not include --sections-from-stdin for single section', () => {
    const args = buildArgs(baseParams({
      sections: [{ folderPath: '/a', displayName: 'A', imageCount: 5 }]
    }))
    expect(args).not.toContain('--sections-from-stdin')
  })

  it('does not include --sections-from-stdin when sections is undefined', () => {
    const args = buildArgs(baseParams())
    expect(args).not.toContain('--sections-from-stdin')
  })
})
