import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { startCase, toLowerPreposition } from "./utils";
import { I18n } from "./nls";

export const defaultManifest: ExtensionManifest = {
  name: "unknown",
  version: "1.0.0",
  publisher: "extension-manager",
  engines: { vscode: "^1.63.0" },
};

export class FakeExtension implements vscode.Extension<any> {
  /**
   * The canonical extension identifier in the form of: `publisher.name`.
   */
  readonly id: string;

  /**
   * The uri of the directory containing the extension.
   */
  readonly extensionUri: vscode.Uri;

  /**
   * The absolute file path of the directory containing this extension. Shorthand
   * notation for {@link Extension.extensionUri Extension.extensionUri.fsPath} (independent of the uri scheme).
   */
  readonly extensionPath: string;

  /**
   * The uri of the extension icon file
   */
  readonly iconUri: vscode.Uri;

  /**
   * The absolute file path of the extension icon
   */
  readonly iconPath: string;

  /**
   * `true` if the extension has been activated.
   */
  readonly isActive: boolean = false;

  /**
   * The parsed contents of the extension's package.json.
   */
  readonly packageJSON: ExtensionManifest;

  /**
   * The extension kind describes if an extension runs where the UI runs
   * or if an extension runs where the remote extension host runs. The extension kind
   * is defined in the `package.json`-file of extensions but can also be refined
   * via the `remote.extensionKind`-setting. When no remote extension host exists,
   * the value is {@linkcode ExtensionKind.UI}.
   */
  extensionKind: vscode.ExtensionKind = 1;

  /**
   * The public API exported by this extension. It is an invalid action
   * to access this field before this extension has been activated.
   */
  readonly exports: undefined = undefined;

  /**
   * Activates this extension and returns its public API.
   *
   * @return A promise that will resolve when this extension has been activated.
   */
  activate(): Thenable<undefined> {
    return Promise.resolve(this.exports);
  }

  constructor(rootPath: string) {
    const packageJSON = fs.existsSync(rootPath)
      ? this.parseExtension(rootPath)
      : this.createExtension(rootPath);

    // nls localize
    const i18n = I18n.loadMessageBundle(rootPath);
    Object.entries(packageJSON).forEach(([key, value]) => {
      if (typeof value === "string" && /^%.*%$/.test(value)) {
        packageJSON[key] = i18n.localize(value.replace(/^%(.*)%$/, "$1"), value);
      }
    });

    // initial fakeExtension
    this.id = `${packageJSON.publisher}.${packageJSON.name}`;
    this.packageJSON = packageJSON;
    this.extensionUri = vscode.Uri.file(rootPath);
    this.extensionPath = this.extensionUri.fsPath;
    this.iconUri = this.parseExtensionIcon(path.join(rootPath, packageJSON.icon || ""));
    this.iconPath = this.iconUri.toString();
  }

  private parseExtension(rootPath: string): ExtensionManifest {
    const packageFilename = path.join(rootPath, "package.json");
    try {
      if (fs.existsSync(packageFilename)) {
        return JSON.parse(fs.readFileSync(packageFilename, "utf-8"));
      }
      return defaultManifest;
    } catch (error: any) {
      vscode.window.showErrorMessage(error.message);
      return defaultManifest;
    }
  }

  private createExtension(rootPath: string): ExtensionManifest {
    const extensionDirName = path.basename(rootPath);
    const matches = extensionDirName.match(/(.*)\.(.*)-(\d*\.\d*\.\d*)/);
    if (matches) {
      try {
        const [, publisher, extensionName, version] = matches;
        const packageJSON: ExtensionManifest = {
          name: extensionName,
          displayName: toLowerPreposition(startCase(extensionName)),
          description: "Created by Extension Manager, ",
          version: version,
          icon: "",
          publisher: publisher,
          engines: defaultManifest.engines,
          categories: ["Extension Packs"],
          extensionPack: [],
          __metadata: {
            installedTimestamp: new Date().getTime(),
            publisherDisplayName: startCase(publisher),
          },
        };
        this.genExtensionFiles(rootPath, {
          "package.json": packageJSON,
          "README.md": this.getReadmeContent(packageJSON.displayName!),
        });
        return packageJSON;
      } catch (error: any) {
        vscode.window.showErrorMessage(error.message);
        return defaultManifest;
      }
    } else {
      vscode.window.showErrorMessage(`${extensionDirName} is not valid name`);
      return defaultManifest;
    }
  }

  private genExtensionFiles(rootPath: string, files: Record<string, any>) {
    fs.mkdirSync(rootPath);
    Object.entries(files).forEach(([filename, content]) => {
      if (typeof content === "string") {
        fs.writeFileSync(path.join(rootPath, filename), content);
      } else {
        fs.writeFileSync(path.join(rootPath, filename), JSON.stringify(content));
      }
    });
  }

  private parseExtensionIcon(iconPath: string) {
    const defaultIcon = path.join(
      vscode.env.appRoot,
      "/out/vs/platform/extensionManagement/common/media/defaultIcon.png"
    );
    const finalIconPath = fs.statSync(iconPath).isFile() ? iconPath : defaultIcon;
    return vscode.Uri.file(finalIconPath).with({ scheme: "vscode-file", authority: "vscode-app" });
  }

  private getReadmeContent(name: string) {
    return `\
# ${name}

点击管理按钮 &#9881;&#65039; ，选择 \`编辑扩展包\` 进入编辑页面，点击扩展图标上传自定义图片，选择扩展后点击保存。

Click &#9881;&#65039; and select \`Edit Extension Pack\` to go to the edit page.
Click the extension icon to upload the custom picture. Select extensions for extension pack.
`;
  }
}
