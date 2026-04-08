import * as vscode from 'vscode';
import { formatHoconSource } from './formatter.js';

type ContainerKind = 'object' | 'array';

interface ContainerContext {
  kind: ContainerKind;
  lastElementLine: number | null;
  needsComma: boolean;
}

function trimRight(value: string): string {
  return value.replace(/[ \t]+$/g, '');
}

function findMatchingContainerIndex(
  stack: ContainerContext[],
  closeToken: string
): number {
  const expectedKind = closeToken === '}' ? 'object' : 'array';

  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].kind === expectedKind) {
      return i;
    }
  }

  return -1;
}

function normalizeComment(lineComment: string): string {
  if (lineComment.startsWith('//')) {
    return lineComment;
  }

  if (lineComment.startsWith('#')) {
    return `//${lineComment.slice(1)}`;
  }

  return lineComment;
}

function isSignificantLine(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && !trimmed.startsWith('//');
}

function getIndentUnit(options: vscode.FormattingOptions): string {
  if (!options.insertSpaces) {
    return '\t';
  }

  const size = Math.max(1, Math.floor(options.tabSize));
  return ' '.repeat(size);
}

function normalizeHoconSource(
  source: string,
  eol: string,
  options: vscode.FormattingOptions
): string {
  const indentUnit = getIndentUnit(options);
  const lines: string[] = [];
  const stack: ContainerContext[] = [];

  let current = '';
  let indentLevel = 0;
  let pendingSpace = false;

  let inString = false;
  let escaped = false;
  let inMultilineString = false;
  let substitutionDepth = 0;

  const top = (): ContainerContext | undefined => stack[stack.length - 1];

  const ensureIndent = () => {
    if (current.length === 0) {
      current = indentUnit.repeat(Math.max(0, indentLevel));
    }
  };

  const ensureArrayCommaForNextValue = () => {
    const context = top();
    if (!context || context.kind !== 'array') {
      return;
    }

    if (!context.needsComma || context.lastElementLine === null) {
      return;
    }

    const previous = lines[context.lastElementLine];
    const trimmed = trimRight(previous);

    if (trimmed.length > 0 && !trimmed.endsWith(',')) {
      lines[context.lastElementLine] = `${trimmed},`;
    }

    context.needsComma = false;
  };

  const pushCurrentLine = (force = false) => {
    const normalized = trimRight(current);

    if (force || normalized.length > 0) {
      lines.push(normalized);

      const context = top();
      if (
        context &&
        context.kind === 'array' &&
        isSignificantLine(normalized)
      ) {
        context.lastElementLine = lines.length - 1;
        context.needsComma =
          normalized !== '[' && normalized !== ']' && !normalized.endsWith(',');
      }
    }

    current = '';
    pendingSpace = false;
  };

  const appendText = (value: string) => {
    ensureIndent();
    current += value;
  };

  const appendSpaceIfNeeded = () => {
    if (!pendingSpace) {
      return;
    }

    if (current.length > 0 && !current.endsWith(' ')) {
      current += ' ';
    }

    pendingSpace = false;
  };

  const beginValue = () => {
    ensureArrayCommaForNextValue();
    appendSpaceIfNeeded();
    ensureIndent();
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : '';
    const third = i + 2 < source.length ? source[i + 2] : '';

    if (inMultilineString) {
      appendText(ch);

      if (ch === '"' && next === '"' && third === '"') {
        appendText('""');
        i += 2;
        inMultilineString = false;
      }

      continue;
    }

    if (inString) {
      appendText(ch);

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
      beginValue();
      appendText(ch);

      if (ch === '{') {
        substitutionDepth++;
      } else if (ch === '}') {
        substitutionDepth = Math.max(0, substitutionDepth - 1);
      }

      continue;
    }

    if (ch === '\r') {
      continue;
    }

    if (ch === '\n') {
      pushCurrentLine();
      continue;
    }

    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }

    if (ch === '#') {
      const newlineIndex = source.indexOf('\n', i);
      const end = newlineIndex === -1 ? source.length : newlineIndex;
      const commentText = normalizeComment(source.slice(i, end));

      appendSpaceIfNeeded();
      appendText(commentText);
      pushCurrentLine();

      i = end - 1;
      continue;
    }

    if (ch === '/' && next === '/' && source[i - 1] !== ':') {
      const newlineIndex = source.indexOf('\n', i);
      const end = newlineIndex === -1 ? source.length : newlineIndex;
      const commentText = source.slice(i, end);

      appendSpaceIfNeeded();
      appendText(commentText);
      pushCurrentLine();

      i = end - 1;
      continue;
    }

    if (ch === '"' && next === '"' && third === '"') {
      beginValue();
      appendText('"""');
      inMultilineString = true;
      i += 2;
      continue;
    }

    if (ch === '"') {
      beginValue();
      appendText(ch);
      inString = true;
      escaped = false;
      continue;
    }

    if (ch === '$' && next === '{') {
      beginValue();
      appendText('${');
      substitutionDepth = 1;
      i++;
      continue;
    }

    if (ch === '{' || ch === '[') {
      beginValue();
      appendText(ch);
      pushCurrentLine();

      stack.push({
        kind: ch === '{' ? 'object' : 'array',
        lastElementLine: null,
        needsComma: false,
      });
      indentLevel++;
      continue;
    }

    if (ch === '}' || ch === ']') {
      if (trimRight(current).length > 0) {
        pushCurrentLine();
      }

      const closingIndex = findMatchingContainerIndex(stack, ch);
      if (closingIndex !== -1) {
        stack.splice(closingIndex, 1);
      }

      indentLevel = Math.max(0, indentLevel - 1);
      ensureIndent();
      appendText(ch);
      continue;
    }

    if (ch === ',') {
      const context = top();

      if (context?.kind === 'array') {
        appendText(',');
        pushCurrentLine();
        context.needsComma = false;
        continue;
      }

      if (context?.kind === 'object') {
        pushCurrentLine();
        continue;
      }

      appendText(',');
      pendingSpace = true;
      continue;
    }

    if (ch === ':' || ch === '=') {
      if (ch === ':' && next === '/' && third === '/') {
        beginValue();
        appendText(ch);
        continue;
      }

      current = trimRight(current);
      appendText(' = ');
      pendingSpace = false;
      continue;
    }

    if (ch === '+' && next === '=') {
      current = trimRight(current);
      appendText(' += ');
      pendingSpace = false;
      i++;
      continue;
    }

    beginValue();
    appendText(ch);
  }

  if (trimRight(current).length > 0) {
    pushCurrentLine();
  }

  const normalized = lines.join(eol);
  return formatHoconSource(normalized, eol, options);
}

export function provideHoconDocumentNormalizationEdits(
  document: vscode.TextDocument,
  options: vscode.FormattingOptions
): vscode.TextEdit[] {
  const originalText = document.getText();
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const normalized = normalizeHoconSource(originalText, eol, options);

  if (normalized === originalText) {
    return [];
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(originalText.length)
  );

  return [vscode.TextEdit.replace(fullRange, normalized)];
}
