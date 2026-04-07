import * as vscode from 'vscode';
import { hoconFoldingRangeProvider } from './folding.js';
import { provideHoconDocumentFormattingEdits } from './formatter.js';

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

  const foldingProvider = vscode.languages.registerFoldingRangeProvider(
    'hocon',
    hoconFoldingRangeProvider
  );

  context.subscriptions.push(formatter);
  context.subscriptions.push(foldingProvider);
}

export function deactivate() {}
