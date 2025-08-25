const createSVGElement = (tag: string): SVGElement =>
    document.createElementNS("http://www.w3.org/2000/svg", tag);
  
  const createExpanderIcon = (): SVGSVGElement => {
    const svg = createSVGElement("svg") as SVGSVGElement;
    svg.setAttribute("viewBox", "0 0 13 10");
    svg.setAttribute("width", "13");
    svg.setAttribute("height", "13");
    const polygon = createSVGElement("polygon");
    polygon.setAttribute("points", "2 1, 12 1, 7 9");
    svg.append(polygon);
    return svg;
  };
  
  interface TOCItem {
    label: string;
    href?: string;
    subitems?: TOCItem[];
  }
  
  const createTOCItemElement = (
    list: HTMLElement[],
    map: Map<string, HTMLElement>,
    onclick: (href: string) => void
  ) => {
    let count = 0;
    const makeID = () => `toc-element-${count++}`;
  
    const createItem = ({ label, href, subitems }: TOCItem, depth = 0): HTMLLIElement => {
      const a = document.createElement(href ? "a" : "span");
      a.innerText = label;
      a.setAttribute("role", "treeitem");
      a.tabIndex = -1;
      (a.style as CSSStyleDeclaration).paddingInlineStart = `${(depth + 1) * 24}px`;
      list.push(a);
  
      if (href) {
        if (!map.has(href)) map.set(href, a);
        (a as HTMLAnchorElement).href = href;
        a.onclick = (event) => {
          event.preventDefault();
          onclick(href);
        };
      } else {
        a.onclick = (event) => (a.firstElementChild as HTMLElement)?.onclick?.(event as any);
      }
  
      const li = document.createElement("li");
      li.setAttribute("role", "none");
      li.append(a);
  
      if (subitems?.length) {
        a.setAttribute("aria-expanded", "false");
        const expander = createExpanderIcon();
        expander.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const expanded = a.getAttribute("aria-expanded");
          a.setAttribute("aria-expanded", expanded === "true" ? "false" : "true");
        };
        a.prepend(expander);
        const ol = document.createElement("ol");
        ol.id = makeID();
        ol.setAttribute("role", "group");
        a.setAttribute("aria-owns", ol.id);
        ol.replaceChildren(...subitems.map((item) => createItem(item, depth + 1)));
        li.append(ol);
      }
      return li;
    };
  
    return createItem;
  };
  
  export const createTOCView = (
    toc: TOCItem[],
    onclick: (href: string) => void
  ) => {
    const $toc = document.createElement("ol");
    $toc.setAttribute("role", "tree");
    const list: HTMLElement[] = [];
    const map = new Map<string, HTMLElement>();
    const createItem = createTOCItemElement(list, map, onclick);
    $toc.replaceChildren(...toc.map((item) => createItem(item)));
  
    const isTreeItem = (item: Element | null): boolean =>
      item?.getAttribute("role") === "treeitem";
  
    function* getParents(el: Element): Generator<HTMLElement> {
      for (
        let parent: Element | null = el.parentNode as Element;
        parent !== $toc && parent;
        parent = parent.parentNode as Element
      ) {
        const item = parent.previousElementSibling as HTMLElement | null;
        if (isTreeItem(item)) yield item!;
      }
    }
  
    let currentItem: HTMLElement | undefined;
    let currentVisibleParent: HTMLElement | undefined;
  
    $toc.addEventListener("focusout", () => {
      if (!currentItem) return;
      if (currentVisibleParent) currentVisibleParent.tabIndex = -1;
      if ((currentItem as any).offsetParent) {
        currentItem.tabIndex = 0;
        return;
      }
      for (const item of getParents(currentItem)) {
        if ((item as any).offsetParent) {
          item.tabIndex = 0;
          currentVisibleParent = item;
          break;
        }
      }
    });
  
    const setCurrentHref = (href: string) => {
      if (currentItem) {
        currentItem.removeAttribute("aria-current");
        currentItem.tabIndex = -1;
      }
      const el = map.get(href);
      if (!el) {
        currentItem = list[0];
        currentItem.tabIndex = 0;
        return;
      }
      for (const item of getParents(el)) item.setAttribute("aria-expanded", "true");
      el.setAttribute("aria-current", "page");
      el.tabIndex = 0;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      currentItem = el;
    };
  
    const acceptNode = (node: Node): number =>
      isTreeItem(node as HTMLElement) && (node as any).offsetParent
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
  
    const iter = document.createTreeWalker($toc, NodeFilter.SHOW_ELEMENT, { acceptNode });
    const getIter = (current: Node) => ((iter.currentNode = current), iter);
  
    for (const el of list) {
      el.addEventListener("keydown", (event: KeyboardEvent) => {
        let stop = false;
        const { currentTarget, key } = event;
        const target = currentTarget as HTMLElement;
        switch (key) {
          case " ":
          case "Enter":
            target.click();
            stop = true;
            break;
          case "ArrowDown":
            getIter(target).nextNode()?.dispatchEvent(new FocusEvent("focus"));
            stop = true;
            break;
          case "ArrowUp":
            getIter(target).previousNode()?.dispatchEvent(new FocusEvent("focus"));
            stop = true;
            break;
          case "ArrowLeft":
            if (target.getAttribute("aria-expanded") === "true")
              target.setAttribute("aria-expanded", "false");
            else (getParents(target).next().value as HTMLElement)?.focus();
            stop = true;
            break;
          case "ArrowRight":
            if (target.getAttribute("aria-expanded") === "true")
              (getIter(target).nextNode() as HTMLElement)?.focus();
            else if (target.getAttribute("aria-owns"))
              target.setAttribute("aria-expanded", "true");
            stop = true;
            break;
          case "Home":
            list[0].focus();
            stop = true;
            break;
          case "End": {
            const last = list[list.length - 1];
            if ((last as any).offsetParent) last.focus();
            else (getIter(last).previousNode() as HTMLElement)?.focus();
            stop = true;
            break;
          }
        }
        if (stop) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
    }
  
    return { element: $toc, setCurrentHref };
  };
  