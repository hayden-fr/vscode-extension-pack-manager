import { useEffect, useMemo, useState } from "react";
import { render } from "react-dom";
import type { FakeExtension } from "../utils/core";
import { startCase } from "../utils/str";
import Avatar from "./components/avatar";
import Button from "./components/button";
import ExtensionList from "./components/extensionList";
import Input from "./components/input";
import Panels from "./components/panels";
import { vscode, Context } from "./context";
import "./index.less";

/**
 * Create an fake Symbol for command
 */
function CommandSymbol(description: string) {
  const uniqKey = window.btoa(`${description}.${new Date().getTime()}`);
  return { description, uniqKey } as CommandSymbol;
}

/**
 * a data request service center, receive message by li
 */
const listener = (() => {
  const response: Map<string, Function> = new Map();

  const messageListener = (event: { data: { command: CommandSymbol; payload: any } }) => {
    const { data } = event;
    const { command, payload } = data;
    const resolve = response.get(command.uniqKey);
    resolve?.(payload);
  };
  window.addEventListener("message", messageListener);

  const registerResolve = (command: CommandSymbol, resolve: (value: any) => void) => {
    response.set(command.uniqKey, resolve);
  };

  return { registerResolve };
})();

/**
 * Send message to extension and return response
 */
function request<T = any>(command: string, payload?: any) {
  return new Promise<T>((resolve) => {
    const commandSymbol = CommandSymbol(command);
    listener.registerResolve(commandSymbol, resolve);
    vscode.postMessage({ command: commandSymbol, payload });
  });
}

/**
 * Literal meaning, sort by display name
 */
function sortByDisplayName(extensions: FakeExtension[]) {
  const map: Record<string, FakeExtension> = {};
  for (const extension of extensions) {
    const { packageJSON } = extension;
    map[`${packageJSON.displayName?.toLowerCase()}.${packageJSON.publisher}`] = extension;
  }
  const sortName = Object.keys(map).sort();
  return sortName.map((name) => map[name]);
}

/**
 * Main Component, manage status and change data
 */
