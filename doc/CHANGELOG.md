# 更新日志

本文档记录了 matchstick-solver-graph 项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

---



## [v0.3] - 2026-03-02

### 新增
- 🧮 **移动2根算法增强**：
  - 新增 REMOVE_2 + ADD_1 + ADD_1 组合：移除两根 + 添加一根 + 添加一根
- ✨ **多数据库支持**：支持 FalkorDB、AuraDB（Neo4j）和 RealmDB 三种图存储
  - 实现统一的 `IGraphDatabase` 抽象
  - 编写 `FalkorDBAdapter`、`AuraDBAdapter`、`RealmDBAdapter`
  - 支持通过 `.env` 文件选择数据库并配置连接参数
- 📝 **环境变量扩展**：
  - 新增 `DB_TYPE`、`GRAPH_NAME`、`PORT` 等
  - 添加 `REALMDB_PATH`（默认 `./data/matchstick.realm`）
- 📦 **新增依赖**
  - `realm`：Realm 本地数据库库（为 RealmDB 提供支持）
  - 其他新依赖：`neo4j-driver`（AuraDB）和 `dotenv` 之前已添加

### 改进
- 🏗️ **配置系统增强**
  - 更新 `config.ts` 支持 RealmDB 配置加载
  - 更新 `DatabaseType` 类型定义包含 `'realmdb'`
  - 完善配置打印功能，显示 RealmDB 路径信息
- 📖 **文档更新**
  - 更新 README 中英文版，添加 RealmDB 使用说明
  - 更新 `.env.example` 添加 RealmDB 配置示例
  - 新增数据库性能对比说明
- 🎯 **数据库适配器优化**
  - RealmDB 适配器支持常用 Cypher 查询模式
  - 自动索引管理（通过 schema 定义）



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
