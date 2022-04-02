import classNames from "classnames";
import type { FakeExtension } from "../../../utils/core";

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
  const extensionPacks = extension.packageJSON.extensionPack?.length;
  return (
    <li
      className={classNames("extension-item", { picked, disabled })}
      onClick={() => disabled || props.onClick?.()}
    >
      <div className="icon-container">
        <img src={extension.packageJSON.icon} alt="" />
        {extensionPacks && <span className="badge">{extensionPacks}</span>}
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
                props.onChange?.(newSelected.sort());
              }}
              disabled={props.disabled}
            ></ExtensionItem>
          );
        })}
      </ul>
    </div>
  );
}

export default ExtensionList;