function App() {
  // current extension info, origin data
  const [extension, setExtension] = useState<FakeExtension | undefined>(undefined);
  // current extension package json, for page data display
  const [packageJSON, setPackageJSON] = useState<FakeExtension["packageJSON"] | undefined>();
  // installed extensions
  const [installedExtensions, setInstalledExtensions] = useState<FakeExtension[]>([]);
  // i18n json object
  const [nls, setNls] = useState<Record<string, string>>({});

  const localize = (key: string, defaultValue: string) => nls[key] ?? defaultValue;

  useEffect(() => {
    const cache = vscode.getState();
    if (cache) {
      setNls(cache.nls);
      setExtension(cache.extension);
      setPackageJSON(cache.packageJSON);
      // TODO 需要更新已安装的插件
      setInstalledExtensions(sortByDisplayName(cache.installedExtensions));
    } else {
      request("initial").then((resData) => {
        setNls(resData.nls);
        setExtension(resData.extension);
        setPackageJSON(resData.extension.packageJSON);
        setInstalledExtensions(sortByDisplayName(resData.installedExtensions));
        vscode.setState({ ...resData, packageJSON: resData.extension.packageJSON });
      });
    }
  }, []);

  /** extension status: if extensions pack has uninstalled  */
  const hasUninstalledExtension = useMemo(() => {
    const installedExtensionId = installedExtensions.map((item) => {
      return item.id;
    });
    for (const id of packageJSON?.extensionPack || []) {
      if (!installedExtensionId.includes(id)) {
        return true;
      }
    }
    return false;
  }, [installedExtensions, packageJSON]);

  if (!extension || !packageJSON) {
    return null;
  }

  const propertiesChanged = (property: string, defaultValue: string | string[] = ""): boolean => {
    const packageValue: string | string[] = packageJSON[property] || defaultValue;
    const extensionValue: string | string[] = extension.packageJSON[property] || defaultValue;
    return packageValue.toString() !== extensionValue.toString();
  };

  /** extension status: extension info has changed */
  const isChanged =
    propertiesChanged("icon") ||
    propertiesChanged("displayName") ||
    propertiesChanged("description") ||
    propertiesChanged("extensionPack", []);

  /** extension status: current extension is not installed */
  const notInstalled = packageJSON.obsolete === "new-extension-pack";

  const updatePackageJSON = (packageJSON: ExtensionManifest) => {
    const cache = vscode.getState();
    setPackageJSON(packageJSON);
    vscode.setState({ ...cache, packageJSON });
  };

  const updateExtension = (extension: FakeExtension) => {
    const cache = vscode.getState();
    setExtension(extension);
    setPackageJSON(extension.packageJSON);
    vscode.setState({ ...cache, extension, packageJSON: extension.packageJSON });
  };

  return (
    <Context.Provider value={{ localize }}>
      <div className="container">
        <div className="header">
          <Avatar
            src={packageJSON.icon}
            onChange={(icon) => {
              updatePackageJSON({ ...packageJSON, icon });
            }}
          ></Avatar>
          <div className="details">
            <div className="title">
              <Input
                value={packageJSON.displayName}
                onChange={(displayName) => {
                  updatePackageJSON({ ...packageJSON, displayName });
                }}
              ></Input>
            </div>
            <div className="subtitle">
              <span>{startCase(packageJSON.publisher)}</span>
              <code className="version">v{packageJSON.version}</code>
            </div>
            <div className="description">
              <Input
                value={packageJSON.description}
                onChange={(description) => {
                  updatePackageJSON({ ...packageJSON, description });
                }}
              ></Input>
            </div>
            <div className="state-container">
              <div className="actions-bar">
                {/* create new extension button */}
                {notInstalled && (
                  <Button onClick={() => request("create", packageJSON).then(updateExtension)}>
                    {localize("manager.webview.create", "Create")}
                  </Button>
                )}
                {/* update installed extension button */}
                {!notInstalled && (
                  <Button
                    onClick={() => {
                      const obsolete = `${extension.id}-${extension.packageJSON.version}`;
                      request("update", { ...packageJSON, obsolete }).then(updateExtension);
                    }}
                    disabled={!isChanged}
                  >
                    {localize("manager.webview.update", "Update")}
                  </Button>
                )}
                {/* uninstall extension button */}
                {!notInstalled && (
                  <Button onClick={() => request("uninstall", extension.packageJSON.version)}>
                    {localize("manager.webview.uninstall", "Uninstall")}
                  </Button>
                )}
                {/* remove obsolete extension where in extensionPack */}
                {hasUninstalledExtension && (
                  <Button
                    onClick={() => {
                      const installedExtensionId = installedExtensions.map((item) => {
                        return item.id;
                      });
                      const extensionPack = packageJSON.extensionPack?.filter((id) => {
                        return installedExtensionId.includes(id);
                      });
                      updatePackageJSON({ ...packageJSON, extensionPack });
                    }}
                  >
                    {localize("manager.webview.reject", "Remove obsolete")}
                  </Button>
                )}
              </div>
              <div className="status"></div>
            </div>
            <div className="recommendation"></div>
          </div>
        </div>
        <div className="body">
          <Panels>
            <Panels.View
              key="extensionPack"
              title={localize("manager.webview.tabs.extension-pack", "Extension Pack")}
            >
              <ExtensionList
                dataSource={installedExtensions}
                selected={packageJSON.extensionPack || []}
                onChange={(extensionPack) => {
                  updatePackageJSON({ ...packageJSON, extensionPack });
                }}
              ></ExtensionList>
            </Panels.View>
          </Panels>
        </div>
      </div>
    </Context.Provider>
  );
}

render(<App />, document.querySelector("#root"));
