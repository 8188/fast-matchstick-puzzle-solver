import Realm from 'realm';
import { IGraphDatabase, QueryResult, GraphStats } from './IGraphDatabase';

/**
 * Character node schema for Realm
 */
class CharacterNode extends Realm.Object<CharacterNode> {
  id!: string;  // 复合主键: symbol_mode
  symbol!: string;
  mode!: string;

  static schema: Realm.ObjectSchema = {
    name: 'CharacterNode',
    primaryKey: 'id',
    properties: {
      id: 'string',
      symbol: 'string',
      mode: 'string',
    },
  };
}

/**
 * Relationship edge schema for Realm
 */
class Relationship extends Realm.Object<Relationship> {
  id!: string;
  type!: string;
  from!: string;
  to!: string;

  static schema: Realm.ObjectSchema = {
    name: 'Relationship',
    primaryKey: 'id',
    properties: {
      id: 'string',
      type: 'string',
      from: 'string',
      to: 'string',
    },
  };
}

/**
 * RealmDB 数据库适配器
 * 使用 Realm 本地数据库模拟图数据库行为
 * 
 * 注意：Realm 不是原生图数据库，此适配器将图查询转换为对象查询
 * 适用于本地开发和小规模数据集
 */
export class RealmDBAdapter implements IGraphDatabase {
  private realm: Realm | null = null;
  private graphName: string;

  constructor(
    private realmPath: string,
    graphName: string = 'matchstick'
  ) {
    this.graphName = graphName;
  }

  async connect(): Promise<void> {
    this.realm = await Realm.open({
      path: this.realmPath,
      schema: [CharacterNode, Relationship],
      schemaVersion: 2,
    });
    console.log('✅ Connected to RealmDB');
  }

  async disconnect(): Promise<void> {
    if (this.realm && !this.realm.isClosed) {
      this.realm.close();
      this.realm = null;
    }
  }

  /**
   * 解析简化版 Cypher 查询并执行
   * 支持的查询模式：
   * - MATCH (n) DETACH DELETE n
   * - MATCH (n) RETURN count(n) as count
   * - MATCH ()-[r]->() RETURN count(r) as count
   * - CREATE (:Character {symbol: $symbol, mode: $mode})
   * - MERGE (c:Character {symbol: 'value', mode: 'mode'}) SET c.matchsticks = N, c.category = 'cat'
   * - MATCH (a:Character {symbol: $from}), (b:Character {symbol: $to}) CREATE (a)-[:TYPE]->(b)
   * - MATCH (a), (b) MERGE (a)-[:TYPE]->(b)
   * - MATCH (a), (b) MERGE (a)-[:TYPE]->(b) MERGE (b)-[:TYPE]->(a)
   * - MATCH (c:Character {symbol: $symbol, mode: $mode}) RETURN c
   * - MATCH (a:Character {symbol: 'value', mode: 'mode'})-[:TYPE]->(b:Character) RETURN b.symbol as target
   */
  async query(cypher: string, params: any = {}): Promise<QueryResult> {
    if (!this.realm) {
      throw new Error('Realm not initialized. Call connect() first.');
    }

    const cypherUpper = cypher.trim().toUpperCase();

    // MATCH (n) DETACH DELETE n
    if (cypherUpper.includes('DETACH DELETE')) {
      this.realm.write(() => {
        this.realm!.delete(this.realm!.objects('CharacterNode'));
        this.realm!.delete(this.realm!.objects('Relationship'));
      });
      return { data: [] };
    }

    // MATCH (n) RETURN count(n) as count
    // MATCH (c:Character) RETURN count(c) as count
    if ((cypherUpper.includes('MATCH (N)') || cypherUpper.includes('MATCH (C:CHARACTER)')) && 
        cypherUpper.includes('COUNT(') && !cypherUpper.includes('{')) {
      const count = this.realm.objects('CharacterNode').length;
      return { data: [[count]] };
    }

    // MATCH (c:Character {mode: 'mode'}) RETURN count(c) as count
    // 按mode条件统计节点数
    if (cypherUpper.includes('MATCH (C:CHARACTER') && cypherUpper.includes('COUNT(C)') && cypherUpper.includes('{MODE:')) {
      const modeMatch = cypher.match(/mode:\s*'([^']+)'/i);
      if (modeMatch) {
        const mode = modeMatch[1];
        const nodes = this.realm.objects('CharacterNode').filtered('mode == $0', mode);
        return { data: [[nodes.length]] };
      }
      return { data: [[0]] };
    }

    // MATCH ()-[r]->() RETURN count(r) as count
    if (cypherUpper.includes('MATCH ()-[R]->()') && cypherUpper.includes('COUNT(R)')) {
      const count = this.realm.objects('Relationship').length;
      return { data: [[count]] };
    }

