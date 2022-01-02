import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class I18n {
  public readonly nls: Record<string, string> = {};

  public static loadMessageBundle(rootPath: string) {
    const language = vscode.env.language;
    return new I18n({ language, rootPath });
  }

  // public static

  private constructor(opts: { language: string; rootPath: string }) {
    const { language, rootPath } = opts;
    let languageFile: string;
    if (fs.existsSync((languageFile = path.join(rootPath, `package.nls.${language}.json`)))) {
      try {
        Object.assign(this.nls, JSON.parse(fs.readFileSync(languageFile, "utf-8")));
      } catch (error) {}
    } else if (fs.existsSync((languageFile = path.join(rootPath, "package.nls.json")))) {
      try {
        Object.assign(this.nls, JSON.parse(fs.readFileSync(languageFile, "utf-8")));
      } catch (error) {}
    }
  }

  public localize(key: string, defaultValue: string) {
    if (this instanceof I18n) {
      return this.nls[key] ?? defaultValue;
    }
    throw new Error("The caller of localize is not I8n, please check");
  }

  public toString() {
    return JSON.stringify(this.nls);
  }
}
