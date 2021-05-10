import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground";
import { formatEnum } from "./formatEnum";

export interface TokenInfo {
  kind: import("typescript").SyntaxKind;
  token: string;
  start: number;
  end: number;
  jsdocTokens?: TokenInfo[];
}

const makePlugin = (utils: PluginUtils) => {
  let scanContainer: HTMLDivElement = undefined;

  const customPlugin: PlaygroundPlugin = {
    id: "scanner",
    displayName: "Scanner",
    didMount: (sandbox, container) => {
      // Create a design system object to handle
      // making DOM elements which fit the playground (and handle mobile/light/dark etc)
      const ds = utils.createDesignSystem(container);

      ds.title("Scanner Results");
      ds.p("This plugin will run the TypeScript scanner over a code in your editor.");
      ds.p(
        "This isn't the same as what TypeScript is actually doing (because the Parser would handle re-scanning) but it's enough to have a sense of what is going on under the hood."
      );

      scanContainer = document.createElement("div");
      const scanDS = utils.createDesignSystem(scanContainer);
      scanDS.p("Change the text in your editor to see the results.");

      container.appendChild(scanContainer);
    },

    modelChangedDebounce: async (sandbox, model) => {
      if (!scanContainer) return;
      const scanDS = utils.createDesignSystem(scanContainer);

      const ts = sandbox.ts;
      const isJSX = sandbox.filepath.endsWith("x") ? 1 : 0;
      const scanner = ts.createScanner(sandbox.getCompilerOptions().target, false, isJSX);

      scanner.setText(model.getValue());
      scanner.setOnError((message: any, length: number) => {
        scanDS.clear();
        scanDS.subtitle("Scan failed");
        scanDS.p(message);
      });

      const tokens: TokenInfo[] = [];

      let kind;
      let start = 0;
      while (kind != ts.SyntaxKind.EndOfFileToken) {
        kind = scanner.scan();
        const end = scanner.getTextPos();
        const token: TokenInfo = {
          kind,
          token: formatEnum(ts, kind, ts.SyntaxKind),
          start,
          end,
        };

        let jsdocTokens: TokenInfo[] = [];

        // Handle JSDoc parsing, basically the same thing as above, but uses scanJsDocToken
        if (kind === ts.SyntaxKind.MultiLineCommentTrivia && isJSDocLikeText(scanner.getText(), start)) {
          scanner.scanRange(start + 3, end - start - 5, () => {
            let token = scanner.scanJsDocToken();
            let jsDocStart = start + 3;

            while (token != ts.SyntaxKind.EndOfFileToken) {
              const jsDocEnd = scanner.getTextPos();

              jsdocTokens.push({
                kind,
                token: formatEnum(ts, token, ts.SyntaxKind),
                start: jsDocStart,
                end: jsDocEnd,
              });

              jsDocStart = jsDocEnd;
              token = scanner.scanJsDocToken();
            }
          });
        }

        if (jsdocTokens.length) token.jsdocTokens = jsdocTokens;
        tokens.push(token);
        start = end;
      }

      scanDS.clear();
      scanDS.subtitle("Scan results");

      const renderTokens = (container: HTMLElement, tokens: TokenInfo[]) => {
        const ul = document.createElement("ul");
        container.appendChild(ul);

        tokens.forEach((t, i) => {
          const li = document.createElement("li");
          ul.appendChild(li);
          
          if (t.jsdocTokens) {
            li.innerHTML = `<code>${t.token}</code><p>JSDoc:</p>`;
            renderTokens(li, t.jsdocTokens);
          } else {
            li.innerHTML = `<code>${t.token}</code>`;
            li.onmouseover = () => {
              const beforeIndex = i - 1;
              let startPos = model.getPositionAt(0);
              if (beforeIndex >= 0) {
                const beforeToken = tokens[beforeIndex];
                startPos = model.getPositionAt(beforeToken.end);
              }
              const endPos = model.getPositionAt(t.end);

              sandbox.editor.setSelection({
                selectionStartLineNumber: startPos.lineNumber,
                selectionStartColumn: startPos.column,
                positionLineNumber: endPos.lineNumber,
                positionColumn: endPos.column,
              });
            };
          }
        });
      };

      renderTokens(scanContainer, tokens);

      function isJSDocLikeText(text: string, start: number) {
        return text.charCodeAt(start + 1) === 42 && text.charCodeAt(start + 2) === 42 && text.charAt(start + 3) !== "/";
      }
    },
  };

  return customPlugin;
};

export default makePlugin;
