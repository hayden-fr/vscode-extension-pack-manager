// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ExtensionWebview } from "./utils/ExtensionWebview";
import { defaultManifest, FakeExtension } from "./utils/Extension";
import { getExtensionsRootPath, kebabCase } from "./utils/utils";
import { I18n } from "./utils/nls";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // ExtensionWebview.bundleContext(context);
  const extensionWebview = new ExtensionWebview(context);

  const i18n = I18n.loadMessageBundle(context.extensionPath);

  const extensionRootPath = getExtensionsRootPath();

  // create new custom extension pack
  context.subscriptions.push(
    vscode.commands.registerCommand("extension-manager.extension.create", async () => {
      const customizeName = await vscode.window.showInputBox({
        placeHolder: i18n.localize(
          "manager.action.extension.create.placeholder",
          "Type a name for you extension"
        ),
      });
      if (customizeName) {
        const extensionDirName = path.join(
          extensionRootPath,
          `${defaultManifest.publisher}.${kebabCase(customizeName)}-1.0.0`
        );
        const extension = new FakeExtension(extensionDirName);
        vscode.commands.executeCommand("workbench.extensions.action.refreshExtension");
        extensionWebview.loadExtension(extension);
        // TODO 修改 .obsolete 对应插件包属性为 false
      }
    })
  );

  // editor custom extension pack
  context.subscriptions.push(
    vscode.commands.registerCommand("extension-manager.extension.edit", (extensionId: string) => {
      if (typeof extensionId === "string") {
        const installedExtension = fs.readdirSync(extensionRootPath);
        const fileWithVersion = new RegExp(`${extensionId}-\d*\.\d*\.\d*`);
        const extensionPath = installedExtension
          .filter((name) => fileWithVersion.test(name))
          .shift();
        if (extensionPath) {
          const extension = new FakeExtension(path.join(extensionRootPath, extensionPath));
          extensionWebview.loadExtension(extension);
        }
      }
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
