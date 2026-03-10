import { ITransformationProvider } from './ITransformationProvider.js';
import { IGraphDatabase } from '../database/index.js';

/**
 * 基于图数据库的变换提供者
 * 封装现有 Cypher 查询逻辑
 */
export class GraphTransformationProvider implements ITransformationProvider {
  constructor(private db: IGraphDatabase) {}

  async connect(): Promise<void> {
    await this.db.connect();
  }

  async disconnect(): Promise<void> {
    await this.db.disconnect();
  }

  async getTransformations(character: string, mode: string, operation: string): Promise<string[]> {
    // 在图数据库中，变换通过关系（边）表示
    // 查询从 character 节点出发，通过指定类型的关系到达的目标节点
    
    // 转义单引号以防止 SQL 注入风险
    const escapedChar = character.replace(/'/g, "\\'");
    const escapedMode = mode.replace(/'/g, "\\'");
    
    // 使用字符串插值而不是参数化查询，因为 RealmDB 适配器使用正则解析
    const cypher = `
      MATCH (a:Character {symbol: '${escapedChar}', mode: '${escapedMode}'})-[:${operation}]->(b:Character)
      RETURN b.symbol AS target
    `;
    
    const result = await this.db.query(cypher);
    
    if (!result.data || result.data.length === 0) {
      return [];
    }
    
    // 提取所有目标字符
    return result.data.map((row: any[]) => row[0]);
  }

  getProviderName(): string {
    return 'GraphTransformationProvider';
  }
}
