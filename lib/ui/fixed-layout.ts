interface Viewport {
    width: string | number;
    height: string | number;
}

interface Frame {
    element: HTMLDivElement;
    iframe: HTMLIFrameElement;
    width?: number;
    height?: number;
    blank?: boolean;
    onZoom?: (params: { doc: Document; scale: number }) => void;
}

interface Spread {
    left?: any;
    right?: any;
    center?: any;
}

interface Book {
    dir?: string;
    sections: any[];
    rendition?: {
        spread?: string;
        viewport?: Viewport;
    };
}

interface Target {
    index: number;
    src?: string;
}

const parseViewport = (str: string): [string, string][] | undefined => str
    ?.split(/[,;\s]/) // NOTE: technically, only the comma is valid
    ?.filter(x => x)
    ?.map(x => x.split('=').map(x => x.trim()))
    ?.filter(x => x.length === 2) as [string, string][] | undefined

const getViewport = (doc: Document, viewport?: Viewport | string): Viewport => {
    // use `viewBox` for SVG
    if (doc.documentElement.localName === 'svg') {
        const [, , width, height] = doc.documentElement
            .getAttribute('viewBox')?.split(/\s/) ?? []
        return { width, height }
    }

    // get `viewport` `meta` element
    const meta = parseViewport(doc.querySelector('meta[name="viewport"]')
        ?.getAttribute('content') || '')
    if (meta) {
        const viewportObj: Record<string, string> = {}
        meta.forEach(([key, value]) => {
            viewportObj[key] = value
        })
        return viewportObj as unknown as Viewport
    }

    // fallback to book's viewport
    if (typeof viewport === 'string') {
        const parsed = parseViewport(viewport)
        if (parsed) {
            const viewportObj: Record<string, string> = {}
            parsed.forEach(([key, value]) => {
                viewportObj[key] = value
            })
            return viewportObj as unknown as Viewport
        }
        return { width: 1000, height: 2000 }
    }
    if (viewport?.width && viewport.height) return viewport

    // if no viewport (possibly with image directly in spine), get image size
    const img = doc.querySelector('img')
    if (img) return { width: img.naturalWidth, height: img.naturalHeight }

    // just show *something*, i guess...
    console.warn(new Error('Missing viewport properties'))
    return { width: 1000, height: 2000 }
}

export class FixedLayout extends HTMLElement {
    static observedAttributes = ['zoom']
    private _root = this.attachShadow({ mode: 'closed' })
    private _observer = new ResizeObserver(() => this._render())
    private _spreads: Spread[] = []
    private _index = -1
    defaultViewport?: Viewport
    spread?: string
    book?: Book
    rtl?: boolean
    private _portrait = false
    private _left: Frame | null = null
    private _right: Frame | null = null
    private _center: Frame | null = null
    private _side?: 'left' | 'right' | 'center'
    private _zoom?: number | 'fit-width' | 'fit-page'

    constructor() {
        super()

        const sheet = new CSSStyleSheet()
        this._root.adoptedStyleSheets = [sheet]
        sheet.replaceSync(`:host {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
        }`)

        this._observer.observe(this)
    }

    attributeChangedCallback(name: string, _: string | null, value: string | null) {
        switch (name) {
            case 'zoom':
                this._zoom = value !== 'fit-width' && value !== 'fit-page'
                    ? parseFloat(value || '1') : value
                this._render()
                break
        }
    }

    private async _createFrame({ index, src: srcOption }: { index: number; src: string | { src?: string; onZoom?: (params: { doc: Document; scale: number }) => void } }): Promise<Frame> {
        const srcOptionIsString = typeof srcOption === 'string'
        const src = srcOptionIsString ? srcOption : srcOption?.src
        const onZoom = srcOptionIsString ? undefined : srcOption?.onZoom
        const element = document.createElement('div')
        element.setAttribute('dir', 'ltr')
        const iframe = document.createElement('iframe')
        element.append(iframe)
        Object.assign(iframe.style, {
            border: '0',
            display: 'none',
            overflow: 'hidden',
        })
        // `allow-scripts` is needed for events because of WebKit bug
        // https://bugs.webkit.org/show_bug.cgi?id=218086
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts')
        iframe.setAttribute('scrolling', 'no')
        iframe.setAttribute('part', 'filter')
        this._root.append(element)
        if (!src) return { blank: true, element, iframe }
        return new Promise<Frame>(resolve => {
            iframe.addEventListener('load', () => {
                const doc = iframe.contentDocument!
                this.dispatchEvent(new CustomEvent('load', { detail: { doc, index } }))
                const { width, height } = getViewport(doc, this.defaultViewport)
                resolve({
                    element, iframe,
                    width: parseFloat(width.toString()),
                    height: parseFloat(height.toString()),
                    onZoom,
                })
            }, { once: true })
            iframe.src = src
        })
    }

