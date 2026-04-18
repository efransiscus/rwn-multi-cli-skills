# [TODO: Endpoint / operation name] — API

<!--
Copy this file to `docs/api/<short-slug>.md`. One file per endpoint or
closely related group of endpoints. Keep the slug kebab-case.
-->

## Summary

[TODO: one sentence — what this endpoint does and who calls it.]

## Endpoint

| Field | Value |
|---|---|
| Method | [TODO: GET / POST / PUT / PATCH / DELETE] |
| Path | [TODO: `/api/v1/...`] |
| Auth | [TODO: Bearer JWT / API key / public] |

## Request

### Parameters

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| [TODO] | [TODO: path / query / header] | [TODO] | [TODO: yes / no] | [TODO] |

### Body

```json
[TODO: example request body, or "N/A" for GET/DELETE]
```

## Response

### Success (200)

```json
{
  "success": true,
  "data": [TODO: response shape]
}
```

## Errors

| Status | Meaning |
|---|---|
| 400 | [TODO: validation failure description] |
| 401 | [TODO: missing or invalid auth] |
| 404 | [TODO: resource not found] |
| 429 | [TODO: rate limit exceeded] |

## Examples

```bash
curl -X [TODO: METHOD] https://[TODO: host]/api/v1/[TODO: path] \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[TODO: body]'
```

```json
[TODO: example response]
```

## Notes

- [TODO: rate limits, idempotency keys, deprecation notices, pagination details]
