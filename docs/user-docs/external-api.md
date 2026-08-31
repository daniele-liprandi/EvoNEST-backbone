# External API

The external API lets you pull data out of EvoNEST from scripts and other tools without a browser session. It is read-only and authenticated with a personal API key.

## What it is for

Programmatic export of a database's samples, traits, and experiments, for analysis pipelines, backups, or integration with other systems. It exposes the same records as the in-app export, in JSON.

## Security model

- The `/ext` routes are excluded from the session middleware, so they never see your login cookie. Every request is authenticated by API key instead.
- A key belongs to one user. It grants access only to the databases that user already has access to, and only to the database named in the request.
- Keys can carry an expiry date and can be deactivated. Each use updates the key's `lastUsedAt` and `usageCount`.
- Keys are read from the request headers, never logged in full.
- There is no rate limiting on these routes yet (tracked in #18). Until there is, treat a leaked key as full read access to your databases and rotate it.

## Getting a key

Create and manage keys from your user account settings. Each key has a name and an optional lifetime in days. The full key value is shown once, at creation. Store it somewhere safe.

## Endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/samples/ext` | Samples in the database |
| GET | `/api/traits/ext` | Trait measurements |
| GET | `/api/experiments/ext` | Experiments |

### Authentication

Pass the key in one of these headers:

```
Authorization: Bearer <your-api-key>
```
```
X-API-Key: <your-api-key>
```

The `apiKey` query parameter shown in the OpenAPI spec is not currently honoured; use a header.

### Common parameters

| Parameter | Endpoint | Meaning |
|-----------|----------|---------|
| `database` | all | Required. The database to export from. |
| `format` | all | Only `json` is supported. |
| `type` | samples, traits | Filter by record type. |
| `includeRelated` | samples, traits | Include the parent sample chain. |
| `includeSampleFeatures` | traits | Include fields from the associated sample. |
| `includeRawData` | experiments | Include raw experiment data. |
| `includeOriginalData` | traits | Include the original imported values. |

### Responses

| Status | Meaning |
|--------|---------|
| 200 | Records returned |
| 401 | Missing or invalid key, or the key cannot access that database |
| 404 | No matching records |
| 500 | Server error |

## Example

```bash
curl -H "Authorization: Bearer $EVONEST_API_KEY" \
  "https://your-evonest-host/api/samples/ext?database=my_lab&type=silk&includeRelated=true"
```

```python
import os, requests

r = requests.get(
    "https://your-evonest-host/api/traits/ext",
    headers={"X-API-Key": os.environ["EVONEST_API_KEY"]},
    params={"database": "my_lab", "includeSampleFeatures": "true"},
)
r.raise_for_status()
traits = r.json()
```

All tables come back in long format. See [Data Export](/user-docs/data-export) for reshaping notes.
