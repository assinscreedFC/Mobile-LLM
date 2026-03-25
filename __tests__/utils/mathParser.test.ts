import { segmentize } from '../../utils/mathParser';

describe('segmentize', () => {
  it('returns single text segment for plain text', () => {
    const result = segmentize('Hello world');
    expect(result).toEqual([{ type: 'text', content: 'Hello world', isBlock: false }]);
  });

  it('parses inline math $...$', () => {
    const result = segmentize('value is $x^2$');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'text', content: 'value is ', isBlock: false });
    expect(result[1]).toEqual({ type: 'math', content: 'x^2', isBlock: false });
  });

  it('parses block math $$...$$', () => {
    const result = segmentize('formula: $$E=mc^2$$');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'text', content: 'formula: ', isBlock: false });
    expect(result[1]).toEqual({ type: 'math', content: 'E=mc^2', isBlock: true });
  });

  it('handles mixed text and math', () => {
    const result = segmentize('Start $a$ middle $$b$$ end');
    expect(result.length).toBeGreaterThanOrEqual(4);

    const mathSegments = result.filter(s => s.type === 'math');
    expect(mathSegments).toHaveLength(2);
    expect(mathSegments[0].content).toBe('a');
    expect(mathSegments[0].isBlock).toBe(false);
    expect(mathSegments[1].content).toBe('b');
    expect(mathSegments[1].isBlock).toBe(true);
  });

  it('filters empty segments', () => {
    const result = segmentize('$x$');
    expect(result).toEqual([{ type: 'math', content: 'x', isBlock: false }]);
  });

  it('handles empty string input', () => {
    const result = segmentize('');
    expect(result).toEqual([]);
  });

  it('handles multiple consecutive math expressions', () => {
    const result = segmentize('$a$$b$');
    const mathSegments = result.filter(s => s.type === 'math');
    expect(mathSegments.length).toBeGreaterThanOrEqual(1);
  });

  it('handles math with special characters inside', () => {
    const result = segmentize('$\\frac{a}{b}$');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('math');
    expect(result[0].content).toBe('\\frac{a}{b}');
  });
});
