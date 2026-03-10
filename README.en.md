# Matchstick Equation Solver - Graph Edition 

[ 中文](./README.md) | [ English](#)

**Version: v0.4**

---

A high-performance matchstick equation solver — a faster, backend-enabled cousin of [matchstick-puzzle-solver](https://github.com/8188/matchstick-puzzle-solver).

## Features

-  🗄️  **Multiple Database Support**: Flexible choice between Memory, FalkorDB, AuraDB (Neo4j), or RealmDB as storage engine
-  🔀  **Dual Modes**: Standard seven-segment mode + handwritten mode (`(n)H` syntax)
-  ✏️  **Custom Rules**: Online rule editing with persistence to the graph
-  🔧  **Generalized Move Algorithm**: Balance-model-based solver supporting 1 or 2 matchstick moves
-  🎨  **SVG Live Preview**: Real-time matchstick equation rendering as you type
-  ⚙️  **Advanced Syntax**: Supports `=+`, `=-`, leading sign expressions

## Quick Start

### Database Selection

#### Option 1: Using FalkorDB (Local)

```bash
# Start FalkorDB
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

#### Option 2: Using AuraDB (Cloud)

1. Visit [Neo4j AuraDB](https://neo4j.com/product/aura/) to create a free instance
2. Obtain connection credentials (URI, username, password)

#### Option 3: Using RealmDB (Local)

RealmDB is a local object database that requires no additional installation or configuration. Ideal for:
- Rapid development and testing
- Small-scale datasets
- Avoiding extra database service setup

**Note**: RealmDB is not a native graph database, so performance may be lower than FalkorDB/AuraDB, but it's sufficient for learning and small-scale use.
#### Option 4: Memory Mode

Use `DB_TYPE=memory` or omit `DB_TYPE` to run entirely in memory. No external database is needed, and startup/response are the fastest, making it the preferred choice for local testing.
### Install & Configure

```bash
git clone <repo-url>
cd fast-matchstick-puzzle-solver

# Install dependencies
npm install

# Configure database
cp .env.example .env
# Edit .env file, select database type and fill in connection details
```

### Initialize & Run

```bash
# If you edit Markdown rule sources, regenerate JSON and sync graph:
npm run parse-rules

# Initialize graph data (first time or after rule updates)
npm run init-graph

# Start backend server (default port 8080)
npm run dev

# Frontend: open frontend/index.html directly, or serve statically
npx http-server frontend -p 3000
```

Then visit: `http://localhost:3000/index.html`

## Project Structure (high level)

```
fast-matchstick-puzzle-solver/
├─ backend/       # API server, graph adapters, solver
├─ frontend/      # Static UI (index.html, assets, js)
├─ test/          # Integration and validation tests
├─ .env.example   # Environment template
└─ package.json
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/solve` | Solve equation |
| `GET` | `/api/rules/:mode` | Get transformation rules |
| `POST` | `/api/cache/clear` | Clear server-side cache |
| `GET` | `/api/cache/stats` | View cache statistics |

**Solve request example:**

```json
POST /api/solve
{
  "equation": "8+3-4=0",
  "mode": "standard",
  "moveCount": 1,
  "maxSolutions": 100
}
```

## Testing

>  Tests require the backend service and FalkorDB running simultaneously

```bash
npm test

# Test with cache cleared (measures real query speed)
npm test -- --no-cache
```

## Comparison with matchstick-puzzle-solver

| Feature | matchstick-puzzle-solver | fast-matchstick-puzzle-solver |
|---------|--------------------------|-------------------------|
| Architecture | Pure frontend | Frontend/backend, graph-backed service |
| Database | None (rules in-memory) | Memory / FalkorDB / AuraDB / RealmDB selectable |
| Rule Storage | JS objects / local cache | Graph nodes & edges persisted in DB |
| Query Method | Brute-force + pruning, with rule cache & generator-based lazy evaluation | Cypher graph queries + server-side cache |
| Scalability | Good for small-to-medium puzzles with optimized local solver | High — suitable for large rule-sets and dynamic rule updates |
| Configuration | In-code / runtime options | .env and server configuration |
| Deploy Complexity | Very low (static page) | Medium (requires database) |
| Testing | Pure frontend node script | HTTP API integration tests |

### Performance Notes

**Actual Test Results** (based on 32 test cases):
- **Memory mode**: ~280ms – Entirely in-process execution with zero DB overhead; fastest startup/response for local testing.
- **RealmDB**: ~450ms - Slightly faster than the others thanks to direct local object access and no network overhead; ideal for rapid development and small datasets.
- **FalkorDB**: ~550ms - Lightweight Redis graph database with excellent performance and true concurrent query support, recommended when simulating production or under higher load.
- **AuraDB**: >27s - Offers the same functionality but is slower due to Neo4j session management and network latency; the benefit is scalability and easy cloud deployment.

##  TODO List

- [ ] **Add test cases**: Expand integration and edge-case coverage
- [ ] **Polish UI**: Improve visuals and responsiveness
- [ ] **Expand architecture for N≥3**: solver already contains generalized model, complete rule set required
- [ ] **Continue optimizing performance**: improve pruning, caching and concurrency for faster responses

## Changelog

See changelog: [doc/CHANGELOG.en.md](doc/CHANGELOG.en.md)

## Screenshots

![index screenshot](frontend/assets/images/index.en.png)

## License

MIT License

## Acknowledgments

- Graph database support:
  - [FalkorDB](https://github.com/FalkorDB/FalkorDB) - Redis-based graph database
  - [Neo4j AuraDB](https://neo4j.com/product/auradb/) - Cloud-native graph database
  - [Realm](https://realm.io/) - Mobile-first local database

---
