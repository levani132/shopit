/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '*.svg' {
  const content: any;
  export const ReactComponent: any;
  export default content;
}

declare module 'monaco-jsx-highlighter' {
  const MonacoJsxHighlighter: any;
  export default MonacoJsxHighlighter;
}
