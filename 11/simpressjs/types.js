/**
 * @typedef {import('http').IncomingMessage} IncomingMessage
 * @typedef {import('http').ServerResponse} ServerResponse
 * @typedef {import('querystring').ParsedUrlQuery} ParsedUrlQuery
 *
 * @typedef {{ body?: unknown }} RawBody
 * @typedef {{ pathParams?: Record<string, string> | null }} PathParams
 * @typedef {{ queryParams?: ParsedUrlQuery }} QueryParams
 * @typedef {IncomingMessage & { pathRegex: RegExp } & RawBody & PathParams & QueryParams} Request
 * @typedef {ServerResponse & { req: Request }} Response
 * @typedef {(req: Request, res: Response) => void | Promise<void>} RequestListener
 * @typedef {(req: Request, res: Response, next: (err?: unknown) => void) => void} Middleware
 * @typedef {(err: unknown, req: Request, res: Response, next: (err?: unknown) => void) => void} ErrorMiddleware
 */

export default {}; // module stub
