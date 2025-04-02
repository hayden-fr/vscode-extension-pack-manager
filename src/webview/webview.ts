import * as vscode from "vscode";
import { Extensions, FakeExtension } from "../utils/core";
import { I18n } from "../utils/i18n";
import { startCase } from "../utils/str";
import { genCurrentVersion, getUri, updateExtension, updateObsolete } from "../utils/utils";

export class ExtensionWebview {
  /**
   * extension context
   */
  private readonly _context: vscode.ExtensionContext;

  /**
   * handler of custom extension pack webview
   */
  private readonly _webviewPanel: Map<string, vscode.WebviewPanel>;

  /**
   * internationalization local
   */
  private readonly _i18n: I18n;

  private readonly _rootPath: string;

  public constructor(context: vscode.ExtensionContext, rootPath: string) {
    this._context = context;
    this._rootPath = rootPath;
    // this._extensions = new Extensions(rootPath);
    this._i18n = I18n.loadMessageBundle(context.extensionPath);
    this._webviewPanel = new Map();
  }

  public localize(key: string, message: string) {
    return this._i18n.localize(key, message);
  }

  public loadExtension(extension: FakeExtension) {
    const extensionId = extension.id;
    // Show the webview panel if it is exist
    if (this._webviewPanel.has(extensionId)) {
      const currentPanel = this._webviewPanel.get(extensionId)!;
      currentPanel.reveal();
      return currentPanel;
    }
    const currentPanel = this.createWebviewPanel(extension);
    this._webviewPanel.set(extensionId, currentPanel);
    return currentPanel;
  }

  /**
   * Create a new webview panel with extension
   *
   * @param extension
   * @returns
   */
  private createWebviewPanel(extension: FakeExtension) {
    const extensionId = extension.id;
    // create webview panel
    const webviewTitle = `${this._i18n.localize(
      "manager.webview.editor.pre-title",
      "Extension"
    )}: ${extension.packageJSON.displayName}`;
    const panel = vscode.window.createWebviewPanel(
      extensionId,
      webviewTitle,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    // render html
    const webview = panel.webview;
    const extensionScriptUri = getUri(webview, this._context.extensionUri, ["dist", "webview.js"]);
    webview.html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <script type="module" src="${extensionScriptUri}"></script>
    <title>Document</title>
  </head>
  <body class="custom-extension-body">
    <div id="root"></div>
  </body>
</html>
`;
    // listener message
    panel.webview.onDidReceiveMessage(this.addMessageListener.bind(this, extension, panel));
    // listener dispose
    panel.onDidDispose(() => {
      this._webviewPanel.delete(extensionId);
    });
    return panel;
  }

  /**
   * handle request data exchange
   * @param extension
   * @param panel
   * @param message
   */
  private async addMessageListener(
    extension: FakeExtension,
    panel: vscode.WebviewPanel,
    message: { command: CommandSymbol; payload?: any }
  ) {
    const webview = panel.webview;
    const { command, payload } = message;

    webview.postMessage({
      command,
      payload: await (async () => {
        switch (command.description) {
          case "initial": {
            const nls = this._i18n.nls;
            const installedExtensions = new Extensions(this._rootPath).getAllExtension();
            return { nls, extension, installedExtensions };
          }
          case "create":
          case "update": {
            const packageJSON = payload as ExtensionManifest;
            if (packageJSON.obsolete) {
              updateObsolete(this._rootPath, { [packageJSON.obsolete]: true });
            }
            delete packageJSON.obsolete;
            packageJSON.version = genCurrentVersion();
            packageJSON.__metadata = {
              publisherDisplayName: startCase(packageJSON.publisher),
              installedTimestamp: Date.now(),
            };
            const newExtension = FakeExtension.genExtension(this._rootPath, packageJSON);
            updateExtension(this._rootPath, newExtension);
            vscode.commands.executeCommand("workbench.extensions.action.refreshExtension");
            return newExtension;
          }
          case "uninstall": {
            const version = payload as string;
            const extensionId = `${extension.id}-${version}`;
            updateObsolete(this._rootPath, { [extensionId]: true });
            vscode.commands.executeCommand("workbench.extensions.action.refreshExtension");
            panel.dispose();
            return null;
          }
          default:
            return null;
        }
      })(),
    });
  }
}