    private _render(side = this._side) {
        if (!side) return
        const left = this._left ?? {}
        const right = this._center ?? this._right ?? {}
        const target = side === 'left' ? left : right
        const { width, height } = this.getBoundingClientRect()
        const portrait = this.spread !== 'both' && this.spread !== 'portrait'
            && height > width
        this._portrait = portrait
        const blankWidth = (left as Frame).width ?? (right as Frame).width ?? 0
        const blankHeight = (left as Frame).height ?? (right as Frame).height ?? 0

        const scale = typeof this._zoom === 'number' && !isNaN(this._zoom)
            ? this._zoom
            : (this._zoom === 'fit-width'
                ? (portrait || this._center
                    ? width / ((target as Frame).width ?? blankWidth)
                    : width / (((left as Frame).width ?? blankWidth) + ((right as Frame).width ?? blankWidth)))
                : (this._zoom === 'fit-page'
                    ? (portrait || this._center
                        ? Math.min(
                            width / ((target as Frame).width ?? blankWidth),
                            height / ((target as Frame).height ?? blankHeight))
                        : Math.min(
                            width / (((left as Frame).width ?? blankWidth) + ((right as Frame).width ?? blankWidth)),
                            height / Math.max(
                                (left as Frame).height ?? blankHeight,
                                (right as Frame).height ?? blankHeight)))
                    : 1)
            ) || 1

        const transform = (frame: Frame) => {
            let { element, iframe, width, height, blank, onZoom } = frame
            if (!iframe) return
            if (onZoom) onZoom({ doc: frame.iframe.contentDocument!, scale })
            const iframeScale = onZoom ? scale : 1
            Object.assign(iframe.style, {
                width: `${(width || 0) * iframeScale}px`,
                height: `${(height || 0) * iframeScale}px`,
                transform: onZoom ? 'none' : `scale(${scale})`,
                transformOrigin: 'top left',
                display: blank ? 'none' : 'block',
            })
            Object.assign(element.style, {
                width: `${((width ?? blankWidth) || 0) * scale}px`,
                height: `${((height ?? blankHeight) || 0) * scale}px`,
                overflow: 'hidden',
                display: 'block',
                flexShrink: '0',
                marginBlock: 'auto',
            })
            if (portrait && frame !== target) {
                element.style.display = 'none'
            }
        }
        if (this._center) {
            transform(this._center)
        } else {
            transform(left as Frame)
            transform(right as Frame)
        }
    }

    private async _showSpread({ left, right, center, side }: { left?: any; right?: any; center?: any; side?: 'left' | 'right' | 'center' }) {
        this._root.replaceChildren()
        this._left = null
        this._right = null
        this._center = null
        if (center) {
            this._center = await this._createFrame(center)
            this._side = 'center'
            this._render()
        } else {
            this._left = await this._createFrame(left)
            this._right = await this._createFrame(right)
            this._side = this._left.blank ? 'right'
                : this._right.blank ? 'left' : side
            this._render()
        }
    }

    private _goLeft(): boolean | undefined {
        if (this._center || this._left?.blank) return
        if (this._portrait && this._left?.element?.style?.display === 'none') {
            this._side = 'left'
            this._render()
            this._reportLocation('page')
            return true
        }
    }

    private _goRight(): boolean | undefined {
        if (this._center || this._right?.blank) return
        if (this._portrait && this._right?.element?.style?.display === 'none') {
            this._side = 'right'
            this._render()
            this._reportLocation('page')
            return true
        }
    }

