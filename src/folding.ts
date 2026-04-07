import * as vscode from 'vscode';

type BracketToken = '{' | '[';

interface StackEntry {
  token: BracketToken;
  startLine: number;
}

function isMatching(open: BracketToken, close: string): boolean {
  return (open === '{' && close === '}') || (open === '[' && close === ']');
}

function buildRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
  const ranges: vscode.FoldingRange[] = [];
  const stack: StackEntry[] = [];
  let inString = false;
  let escaped = false;
  let inMultilineString = false;
  let substitutionDepth = 0;

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
    const line = document.lineAt(lineIndex).text;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = i + 1 < line.length ? line[i + 1] : '';
      const third = i + 2 < line.length ? line[i + 2] : '';

      if (inMultilineString) {
        if (ch === '"' && next === '"' && third === '"') {
          inMultilineString = false;
          i += 2;
        }

        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (ch === '\\') {
          escaped = true;
          continue;
        }

        if (ch === '"') {
          inString = false;
        }

        continue;
      }

      if (substitutionDepth > 0) {
        if (ch === '{') {
          substitutionDepth++;
        } else if (ch === '}') {
          substitutionDepth = Math.max(0, substitutionDepth - 1);
        }

        continue;
      }

      if (ch === '#') {
        break;
      }

      if (ch === '/' && next === '/' && line[i - 1] !== ':') {
        break;
      }

      if (ch === '"' && next === '"' && third === '"') {
        inMultilineString = true;
        i += 2;
        continue;
      }

      if (ch === '"') {
        inString = true;
        escaped = false;
        continue;
      }

      if (ch === '$' && next === '{') {
        substitutionDepth = 1;
        i++;
        continue;
      }

      if (ch === '{' || ch === '[') {
        stack.push({
          token: ch,
          startLine: lineIndex,
        });
        continue;
      }

      if (ch === '}' || ch === ']') {
        for (let stackIndex = stack.length - 1; stackIndex >= 0; stackIndex--) {
          const candidate = stack[stackIndex];
          if (!isMatching(candidate.token, ch)) {
            continue;
          }

          stack.splice(stackIndex, 1);

          if (lineIndex > candidate.startLine) {
            ranges.push(
              new vscode.FoldingRange(
                candidate.startLine,
                lineIndex,
                vscode.FoldingRangeKind.Region
              )
            );
          }

          break;
        }
      }
    }
  }

  return ranges.sort((a, b) => {
    if (a.start === b.start) {
      return b.end - a.end;
    }

    return a.start - b.start;
  });
}

export const hoconFoldingRangeProvider: vscode.FoldingRangeProvider = {
  provideFoldingRanges(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    return buildRanges(document);
  },
};
