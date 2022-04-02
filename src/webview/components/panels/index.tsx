import { Children, isValidElement, useMemo, useState } from "react";
import classNames from "classnames";
import "./index.less";

/**
 * Vscode Tabs Component, provide base layout for content, replace WebComponent vscode-panel
 */
function Panels(props: React.HTMLAttributes<HTMLDivElement>) {
  const { navbar, content } = useMemo(() => {
    const navbar: { key: React.Key; title: React.ReactNode }[] = [];
    const content: Record<string, React.ReactChild> = {};
    Children.forEach(props.children, (child, index) => {
      if (isValidElement(child)) {
        const { key, type, props: childProps } = child;
        if (type === Panels.View) {
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
    <div className="vscode-panel">
      <div className="vscode-panel-navbar">
        <ul className="vscode-panel-list">
          {navbar.map((item) => {
            const checked = activeKey === item.key;
            const className = classNames("vscode-panel-item-label", { checked });
            return (
              <li key={item.key} className="vscode-panel-item">
                <span className={className} onClick={() => setActiveKey(item.key)}>
                  {item.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="vscode-panel-content">{content[activeKey]}</div>
    </div>
  );
}

function Panel(props: React.HTMLAttributes<HTMLDivElement>) {
  return null;
}

Panels.View = Panel;

export default Panels;
