// Assign unique IDs for each TOC item
const assignIDs = (toc: TOCItem[]): TOCItem[] => {
    let id = 0;
    const assignID = (item: TOCItem) => {
      (item as any).id = id++;
      if (item.subitems) for (const sub of item.subitems) assignID(sub);
    };
    for (const item of toc) assignID(item);
    return toc;
  };
  
  const flatten = (items: TOCItem[]): TOCItem[] =>
    items
      .map((item) =>
        item.subitems?.length ? [item, ...flatten(item.subitems)] : item
      )
      .flat();
  
  export interface TOCItem {
    href?: string;
    subitems?: TOCItem[];
    [key: string]: any;
  }
  
  export class TOCProgress {
    private ids: string[] = [];
    private map: Map<string, any> = new Map();
    private getFragment!: (doc: Document, fragment: string) => HTMLElement | null;
  
    async init({
      toc,
      ids,
      splitHref,
      getFragment,
    }: {
      toc: TOCItem[];
      ids: string[];
      splitHref: (href?: string) => Promise<[string, string] | null>;
      getFragment: (doc: Document, fragment: string) => HTMLElement | null;
    }) {
      assignIDs(toc);
      const items = flatten(toc);
      const grouped = new Map<
        string,
        { prev?: TOCItem; items: { fragment: string; item: TOCItem }[] }
      >();
  
      for (const [i, item] of items.entries()) {
        const [id, fragment] = (await splitHref(item?.href)) ?? [];
        if (!id) continue;
        const value = { fragment: fragment || '', item };
        if (grouped.has(id)) grouped.get(id)!.items.push(value);
        else grouped.set(id, { prev: items[i - 1], items: [value] });
      }
  
      const map = new Map();
      for (const [i, id] of ids.entries()) {
        if (grouped.has(id)) map.set(id, grouped.get(id));
        else map.set(id, map.get(ids[i - 1]));
      }
  
      this.ids = ids;
      this.map = map;
      this.getFragment = getFragment;
    }
  
    getProgress(index: number, range?: Range | null): TOCItem | null {
      if (!this.ids) return null;
      const id = this.ids[index];
      const obj = this.map.get(id);
      if (!obj) return null;
      const { prev, items } = obj;
      if (!items) return prev;
      if (!range || (items.length === 1 && !items[0].fragment))
        return items[0].item;
  
      const doc = range.startContainer.getRootNode() as Document;
      for (const [i, { fragment }] of items.entries()) {
        const el = this.getFragment(doc, fragment);
        if (!el) continue;
        if (range.comparePoint(el, 0) > 0) return items[i - 1]?.item ?? prev;
      }
      return items[items.length - 1].item;
    }
  }
  
  export class SectionProgress {
    private sizes: number[];
    private sizePerLoc: number;
    private sizePerTimeUnit: number;
    private sizeTotal: number;
    sectionFractions: number[];
  
    constructor(
      sections: { linear?: string; size: number }[],
      sizePerLoc: number,
      sizePerTimeUnit: number
    ) {
      this.sizes = sections.map((s) =>
        s.linear !== "no" && s.size > 0 ? s.size : 0
      );
      this.sizePerLoc = sizePerLoc;
      this.sizePerTimeUnit = sizePerTimeUnit;
      this.sizeTotal = this.sizes.reduce((a, b) => a + b, 0);
      this.sectionFractions = this.#getSectionFractions();
    }
  
    #getSectionFractions(): number[] {
      const { sizeTotal } = this;
      const results = [0];
      let sum = 0;
      for (const size of this.sizes) results.push((sum += size) / sizeTotal);
      return results;
    }
  
    getProgress(index: number, fractionInSection: number, pageFraction = 0) {
      const { sizes, sizePerLoc, sizePerTimeUnit, sizeTotal } = this;
      const sizeInSection = sizes[index] ?? 0;
      const sizeBefore = sizes.slice(0, index).reduce((a, b) => a + b, 0);
      const size = sizeBefore + fractionInSection * sizeInSection;
      const nextSize = size + pageFraction * sizeInSection;
      const remainingTotal = sizeTotal - size;
      const remainingSection = (1 - fractionInSection) * sizeInSection;
      return {
        fraction: nextSize / sizeTotal,
        section: { current: index, total: sizes.length },
        location: {
          current: Math.floor(size / sizePerLoc),
          next: Math.floor(nextSize / sizePerLoc),
          total: Math.ceil(sizeTotal / sizePerLoc),
        },
        time: {
          section: remainingSection / sizePerTimeUnit,
          total: remainingTotal / sizePerTimeUnit,
        },
      };
    }
  
    getSection(fraction: number): [number, number] {
      if (fraction <= 0) return [0, 0];
      if (fraction >= 1) return [this.sizes.length - 1, 1];
      fraction = fraction + Number.EPSILON;
      const { sizeTotal } = this;
      let index = this.sectionFractions.findIndex((x) => x > fraction) - 1;
      if (index < 0) return [0, 0];
      while (!this.sizes[index]) index++;
      const fractionInSection =
        (fraction - this.sectionFractions[index]) /
        (this.sizes[index] / sizeTotal);
      return [index, fractionInSection];
    }
  }
  