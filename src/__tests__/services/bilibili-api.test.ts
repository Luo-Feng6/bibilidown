import { describe, it, expect } from 'vitest'
import { identifyInput, QN_LABEL_MAP, type DownloadFormat } from '../../services/bilibili-api'

/* ═══════════════════════════════════════════════════════════════
   bilibili-api tests
   ═══════════════════════════════════════════════════════════════

   All async API-calling functions (parseBilibiliUrl, resolveDownloadUrl,
   loadMoreMediaList, etc.) are skipped — they require a live Bilibili
   backend and login cookies.

   Pure functions that DO have tests:
     - identifyInput   (URL / ID parsing)
     - QN_LABEL_MAP    (constant map)
   ═══════════════════════════════════════════════════════════════ */

/* ── QN_LABEL_MAP ── */

describe('QN_LABEL_MAP', () => {
  it('maps common quality codes to labels', () => {
    expect(QN_LABEL_MAP[127]).toBe('8K')
    expect(QN_LABEL_MAP[120]).toBe('4K')
    expect(QN_LABEL_MAP[116]).toBe('1080P60')
    expect(QN_LABEL_MAP[112]).toBe('1080P+')
    expect(QN_LABEL_MAP[80]).toBe('1080P')
    expect(QN_LABEL_MAP[74]).toBe('720P60')
    expect(QN_LABEL_MAP[64]).toBe('720P')
    expect(QN_LABEL_MAP[32]).toBe('480P')
    expect(QN_LABEL_MAP[16]).toBe('360P')
    expect(QN_LABEL_MAP[6]).toBe('240P')
    expect(QN_LABEL_MAP[126]).toBe('杜比视界')
    expect(QN_LABEL_MAP[125]).toBe('HDR')
  })

  it('returns undefined for unknown quality codes', () => {
    expect(QN_LABEL_MAP[999]).toBeUndefined()
  })
})

/* ── identifyInput ── */

describe('identifyInput', () => {
  /* ── BV 号 ── */
  describe('BV', () => {
    it('recognizes a bare BV number', () => {
      const result = identifyInput('BV1xx411c7mD')
      expect(result).toEqual({ type: 'bv', id: 'BV1xx411c7mD' })
    })

    it('extracts BV from a full video URL', () => {
      const result = identifyInput('https://www.bilibili.com/video/BV1xx411c7mD')
      expect(result).toEqual({ type: 'bv', id: 'BV1xx411c7mD' })
    })

    it('extracts BV from a URL with query params', () => {
      const result = identifyInput(
        'https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333.337'
      )
      expect(result).toEqual({ type: 'bv', id: 'BV1xx411c7mD' })
    })

    it('handles leading/trailing whitespace', () => {
      const result = identifyInput('  BV1xx411c7mD  ')
      expect(result).toEqual({ type: 'bv', id: 'BV1xx411c7mD' })
    })
  })

  /* ── av 号 ── */
  describe('AV', () => {
    it('recognizes a bare av number', () => {
      const result = identifyInput('av170001')
      expect(result).toEqual({ type: 'av', id: '170001' })
    })

    it('is case-insensitive', () => {
      const result = identifyInput('AV170001')
      expect(result).toEqual({ type: 'av', id: '170001' })
    })

    it('extracts av from a full URL', () => {
      const result = identifyInput('https://www.bilibili.com/video/av170001')
      expect(result).toEqual({ type: 'av', id: '170001' })
    })
  })

  /* ── ep 号 ── */
  describe('EP', () => {
    it('recognizes a bare ep number', () => {
      const result = identifyInput('ep123456')
      expect(result).toEqual({ type: 'ep', id: '123456' })
    })

    it('extracts ep from a bangumi URL', () => {
      const result = identifyInput('https://www.bilibili.com/bangumi/play/ep123456')
      expect(result).toEqual({ type: 'ep', id: '123456' })
    })

    it('extracts ep from a cheese URL', () => {
      const result = identifyInput('https://www.bilibili.com/cheese/play/ep123456')
      expect(result).toEqual({ type: 'ep', id: '123456' })
    })
  })

  /* ── ss 号 ── */
  describe('SS', () => {
    it('recognizes a bare ss number', () => {
      const result = identifyInput('ss12345')
      expect(result).toEqual({ type: 'ss', id: '12345' })
    })

    it('extracts ss from a bangumi URL', () => {
      const result = identifyInput('https://www.bilibili.com/bangumi/play/ss12345')
      expect(result).toEqual({ type: 'ss', id: '12345' })
    })

    it('extracts ss from a cheese URL', () => {
      const result = identifyInput('https://www.bilibili.com/cheese/play/ss12345')
      expect(result).toEqual({ type: 'ss', id: '12345' })
    })
  })

  /* ── md 号 ── */
  describe('MD', () => {
    it('recognizes a bare md number', () => {
      const result = identifyInput('md134912')
      expect(result).toEqual({ type: 'md', id: '134912' })
    })

    it('extracts md from a media URL', () => {
      const result = identifyInput('https://www.bilibili.com/bangumi/media/md134912')
      expect(result).toEqual({ type: 'md', id: '134912' })
    })
  })

  /* ── ml 号 (收藏夹) ── */
  describe('ML', () => {
    it('recognizes a bare ml number', () => {
      const result = identifyInput('ml999999')
      expect(result).toEqual({ type: 'ml', id: '999999' })
    })

    it('extracts ml from a medialist URL', () => {
      const result = identifyInput('https://www.bilibili.com/medialist/detail/ml999999')
      expect(result).toEqual({ type: 'ml', id: '999999' })
    })
  })

  /* ── Unrecognized input ── */
  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(identifyInput('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(identifyInput('   ')).toBeNull()
    })

    it('returns null for random text', () => {
      expect(identifyInput('hello world')).toBeNull()
    })

    it('returns null for a plain number', () => {
      expect(identifyInput('12345')).toBeNull()
    })
  })

  /* ── b23.tv short links ── */
  describe('b23.tv', () => {
    it('returns null for b23.tv links (needs async resolution)', () => {
      // b23.tv links cannot be resolved synchronously; identifyInput returns null
      // so the caller knows to use parseBilibiliUrl → resolveB23Url
      expect(identifyInput('https://b23.tv/abc123')).toBeNull()
      expect(identifyInput('http://b23.tv/xyz')).toBeNull()
    })
  })
})

/* ── Async API functions (placeholder) ── */

describe('parseBilibiliUrl (async)', () => {
  it.skip('parses a BV URL (requires network)', async () => {
    // Needs live Bilibili API + potentially login cookies
    const { parseBilibiliUrl } = await import('../../services/bilibili-api')
    const videos = await parseBilibiliUrl('BV1xx411c7mD')
    expect(videos.length).toBeGreaterThan(0)
  })

  it.skip('parses an av URL (requires network)', async () => {
    const { parseBilibiliUrl } = await import('../../services/bilibili-api')
    const videos = await parseBilibiliUrl('av170001')
    expect(videos.length).toBeGreaterThan(0)
  })
})

describe('resolveDownloadUrl (async)', () => {
  it.skip('returns download URLs for a BV + cid (requires network)', async () => {
    const { resolveDownloadUrl } = await import('../../services/bilibili-api')
    const result = await resolveDownloadUrl('BV1xx411c7mD', '12345', 80, 'dash')
    expect(result).toHaveProperty('videoUrl')
    expect(result).toHaveProperty('audioUrl')
    expect(result.format).toBe('dash')
  })
})
