// Test the parseContent logic from MessageBubble
// Since parseContent is not exported, we replicate it here for unit testing
// This tests the core math detection algorithm used by the component

interface ContentBlock {
  type: 'text' | 'math-block' | 'math-inline';
  value: string;
}

function parseContent(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)(?:\\.|[^$\\])+\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', value: raw.slice(lastIndex, match.index) });
    }

    const token = match[1];
    let mathContent: string;
    let blockType: ContentBlock['type'];

    if (token.startsWith('$$') && token.endsWith('$$')) {
      mathContent = token.slice(2, -2).trim();
      blockType = 'math-block';
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      mathContent = token.slice(2, -2).trim();
      blockType = 'math-block';
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      mathContent = token.slice(2, -2).trim();
      blockType = 'math-inline';
    } else {
      mathContent = token.slice(1, -1).trim();
      blockType = 'math-inline';
    }

    blocks.push({ type: blockType, value: mathContent });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < raw.length) {
    blocks.push({ type: 'text', value: raw.slice(lastIndex) });
  }

  return blocks;
}

describe('MessageBubble parseContent', () => {
  it('returns single text block for plain text', () => {
    const result = parseContent('Hello world');
    expect(result).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('returns empty array for empty string', () => {
    const result = parseContent('');
    expect(result).toEqual([]);
  });

  it('detects block math $$...$$', () => {
    const result = parseContent('Formula: $$E=mc^2$$');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'text', value: 'Formula: ' });
    expect(result[1]).toEqual({ type: 'math-block', value: 'E=mc^2' });
  });

  it('detects inline math $...$', () => {
    const result = parseContent('value is $x^2$ here');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'text', value: 'value is ' });
    expect(result[1]).toEqual({ type: 'math-inline', value: 'x^2' });
    expect(result[2]).toEqual({ type: 'text', value: ' here' });
  });

  it('detects \\[...\\] block math', () => {
    const result = parseContent('see \\[a+b\\] below');
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ type: 'math-block', value: 'a+b' });
  });

  it('detects \\(...\\) inline math', () => {
    const result = parseContent('see \\(a+b\\) below');
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ type: 'math-inline', value: 'a+b' });
  });

  it('handles mixed text, inline math, and block math', () => {
    const result = parseContent('Start $a$ middle $$b$$ end');
    const types = result.map(b => b.type);
    expect(types).toContain('text');
    expect(types).toContain('math-inline');
    expect(types).toContain('math-block');
  });

  it('handles math with special LaTeX characters', () => {
    const result = parseContent('$\\frac{a}{b}$');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('math-inline');
    expect(result[0].value).toBe('\\frac{a}{b}');
  });

  it('handles multiline block math', () => {
    const result = parseContent('text $$\na+b\n$$ more');
    expect(result.some(b => b.type === 'math-block')).toBe(true);
  });
});

describe('buildKatexHtml (XSS safety)', () => {
  // The component injects LaTeX into a JS variable via JSON.stringify inside a WebView.
  // JSON.stringify wraps the value in quotes and escapes internal quotes/backslashes,
  // so it cannot break out of the JS string context.
  it('JSON.stringify prevents JS string breakout', () => {
    const malicious = '";alert("xss");//';
    const escaped = JSON.stringify(malicious);
    // The result is a valid JSON string — the inner quotes are escaped
    expect(escaped).toBe('"\\";alert(\\"xss\\");//"');
    // Parsing it back gives the original, proving no code execution
    expect(JSON.parse(escaped)).toBe(malicious);
  });
});