    // MERGE (c:Character {symbol: 'value', mode: 'mode'}) SET c.matchsticks = N, c.category = 'cat'
    // 创建或更新节点
    if (cypherUpper.includes('MERGE (') && cypherUpper.includes(':CHARACTER') && cypherUpper.includes('SET ')) {
      const symbolMatch = cypher.match(/symbol:\s*'([^']+)'/i);
      const modeMatch = cypher.match(/mode:\s*'([^']+)'/i);
      const matchsticksMatch = cypher.match(/matchsticks\s*=\s*(\d+)/i);
      const categoryMatch = cypher.match(/category\s*=\s*'([^']+)'/i);
      
      if (symbolMatch && modeMatch) {
        const symbol = symbolMatch[1];
        const mode = modeMatch[1];
        const matchsticks = matchsticksMatch ? parseInt(matchsticksMatch[1]) : 0;
        const category = categoryMatch ? categoryMatch[1] : '';
        
        const nodeId = `${symbol}_${mode}`;
        
        this.realm.write(() => {
          const existing = this.realm!.objectForPrimaryKey('CharacterNode', nodeId);
          if (!existing) {
            // 创建新节点
            this.realm!.create('CharacterNode', {
              id: nodeId,
              symbol,
              mode,
            });
          }
        });
      }
      return { data: [] };
    }

    // CREATE (:Character {symbol: $symbol, mode: $mode})
    if (cypherUpper.startsWith('CREATE (:CHARACTER')) {
      const nodeId = `${params.symbol}_${params.mode}`;
      this.realm.write(() => {
        const existing = this.realm!.objectForPrimaryKey('CharacterNode', nodeId);
        if (!existing) {
          this.realm!.create('CharacterNode', {
            id: nodeId,
            symbol: params.symbol,
            mode: params.mode,
          });
        }
      });
      return { data: [] };
    }

    // MATCH (a:Character {...}), (b:Character {...}) MERGE (a)-[:TYPE]->(b)
    // MATCH (a:Character {...}), (b:Character {...}) MERGE (a)-[:TYPE]->(b) MERGE (b)-[:TYPE]->(a)
    // 创建关系（双向或单向）
    if ((cypherUpper.includes('MERGE (A)-[') || cypherUpper.includes('MERGE (B)-[')) && 
        cypherUpper.includes('MATCH (A:CHARACTER') && cypherUpper.includes('MATCH (B:CHARACTER')) {
      
      // 提取symbol和mode
      const aSymbolMatch = cypher.match(/MATCH\s*\(a:Character\s*\{\s*symbol:\s*'([^']+)'/i);
      const aModeMatch = cypher.match(/MATCH\s*\(a:Character\s*\{[^}]*mode:\s*'([^']+)'/i);
      const bSymbolMatch = cypher.match(/MATCH\s*\(b:Character\s*\{\s*symbol:\s*'([^']+)'/i);
      const bModeMatch = cypher.match(/MATCH\s*\(b:Character\s*\{[^}]*mode:\s*'([^']+)'/i);
      
      // 提取关系类型
      const relTypeMatch = cypher.match(/MERGE\s*\([ab]\)-\[:(\w+)\]->\([ab]\)/i);
      
      if (aSymbolMatch && bSymbolMatch && relTypeMatch) {
        const aSymbol = aSymbolMatch[1];
        const bSymbol = bSymbolMatch[1];
        const aMode = aModeMatch ? aModeMatch[1] : '';
        const bMode = bModeMatch ? bModeMatch[1] : '';
        const relType = relTypeMatch[1];
        
        // 检查是否是双向关系
        const isBidirectional = cypher.match(/MERGE\s*\(b\)-\[:(\w+)\]->\(a\)/i);
        
        // console.log(`Creating relationship: ${aSymbol} -[${relType}]-> ${bSymbol}, bidirectional: ${!!isBidirectional}`);
        
        this.realm.write(() => {
          // 创建 a -> b 关系
          // 使用完整的节点ID（包含mode）来创建关系ID
          const relId1 = `${aSymbol}_${aMode}_${relType}_${bSymbol}_${bMode}`;
          const existing1 = this.realm!.objectForPrimaryKey('Relationship', relId1);
          if (!existing1) {
            this.realm!.create('Relationship', {
              id: relId1,
              type: relType,
              from: aSymbol,
              to: bSymbol,
            });
          }
          
          // 如果是双向关系，创建 b -> a 关系
          if (isBidirectional) {
            const relId2 = `${bSymbol}_${bMode}_${relType}_${aSymbol}_${aMode}`;
            const existing2 = this.realm!.objectForPrimaryKey('Relationship', relId2);
            if (!existing2) {
              this.realm!.create('Relationship', {
                id: relId2,
                type: relType,
                from: bSymbol,
                to: aSymbol,
              });
            }
          }
        });
      }
      return { data: [] };
    }

    // MATCH (a:Character {symbol: $from}), (b:Character {symbol: $to}) CREATE (a)-[r:TYPE]->(b)
    if (cypherUpper.includes('CREATE (A)-[') && params.from && params.to && params.type) {
      const relId = `${params.from}_${params.type}_${params.to}`;
      this.realm.write(() => {
        const existing = this.realm!.objectForPrimaryKey('Relationship', relId);
        if (!existing) {
          this.realm!.create('Relationship', {
            id: relId,
            type: params.type,
            from: params.from,
            to: params.to,
          });
        }
      });
      return { data: [] };
    }

    // MATCH (c:Character {symbol: $symbol, mode: $mode}) RETURN c
    if (cypherUpper.includes('MATCH (C:CHARACTER') && cypherUpper.includes('RETURN C') && !cypherUpper.includes('->')) {
      const nodes = this.realm.objects('CharacterNode')
        .filtered('symbol == $0 AND mode == $1', params.symbol, params.mode);
      return {
        data: nodes.map(n => [{ symbol: n.symbol, mode: n.mode }])
      };
    }

    // MATCH (a:Character {symbol: 'value', mode: 'mode'})-[:TYPE]->(b:Character) RETURN b.symbol as target
    // 或 RETURN b (返回整个节点)
    // 这种查询使用字符串插值而非参数化，需要从查询字符串中提取值
    if (cypherUpper.includes('CHARACTER') && cypherUpper.includes(']->(') && 
        (cypherUpper.includes('RETURN B.SYMBOL') || cypherUpper.includes('RETURN B'))) {
      
      // 提取关系类型
      const relType = this.extractRelationType(cypher);
      
      // 提取symbol和mode的值（从字符串中解析）
      const symbolMatch = cypher.match(/symbol:\s*'([^']+)'/i);
      const modeMatch = cypher.match(/mode:\s*'([^']+)'/i);
      
      if (!symbolMatch) {
        console.warn(`⚠️  Could not extract symbol from query: ${cypher}`);
        return { data: [] };
      }
      
      const symbol = symbolMatch[1];
      const mode = modeMatch ? modeMatch[1] : undefined;
      
      if (!mode) {
        console.warn(`⚠️  Could not extract mode from query: ${cypher}`);
        return { data: [] };
      }
      
      // 关系ID格式：${from}_${fromMode}_${type}_${to}_${toMode}
      // 由于symbol可能包含下划线，我们需要使用前缀匹配而不是split
      const relationshipPrefix = `${symbol}_${mode}_${relType || ''}`;
      
      // 获取所有关系并手动过滤
      const allRelationships = this.realm.objects('Relationship');
      const results: any[][] = [];
      
      for (const rel of allRelationships) {
        // 检查关系是否以正确的 from_mode_type 开头
        // 关系ID格式：from_fromMode_type_to_toMode
        // 我们需要检查它是否匹配 symbol_mode_type
        if (!rel.id.startsWith(relationshipPrefix + '_')) {
          continue;
        }
        
        // 从关系ID中提取目标部分
        // 去掉前缀，剩余部分是 to_toMode
        const remainingPart = rel.id.substring(relationshipPrefix.length + 1); // +1 for the underscore
        
        // 剩余部分应该是 to_toMode
        // 最后一个下划线分隔的是 mode
        const lastUnderscoreIndex = remainingPart.lastIndexOf('_');
        if (lastUnderscoreIndex === -1) continue;
        
        const targetSymbol = remainingPart.substring(0, lastUnderscoreIndex);
        const targetMode = remainingPart.substring(lastUnderscoreIndex + 1);
        
        // 使用复合ID查找目标节点
        const targetNodeId = `${targetSymbol}_${targetMode}`;
        const targetNode = this.realm.objectForPrimaryKey('CharacterNode', targetNodeId);
        
        if (targetNode) {
          // 根据返回字段决定返回内容
          if (cypherUpper.includes('RETURN B.SYMBOL')) {
            results.push([targetNode.symbol]);
          } else {
            results.push([{ symbol: targetNode.symbol, mode: targetNode.mode }]);
          }
        }
      }
      return { data: results };
    }

    // 默认返回空结果
    console.warn(`⚠️  Unsupported Cypher query pattern: ${cypher}`);
    return { data: [] };
  }

  /**
   * 从 Cypher 查询中提取关系类型
   * 支持多种格式：-[r:TYPE]->、-[:TYPE]->、-[a:TYPE]->等
   */
  private extractRelationType(cypher: string): string {
    const match = cypher.match(/-\[(?:\w+)?:(\w+)\]->/i);
    return match ? match[1] : '';
  }

  async clearGraph(): Promise<void> {
    try {
      await this.query('MATCH (n) DETACH DELETE n');
      console.log('🗑️  Cleared existing graph data');
    } catch (error) {
      console.log('ℹ️  No existing graph to clear (this is normal on first run)');
    }
  }

  async getStats(): Promise<GraphStats> {
    const nodeResult = await this.query('MATCH (n) RETURN count(n) as count');
    const relResult = await this.query('MATCH ()-[r]->() RETURN count(r) as count');
    
    const nodeCount = nodeResult.data[0]?.[0] || 0;
    const relationshipCount = relResult.data[0]?.[0] || 0;

    return {
      nodeCount,
      relationshipCount
    };
  }

  async createIndexes(): Promise<void> {
    // Realm 自动为主键创建索引
    // 对于其他字段，可以在 schema 中定义索引
    console.log('📇 RealmDB indexes are automatically managed via schema');
  }
}
