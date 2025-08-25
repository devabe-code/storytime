import * as CFI from "@/lib/reader/epubcfi.js";
import { TOCProgress, SectionProgress } from "@/lib/ui/progress";
import { Overlayer } from "@/lib/ui/overlayer";
import { textWalker } from "@/lib/ui/text-walker";

// ---------------- Types ----------------
interface Loader {
  loadText(name: string): Promise<string | null>;
  loadBlob(name: string, type?: string): Promise<Blob | null>;
  getSize(name: string): number;
  sha1: (name: string) => string;
}

interface BookSection {
  id: string;
  index?: number;
  linear?: string;
  mediaOverlay?: boolean;
  cfi?: string;
  createDocument?: () => Promise<Document>;
  resolveHref?: (href: string) => string;
}

interface Book {
  metadata?: { title?: string; author?: string; language?: string };
  toc?: any[];
  pageList?: any[];
  sections: BookSection[];
  dir?: "ltr" | "rtl";
  rendition?: { layout?: string };
  media?: { activeClass: string; playbackActiveClass?: string };
  getCover?: () => Promise<Blob | null>;
  getMediaOverlay?: () => any;
  landmarks?: { type: string[]; href: string }[];
  splitTOCHref?: (href: string) => string;
  getTOCFragment?: (href: string) => string;
  isExternal?: (href: string) => boolean;
  resolveHref?: (href: string) => any;
  resolveCFI?: (cfi: string) => any;
}

// ---------------- File Type Helpers ----------------
const SEARCH_PREFIX = "foliate-search:";

const isZip = async (file: File) => {
  const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return arr[0] === 0x50 && arr[1] === 0x4b && arr[2] === 0x03 && arr[3] === 0x04;
};

const isPDF = async (file: File) => {
  const arr = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46 && arr[4] === 0x2d;
};

const isCBZ = ({ name, type }: File) =>
  type === "application/vnd.comicbook+zip" || name.endsWith(".cbz");

const isFB2 = ({ name, type }: File) =>
  type === "application/x-fictionbook+xml" || name.endsWith(".fb2");

const isFBZ = ({ name, type }: File) =>
  type === "application/x-zip-compressed-fb2" || name.endsWith(".fb2.zip") || name.endsWith(".fbz");

// ---------------- Loader Factories ----------------
const makeZipLoader = async (file: File): Promise<Loader & { entries: any[] }> => {
  const { configure, ZipReader, BlobReader, TextWriter, BlobWriter } = await import("@/lib/formats/zip.js");
  configure({ useWebWorkers: false });
  const reader = new ZipReader(new BlobReader(file));
  const entries = await reader.getEntries();
  const map = new Map(entries.map((entry: any) => [entry.filename, entry]));
  const load = (f: Function) => (name: string, ...args: any[]) =>
    map.has(name) ? f(map.get(name), ...args) : null;
  const loadText = load((entry: any) => entry.getData(new TextWriter()));
  const loadBlob = load((entry: any, type: string) => entry.getData(new BlobWriter(type)));
  const getSize = (name: string) => map.get(name)?.uncompressedSize ?? 0;
  const sha1 = (name: string) => ''; // Placeholder implementation
  return { entries, loadText, loadBlob, getSize, sha1 };
};

const getFileEntries = async (entry: any): Promise<any[]> =>
  entry.isFile
    ? entry
    : (
        await Promise.all(
          Array.from(
            await new Promise<any[]>((resolve, reject) =>
              entry.createReader().readEntries(resolve, reject)
            ),
            getFileEntries
          )
        )
      ).flat();

const makeDirectoryLoader = async (entry: any): Promise<Loader> => {
  const entries = await getFileEntries(entry);
  const files = await Promise.all(
    entries.map(
      (entry) =>
        new Promise<[File, string]>((resolve, reject) =>
          entry.file((file: File) => resolve([file, entry.fullPath]), reject)
        )
    )
  );
  const map = new Map(files.map(([file, path]) => [path.replace(entry.fullPath + "/", ""), file]));
  const decoder = new TextDecoder();
  const decode = (x: ArrayBuffer | null) => (x ? decoder.decode(x) : null);
  const getBuffer = (name: string) => map.get(name)?.arrayBuffer() ?? null;
  const loadText = async (name: string) => decode(await getBuffer(name));
  const loadBlob = async (name: string) => map.get(name) ?? null;
  const getSize = (name: string) => map.get(name)?.size ?? 0;
  const sha1 = (name: string) => ''; // Placeholder implementation
  return { loadText, loadBlob, getSize, sha1 };
};

