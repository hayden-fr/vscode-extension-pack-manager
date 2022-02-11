import type { ChangeEvent } from "react";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { Children as ReactChildren, isValidElement } from "react";
import { render, createPortal } from "react-dom";
import type { FakeExtension } from "../utils/Extension";
import "./index.less";

const vscode = acquireVsCodeApi();

const Context = createContext({ localize: (key: string, message: string) => message });

/**
 * Create an object composed of the picked value is not undefined.
 */
function omitUndefined(object: object) {
  const result: Record<string, string> = {};
  Object.entries(object).forEach(([key, value]) => value && (result[key] = value));
  return result;
}

/**
 * Get keys of object
 */
function object2array(object: object) {
  return Object.keys(omitUndefined(object));
}

/**
 * Judge the parameter is type of object
 */
function isObject(obj: any): obj is object {
  return typeof obj === "object";
}

/**
 * Transform string array or object to string
 */
function classnames(...classes: (string | object | undefined)[]): string {
  return classes
    .map((c) => (isObject(c) ? classnames(...object2array(c)) : c))
    .filter(Boolean)
    .join(" ");
}

/**
 * Compared whether the parameters are equal
 */
function compared(arg1: string, arg2: string): boolean;
function compared(arg1: string[], arg2: string[]): boolean;
function compared(arg1: string | string[], arg2: string | string[]) {
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    return arg1.sort().toString() === arg2.sort().toString();
  }
  return arg1.toString() === arg2.toString();
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
 * Create an fake Symbol for command
 */
function CommandSymbol(description: string) {
  const uniqKey = window.btoa(`${description}.${new Date().getTime()}`);
  return { description, uniqKey } as CommandSymbol;
}

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

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

/**
 * Vscode Button Component, replace WebComponent vscode-button
 */
function Button(props: ButtonProps) {
  const { disabled, ...buttonProps } = props;
  const className = classnames("vscode-button", props.className, {
    ["disabled"]: disabled,
  });
  return <button {...buttonProps} className={className}></button>;
}

/**
 * Vscode Tabs Component, provide base layout for content, replace WebComponent vscode-panel
 */
