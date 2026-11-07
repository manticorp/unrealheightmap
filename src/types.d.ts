declare module '*.html' {
  const content: string;
  export default content;
}
/** Build id, set by webpack (see webpack.config.js). */
declare const __BUILD__: string;
