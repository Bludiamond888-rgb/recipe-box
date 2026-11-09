import { describe, expect, it } from 'vitest'
import { detectLang, formatClock, parseTimers, pickVoice, segmentByScript, sourceKind, splitTitle } from './cook'
import { CHEF_RECIPES } from './chef'

describe('splitTitle (display only)', () => {
  it('splits English + Chinese titles', () => {
    expect(splitTitle('Argentine Chimichurri Steak (阿根廷青酱牛排)')).toEqual({ main: 'Argentine Chimichurri Steak', sub: '阿根廷青酱牛排' })
    expect(splitTitle('Peruvian Roast Chicken Legs with Green Sauce (秘鲁烤鸡腿 / Pollo a la Brasa)'))
      .toEqual({ main: 'Peruvian Roast Chicken Legs with Green Sauce', sub: '秘鲁烤鸡腿 / Pollo a la Brasa' })
  })
  it('leaves non-Chinese brackets alone', () => {
    expect(splitTitle('Japanese Beef Bowl (Gyudon)')).toEqual({ main: 'Japanese Beef Bowl (Gyudon)', sub: null })
    expect(splitTitle('Shrimp Fresh Spring Rolls (Gỏi Cuốn)').sub).toBeNull()
    expect(splitTitle('Steak Tacos')).toEqual({ main: 'Steak Tacos', sub: null })
    expect(splitTitle('奶皮子酸奶').sub).toBeNull()
  })
})

describe('read-aloud language', () => {
  it('segments mixed text by script', () => {
    expect(segmentByScript('Argentine Chimichurri Steak (阿根廷青酱牛排)')).toEqual([
      { text: 'Argentine Chimichurri Steak', lang: 'en-US' },
      { text: '阿根廷青酱牛排', lang: 'zh-CN' },
    ])
    expect(segmentByScript('Sear 3–4 minutes per side.')).toEqual([{ text: 'Sear 3–4 minutes per side.', lang: 'en-US' }])
    expect(segmentByScript('先把牛排擦干，撒盐。')).toEqual([{ text: '先把牛排擦干，撒盐。', lang: 'zh-CN' }])
  })
  it('detects the main language', () => {
    expect(detectLang('Heat the pan until smoking')).toBe('en-US')
    expect(detectLang('烤箱预热到200度')).toBe('zh-CN')
  })
  it('picks a matching voice', () => {
    const vs = [
      { name: 'Albert', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US', localService: true },
      { name: 'Daniel', lang: 'en-GB' },
      { name: 'Meijia', lang: 'zh-TW' },
      { name: 'Tingting', lang: 'zh-CN', localService: true },
    ]
    expect(pickVoice(vs, 'en-US')?.name).toBe('Samantha')
    expect(pickVoice(vs, 'zh-CN')?.name).toBe('Tingting')
    expect(pickVoice([{ name: 'Daniel', lang: 'en_GB' }], 'en-US')?.name).toBe('Daniel')
    expect(pickVoice([{ name: 'Samantha', lang: 'en-US' }], 'zh-CN')).toBeNull()
  })
})

describe('parseTimers', () => {
  it('finds minutes, ranges (lower bound) and hours', () => {
    expect(parseTimers('Sear the steaks for 3–4 minutes per side for medium-rare.')).toEqual([{ label: '3–4 minutes', seconds: 180 }])
    expect(parseTimers('Slow-roast for 30 to 40 minutes, until soft.')).toEqual([{ label: '30 to 40 minutes', seconds: 1800 }])
    expect(parseTimers('Cover and cook 8 to 10 minutes more.')[0]).toEqual({ label: '8 to 10 minutes', seconds: 480 })
    expect(parseTimers('Simmer 1 hour, then rest 10 min.')).toEqual([{ label: '1 hour', seconds: 3600 }, { label: '10 min', seconds: 600 }])
    expect(parseTimers('Cook at 180°C (350°F) for 20 minutes')).toEqual([{ label: '20 minutes', seconds: 1200 }])
    expect(parseTimers('焖15分钟')).toEqual([{ label: '15分钟', seconds: 900 }])
  })
  it('ignores vague or missing times', () => {
    expect(parseTimers('Turn the heat to high for the last few tens of seconds.')).toEqual([])
    expect(parseTimers('Refrigerate overnight.')).toEqual([])
    expect(parseTimers('Serve with lemon.')).toEqual([])
  })
  it('works across every Chef recipe without throwing', () => {
    const all = CHEF_RECIPES.flatMap((r) => r.steps.flatMap(parseTimers))
    expect(all.length).toBeGreaterThan(10)
    for (const t of all) expect(t.seconds).toBeGreaterThanOrEqual(5)
  })
})

describe('formatClock + sourceKind', () => {
  it('formats', () => {
    expect(formatClock(185)).toBe('3:05')
    expect(formatClock(59.2)).toBe('1:00')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-3)).toBe('0:00')
  })
  it('classifies sources', () => {
    expect(sourceKind('https://www.rednote.com/discovery/item/x', 'Xiaohongshu · CL美食记')).toBe('xhs')
    expect(sourceKind('http://xhslink.com/o/abc')).toBe('xhs')
    expect(sourceKind('https://www.tiktok.com/@kaydenechols/video/1')).toBe('tiktok')
    expect(sourceKind('https://m.xiachufang.com/recipe/1/')).toBe('link')
    expect(sourceKind(undefined, undefined)).toBeNull()
  })
})
