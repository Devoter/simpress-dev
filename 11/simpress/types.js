/**
 * @typedef {import('http').IncomingMessage} IncomingMessage
 * @typedef {import('http').ServerResponse} ServerResponse
 * 
 * @typedef {(req: IncomingMessage, ServerResponse, next: (err?: unknown) => void)} Middleware
 * 
 * @typedef {(err: unknown, req: IncomingMessage, ServerResponse, next: (err?: unknown) => void)} ErrorMiddleware
 */