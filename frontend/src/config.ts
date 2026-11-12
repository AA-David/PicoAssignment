// Backend base URL, no trailing slash. Set VITE_API_URL at build time.
export const API_URL: string = (
    import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');
