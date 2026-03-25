/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';

//                                                              
// Types
//                                                              
interface MessageBubbleProps {
  content: string;
  isUser: boolean;
}

//                                                              
// Parse content into text blocks and math blocks
// Supports: $$...$$, $...$, \[...\], \(...\)
//                                                              
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

    const token = match[1] ?? match[0];
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

//                                                              
// Lightweight KaTeX WebView renderer (only for math blocks)
// No lodash, no native modules — just a tiny WebView with KaTeX CDN
//                                                              
function buildKatexHtml(latex: string, displayMode: boolean, textColor: string): string {
  const safeLatex = JSON.stringify(latex); // handles all escaping safely (XSS-safe)
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { color: ${textColor}; background: transparent; display: flex; justify-content: ${displayMode ? 'center' : 'flex-start'}; align-items: center; min-height: 1px; padding: ${displayMode ? '8px 4px' : '2px 0'}; }
  .katex { font-size: ${displayMode ? '26px' : '22px'}; color: ${textColor}; }
  .error { color: #D63384; font-family: monospace; font-size: 14px; }
</style>
</head><body>
<div id="math"></div>
<script>
try {
  katex.render(${safeLatex}, document.getElementById('math'), { displayMode: ${displayMode}, throwOnError: false, strict: false });
} catch(e) {
  document.getElementById('math').innerHTML = '<span class="error">' + ${safeLatex} + '</span>';
}
setTimeout(function() {
  window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight));
}, 50);
</script>
</body></html>`;
}

const KaTeXBlock = React.memo(({ math, block, textColor }: { math: string; block: boolean; textColor: string }) => {
  const [height, setHeight] = useState(block ? 50 : 24);
  const html = useMemo(() => buildKatexHtml(math, block, textColor), [math, block, textColor]);

  const onMessage = useCallback((e: any) => {
    const h = Number(e.nativeEvent.data);
    if (h > 0) setHeight(h);
  }, []);

  return (
    <View style={[block ? s.mathBlockWrap : s.mathInlineWrap, { height }]}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        originWhitelist={['*']}
        onMessage={onMessage}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

//                                                                
const createMdStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  heading1: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8, lineHeight: 28 },
  heading2: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6, lineHeight: 26 },
  heading3: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 10, marginBottom: 4, lineHeight: 24 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: '700', color: colors.text },
  em: { fontStyle: 'italic', color: colors.text },
  code_block: {
    backgroundColor: isDark ? '#1A1A24' : '#1E1E2E', color: '#CDD6F4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, lineHeight: 20, padding: 14, borderRadius: 10, marginVertical: 8,
  },
  fence: {
    backgroundColor: isDark ? '#1A1A24' : '#1E1E2E', color: '#CDD6F4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, lineHeight: 20, padding: 14, borderRadius: 10, marginVertical: 8,
  },
  code_inline: {
    backgroundColor: isDark ? '#2B2B36' : '#F0F0F5', color: isDark ? '#FF79C6' : '#D63384',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  blockquote: {
    backgroundColor: isDark ? '#15151C' : '#F8F9FA', borderLeftWidth: 4, borderLeftColor: '#007AFF',
    paddingHorizontal: 12, paddingVertical: 8, marginVertical: 8, borderRadius: 4,
  },
  bullet_list: { marginVertical: 4, color: colors.text },
  ordered_list: { marginVertical: 4, color: colors.text },
  list_item: { marginVertical: 2, flexDirection: 'row', color: colors.text },
  link: { color: '#007AFF', textDecorationLine: 'underline' },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, marginVertical: 8 },
  thead: { backgroundColor: isDark ? '#262633' : '#F5F5F7' },
  th: { padding: 8, fontWeight: '600', borderBottomWidth: 1, borderColor: colors.border, color: colors.text },
  td: { padding: 8, borderBottomWidth: 1, borderColor: colors.border, color: colors.text },
  tr: { borderBottomWidth: 1, borderColor: colors.border },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: 12 },
  image: { borderRadius: 8, marginVertical: 6 },
});

//                                                              
// Main Component
//                                                              
function MessageBubble({ content, isUser }: MessageBubbleProps) {
  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const isDark = resolved === 'dark';
  const mdStyles = useMemo(() => createMdStyles(colors, isDark), [colors, isDark]);

  // Hooks must be called unconditionally before any early return
  const blocks = useMemo(() => parseContent(content || ''), [content]);
  const hasMath = blocks.some(b => b.type !== 'text');

  // User messages: simple text
  if (isUser) {
    return <Text style={s.userText}>{content}</Text>;
  }

  if (!hasMath) {
    return (
      <View style={s.aiContainer}>
        <Markdown style={mdStyles}>{content || ''}</Markdown>
      </View>
    );
  }

  return (
    <View style={s.aiContainer}>
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          const trimmed = block.value.trim();
          if (!trimmed) return null;
          return <Markdown key={`md-${i}`} style={mdStyles}>{block.value}</Markdown>;
        }
        return (
          <KaTeXBlock
            key={`math-${i}`}
            math={block.value}
            block={block.type === 'math-block'}
            textColor={colors.text}
          />
        );
      })}
    </View>
  );
}


export default React.memo(MessageBubble);

const s = StyleSheet.create({
  userText: { color: '#FFF', fontSize: 16, lineHeight: 22 },
  aiContainer: { flex: 1 },
  mathBlockWrap: { width: '100%', minHeight: 30, marginVertical: 6, borderRadius: 8, overflow: 'hidden' },
  mathInlineWrap: { minHeight: 20, marginVertical: 2, overflow: 'hidden' },
});
