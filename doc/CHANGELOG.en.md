# Changelog

All notable changes to fast-matchstick-puzzle-solver are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [v0.4] - 2026-03-10

### Added
- 🔬 **Generalized N-match solver**: Introduced a universal transformation combination generator based on a balance model (picked=N, placed=N, delta=0), replacing all specialized implementations
- 🎛️ **TransformationMetadata module**: Centralized metadata for all transformation operations (MOVE_1/2, ADD_1/2, REMOVE_1/2, MOVE_SUB, MOVE_ADD) with automatic combination derivation for any N
- 🔢 **moveCount generalization**: Parameter type widened from `1 | 2` to any positive integer, laying the groundwork for future N≥3 support
- 🚫 **Sub-move solution filtering**: When solving for N moves, solutions reachable in fewer moves are automatically excluded for more precise results
- 🧪 **Test files added**: Included `test/benchmark.ts` for performance benchmarking and `test/test-generalized-model.ts` for validating the generalized solver
- 🏗️ **Provider abstraction & memory backend**: Introduced ITransformationProvider interface with GraphTransformationProvider and MemoryTransformationProvider; `DB_TYPE=memory` is now the default
- ⚡ **Performance & observability enhancements**: Replaced eval with AST interpreter, added search space pruning, state deduplication, and observability metrics (candidatesExplored, pruningHitRate, validationTimeRatio, cacheHitRate, provider)

### Improved
- 🗜️ **Major code reduction**: solver.ts shrunk from 1868 to ~700 lines (63% reduction) by removing 12 specialized helper methods
- ♻️ **Combination deduplication**: `generateBalancedCombinations()` treats permutation-equivalent combinations as identical (e.g. ADD_2+REMOVE_2 = REMOVE_2+ADD_2), reducing N=2 combinations from 148 to 9
- 🧹 **Interface cleanup**: Removed redundant `operation` field from `TransformationMetadata` interface

### Fixed
- 🛠️ **parse-rules.ts fix**: Added ESM main-module detection so `npm run parse-rules` executes directly without side effects on import

---

## [v0.3] - 2026-03-02

### Added
- ✨ **RealmDB Database Support**: Added RealmDB as the third database option
  - Implemented `RealmDBAdapter` compatible with the unified database interface
  - RealmDB is a local object database that simulates graph database behavior through an adapter layer
  - Ideal for rapid development, testing, and small-scale datasets
  - No additional database service installation required, ready to use out of the box
- 📝 **Environment Variable Configuration Extension**:
  - Support for `DB_TYPE=realmdb` configuration
  - Added `REALMDB_PATH` configuration option (default: `./data/matchstick.realm`)
- 📦 **New Dependencies**
  - `realm`: Realm database core library

### Improved
- 🏗️ **Configuration System Enhancement**
  - Updated `config.ts` to support RealmDB configuration loading
  - Updated `DatabaseType` type definition to include `'realmdb'`
  - Enhanced configuration printing to display RealmDB path information
- 📖 **Documentation Updates**
  - Updated README (both Chinese and English) with database selection guide
  - Created `.env.example` template file
  - Added database performance comparison notes
- 🎯 **Database Adapter Optimization**
  - RealmDB adapter supports common Cypher query patterns
  - Automatic index management (via schema definitions)

### Added
- 🧮 **Move-2 Algorithm Enhancement**:
  - Added REMOVE_2 + ADD_1 + ADD_1 combination: remove 2 matchsticks + add 1 matchstick + add 1 matchstick
- ✨ **Multi-Database Support**: Added AuraDB (Neo4j) as an optional graph database
  - Implemented database abstraction layer (`IGraphDatabase` interface)
  - Created `FalkorDBAdapter` and `AuraDBAdapter` adapters
  - Support database type configuration via `.env` file
- 📝 **Environment Variable Configuration**: Added `.env` file support
  - Supports `DB_TYPE`, `GRAPH_NAME`, `PORT`, etc.
  - FalkorDB config: `FALKORDB_URL`
  - AuraDB config: `AURADB_URI`, `AURADB_USERNAME`, `AURADB_PASSWORD`, `AURADB_DATABASE`
- 📦 **New Dependencies**
  - `neo4j-driver`: Official Neo4j driver (for AuraDB)
  - `dotenv`: Environment variable loader

### Improved
- 🏗️ **Architecture Refactoring**
  - Refactored `solveMove1` and `solveMove2` functions in `solver.ts`, splitting into smaller functions
  - Extracted cache building logic into standalone functions `buildMove1Cache` and `buildMove2Cache`
  - Split various transformation combinations into independent helper functions (e.g., `applyMove1Transforms`, `applyRemove1Add1Combination`, `applyDoubleRemove1Add1`, etc.)
  - Refactored `GraphBuilder` and `MatchstickSolver` to use database adapters instead of direct Redis client
  - Unified database query interface for better maintainability and testability
  - Updated test file `check-graph.ts` to support configurable database selection
- 🧪 **Test Optimization**
  - Separated test cases from `test-solver.ts` into standalone `cases.json` file

### Fixed
- 🐛 **AuraDB Concurrent Query Issue**
  - Fixed incomplete query results caused by Neo4j Session not supporting concurrent transactions
  - Each query now creates an independent session, ensuring `Promise.all` parallel queries work correctly
- 🐛 **Neo4j Integer Type Conversion**
  - Fixed Neo4j Integer objects (`{low, high}`) not being properly converted to JavaScript numbers
  - Added `convertNeo4jValue` method to handle Neo4j special types (Integer, Date, DateTime, Point, etc.)

---

## [v0.2] - 2026-02-19

### Added
- Three new 2-match transformation strategies:
  - `moveSubThenAdd`: Move 1 + Remove 1 + Add 1 (net -1 match)
  - `moveAddThenSub`: Move 1 + Add 1 + Remove 1 (net +1 match)
  - `removeRemoveAdd2`: Remove 2 + Add 2 (net 0 matches)
- Frontend search limit input (1000-500000 nodes)
- Frontend filter signs button to filter solutions with leading +/- signs
- Rules page (2-match mode) now shows two additional columns:
  - "Move 1 & Remove 1 to get..." (moveSub)
  - "Move 1 & Add 1 to get..." (moveAdd)
- New test cases: 94-35=48 and 1+7=8+8

### Improved
- Optimized filter logic to only filter leading signs (beginning or after =)
- Repositioned filter button to search limit row
- Updated i18n translations (moveSub, moveAdd, filterSigns)
- parse-rules.ts now parses columns 9 and 10 from markdown tables
- graph-builder.ts creates MOVE_SUB and MOVE_ADD directed edges

### Fixed
- Fixed filter button incorrectly filtering all equations with +/- operators

---

## [v0.1] - 2026-02-18
