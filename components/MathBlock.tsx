import React, { memo, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathBlockProps {
  formula: string;
  isBlock: boolean;
}

export const MathBlock = memo(({ formula, isBlock }: MathBlockProps) => {
  const [height, setHeight] = useState(isBlock ? 60 : 30);
  const [loading, setLoading] = useState(true);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <style>
        body { margin: 0; display: flex; justify-content: ${isBlock ? 'center' : 'flex-start'}; align-items: center; background: transparent; overflow: hidden; }
        .katex { font-size: 1.2em; color: #1a1a1a; }
      </style>
    </head>
    <body>
      <div id="math"></div>
      <script>
        window.onload = () => {
          try {
            katex.render(${JSON.stringify(formula)}, document.getElementById('math'), { 
              displayMode: ${isBlock},
              throwOnError: false 
            });
            setTimeout(() => {
              window.ReactNativeWebView.postMessage(document.body.scrollHeight);
            }, 50);
          } catch (e) { console.error(e); }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ height: height, marginVertical: isBlock ? 8 : 0, justifyContent: 'center' }}>
      <WebView
        source={{ html }}
        scrollEnabled={false}
        onMessage={(event) => {
          setHeight(Number(event.nativeEvent.data));
          setLoading(false);
        }}
        style={{ backgroundColor: 'transparent' }}
        javaScriptEnabled={true}
      />
      {loading && <ActivityIndicator size="small" style={{ position: 'absolute', alignSelf: 'center' }} />}
    </View>
  );
});

export default MathBlock;