// ---------------- Errors ----------------
export class ResponseError extends Error {}
export class NotFoundError extends Error {}
export class UnsupportedTypeError extends Error {}

// ---------------- Fetch Helper ----------------
const fetchFile = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new ResponseError(`${res.status} ${res.statusText}`, { cause: res });
    const blob = await res.blob();
    const nameFromUrl = (() => {
      try {
        const u2 = new URL(res.url, (typeof window !== 'undefined' ? window.location.href : 'http://localhost/'));
        const p = u2.pathname || '';
        const base = p.split('/').pop() || '';
        return base || 'book.epub';
      } catch { return 'book.epub'; }
    })();
    return new File([blob], nameFromUrl);
  } catch (e: any) {
    // Check if this is a blob URL that failed to fetch (likely expired)
    if (url.startsWith('blob:')) {
      throw new NotFoundError('This uploaded book is not available after refresh. Please re-upload it.');
    }
    throw new ResponseError('Failed to fetch the book. Check your network or URL.', { cause: e });
  }
};

// ---------------- Book Loader ----------------
export const makeBook = async (file: File | string | any): Promise<Book> => {
  if (typeof file === "string") file = await fetchFile(file);
  let book: any;
  if (file.isDirectory) {
    const loader = await makeDirectoryLoader(file);
    const { EPUB } = await import("@/lib/formats/epub.js");
    book = await new EPUB(loader).init();
  } else if (!file.size) throw new NotFoundError("File not found");
  else if (await isZip(file)) {
    const loader = await makeZipLoader(file);
    if (isCBZ(file)) {
      const { makeComicBook } = await import("@/lib/formats/comic-book.js");
      book = makeComicBook(loader, file);
    } else if (isFBZ(file)) {
      const { makeFB2 } = await import("@/lib/formats/fb2.js");
      const { entries } = loader;
      const entry = entries.find((entry: any) => entry.filename.endsWith(".fb2"));
      const blob = await loader.loadBlob((entry ?? entries[0]).filename);
      book = await makeFB2(blob);
    } else {
      const { EPUB } = await import("@/lib/formats/epub.js");
      book = await new EPUB(loader).init();
    }
  } else if (await isPDF(file)) {
    const { makePDF } = await import("@/lib/formats/pdf.js");
    book = await makePDF(file);
  } else {
    const { isMOBI, MOBI } = await import("@/lib/formats/mobi.js");
    if (await isMOBI(file)) {
      const fflate = await import("@/lib/vendor/fflate.js");
      book = await new MOBI({ unzlib: fflate.unzlibSync }).open(file);
    } else if (isFB2(file)) {
      const { makeFB2 } = await import("@/lib/formats/fb2.js");
      book = await makeFB2(file);
    }
  }
  if (!book) throw new UnsupportedTypeError("File type not supported");
  return book;
};

