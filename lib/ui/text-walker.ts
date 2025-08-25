const walkRange = (range: Range, walker: TreeWalker): Node[] => {
    const nodes: Node[] = [];
    for (let node = walker.currentNode; node; node = walker.nextNode()!) {
      const compare = range.comparePoint(node, 0);
      if (compare === 0) nodes.push(node);
      else if (compare > 0) break;
    }
    return nodes;
  };
  
  const walkDocument = (_: any, walker: TreeWalker): Node[] => {
    const nodes: Node[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()!) {
      nodes.push(node);
    }
    return nodes;
  };
  
  const acceptNode = (node: Node): number => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const name = (node as HTMLElement).tagName.toLowerCase();
      if (name === "script" || name === "style") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_SKIP;
    }
    return NodeFilter.FILTER_ACCEPT;
  };
  
  export type MatchResult = {
    range: Range;
    [key: string]: any;
  };
  
  export function* textWalker(
    x: Range | Document | Node,
    func: (strs: (string | null)[], makeRange: (startIndex: number, startOffset: number, endIndex: number, endOffset: number) => Range) => MatchResult[],
    filterFunc?: (node: Node) => number
  ): Generator<MatchResult, void, unknown> {
    // Only access NodeFilter in browser environment
    if (typeof window === 'undefined') {
      throw new Error('textWalker can only be used in browser environment');
    }
    
    const filter = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_CDATA_SECTION;
    
    let root: Node;
    let nodes: Node[];
    
    if ('commonAncestorContainer' in x && x.commonAncestorContainer) {
      root = x.commonAncestorContainer;
      const walker = document.createTreeWalker(
        root,
        filter,
        { acceptNode: filterFunc || acceptNode } as unknown as NodeFilter
      );
      nodes = walkRange(x as Range, walker);
    } else if ('body' in x && x.body) {
      root = x.body;
      const walker = document.createTreeWalker(
        root,
        filter,
        { acceptNode: filterFunc || acceptNode } as unknown as NodeFilter
      );
      nodes = walkDocument(x as Document, walker);
    } else {
      root = x as Node;
      const walker = document.createTreeWalker(
        root,
        filter,
        { acceptNode: filterFunc || acceptNode } as unknown as NodeFilter
      );
      nodes = walkDocument(x as Document, walker);
    }
  
    const strs = nodes.map((node) => node.nodeValue);
  
    const makeRange = (startIndex: number, startOffset: number, endIndex: number, endOffset: number): Range => {
      const range = document.createRange();
      range.setStart(nodes[startIndex], startOffset);
      range.setEnd(nodes[endIndex], endOffset);
      return range;
    };
  
    for (const match of func(strs, makeRange)) {
      yield match;
    }
  }
  