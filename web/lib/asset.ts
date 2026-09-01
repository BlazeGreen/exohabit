// Prefix for static assets under public/ when the site is served from a
// sub-path (GitHub Pages). next/link and the router handle basePath on their
// own, but a raw fetch() to /data/... does not.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (p: string): string => `${BASE_PATH}${p}`;
