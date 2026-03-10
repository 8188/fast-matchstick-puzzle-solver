import { ITransformationProvider } from './ITransformationProvider.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CharacterRule {
  character: string;
  matchsticks: number;
  mode: string;
  category: string;
  move1?: string[];
  add1?: string[];
  remove1?: string[];
  move2?: string[];
  add2?: string[];
  remove2?: string[];
  moveSub?: string[];
  moveAdd?: string[];
}

interface RuleSet {
  mode: string;
  version: string;
  characters: CharacterRule[];
}

/**
 * 基于内存的变换提供者
 * 启动时加载 backend/rules/*.json 到内存
 * 查询 O(1)，无数据库依赖
 */
export class MemoryTransformationProvider implements ITransformationProvider {
  private rules: Map<string, CharacterRule> = new Map();

  async connect(): Promise<void> {
    // 加载规则文件
    await this.loadRules();
  }

  async disconnect(): Promise<void> {
    // 清空内存
    this.rules.clear();
  }

  async getTransformations(character: string, mode: string, operation: string): Promise<string[]> {
    const key = this.makeKey(character, mode);
    const rule = this.rules.get(key);
    
    if (!rule) {
      return [];
    }

    const property = this.operationToProperty(operation);
    const targets = rule[property as keyof CharacterRule];
    
    return Array.isArray(targets) ? targets : [];
  }

  getProviderName(): string {
    return 'MemoryTransformationProvider';
  }

  private async loadRules(): Promise<void> {
    // 加载 standard.json 和 handwritten.json
    const rulesDir = path.join(process.cwd(), 'backend', 'rules');
    
    const standardPath = path.join(rulesDir, 'standard.json');
    const handwrittenPath = path.join(rulesDir, 'handwritten.json');

    try {
      // 加载 standard 规则
      const standardContent = await fs.readFile(standardPath, 'utf-8');
      const standardRules: RuleSet = JSON.parse(standardContent);
      
      for (const char of standardRules.characters) {
        const key = this.makeKey(char.character, 'standard');
        this.rules.set(key, char);
      }

      // 加载 handwritten 规则
      const handwrittenContent = await fs.readFile(handwrittenPath, 'utf-8');
      const handwrittenRules: RuleSet = JSON.parse(handwrittenContent);
      
      for (const char of handwrittenRules.characters) {
        const key = this.makeKey(char.character, 'handwritten');
        this.rules.set(key, char);
      }

      console.log(`✅ Loaded ${this.rules.size} character rules into memory`);
    } catch (error: any) {
      throw new Error(`Failed to load rules: ${error.message}`);
    }
  }

  private makeKey(character: string, mode: string): string {
    return `${character}:${mode}`;
  }

  private operationToProperty(operation: string): string {
    const mapping: Record<string, string> = {
      'MOVE_1': 'move1',
      'ADD_1': 'add1',
      'REMOVE_1': 'remove1',
      'MOVE_2': 'move2',
      'ADD_2': 'add2',
      'REMOVE_2': 'remove2',
      'MOVE_SUB': 'moveSub',
      'MOVE_ADD': 'moveAdd'
    };
    return mapping[operation] || 'move1';
  }
}
