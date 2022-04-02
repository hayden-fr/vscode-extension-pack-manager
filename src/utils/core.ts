import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { genCurrentVersion } from "./utils";
import { startCase } from "./str";
import { I18n } from "./i18n";

export const defaultManifest: ExtensionManifest = {
  name: "new-extension-pack",
  version: "0.0.0",
  publisher: "extension-manager",
  engines: { vscode: "^1.60.0" },
};

const defaultIconData =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAATlBMVEUAAADx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLx8vLe39/o6enj5OTY2dnl5uba29vr7Ozv8PD///+VH9SVAAAAEHRSTlMAQHCAv+8gYJ/fz1CPMBCv0SKY+gAAAAFiS0dEGexutYgAAAAHdElNRQfiCwYULSNcgV7VAAACjElEQVRo3u2b247iMAyGU1L3EEJxmWFm3/9J92IX1KKmcWo7Hmn4LxHSp1SxHZ+cK1Vz8m0L+BS0rT81TlVdP4yYUBj6Tod6jknoQ2M8S1MvEZAkiBc56tQHLFDoJxmsBywU+MkCK4I+hv2HZmCbERkajxr3dEWmroe+9xmQLSi36ymiiGLhobuAQgpFjrQBFBMU3LEeRdWTjReFRTTpAcU1GHFJZBUugexRSb7qfSbf7QYVtWPPHWiCIenDpoCqCim/HVFZMREHUV2bUXICfTBsfewrVtC1siXt2VTqXTendEPEj3lHH5svQLKr/Ezpjojz545miutM3yxp8Mv9SscGafD6yDumJA5eHXknGIqDl0fe8x3y4MWR96KwPHgRmQMbvLTfrxw4POsMyAavXE4OjBdKONQAP8Ij1AYDJQ5rgP/H5UgGz6QARADH3bikCB6dc67D+mDs8m94HXCfT5Zewd/J21YCHjJuSw0cnHNoAcb8I08J3LiTKJh8FU/ZhFgJ7F1rA27twGADhpw1aYHxDWaCs0mbFpiuN5gJvi90e5vTGmzmMn9fdDJ7CJg9fRobcFP8vP3znVIROJuzFaYw1H+H8hRG5t+DdNJG/XdflqZ+bVVwb8sfqOCuLDHfLEfci+tcj+JxrA+OnOILB3zmlJsYYGAV2BjgyCopMsAXVhH1ODjwysbHwT2vUH4YvOwN+Jpgz2yGHAWv+z++HthXb6VuN1R9LbCnNjWFNf6cNq5Z49quVW82nGA3jmE3gGI2cmM3ZGQ3VmU3SGY3Omc3LGg3Hmk3EGo3Ams39Gs35mw32G03ym44vG+3rmC4oGG4kmK3hGO4dmS4aGW5WvZcpkt+dL1lOuH1wb8Dn/C3GCuwnwAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxOC0xMS0wNlQyMDo0NTozNSswMDowMEkH/xoAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTgtMTEtMDZUMjA6NDU6MzUrMDA6MDA4WkemAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAABJRU5ErkJggg==";