// ---------------- View Class ----------------
// Only define CursorAutohider in browser environment
const CursorAutohiderClass = typeof HTMLElement !== 'undefined' ? class CursorAutohider {
  #timeout: any;
  #el: HTMLElement;
  #check: () => boolean;
  #state: any;
  constructor(el: HTMLElement, check: () => boolean, state: any = {}) {
    this.#el = el;
    this.#check = check;
    this.#state = state;
    if (this.#state.hidden) this.hide();
    this.#el.addEventListener(
      "mousemove",
      ({ screenX, screenY }) => {
        if (screenX === this.#state.x && screenY === this.#state.y) return;
        this.#state.x = screenX;
        this.#state.y = screenY;
        this.show();
        if (this.#timeout) clearTimeout(this.#timeout);
        if (check()) this.#timeout = setTimeout(this.hide.bind(this), 1000);
      },
      false
    );
  }
  cloneFor(el: HTMLElement) {
    return new CursorAutohiderClass(el, this.#check, this.#state);
  }
  hide() {
    this.#el.style.cursor = "none";
    this.#state.hidden = true;
  }
  show() {
    this.#el.style.removeProperty("cursor");
    this.#state.hidden = false;
  }
} : class CursorAutohider {};

class History extends EventTarget {
  #arr: any[] = [];
  #index = -1;
  pushState(x: any) {
    const last = this.#arr[this.#index];
    if (last === x || (last?.fraction && last.fraction === x.fraction)) return;
    this.#arr[++this.#index] = x;
    this.#arr.length = this.#index + 1;
    this.dispatchEvent(new Event("index-change"));
  }
  replaceState(x: any) {
    this.#arr[this.#index] = x;
  }
  back() {
    if (this.#index <= 0) return;
    const detail = { state: this.#arr[this.#index - 1] };
    this.#index -= 1;
    this.dispatchEvent(new CustomEvent("popstate", { detail }));
    this.dispatchEvent(new Event("index-change"));
  }
  forward() {
    if (this.#index >= this.#arr.length - 1) return;
    const detail = { state: this.#arr[this.#index + 1] };
    this.#index += 1;
    this.dispatchEvent(new CustomEvent("popstate", { detail }));
    this.dispatchEvent(new Event("index-change"));
  }
  get canGoBack() {
    return this.#index > 0;
  }
  get canGoForward() {
    return this.#index < this.#arr.length - 1;
  }
  clear() {
    this.#arr = [];
    this.#index = -1;
  }
}

const languageInfo = (lang?: string) => {
  if (!lang) return {};
  try {
    const canonical = Intl.getCanonicalLocales(lang)[0];
    const locale = new Intl.Locale(canonical);
    const isCJK = ["zh", "ja", "kr"].includes(locale.language);
    const direction = (locale as any).textInfo?.direction;
    return { canonical, locale, isCJK, direction };
  } catch (e) {
    console.warn(e);
    return {};
  }
};

// Only define the View class in browser environment
const ViewClass = typeof HTMLElement !== 'undefined' ? class View extends HTMLElement {
  #root: ShadowRoot = this.attachShadow({ mode: "closed" });
  book!: Book;
  renderer: any;
  language: any;
  history = new History();
  isFixedLayout = false;
  lastLocation: any;
  tts: any;
  mediaOverlay: any;
  #sectionProgress: SectionProgress | null = null;
  #tocProgress: TOCProgress | null = null;
  #pageProgress: TOCProgress | null = null;
  #searchResults = new Map();

  #cursorAutohider: any = new CursorAutohiderClass(this, () =>
    this.hasAttribute("autohide-cursor")
  );

  constructor() {
    super();
    this.history.addEventListener("popstate", ({ detail }: any) => {
      const resolved = this.resolveNavigation(detail.state);
      this.renderer.goTo(resolved);
    });
  }

  async open(book: any) {
    if (typeof book === "string" || typeof book.arrayBuffer === "function" || book.isDirectory)
      book = await makeBook(book);
    this.book = book;
    this.language = languageInfo(book.metadata?.language);
    if (book.splitTOCHref && book.getTOCFragment) {
        const ids = book.sections.map((s: any) => s.id);
        this.#sectionProgress = new SectionProgress(book.sections, 1500, 1600);
        const splitHref = book.splitTOCHref.bind(book);
        const getFragment = book.getTOCFragment.bind(book);
        this.#tocProgress = new TOCProgress();
        await this.#tocProgress.init({
            toc: book.toc ?? [], ids, splitHref, getFragment });
        this.#pageProgress = new TOCProgress();
        await this.#pageProgress.init({
            toc: book.pageList ?? [], ids, splitHref, getFragment });
    }

    this.isFixedLayout = this.book.rendition?.layout === 'pre-paginated';
    if (this.isFixedLayout) {
        await import('@/lib/ui/fixed-layout');
        this.renderer = document.createElement('foliate-fxl');
    } else {
        await import('@/lib/ui/paginator.js');
        this.renderer = document.createElement('foliate-paginator');
    }
    this.renderer.setAttribute('exportparts', 'head,foot,filter');
    this.renderer.addEventListener('load', (e: any) => this.#onLoad(e.detail));
    this.renderer.addEventListener('relocate', (e: any) => this.#onRelocate(e.detail));
    this.renderer.addEventListener('create-overlayer', (e: any) =>
        e.detail.attach(this.#createOverlayer(e.detail)));
    this.renderer.open(book);
    this.#root.append(this.renderer);

    if (book.sections.some((section: any) => section.mediaOverlay)) {
        const activeClass = book.media.activeClass;
        const playbackActiveClass = book.media.playbackActiveClass;
        this.mediaOverlay = book.getMediaOverlay();
        let lastActive: any;
        this.mediaOverlay.addEventListener('highlight', (e: any) => {
            const resolved = this.resolveNavigation(e.detail.text);
            this.renderer.goTo(resolved)
                .then(() => {
                    const { doc } = this.renderer.getContents()
                        .find((x: any) => x.index = resolved.index);
                    const el = resolved.anchor(doc);
                    el.classList.add(activeClass);
                    if (playbackActiveClass) el.ownerDocument
                        .documentElement.classList.add(playbackActiveClass);
                    lastActive = new WeakRef(el);
                });
        });
        this.mediaOverlay.addEventListener('unhighlight', () => {
            const el = lastActive?.deref();
            if (el) {
                el.classList.remove(activeClass);
                if (playbackActiveClass) el.ownerDocument
                    .documentElement.classList.remove(playbackActiveClass);
            }
        });
    }
  }

  close() {
    this.renderer?.destroy();
    this.renderer?.remove();
    this.#sectionProgress = null;
    this.#tocProgress = null;
    this.#pageProgress = null;
    this.#searchResults = new Map();
    this.lastLocation = null;
    this.history.clear();
    this.tts = null;
    this.mediaOverlay = null;
  }

  goToTextStart() {
    return this.goTo(this.book.landmarks
        ?.find(m => m.type.includes('bodymatter') || m.type.includes('text'))
        ?.href ?? this.book.sections.findIndex(s => s.linear !== 'no'));
  }

  async init({ lastLocation, showTextStart }: { lastLocation?: any; showTextStart?: boolean }) {
    const resolved = lastLocation ? this.resolveNavigation(lastLocation) : null;
    if (resolved) {
        await this.renderer.goTo(resolved);
        this.history.pushState(lastLocation);
    }
    else if (showTextStart) await this.goToTextStart();
    else {
        this.history.pushState(0);
        await this.next();
    }
  }

  #emit(name: string, detail: any, cancelable: boolean) {
    return this.dispatchEvent(new CustomEvent(name, { detail, cancelable }));
  }

  #onRelocate({ reason, range, index, fraction, size }: any) {
    const progress = this.#sectionProgress?.getProgress(index, fraction, size) ?? {};
    const tocItem = this.#tocProgress?.getProgress(index, range);
    const pageItem = this.#pageProgress?.getProgress(index, range);
    const cfi = this.getCFI(index, range);
    this.lastLocation = { ...progress, tocItem, pageItem, cfi, range };
    if (reason === 'snap' || reason === 'page' || reason === 'scroll')
        this.history.replaceState(cfi);
    this.#emit('relocate', this.lastLocation, false);
  }

  #onLoad({ doc, index }: any) {
    // set language and dir if not already set
    doc.documentElement.lang ||= this.language.canonical ?? '';
    if (!this.language.isCJK)
        doc.documentElement.dir ||= this.language.direction ?? '';

    this.#handleLinks(doc, index);
    this.#cursorAutohider.cloneFor(doc.documentElement);

    this.#emit('load', { doc, index }, false);
  }

  #handleLinks(doc: Document, index: number) {
    const { book } = this;
    const section = book.sections[index];
    doc.addEventListener('click', (e: any) => {
        const a = e.target?.closest('a[href]');
        if (!a) return;
        e.preventDefault();
        const href_ = a.getAttribute('href');
        const href = section?.resolveHref?.(href_) ?? href_;
        if (book?.isExternal?.(href))
            Promise.resolve(this.#emit('external-link', { a, href }, true))
                .then(x => x ? globalThis.open(href, '_blank') : null)
                .catch(e => console.error(e));
        else Promise.resolve(this.#emit('link', { a, href }, true))
            .then(x => x ? this.goTo(href) : null)
            .catch(e => console.error(e));
    });
  }

  async addAnnotation(annotation: any, remove?: boolean) {
    const { value } = annotation;
    if (value.startsWith(SEARCH_PREFIX)) {
        const cfi = value.replace(SEARCH_PREFIX, '');
        const { index, anchor } = await this.resolveNavigation(cfi);
        const obj = this.#getOverlayer(index);
        if (obj) {
            const { overlayer, doc } = obj;
            if (remove) {
                overlayer.remove(value);
                return;
            }
            const range = doc ? anchor(doc) : anchor;
            overlayer.add(value, range, Overlayer.outline);
        }
        return;
    }
    const { index, anchor } = await this.resolveNavigation(value);
    const obj = this.#getOverlayer(index);
    if (obj) {
        const { overlayer, doc } = obj;
        overlayer.remove(value);
        if (!remove) {
            const range = doc ? anchor(doc) : anchor;
            const draw = (func: any, opts: any) => overlayer.add(value, range, func, opts);
            this.#emit('draw-annotation', { draw, annotation, doc, range }, false);
        }
    }
    const label = this.#tocProgress?.getProgress(index)?.label ?? '';
    return { index, label };
  }

  deleteAnnotation(annotation: any) {
    return this.addAnnotation(annotation, true);
  }

  #getOverlayer(index: number) {
    return this.renderer.getContents()
        .find((x: any) => x.index === index && x.overlayer);
  }

  #createOverlayer({ doc, index }: any) {
    const overlayer = new Overlayer();
    doc.addEventListener('click', (e: any) => {
        const [value, range] = overlayer.hitTest(e);
        if (value && !value.startsWith(SEARCH_PREFIX)) {
            this.#emit('show-annotation', { value, index, range }, false);
        }
    }, false);

    const list = this.#searchResults.get(index);
    if (list) for (const item of list) this.addAnnotation(item);

    this.#emit('create-overlay', { index }, false);
    return overlayer;
  }

  async showAnnotation(annotation: any) {
    const { value } = annotation;
    const resolved = await this.goTo(value);
    if (resolved) {
        const { index, anchor } = resolved;
        const obj = this.#getOverlayer(index);
        if (obj) {
            const { doc } = obj;
            const range = anchor(doc);
            this.#emit('show-annotation', { value, index, range }, false);
        }
    }
  }

  getCFI(index: number, range?: Range) {
    const baseCFI = this.book.sections[index].cfi ?? CFI.fake.fromIndex(index);
    if (!range) return baseCFI;
    return CFI.joinIndir(baseCFI, CFI.fromRange(range));
  }

  resolveCFI(cfi: string) {
    if (this.book.resolveCFI)
        return this.book.resolveCFI(cfi);
    else {
        const parts = CFI.parse(cfi);
        const index = CFI.fake.toIndex((parts.parent ?? parts).shift());
        const anchor = (doc: Document) => CFI.toRange(doc, parts);
        return { index, anchor };
    }
  }

  resolveNavigation(target: any) {
    try {
        if (typeof target === 'number') return { index: target };
        if (typeof target.fraction === 'number') {
            const [index, anchor] = this.#sectionProgress?.getSection(target.fraction) ?? [];
            return { index, anchor };
        }
        if (CFI.isCFI.test(target)) return this.resolveCFI(target);
        return this.book.resolveHref?.(target);
    } catch (e) {
        console.error(e);
        console.error(`Could not resolve target ${target}`);
    }
  }

  async goTo(target: any) {
    const resolved = this.resolveNavigation(target);
    try {
        await this.renderer.goTo(resolved);
        this.history.pushState(target);
        return resolved;
    } catch(e) {
        console.error(e);
        console.error(`Could not go to ${target}`);
    }
  }

  async goToFraction(frac: number) {
    const [index, anchor] = this.#sectionProgress?.getSection(frac) ?? [];
    await this.renderer.goTo({ index, anchor });
    this.history.pushState({ fraction: frac });
  }

  async select(target: any) {
    try {
        const obj = await this.resolveNavigation(target);
        await this.renderer.goTo({ ...obj, select: true });
        this.history.pushState(target);
    } catch(e) {
        console.error(e);
        console.error(`Could not go to ${target}`);
    }
  }

  deselect() {
    for (const { doc } of this.renderer.getContents())
        doc.defaultView.getSelection().removeAllRanges();
  }

  getSectionFractions() {
    return (this.#sectionProgress?.sectionFractions ?? [])
        .map(x => x + Number.EPSILON);
  }

  getProgressOf(index: number, range?: Range) {
    const tocItem = this.#tocProgress?.getProgress(index, range);
    const pageItem = this.#pageProgress?.getProgress(index, range);
    return { tocItem, pageItem };
  }

  async getTOCItemOf(target: any) {
    try {
        const { index, anchor } = await this.resolveNavigation(target);
        const createDoc = this.book.sections[index]?.createDocument;
        if (!createDoc) return;
        const doc = await createDoc();
        const frag = anchor(doc);
        const isRange = frag instanceof Range;
        const range = isRange ? frag : doc.createRange();
        if (!isRange) range.selectNodeContents(frag);
        return this.#tocProgress?.getProgress(index, range);
    } catch(e) {
        console.error(e);
        console.error(`Could not get ${target}`);
    }
  }

  async prev(distance?: number) {
    await this.renderer.prev(distance);
  }

  async next(distance?: number) {
    await this.renderer.next(distance);
  }

  goLeft() {
    return this.book.dir === 'rtl' ? this.next() : this.prev();
  }

  goRight() {
    return this.book.dir === 'rtl' ? this.prev() : this.next();
  }

  async * #searchSection(matcher: any, query: string, index: number) {
            const createDoc = this.book.sections[index]?.createDocument;
            if (!createDoc) return;
            const doc = await createDoc();
    for (const { range, excerpt } of matcher(doc, query))
        yield { cfi: this.getCFI(index, range), excerpt };
  }

  async * #searchBook(matcher: any, query: string) {
    const { sections } = this.book;
    for (const [index, { createDocument }] of sections.entries()) {
        if (!createDocument) continue;
        const doc = await createDocument();
        const subitems = Array.from(matcher(doc, query), ({ range, excerpt }: any) =>
            ({ cfi: this.getCFI(index, range), excerpt }));
        const progress = (index + 1) / sections.length;
        yield { progress };
        if (subitems.length) yield { index, subitems };
    }
  }

  async * search(opts: any) {
    this.clearSearch();
    const { searchMatcher } = await import('@/lib/ui/search');
    const { query, index } = opts;
    const matcher = searchMatcher(textWalker,
        { defaultLocale: this.language, ...opts });
    const iter = index != null
        ? this.#searchSection(matcher, query, index)
        : this.#searchBook(matcher, query);

    const list: any[] = [];
    this.#searchResults.set(index, list);

    for await (const result of iter) {
        if ('subitems' in result && result.subitems){
            const list = result.subitems
                .map(({ cfi }: any) => ({ value: SEARCH_PREFIX + cfi }));
            this.#searchResults.set(result.index, list);
            for (const item of list) this.addAnnotation(item);
            yield {
                label: this.#tocProgress?.getProgress(result.index)?.label ?? '',
                subitems: result.subitems,
            };
        }
        else if ('cfi' in result && result.cfi) {
            const item = { value: SEARCH_PREFIX + result.cfi };
            list.push(item);
            this.addAnnotation(item);
            yield result;
        }
        else {
            yield result;
        }
    }
    yield 'done';
  }

  clearSearch() {
    for (const list of this.#searchResults.values())
        for (const item of list) this.deleteAnnotation(item);
    this.#searchResults.clear();
  }

  async initTTS(granularity = 'word', highlight?: any) {
    const doc = this.renderer.getContents()[0].doc;
    if (this.tts && this.tts.doc === doc) return;
    const { TTS } = await import('@/lib/reader/tts.js');
    this.tts = new TTS(doc, textWalker, highlight || ((range: Range) =>
        this.renderer.scrollToAnchor(range, true)), granularity);
  }

  startMediaOverlay() {
    const { index } = this.renderer.getContents()[0];
    return this.mediaOverlay.start(index);
  }
} : class View {};

// Export the classes
export { ViewClass as View, CursorAutohiderClass as CursorAutohider };

// Only register the custom element in browser environment
if (typeof HTMLElement !== 'undefined') {
  customElements.define("foliate-view", ViewClass as any);
}
