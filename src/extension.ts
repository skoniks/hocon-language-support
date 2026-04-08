import * as vscode from 'vscode';
import { hoconFoldingRangeProvider } from './folding.js';
import { provideHoconDocumentFormattingEdits } from './formatter.js';
import { provideHoconDocumentNormalizationEdits } from './normalize.js';

function toFormattingOptions(
  editor: vscode.TextEditor,
  document: vscode.TextDocument
): vscode.FormattingOptions {
  const editorConfig = vscode.workspace.getConfiguration(
    'editor',
    document.uri
  );

  const insertSpaces =
    typeof editor.options.insertSpaces === 'boolean'
      ? editor.options.insertSpaces
      : editorConfig.get<boolean>('insertSpaces', true);

  const tabSize =
    typeof editor.options.tabSize === 'number'
      ? editor.options.tabSize
      : editorConfig.get<number>('tabSize', 2);

  return {
    insertSpaces,
    tabSize,
  };
}

export function activate(context: vscode.ExtensionContext) {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'hocon',
    {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
      ) {
        return provideHoconDocumentFormattingEdits(document, options);
      },
    }
  );

  const normalizeDocumentCommand = vscode.commands.registerTextEditorCommand(
    'hocon.normalizeDocument',
    (editor, editBuilder) => {
      const document = editor.document;
      if (document.languageId !== 'hocon') {
        return;
      }

      const edits = provideHoconDocumentNormalizationEdits(
        document,
        toFormattingOptions(editor, document)
      );

      if (edits.length === 0) {
        return;
      }

      for (const edit of edits) {
        editBuilder.replace(edit.range, edit.newText);
      }
    }
  );

  const foldingProvider = vscode.languages.registerFoldingRangeProvider(
    'hocon',
    hoconFoldingRangeProvider
  );

  context.subscriptions.push(formatter);
  context.subscriptions.push(foldingProvider);
  context.subscriptions.push(normalizeDocumentCommand);
}

export function deactivate() {}