/**
 * Extension information from extension package file
 */
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

  constructor(extensionPath: string) {
    // set extension path
    this.extensionUri = vscode.Uri.file(extensionPath);
    this.extensionPath = this.extensionUri.fsPath;

    // parse extension package json
    const packageJSON = fs.existsSync(extensionPath)
      ? this.parseExtension(extensionPath)
      : this.createExtension(extensionPath);

    // translate package property value with nls file
    const i18n = I18n.loadMessageBundle(extensionPath);
    Object.entries(packageJSON).forEach(([key, value]) => {
      if (typeof value === "string" && /^%.*%$/.test(value)) {
        packageJSON[key] = i18n.localize(value.replace(/^%(.*)%$/, "$1"), value);
      }
    });

    // set extension id
    this.id = `${packageJSON.publisher}.${packageJSON.name}`;

    // set other info
    this.iconUri = this.parseIconUri(path.join(extensionPath, packageJSON.icon || "icon.png"));
    this.iconPath = this.iconUri.toString();
    // encode icon file to base64
    packageJSON.icon = this.parseIconData(this.iconUri.fsPath);

    this.packageJSON = packageJSON;
  }

  private parseExtension(extensionPath: string): ExtensionManifest {
    const packageFilename = path.join(extensionPath, "package.json");
    try {
      if (fs.existsSync(packageFilename)) {
        return JSON.parse(fs.readFileSync(packageFilename, "utf-8"));
      }
      return this.parseExtensionByName(extensionPath);
    } catch (error: any) {
      vscode.window.showErrorMessage(error.message);
      return this.parseExtensionByName(extensionPath);
    }
  }

  private parseExtensionByName(extensionPath: string): ExtensionManifest {
    const extensionDirName = path.basename(extensionPath);
    const matches = extensionDirName.match(/^(.*)\.(.*)-(\d*\.\d*\.\d*)$/);
    if (matches) {
      const [, publisher, extensionName, version] = matches;
      const packageJSON: ExtensionManifest = {
        name: extensionName,
        displayName: startCase(extensionName),
        description: "Unknown extension",
        version: version,
        publisher: publisher,
        engines: defaultManifest.engines,
      };
      return packageJSON;
    }
    return defaultManifest;
  }

  private createExtension(extensionPath: string): ExtensionManifest {
    const { publisher, name: extensionName } = defaultManifest;
    const packageJSON: ExtensionManifest = {
      name: new Date().getTime().toString(32),
      displayName: startCase(extensionName),
      description: "new extension pack, click here and change the description",
      version: genCurrentVersion(),
      publisher: publisher,
      engines: defaultManifest.engines,
      obsolete: "new-extension-pack",
    };
    return packageJSON;
  }

  private parseIconUri(iconPath: string) {
    return vscode.Uri.file(iconPath).with({ scheme: "vscode-file", authority: "vscode-app" });
  }

  private parseIconData(iconPath: string) {
    if (fs.existsSync(iconPath)) {
      const type = path.extname(iconPath).replace(".", "");
      const encoding = fs.readFileSync(iconPath, { encoding: "base64" });
      return `data:image/${type};base64,${encoding}`;
    }
    return defaultIconData;
  }

  public static genExtension(rootPath: string, packageJSON: ExtensionManifest) {
    const extensionDirName = `${packageJSON.publisher}.${packageJSON.name}-${packageJSON.version}`;
    const extensionPath = path.join(rootPath, extensionDirName);
    if (!fs.existsSync(extensionPath)) {
      fs.mkdirSync(extensionPath);
    }
    // generate icon file
    const matches = /^data:image\/(\w*);base64,(.*)/gm.exec(packageJSON.icon || defaultIconData);
    if (matches) {
      const [, extname, content] = matches;
      const iconName = `icon.${extname}`;
      const iconFile = path.join(extensionPath, iconName);
      fs.writeFileSync(iconFile, Buffer.from(content, "base64"));
      packageJSON.icon = iconName;
    }
    // generate readme file
    const readme = [
      `# ${packageJSON.displayName}`,
      "",
      "Click &#9881;&#65039; and select `Edit Extension Pack` to go to the edit page.",
      "Click the extension icon to upload the custom picture. Select extensions for extension pack.",
      "",
      "点击管理按钮 &#9881;&#65039; ，选择 `编辑扩展包` 进入编辑页面，点击扩展图标上传自定义图片，选择扩展后点击保存。",
    ];
    fs.writeFileSync(path.join(extensionPath, "README.MD"), readme.join("\n"));

    // generate package file
    packageJSON.categories = ["Custom Extension"];
    fs.writeFileSync(path.join(extensionPath, "package.json"), JSON.stringify(packageJSON));
    return new FakeExtension(extensionPath);
  }

  /**
   * generate extension
   * @deprecated to refactor
   * @param rootPath
   * @param files
   */
  public static genExtensionFiles(rootPath: string, files: Record<string, any>) {
    fs.mkdirSync(rootPath);
    Object.entries(files).forEach(([filename, content]) => {
      if (typeof content === "string") {
        fs.writeFileSync(path.join(rootPath, filename), content);
      } else {
        fs.writeFileSync(path.join(rootPath, filename), JSON.stringify(content));
      }
    });
  }
}

/**
 * Obtain all extensions
 */
export class Extensions {
  private readonly extensions: Map<string, FakeExtension>;

  constructor(public rootPath: string) {
    // get all extension
    const allExtensions = fs
      .readdirSync(rootPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    // get all extension will uninstall
    const obsoleteFile = path.join(rootPath, ".obsolete");
    const obsoleteJson: Record<string, boolean> = fs.existsSync(obsoleteFile)
      ? JSON.parse(fs.readFileSync(obsoleteFile, "utf8"))
      : {};

    const uninstalled = Object.keys(obsoleteJson).filter((name) => obsoleteJson[name]);

    const installed = allExtensions
      .filter((filename) => !uninstalled.includes(filename))
      .map((filename) => new FakeExtension(path.join(rootPath, filename)));

    // parse installed extensions
    this.extensions = new Map(installed.map((extension) => [extension.id, extension]));
  }

  /**
   * get all installed extension except this extension and custom extensions
   * @returns
   */
  public getAllExtension() {
    const Filter = ([id]: [string, FakeExtension]) => {
      return !(id.startsWith("extension-manager.") || id === "hayden.extension-pack-manager");
    };
    return [...this.extensions].filter(Filter).flatMap(([, extensions]) => [extensions]);
  }

  /**
   * get all custom extensions
   * @returns
   */
  public getCustomExtension() {
    const Filter = ([id]: [string, FakeExtension]) => {
      return id.startsWith("extension-manager.");
    };
    return [...this.extensions].filter(Filter).flatMap(([, extensions]) => [extensions]);
  }

  /**
   * get the extension of the specified id
   * @param extensionId
   * @returns
   */
  public getExtension(extensionId: string) {
    return this.extensions.get(extensionId);
  }
}
