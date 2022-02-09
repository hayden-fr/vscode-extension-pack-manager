import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { FakeExtension } from "./Extension";
import { I18n } from "./nls";
import { getExtensionsRootPath, getUri } from "./utils";

export class ExtensionWebview {
  /**
   * extension context
   */
  private _context: vscode.ExtensionContext;

  /**
   * handler of custom extension pack webview
   */
  private readonly webviewPanel: Map<string, vscode.WebviewPanel>;

  /**
   * internationalization local
   */
  private _i18n: I18n;

  public constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._i18n = I18n.loadMessageBundle(context.extensionPath);
    this.webviewPanel = new Map();
  }

  public localize(key: string, message: string) {
    return this._i18n.localize(key, message);
  }

  public loadExtension(extension: FakeExtension) {
    const extensionId = extension.id;
    // Show the webview panel if it is exist
    if (this.webviewPanel.has(extensionId)) {
      const currentPanel = this.webviewPanel.get(extensionId)!;
      currentPanel.reveal();
      return currentPanel;
    }
    const currentPanel = this.createWebviewPanel(extension);
    this.webviewPanel.set(extensionId, currentPanel);
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
    const extensionStyleUri = getUri(webview, this._context.extensionUri, ["dist", "webview.css"]);
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
      this.webviewPanel.delete(extensionId);
    });
    return panel;
  }

  private async addMessageListener(
    extension: FakeExtension,
    panel: vscode.WebviewPanel,
    message: { command: CommandSymbol; payload?: any }
  ) {
    const webview = panel.webview;
    const extensionId = extension.id;
    const packageJSONFilename = path.join(extension.extensionPath, "package.json");
    const { command, payload } = message;

    webview.postMessage({
      command,
      payload: await (async () => {
        switch (command.description) {
          case "initial": {
            const nls = this._i18n.nls;
            const installedExtensions = this.getInstalledExtensions();
            return { nls, extension, installedExtensions };
          }
          case "update": {
            const packageJSON = payload as FakeExtension["packageJSON"];
            // check if the field of icon is file
            if (packageJSON.icon && fs.existsSync(packageJSON.icon)) {
              const iconContent = fs.readFileSync(packageJSON.icon);
              fs.writeFileSync(path.join(extension.extensionPath, "logo.png"), iconContent);
              packageJSON.icon = "logo.png";
            }
            // write package.json
            fs.writeFileSync(packageJSONFilename, JSON.stringify(packageJSON));
            vscode.commands.executeCommand("workbench.extensions.action.refreshExtension");
            // send message webview update success
            webview.postMessage({ command, payload: packageJSON });
            return packageJSON;
          }
          case "uninstall": {
            // ask confirm uninstall
            const confirmUninstall =
              (await vscode.window.showWarningMessage(
                this.localize(
                  "manager.webview.uninstall.confirm",
                  "Confirm uninstall this Extension"
                ),
                this.localize("manager.webview.uninstall", "Uninstall"),
                this.localize("manager.webview.cancel", "Cancel")
              )) === this.localize("manager.webview.uninstall", "Uninstall");
            if (confirmUninstall) {
              const packageJSON: ExtensionManifest = JSON.parse(
                fs.readFileSync(packageJSONFilename, "utf-8")
              );
              packageJSON.extensionPack = [];
              packageJSON.obsolete = true;
              fs.writeFileSync(packageJSONFilename, JSON.stringify(packageJSON));
              vscode.commands.executeCommand(
                "workbench.extensions.uninstallExtension",
                extensionId
              );
              panel.dispose();
            }
            return null;
          }
          default:
            return null;
        }
      })(),
    });
  }

  private getInstalledExtensions() {
    const extensionRootPath = getExtensionsRootPath();
    const extensionFilenames = fs
      .readdirSync(extensionRootPath)
      .filter((filename) => !filename.startsWith("extension-manager."))
      .filter((filename) => !filename.startsWith("hayden.extension-pack-manager-"))
      .filter((filename) => filename !== ".obsolete");
    const installedExtensions = extensionFilenames.map(
      (filename) => new FakeExtension(path.join(extensionRootPath, filename))
    );
    return installedExtensions;
  }
}
