const createMenuItemRadioGroup = (
    label: string,
    arr: [string, string][],
    onclick: (value: string) => void
  ) => {
    const group = document.createElement("ul");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    const map = new Map<string, HTMLElement>();
  
    const select = (value: string) => {
      onclick(value);
      const item = map.get(value);
      for (const child of Array.from(group.children))
        child.setAttribute("aria-checked", child === item ? "true" : "false");
    };
  
    for (const [lbl, value] of arr) {
      const item = document.createElement("li");
      item.setAttribute("role", "menuitemradio");
      item.innerText = lbl;
      item.onclick = () => select(value);
      map.set(value, item);
      group.append(item);
    }
  
    return { element: group, select };
  };
  
  interface MenuConfig {
    name: string;
    label: string;
    type: "radio";
    items: [string, string][];
    onclick: (value: string) => void;
  }
  
  export const createMenu = (arr: MenuConfig[]) => {
    const groups: Record<string, any> = {};
    const element = document.createElement("ul");
    element.setAttribute("role", "menu");
    const hide = () => element.classList.remove("show");
    const hideAnd = (f: Function) => (...args: any[]) => (hide(), f(...args));
  
    for (const { name, label, type, items, onclick } of arr) {
      const widget =
        type === "radio"
          ? createMenuItemRadioGroup(label, items, hideAnd(onclick))
          : null;
      if (name && widget) groups[name] = widget;
      if (widget) element.append(widget.element);
    }
  
    window.addEventListener("blur", () => hide());
    window.addEventListener("click", (e) => {
      if (!element.parentNode?.contains(e.target as Node)) hide();
    });
  
    return { element, groups };
  };
  