"use client";

import { Highlight, themes, type PrismTheme } from "prism-react-renderer";

const languageMap: Record<string, string> = {
  JavaScript: "javascript",
  TypeScript: "typescript",
  Python: "python",
  PHP: "php",
  SQL: "sql",
  CSS: "css",
  HTML: "markup",
  Lainnya: "plaintext",
};

const codeTheme: PrismTheme = {
  ...themes.vsDark,
  plain: { ...themes.vsDark.plain, backgroundColor: "transparent" },
};

export default function CodeBlock({ code, language }: { code: string; language: string }) {
  const prismLang = languageMap[language] ?? "plaintext";

  return (
    <Highlight theme={codeTheme} code={code} language={prismLang}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="codeBlock">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