    open(book: Book) {
        this.book = book
        const { rendition } = book
        this.spread = rendition?.spread
        this.defaultViewport = rendition?.viewport

        const rtl = book.dir === 'rtl'
        const ltr = !rtl
        this.rtl = rtl

        if (rendition?.spread === 'none')
            this._spreads = book.sections.map(section => ({ center: section }))
        else this._spreads = book.sections.reduce((arr: Spread[], section: any, i: number) => {
            const last = arr[arr.length - 1]
            const { pageSpread } = section
            const newSpread = () => {
                const spread: Spread = {}
                arr.push(spread)
                return spread
            }
            if (pageSpread === 'center') {
                const spread = last.left || last.right ? newSpread() : last
                spread.center = section
            }
            else if (pageSpread === 'left') {
                const spread = last.center || last.left || ltr && i ? newSpread() : last
                spread.left = section
            }
            else if (pageSpread === 'right') {
                const spread = last.center || last.right || rtl && i ? newSpread() : last
                spread.right = section
            }
            else if (ltr) {
                if (last.center || last.right) newSpread().left = section
                else if (last.left || !i) last.right = section
                else last.left = section
            }
            else {
                if (last.center || last.left) newSpread().right = section
                else if (last.right || !i) last.left = section
                else last.right = section
            }
            return arr
        }, [{}])
    }

    get index(): number {
        const spread = this._spreads[this._index]
        const section = spread?.center ?? (this._side === 'left'
            ? spread.left ?? spread.right : spread.right ?? spread.left)
        return this.book?.sections.indexOf(section) ?? -1
    }

    private _reportLocation(reason: string) {
        this.dispatchEvent(new CustomEvent('relocate', { detail:
            { reason, range: null, index: this.index, fraction: 0, size: 1 } }))
    }

    getSpreadOf(section: any): { index: number; side: 'left' | 'right' | 'center' } | undefined {
        const spreads = this._spreads
        for (let index = 0; index < spreads.length; index++) {
            const { left, right, center } = spreads[index]
            if (left === section) return { index, side: 'left' }
            if (right === section) return { index, side: 'right' }
            if (center === section) return { index, side: 'center' }
        }
    }

    async goToSpread(index: number, side: 'left' | 'right' | 'center', reason: string) {
        if (index < 0 || index > this._spreads.length - 1) return
        if (index === this._index) {
            this._render(side)
            return
        }
        this._index = index
        const spread = this._spreads[index]
        if (spread.center) {
            const index = this.book?.sections.indexOf(spread.center) ?? -1
            const src = await spread.center?.load?.()
            await this._showSpread({ center: { index, src } })
        } else {
            const indexL = this.book?.sections.indexOf(spread.left) ?? -1
            const indexR = this.book?.sections.indexOf(spread.right) ?? -1
            const srcL = await spread.left?.load?.()
            const srcR = await spread.right?.load?.()
            const left = { index: indexL, src: srcL }
            const right = { index: indexR, src: srcR }
            await this._showSpread({ left, right, side })
        }
        this._reportLocation(reason)
    }

    async select(target: any) {
        await this.goTo(target)
        // TODO
    }

    async goTo(target: Target) {
        const { book } = this
        if (!book) return
        const resolved = await target
        const section = book.sections[resolved.index]
        if (!section) return
        const spreadInfo = this.getSpreadOf(section)
        if (spreadInfo) {
            const { index, side } = spreadInfo
            await this.goToSpread(index, side, 'goto')
        }
    }

    async next() {
        const s = this.rtl ? this._goLeft() : this._goRight()
        if (!s) return this.goToSpread(this._index + 1, this.rtl ? 'right' : 'left', 'page')
    }

    async prev() {
        const s = this.rtl ? this._goRight() : this._goLeft()
        if (!s) return this.goToSpread(this._index - 1, this.rtl ? 'left' : 'right', 'page')
    }

    getContents() {
        return Array.from(this._root.querySelectorAll('iframe'), frame => ({
            doc: frame.contentDocument,
            // TODO: index, overlayer
        }))
    }

    destroy() {
        this._observer.unobserve(this)
    }
}

customElements.define('foliate-fxl', FixedLayout)