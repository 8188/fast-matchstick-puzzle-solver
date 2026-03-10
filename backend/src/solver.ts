import { ITransformationProvider } from './providers/index.js';
import { ExpressionEvaluator } from './utils/ExpressionEvaluator.js';
import { 
  MAX_SUPPORTED_MOVE_COUNT, 
  isMoveCountSupported,
  getRecommendedCombinations,
  TransformationCombination,
  TRANSFORMATION_METADATA 
} from './utils/TransformationMetadata.js';

export interface SolveOptions {
  equation: string;
  mode: 'standard' | 'handwritten';
  moveCount: number;  // 支持任意正整数，当前限制 <= MAX_SUPPORTED_MOVE_COUNT
  maxSolutions?: number;
}

export interface Solution {
  equation: string;
  changes: Change[];
}

export interface Change {
  position: number;
  from: string;
  to: string;
  operation: string;
}

export interface SolveResult {
  solutions: Solution[];
  executionTime: number;
  candidatesExplored: number;
  method: string;
  provider: string;
  // 性能指标
  cacheHitRate?: number;  // 缓存命中率
  validationTimeMs?: number;  // 验证总耗时
  transformationCacheSize?: number;  // 转换缓存大小
  validationCacheSize?: number;  // 验证缓存大小
  uniqueTokensCount?: number;  // 唯一token数量
}

/**
 * MatchstickSolver — 基于变换提供者的火柴棒求解器实现。
 * 提供：字符串分词、变换查询、穷举验证和结果去重；包含本地缓存以提高性能。
 */
export class MatchstickSolver {
  private transformationCache = new Map<string, string[]>();
  private validationCache = new Map<string, boolean>();
  
  // 性能统计
  private cacheHits = 0;
  private cacheMisses = 0;
  private validationTimeMs = 0;
  
  constructor(private provider: ITransformationProvider) {}
  