function Tabs(props: React.HTMLAttributes<HTMLDivElement>) {
  const { navbar, content } = useMemo(() => {
    const navbar: { key: React.Key; title: React.ReactNode }[] = [];
    const content: Record<string, React.ReactChild> = {};
    ReactChildren.forEach(props.children, (child, index) => {
      if (isValidElement(child)) {
        const { key, type, props: childProps } = child;
        if (type === Tabs.Panel) {
          const { title } = childProps;
          navbar.push({ key: key || index, title });
          content[key!] = childProps.children;
        }
      }
    });
    return { navbar, content };
  }, [props.children]);

  const [activeKey, setActiveKey] = useState(navbar[0]?.key);

  return (
    <div className="vscode-tabs">
      <div className="vscode-tabs-navbar">
        <ul className="vscode-tabs-list">
          {navbar.map((item) => {
            const checked = activeKey === item.key;
            const className = classnames("vscode-tabs-item-label", { checked });
            return (
              <li key={item.key} className="vscode-tabs-item">
                <span className={className} onClick={() => setActiveKey(item.key)}>
                  {item.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="vscode-tabs-content">{content[activeKey]}</div>
    </div>
  );
}

/**
 * Hoc of Tabs Panel
 */
Tabs.Panel = function Panel(props: React.HTMLAttributes<HTMLDivElement>) {
  return null;
};

/**
 * Vscode Extension Avatar, preview extension icon and upload custom picture
 */
function Avatar(props: {
  src?: string;
  onChange?: (filename: string) => void;
  disabled?: boolean;
}) {
  const [imgUrl, setImgUrl] = useState(props.src);
  const InputRef = useRef<HTMLInputElement | null>(null);
  const file = useRef<File>();

  const handleChangeImage = () => props.disabled || InputRef.current?.click();

  useEffect(() => {
    setImgUrl(props.src);
  }, [props.src]);

  useEffect(() => {
    const changeImage = (event: any) => {
      file.current = (event as ChangeEvent<HTMLInputElement>)?.target?.files?.[0];
      if (file.current) {
        const iconPath = `vscode-file://vscode-app/${file.current.path}`;
        // encoding base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const iconBase64 = e.target?.result as string;
          setImgUrl(iconBase64);
          props.onChange?.(file.current!.path);
          const cache = vscode.getState();
          vscode.setState({ ...cache, extension: { ...cache.extension, iconPath, iconBase64 } });
        };
        reader.readAsDataURL(file.current);
      }
    };
    InputRef.current && InputRef.current.addEventListener("change", changeImage);
    return () => {
      InputRef.current && InputRef.current.removeEventListener("change", changeImage);
    };
  }, [InputRef.current, props.onChange]);

  return (
    <div className={classnames("avatar", { disabled: props.disabled })} onClick={handleChangeImage}>
      <img src={imgUrl} alt="" className="icon" />
      <input ref={InputRef} type="file" accept="image/png" style={{ display: "none" }} />
    </div>
  );
}

/**
 * Vscode Extension Component, show extension list
 */
function ExtensionList(props: {
  dataSource: FakeExtension[];
  selected: string[];
  onChange?: (extensionIds: string[]) => void;
  disabled?: boolean;
}) {
  const { dataSource = [], selected = [] } = props;

  return (
    <div className="extension-list-wrapper">
      <ul className="extension-list">
        {dataSource.map((item) => {
          const picked = selected.includes(item.id);
          return (
            <ExtensionItem
              key={item.id}
              extension={item}
              picked={picked}
              onClick={() => {
                const newSelected = picked
                  ? selected.filter((id) => id !== item.id)
                  : selected.concat(item.id);
                props.onChange?.(newSelected);
              }}
              disabled={props.disabled}
            ></ExtensionItem>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Vscode Extension Component, show extension base information
 */
function ExtensionItem(props: {
  extension: FakeExtension;
  picked: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { extension, picked } = props;
  const disabled = props.disabled || extension.packageJSON.categories?.includes("Language Packs");
  return (
    <li
      className={classnames("extension-item", { picked, disabled })}
      onClick={() => disabled || props.onClick?.()}
    >
      <div className="icon-container">
        <img src={extension.iconBase64} alt="" />
      </div>
      <div className="details">
        <div className="title">{extension.packageJSON.displayName}</div>
        <div className="description">{extension.packageJSON.description}</div>
        <div className="footer">{extension.packageJSON.publisher}</div>
      </div>
      <div className="picked-container">
        <div className="picked-checkbox"></div>
      </div>
    </li>
  );
}

/**
 * Main Component, manage status and change data
 */
function App() {
  const [extension, setExtension] = useState<FakeExtension | undefined>(undefined);
  const [packageJSON, setPackageJSON] = useState<FakeExtension["packageJSON"] | undefined>();
  const [installedExtensions, setInstalledExtensions] = useState<FakeExtension[]>([]);
  const [nls, setNls] = useState<Record<string, string>>({});

  const localize = (key: string, defaultValue: string) => nls[key] ?? defaultValue;

  useEffect(() => {
    const cache = vscode.getState();
    if (cache) {
      setNls(cache.nls);
      setExtension(cache.extension);
      setPackageJSON(cache.packageJSON);
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

  if (!extension || !packageJSON) {
    return null;
  }

  const isChanged =
    !compared(packageJSON.icon || "", extension.packageJSON.icon || "") ||
    !compared(packageJSON.extensionPack || [], extension.packageJSON.extensionPack || []);

  const uninstalled = packageJSON.obsolete;

  return (
    <Context.Provider value={{ localize }}>
      <div className="container">
        <div className="header">
          <Avatar
            src={extension.iconBase64}
            onChange={(icon) => {
              setPackageJSON({ ...packageJSON, icon });
              const cache = vscode.getState();
              vscode.setState({ ...cache, packageJSON: { ...packageJSON, icon } });
            }}
            disabled={uninstalled}
          ></Avatar>
          <div className="details">
            <div className="title">{extension.packageJSON.displayName}</div>
            <div className="subtitle">{extension.packageJSON.__metadata.publisherDisplayName}</div>
            <div className="description">
              {localize(
                "manager.webview.extension.description",
                "Select extensions for your extension pack, and you can customize the icon"
              )}
            </div>
            <div className="state-container">
              <div className="actions-bar">
                {isChanged && (
                  <Button
                    onClick={() => {
                      request("update", packageJSON).then((packageJSON) => {
                        setExtension({ ...extension, packageJSON } as FakeExtension);
                        setPackageJSON(packageJSON);
                        const cache = vscode.getState();
                        vscode.setState({
                          ...cache,
                          extension: { ...extension, packageJSON },
                          packageJSON,
                        });
                      });
                    }}
                  >
                    {localize("manager.webview.update", "Update")}
                  </Button>
                )}
                {uninstalled ? (
                  <span className="uninstalled">
                    {localize("manager.webview.extension.status.uninstalled", "uninstalled")}
                  </span>
                ) : (
                  <Button onClick={() => request("uninstall")}>
                    {localize("manager.webview.uninstall", "Uninstall")}
                  </Button>
                )}
              </div>
              <div className="status">
                {uninstalled || localize("manager.webview.extension.status.ready", "ready")}
              </div>
            </div>
            <div className="recommendation"></div>
          </div>
        </div>
        <div className="body">
          <Tabs>
            <Tabs.Panel
              key="extensionPack"
              title={localize("manager.webview.tabs.extension-pack", "Extension Pack")}
            >
              <ExtensionList
                dataSource={installedExtensions}
                selected={packageJSON.extensionPack || []}
                disabled={uninstalled}
                onChange={(extensionPack) => {
                  setPackageJSON({ ...packageJSON, extensionPack });
                  const cache = vscode.getState();
                  vscode.setState({ ...cache, packageJSON: { ...packageJSON, extensionPack } });
                }}
              ></ExtensionList>
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </Context.Provider>
  );
}

render(<App />, document.querySelector("#root"));
