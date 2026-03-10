# 更新日志

本文档记录了 matchstick-solver-graph 项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

---

## [v0.4] - 2026-03-10

### 新增
- 🔬 **泛化 N 根火柴求解算法**：引入基于收支平衡模型（picked=N, placed=N, delta=0）的通用变换组合生成器，取代原有的特化实现
- 🎛️ **TransformationMetadata 模块**：集中定义所有变换操作元数据（MOVE_1/2, ADD_1/2, REMOVE_1/2, MOVE_SUB, MOVE_ADD），支持按 N 自动推导合法组合
- 🔢 **moveCount 泛化**：参数类型从 `1 | 2` 扩展为任意正整数，预留未来支持移动 N≥3 根的能力
- 🚫 **子移动解过滤**：移动 N 根时自动过滤掉移动少于 N 根即可得到的解，结果更精准
- 🧪 **新增测试文件**：添加 `test/benchmark.ts` 用于性能基准，`test/test-generalized-model.ts` 用于验证泛化求解器
- 🏗️ **Provider 抽象与内存后端**：引入 ITransformationProvider 接口，提供 GraphTransformationProvider 和 MemoryTransformationProvider，`DB_TYPE=memory` 为默认配置
- ⚡ **性能与可观测性优化**：弃用 `eval` 改用 AST 解释器，加入搜索空间剪枝、状态去重，返回观测指标（candidatesExplored、pruningHitRate、validationTimeRatio、cacheHitRate、provider）

### 改进
- 🗜️ **代码大幅精简**：solver.ts 从 1868 行削减至 ~700 行（减少 63%），删除 12 个特化 helper 方法
- ♻️ **组合去重**：`generateBalancedCombinations()` 对排列等价的组合去重（如 ADD_2+REMOVE_2 与 REMOVE_2+ADD_2 视为同一组合），N=2 组合数从 148 降至 9
- 🧹 **接口清理**：移除 `TransformationMetadata` 接口中冗余的 `operation` 字段

### 修复
- 🛠️ **parse-rules.ts 修复**：添加 ESM 主模块检测，`npm run parse-rules` 直接执行，import 时不触发副作用

---


## [v0.3] - 2026-03-02

### 新增
- ✨ **RealmDB 数据库支持**：添加 RealmDB 作为第三种数据库选项
  - 实现与统一数据库接口兼容的 `RealmDBAdapter`
  - RealmDB 是一种本地对象数据库，通过适配器层模拟图数据库行为
  - 适合快速开发、测试和小规模数据集
  - 无需额外数据库服务安装，开箱即用
- 📝 **环境变量配置扩展**：
  - 支持 `DB_TYPE=realmdb` 配置
  - 添加 `REALMDB_PATH` 配置选项（默认：`./data/matchstick.realm`）
- 📦 **新增依赖**
  - `realm`：Realm 数据库核心库
- 🧮 **移动2根算法增强**：
  - 新增 REMOVE_2 + ADD_1 + ADD_1 组合：移除两根 + 添加一根 + 添加一根
- ✨ **多数据库支持**：添加 AuraDB（Neo4j）作为可选图数据库
  - 实现数据库抽象层（`IGraphDatabase` 接口）
  - 创建 `FalkorDBAdapter` 和 `AuraDBAdapter` 适配器
  - 支持通过 `.env` 文件配置数据库类型
- 📝 **环境变量配置**：添加 `.env` 文件支持
  - 支持 `DB_TYPE`、`GRAPH_NAME`、`PORT` 等
  - FalkorDB 配置：`FALKORDB_URL`
  - AuraDB 配置：`AURADB_URI`、`AURADB_USERNAME`、`AURADB_PASSWORD`、`AURADB_DATABASE`
- 📦 **新增依赖**
  - `neo4j-driver`：官方 Neo4j 驱动（用于 AuraDB）
  - `dotenv`：环境变量加载器

### 改进
- 🏗️ **配置系统增强**
  - 更新 `config.ts` 支持 RealmDB 配置加载
  - 更新 `DatabaseType` 类型定义包含 `'realmdb'`
  - 增强配置打印功能，显示 RealmDB 路径信息
- 📖 **文档更新**
  - 更新 README 中英文版，添加数据库选择指南
  - 创建 `.env.example` 模板文件
  - 添加数据库性能对比说明
- 🎯 **数据库适配器优化**
  - RealmDB 适配器支持常用 Cypher 查询模式
  - 自动索引管理（通过 schema 定义）
- 🏗️ **架构重构**
  - 重构 `solver.ts` 中的 `solveMove1` 和 `solveMove2` 函数，拆分为更小函数
  - 将缓存构建逻辑提取为独立函数 `buildMove1Cache` 和 `buildMove2Cache`
  - 将各种变换组合拆分为独立 helper 函数（例如 `applyMove1Transforms`、`applyRemove1Add1Combination`、`applyDoubleRemove1Add1` 等）
  - 重构 `GraphBuilder` 和 `MatchstickSolver` 使用数据库适配器而非直接 Redis 客户端
  - 统一数据库查询接口，提高可维护性和可测试性
  - 更新测试文件 `check-graph.ts` 支持可配置数据库选择
- 🧪 **测试优化**
  - 将测试用例从 `test-solver.ts` 分离到独立 `cases.json` 文件

### 修复
- 🐛 **AuraDB 并发查询问题**
  - 修复 Neo4j Session 不支持并发事务导致的查询结果不完整问题
  - 为每个查询创建独立的 session，确保 `Promise.all` 并行查询正常工作
- 🐛 **Neo4j Integer 类型转换**
  - 修复 Neo4j 返回的 Integer 对象（`{low, high}`）未正确转换为 JavaScript number 的问题
  - 添加 `convertNeo4jValue` 方法处理 Neo4j 特殊类型（Integer、Date、DateTime、Point 等）

---

## [v0.2] - 2026-02-19

### 新增
- 添加了三种新的2根火柴变换方式
  - `moveSubThenAdd`: 移动1根 + 移除1根 + 添加1根（净-1根）
  - `moveAddThenSub`: 移动1根 + 添加1根 + 移除1根（净+1根）
  - `removeRemoveAdd2`: 移除2根 + 添加2根（净0根）
- 前端新增搜索上限输入框（1000-500000节点）
- 前端新增过滤正负号按钮，可过滤包含前导符号的解
- 规则页面（移动2根模式）新增两列：
  - "移1减1根得到..." (moveSub)
  - "移1加1根得到..." (moveAdd)
- 新增测试用例：94-35=48 和 1+7=8+8

### 改进
- 优化过滤逻辑，仅过滤开头或等号后的正负号（如 +8=8, 1+7=+8）
- 调整过滤按钮位置至搜索上限同一行
- 更新 i18n 翻译（moveSub, moveAdd, filterSigns）
- parse-rules.ts 自动解析 markdown 规则表第9和第10列
- graph-builder.ts 自动创建 MOVE_SUB 和 MOVE_ADD 有向边

### 修复
- 修正过滤按钮误过滤所有含加减号的表达式问题

---

## [v0.1] - 2026-02-18