  /**
   * 连接到数据源
   */
  async connect(): Promise<void> {
    await this.provider.connect();
  }
  
  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }
  
  /**
   * 清除本地缓存（transformationCache 与 validationCache）
   */
  clearAllCaches(): void {
    this.transformationCache.clear();
    this.validationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.validationTimeMs = 0;
  }
  
  /**
   * 返回缓存统计信息（转换缓存与验证缓存的大小）
   */
  getCacheStats(): { transformationCacheSize: number; validationCacheSize: number } {
    return {
      transformationCacheSize: this.transformationCache.size,
      validationCacheSize: this.validationCache.size
    };
  }
  
  /**
   * 主求解入口
   * 流程：规范化输入 → 生成分词变体 → 使用 MOVE_1 / MOVE_2 策略求解 → 去重/过滤 → 返回结果和统计信息
   */
  async solve(options: SolveOptions): Promise<SolveResult> {
    const startTime = performance.now();

    // 验证 moveCount 参数
    if (!isMoveCountSupported(options.moveCount)) {
      throw new Error(
        `不支持的移动数量: ${options.moveCount}。` +
        `当前仅支持 1 到 ${MAX_SUPPORTED_MOVE_COUNT} 根火柴的移动。` +
        `支持 N>=${MAX_SUPPORTED_MOVE_COUNT + 1} 需要扩展规则集与组合模型。`
      );
    }

    // 将手写标记中的小写 h 归一化为大写 H（例如 "(1)h" -> "(1)H"）
    const equation = (options.equation || '').replace(/(\(\d+\))h/gi, '$1H');

    // 清除上一次求解留下的验证缓存和统计数据
    this.validationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.validationTimeMs = 0;

    // 生成分词变体（处理 '11' 的二义性）
    const tokenVariants = this.getAllTokenizeVariants(equation, options.mode);
    
    // 收集所有分词变体产生的候选解
    const allSolutions: Solution[] = [];
    let totalCandidatesExplored = 0;
    
    for (const tokens of tokenVariants) {
      let results;
      
      // 根据 moveCount 分发到不同的求解策略
      // 使用泛化的 solveMoveN 求解任意 N 根火柴
      results = await this.solveMoveN(tokens, options.mode, options.moveCount);
      
      allSolutions.push(...results.solutions);
      totalCandidatesExplored += results.candidatesExplored;
    }
    
    // 对候选解进行去重
    const dedupedSolutions = this.dedup(allSolutions);
    
    // 过滤掉与原始等式等价或无效的解（保留真正的变换结果）
    const solutions = this.filterOriginal(dedupedSolutions, equation);
    
    // 根据 maxSolutions（若传入）限制返回的解的数量
    const limitedSolutions = options.maxSolutions 
      ? solutions.slice(0, options.maxSolutions)
      : solutions;
    
    const executionTime = performance.now() - startTime;
    
    // 计算缓存命中率
    const totalCacheAccess = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheAccess > 0 ? this.cacheHits / totalCacheAccess : 0;
    
    // 统计唯一token数量
    const uniqueTokens = new Set<string>();
    for (const tokens of tokenVariants) {
      tokens.forEach(t => uniqueTokens.add(t));
    }
    
    return {
      solutions: limitedSolutions,
      executionTime,
      candidatesExplored: totalCandidatesExplored,
      method: 'Transformation Provider',
      provider: this.provider.getProviderName(),
      cacheHitRate,
      validationTimeMs: this.validationTimeMs,
      transformationCacheSize: this.transformationCache.size,
      validationCacheSize: this.validationCache.size,
      uniqueTokensCount: uniqueTokens.size
    };
  }
  
  /**
   * 生成所有可能的分词变体（解决连续 '1' 的二义性，例如 '111'）
   */
  private getAllTokenizeVariants(equation: string, mode: string): string[][] {
    const variants: string[][] = [];
    
    // 默认分词（优先识别 '11'）
    variants.push(this.tokenize(equation, mode));
    
    // 若存在连续的 '1'（例如 '111'），生成备用分词变体以覆盖边界歧义
    if (/1{3,}/.test(equation)) {
      // 使用备用分词策略以产生不同的分词边界
      const altTokens = this.tokenizeAlternative(equation, mode);
      const defaultStr = JSON.stringify(variants[0]);
      const altStr = JSON.stringify(altTokens);
      if (altStr !== defaultStr) {
        variants.push(altTokens);
      }
    }
    
    return variants;
  }
  
  /**
   * 备用分词策略：处理连续 '1' 的歧义（例如 '111'）
   */
  private tokenizeAlternative(equation: string, mode: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    
    while (i < equation.length) {
      // 手写模式下优先识别 (11)H 与 (n)H
      if (mode === 'handwritten') {
        if (i + 5 <= equation.length && equation.substring(i, i + 5).match(/\(\d\d\)H/i)) {
          tokens.push(equation.substring(i, i + 5));
          i += 5;
          continue;
        }
        if (i + 4 <= equation.length && equation.substring(i, i + 4).match(/\(\d\)H/i)) {
          tokens.push(equation.substring(i, i + 4));
          i += 4;
          continue;
        }
      }
      
      // 处理连续 '1' 的特殊情况，改变切分边界以覆盖不同解析
      if (equation[i] === '1' && i + 1 < equation.length && equation[i + 1] === '1') {
        const nextNext = i + 2 < equation.length ? equation[i + 2] : '';
        if (nextNext === '1') {
          // 遇到 '111' 时，优先分割为 ['1','11']（作为一种变体）
          tokens.push('1');
          i++;
        } else {
          // 将 '11' 作为单一 token
          tokens.push('11');
          i += 2;
        }
      } else if (equation[i] !== ' ') {
        const ch = equation[i] === '*' || equation[i] === '×' ? 'x' : equation[i];
        tokens.push(ch);
        i++;
      } else {
        i++;
      }
    }
    
    return tokens;
  }
  
  /**
   * 泛化的火柴移动求解器 - 支持移动任意 N 根火柴
   * 使用收支平衡模型自动生成所有可能的变换组合。
   * 结果会过滤掉移动少于 N 根即可得到的解（避免与低阶结果重叠）。
   */
  private async solveMoveN(
    tokens: string[],
    mode: string,
    N: number
  ): Promise<{ solutions: Solution[], candidatesExplored: number }> {
    // 收集 N-1 根可达的解，用于后续过滤
    let subSolutionEquations = new Set<string>();
    if (N > 1) {
      const subResult = await this.solveMoveN(tokens, mode, N - 1);
      for (const s of subResult.solutions) {
        subSolutionEquations.add(s.equation.replace(/ /g, ''));
      }
    }

    const solutions: Solution[] = [];
    let candidatesExplored = 0;
    
    const combinations = getRecommendedCombinations(N);
    const transformCache = await this.buildTransformCache(tokens, mode, combinations);
    
    for (const combination of combinations) {
      const combResults = await this.applyCombination(tokens, mode, combination, transformCache);
      solutions.push(...combResults.solutions);
      candidatesExplored += combResults.candidatesExplored;
    }
    
    // 过滤掉移动更少根火柴即可得到的等价解
    const filtered = N > 1
      ? this.dedup(solutions).filter(s => !subSolutionEquations.has(s.equation.replace(/ /g, '')))
      : this.dedup(solutions);

    return { solutions: filtered, candidatesExplored };
  }
  
  /**
   * 为给定的变换组合构建缓存
   */
  private async buildTransformCache(
    tokens: string[],
    mode: string,
    combinations: TransformationCombination[]
  ): Promise<Map<string, Map<string, string[]>>> {
    const cache = new Map<string, Map<string, string[]>>();
    const uniqueTokens = [...new Set(tokens), ' '];
    
    // 收集所有需要的操作类型
    const neededOps = new Set<string>();
    for (const combo of combinations) {
      for (const op of combo.operations) {
        neededOps.add(op);
      }
    }
    
    // 为每个操作类型构建缓存
    for (const op of neededOps) {
      const opCache = new Map<string, string[]>();
      
      for (const token of uniqueTokens) {
        const normalizedToken = token === ' ' ? 'SPACE' : token;
        const targets = await this.getTransformations(normalizedToken, mode, op);
        opCache.set(token, targets);
      }
      
      cache.set(op, opCache);
    }
    
    return cache;
  }
  
  /**
   * 应用一个具体的变换组合到等式上
   */
  private async applyCombination(
    tokens: string[],
    mode: string,
    combination: TransformationCombination,
    transformCache: Map<string, Map<string, string[]>>
  ): Promise<{ solutions: Solution[], candidatesExplored: number }> {
    const solutions: Solution[] = [];
    let candidatesExplored = 0;
    
    // 递归应用所有操作
    const applyOperations = (
      currentTokens: string[],
      currentChanges: Change[],
      operationIndex: number
    ) => {
      // 所有操作都已应用完毕
      if (operationIndex >= combination.operations.length) {
        candidatesExplored++;
        
        // 清理空格和空字符串
        const cleaned = currentTokens.filter(t => t !== ' ' && t !== '');
        
        // 快速语法检查
        if (!this.quickSyntaxCheck(cleaned)) return;
        
        // 验证是否为合法等式
        if (this.isValidEquation(cleaned)) {
          solutions.push({
            equation: cleaned.join(''),
            changes: [...currentChanges]
          });
        }
        return;
      }
      
      const operation = combination.operations[operationIndex];
      const opCache = transformCache.get(operation);
      
      if (!opCache) {
        // 未找到该操作的缓存，跳过
        return;
      }
      
      const metadata = TRANSFORMATION_METADATA[operation];
      
      // 根据操作类型选择不同的应用策略
      if (metadata.picked > 0 && metadata.placed > 0) {
        // MOVE 类操作（MOVE_1, MOVE_2, MOVE_SUB, MOVE_ADD）
        this.applyMoveOperation(
          currentTokens, currentChanges, operationIndex,
          operation, opCache, applyOperations
        );
      } else if (metadata.picked > 0 && metadata.placed === 0) {
        // REMOVE 类操作（REMOVE_1, REMOVE_2）
        this.applyRemoveOperation(
          currentTokens, currentChanges, operationIndex,
          operation, opCache, applyOperations
        );
      } else if (metadata.picked === 0 && metadata.placed > 0) {
        // ADD 类操作（ADD_1, ADD_2）
        this.applyAddOperation(
          currentTokens, currentChanges, operationIndex,
          operation, opCache, applyOperations
        );
      }
    };
    
    // 从第一个操作开始递归应用
    applyOperations(tokens, [], 0);
    
    return { solutions, candidatesExplored };
  }
  
  /**
   * 应用 MOVE 类操作（在某个位置替换 token）
   */
  private applyMoveOperation(
    tokens: string[],
    changes: Change[],
    operationIndex: number,
    operation: string,
    opCache: Map<string, string[]>,
    applyOperations: (tokens: string[], changes: Change[], index: number) => void
  ) {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const transformations = opCache.get(token);
      
      if (!transformations || transformations.length === 0) continue;
      
      for (const target of transformations) {
        const newTokens = [...tokens];
        newTokens[i] = target;
        
        const newChanges = [...changes, {
          position: i,
          from: token,
          to: target,
          operation
        }];
        
        applyOperations(newTokens, newChanges, operationIndex + 1);
      }
    }
  }
  
  /**
   * 应用 REMOVE 类操作（移除某个 token 的火柴）
   */
  private applyRemoveOperation(
    tokens: string[],
    changes: Change[],
    operationIndex: number,
    operation: string,
    opCache: Map<string, string[]>,
    applyOperations: (tokens: string[], changes: Change[], index: number) => void
  ) {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const transformations = opCache.get(token);
      
      if (!transformations || transformations.length === 0) continue;
      
      for (const target of transformations) {
        const newTokens = [...tokens];
        newTokens[i] = target;
        
        const newChanges = [...changes, {
          position: i,
          from: token,
          to: target,
          operation
        }];
        
        applyOperations(newTokens, newChanges, operationIndex + 1);
      }
    }
  }
  
  /**
   * 应用 ADD 类操作（在某个 token 上添加火柴，或插入新 token）
   */
  private applyAddOperation(
    tokens: string[],
    changes: Change[],
    operationIndex: number,
    operation: string,
    opCache: Map<string, string[]>,
    applyOperations: (tokens: string[], changes: Change[], index: number) => void
  ) {
    // 策略1: 在现有 token 位置添加火柴
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const transformations = opCache.get(token);
      
      if (!transformations || transformations.length === 0) continue;
      
      for (const target of transformations) {
        const newTokens = [...tokens];
        newTokens[i] = target;
        
        const newChanges = [...changes, {
          position: i,
          from: token,
          to: target,
          operation
        }];
        
        applyOperations(newTokens, newChanges, operationIndex + 1);
      }
    }
    
    // 策略2: 插入新的 token（从空格添加）
    const spaceTransformations = opCache.get(' ');
    if (spaceTransformations && spaceTransformations.length > 0) {
      for (const newToken of spaceTransformations) {
        // 在每个可能的位置插入
        for (let insertIdx = 0; insertIdx <= tokens.length; insertIdx++) {
          const newTokens = [...tokens];
          newTokens.splice(insertIdx, 0, newToken);
          
          const newChanges = [...changes, {
            position: insertIdx,
            from: ' ',
            to: newToken,
            operation
          }];
          
          applyOperations(newTokens, newChanges, operationIndex + 1);
        }
      }
    }
  }
  
  /**
   * 查询字符的变换结果
   * 返回值已做本地缓存以减少重复查询
   */
  private async getTransformations(
    symbol: string,
    mode: string,
    relType: string
  ): Promise<string[]> {
    const cacheKey = `${symbol}:${mode}:${relType}`;
    if (this.transformationCache.has(cacheKey)) {
      this.cacheHits++;
      return this.transformationCache.get(cacheKey)!;
    }
    
    this.cacheMisses++;
    
    // 将真实空格映射为 'SPACE' 字符串
    const normalizedSymbol = symbol === ' ' ? 'SPACE' : symbol;
    
    try {
      const targets = await this.provider.getTransformations(normalizedSymbol, mode, relType);
      // 将数据源中的 'SPACE' 映射回实际的空格字符
      const denormalized = targets.map(t => t === 'SPACE' ? ' ' : t);
      this.transformationCache.set(cacheKey, denormalized);
      return denormalized;
    } catch (error) {
      this.transformationCache.set(cacheKey, []);
      return [];
    }
  }
  
  /**
   * 将等式字符串切分为 tokens（支持标准与手写模式）
   */
  private tokenize(equation: string, mode: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    
    while (i < equation.length) {
      // 手写模式下优先识别 (11)H 与 (n)H 标记
      if (mode === 'handwritten') {
        // 识别 '(11)H' 标记
        if (i + 5 <= equation.length && equation.substring(i, i + 5).match(/\(\d\d\)H/)) {
          tokens.push(equation.substring(i, i + 5));
          i += 5;
          continue;
        }
        
        // 识别 '(n)H' 这类手写标记
        if (i + 4 <= equation.length && equation.substring(i, i + 4).match(/\(\d\)H/)) {
          tokens.push(equation.substring(i, i + 4));
          i += 4;
          continue;
        }
      }
      
      // 识别连续 '11' 作为单一 token
      if (i + 2 <= equation.length && equation.substring(i, i + 2) === '11') {
        tokens.push('11');
        i += 2;
        continue;
      }
      
      // 将普通字符加入 token 列表（忽略空格）
      if (equation[i] !== ' ') {
        const ch = equation[i] === '*' || equation[i] === '×' ? 'x' : equation[i];
        tokens.push(ch);
      }
      i++;
    }
    
    return tokens;
  }
  
  /**
   * 快速语法检查，提前过滤明显无效的等式?
   * 不进行完整求值，只检查基本语法?
   */
  private quickSyntaxCheck(tokens: string[]): boolean {
    const expr = tokens.join('');
    
    // 必须包含等号
    if (!expr.includes('=')) return false;
    
    // 规范化表达式
    const normalized = expr.replace(/ /g, '');
    
    // '=+' '=-' 等特殊模式替换为占位，然后检测连续非法运算符
    const withoutValidPatterns = normalized.replace(/=[\+\-]/g, '=N');
    
    // 若存在连续运算符，则视为非法
    if (/[\+\-\*\/x=][\+\-\*\/x=]/.test(withoutValidPatterns)) return false;
    
    // 检查是否以运算符开头或结尾（除了一元正负号）
    if (/^[\*\/x=]|[\+\-\*\/x]$/.test(normalized)) return false;
    
    return true;
  }

  /**
   * 验证给定 tokens 表示的等式是否为有效的数值等�?
   */
  private isValidEquation(tokens: string[]): boolean {
    const expr = tokens.join('');
    const cacheKey = expr.replace(/ /g, '');
    
    // 缓存命中则直接返回
    if (this.validationCache.has(cacheKey)) {
      this.cacheHits++;
      return this.validationCache.get(cacheKey)!;
    }
    
    this.cacheMisses++;
    const validationStart = performance.now();
    
    // 不包含等号则不是有效等式
    if (!expr.includes('=')) {
      this.validationCache.set(cacheKey, false);
      this.validationTimeMs += performance.now() - validationStart;
      return false;
    }
    
    // 规范化表达式（去除空格等）并排除非法运算符组合
    const normalized = expr.replace(/ /g, '');
    
    // 将 '=+' 或 '=-' 等特殊模式替换为占位（避免误判），然后检测连续非法运算符
    const withoutValidPatterns = normalized.replace(/=[\+\-]/g, '=N');
    
    // 若存在连续运算符（例如 '++'、'+*' 等），则视为非法表达式
    if (/[\+\-\*\/x=][\+\-\*\/x=]/.test(withoutValidPatterns)) {
      this.validationCache.set(cacheKey, false);
      this.validationTimeMs += performance.now() - validationStart;
      return false;
    }
    
    try {
      // 准备执行求值：将 (n)H -> n，替换乘法符号为 '*'，替换除号为 '/'
      let evalExpr = expr
        .replace(/\(\d+\)H/gi, match => match.match(/\d+/)![0]) // (7)H 或 (7)h -> 7
        .replace(/x/g, '*')  // x -> *
        .replace(/÷/g, '/'); // ÷ -> /
      
      // 拆分为左右表达式并求值比较是否相等
      const parts = evalExpr.split('=');
      if (parts.length !== 2) {
        this.validationCache.set(cacheKey, false);
        this.validationTimeMs += performance.now() - validationStart;
        return false;
      }
      
      // 使用自定义解释器计算左右两侧的数值（替代 eval）
      const left = ExpressionEvaluator.evaluate(parts[0]);
      const right = ExpressionEvaluator.evaluate(parts[1]);
      
      // 比较左右结果的差值以判断等式是否成立
      const isValid = Math.abs(left - right) < 0.0001;
      this.validationCache.set(cacheKey, isValid);
      this.validationTimeMs += performance.now() - validationStart;
      return isValid;
    } catch (error) {
      this.validationCache.set(cacheKey, false);
      this.validationTimeMs += performance.now() - validationStart;
      return false;
    }
  }
  
  /**
   * 去重解集：根据等式字符串（去空格）判定唯一性
   */
  private dedup(solutions: Solution[]): Solution[] {
    const seen = new Set<string>();
    const unique: Solution[] = [];
    
    for (const sol of solutions) {
      const normalized = sol.equation.replace(/ /g, '');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(sol);
      }
    }
    
    return unique;
  }
  
  /**
   * 过滤掉与原始等式等价的解（不返回无变化或等价解）
   */
  private filterOriginal(solutions: Solution[], originalEquation: string): Solution[] {
    const normalizedOriginal = originalEquation.replace(/ /g, '').replace(/\*/g, 'x').replace(/×/g, 'x');
    return solutions.filter(sol => {
      const normalized = sol.equation.replace(/ /g, '');
      return normalized !== normalizedOriginal;
    });
  }
}
