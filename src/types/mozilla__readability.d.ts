
declare module '@mozilla/readability' {
    import { JSDOM } from 'jsdom';

    export interface Article {
        title: string;
        content: string;
        textContent: string;
        length: number;
        excerpt: string;
        byline: string;
        dir: string;
        siteName: string;
        lang: string;
        publishedTime: string;
    }

    export class Readability {
        constructor(doc: Document | JSDOM['window']['document'], options?: any);
        parse(): Article | null;
    }
}
