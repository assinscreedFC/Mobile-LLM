/// <reference types="nativewind/types" />

// Type declarations for packages without bundled TypeScript types

declare module 'react-native-markdown-display' {
    import { Component } from 'react';

    interface MarkdownProps {
        children: string;
        style?: any;
        mergeStyle?: boolean;
        rules?: Record<string, Function>;
        markdownit?: any;
        onLinkPress?: (url: string) => boolean;
        maxTopLevelChildren?: number;
        topLevelMaxExceededItem?: any;
        allowedImageHandlers?: string[];
        defaultImageHandler?: string;
        debugPrintTree?: boolean;
        renderer?: any;
    }

    const Markdown: React.FC<MarkdownProps>;
    export default Markdown;
    export const MarkdownIt: any;
}
