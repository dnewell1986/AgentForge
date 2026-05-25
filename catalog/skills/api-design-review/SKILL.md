# Skill: API Design Review

Evaluates a codebase against the platform API Design Standard and produces a structured compliance report.

## When to use this skill

Use this skill when asked to:
- Review or audit a service for API design compliance
- Score a service against the platform API Design Standard
- Identify gaps in API design
- Produce a compliance report

## What this skill covers

### Resource Naming
- Resources use plural nouns (`/users`, `/orders`)
- No verbs in resource paths (`/getUser` is non-compliant)
- Hierarchical relationships expressed via path nesting (`/users/{id}/orders`)
- Identifiers are opaque (`/users/abc123`, not `/users/1`)

### HTTP Methods
- `GET` — read, idempotent, no body
- `POST` — create or non-idempotent action
- `PUT` — full replacement, idempotent
- `PATCH` — partial update (RFC 7396 merge patch preferred)
- `DELETE` — removal, idempotent

### Request / Response Format
- `Content-Type: application/json` for all JSON endpoints
- Response envelopes: `{ "data": ..., "meta": ... }` for collections
- No null fields in responses — omit optional absent fields
- ISO 8601 for all dates/timestamps

### HTTP Status Codes
| Scenario | Code |
|---|---|
| Created | 201 with `Location` header |
| Accepted async | 202 |
| No content | 204 |
| Bad request | 400 |
| Unauthorised | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Conflict | 409 |
| Unprocessable | 422 |
| Server error | 500 |

### Error Handling
All error responses use RFC 9457 Problem Details:
```json
{
  "type": "https://example.com/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "detail": "The 'email' field is required.",
  "instance": "/users"
}
```

### Pagination
- Cursor-based preferred for large/real-time datasets
- Offset-based acceptable for small, stable datasets
- Response includes `meta.total`, `meta.page`, `meta.pageSize`, `links.next`, `links.prev`

### Versioning
- URI versioning: `/v1/users`
- Breaking changes require a new major version
- Old versions supported for minimum 12 months after deprecation notice

### OpenAPI Documentation
- OpenAPI 3.1 spec present and kept in sync with implementation
- All endpoints documented with request/response schemas
- Error responses documented
- Security schemes declared

### Security
- All endpoints require authentication unless explicitly public
- `Authorization: Bearer <token>` for authenticated requests
- Input validated and sanitised on the server
- No sensitive data in URLs (tokens, passwords)

### Performance
- `ETag` / `Last-Modified` headers on cacheable resources
- `Cache-Control` set appropriately
- Bulk endpoints for high-volume operations

## Output format

Produce a compliance report with:
1. **Summary** — overall compliance score (0–100)
2. **Findings** — per-category table of pass/fail/warning
3. **Issues** — specific non-compliant lines/endpoints with remediation steps
4. **Recommendations** — prioritised list of improvements
