import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground";
import { formatEnum } from "./formatEnum";

export interface TokenInfo {
  kind: import("typescript").SyntaxKind;
  token: string;
  end: number;
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
        "This isn't the same as what TypeScript is doing under the hood (because the Parser would handle re-scanning) but it's enough to have a sense of what is going on under the hood."
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
      while (kind != ts.SyntaxKind.EndOfFileToken) {
        kind = scanner.scan();
        const end = scanner.getTextPos();
        tokens.push({
          kind,
          token: formatEnum(ts, kind, ts.SyntaxKind),
          end,
        });
      }

      scanDS.clear();
      scanDS.subtitle("Scan results");

      const ul = document.createElement("ul");
      scanContainer.appendChild(ul);

      tokens.forEach((t, i) => {
        const li = document.createElement("li");
        ul.appendChild(li);
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
        }
      });
    },
  };

  return customPlugin;
};

export default makePlugin;
