const createSVGElement = (tag: string): SVGElement =>
    document.createElementNS("http://www.w3.org/2000/svg", tag);
  
  type DrawFn = (rects: DOMRect[], options?: any) => SVGElement;
  
  export class Overlayer {
    #svg: SVGSVGElement = createSVGElement("svg") as SVGSVGElement;
    #map: Map<any, any> = new Map();
  
    constructor() {
      Object.assign(this.#svg.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      });
    }
  
    get element(): SVGSVGElement {
      return this.#svg;
    }
  
    add(key: string, range: Range | ((root: Node) => Range), draw: DrawFn, options?: any) {
      if (this.#map.has(key)) this.remove(key);
      if (typeof range === "function") range = range(this.#svg.getRootNode());
      const rects = (range as Range).getClientRects();
      const element = draw(Array.from(rects), options);
      this.#svg.append(element);
      this.#map.set(key, { range, draw, options, element, rects });
    }
  
    remove(key: string) {
      if (!this.#map.has(key)) return;
      this.#svg.removeChild(this.#map.get(key).element);
      this.#map.delete(key);
    }
  
    redraw() {
      for (const obj of this.#map.values()) {
        const { range, draw, options, element } = obj;
        this.#svg.removeChild(element);
        const rects = range.getClientRects();
        const el = draw(Array.from(rects), options);
        this.#svg.append(el);
        obj.element = el;
        obj.rects = rects;
      }
    }
  
    hitTest({ x, y }: { x: number; y: number }) {
      const arr = Array.from(this.#map.entries());
      for (let i = arr.length - 1; i >= 0; i--) {
        const [key, obj] = arr[i];
        for (const { left, top, right, bottom } of obj.rects)
          if (top <= y && left <= x && bottom > y && right > x)
            return [key, obj.range];
      }
      return [];
    }
  
      // static underline/strikethrough/squiggly/highlight/outline/copyImage remain unchanged
  static highlight(rects: DOMRect[], options: { color?: string } = {}) {
    const { color = "red" } = options;
    const g = createSVGElement("g");
    g.setAttribute("fill", color);
    g.style.opacity = "var(--overlayer-highlight-opacity, .3)";
    g.style.mixBlendMode = "var(--overlayer-highlight-blend-mode, normal)";
    for (const { left, top, height, width } of rects) {
      const el = createSVGElement("rect");
      el.setAttribute("x", left.toString());
      el.setAttribute("y", top.toString());
      el.setAttribute("height", height.toString());
      el.setAttribute("width", width.toString());
      g.append(el);
    }
    return g;
  }

  static outline(rects: DOMRect[], options: { color?: string; width?: number } = {}) {
    const { color = "blue", width = 2 } = options;
    const g = createSVGElement("g");
    g.setAttribute("stroke", color);
    g.setAttribute("stroke-width", width.toString());
    g.setAttribute("fill", "none");
    for (const { left, top, height, width: rectWidth } of rects) {
      const el = createSVGElement("rect");
      el.setAttribute("x", left.toString());
      el.setAttribute("y", top.toString());
      el.setAttribute("height", height.toString());
      el.setAttribute("width", rectWidth.toString());
      g.append(el);
    }
    return g;
  }
}
  