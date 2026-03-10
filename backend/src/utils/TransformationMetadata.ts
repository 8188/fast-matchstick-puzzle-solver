/**
 * 变换操作元数据
 * 定义每种变换的火柴收支情况
 */

export interface TransformationMetadata {
  /** 移走的火柴数量 */
  picked: number;
  /** 放置的火柴数量 */
  placed: number;
  /** 净变化量 (placed - picked) */
  delta: number;
}

/**
 * 所有支持的变换操作元数据
 */
export const TRANSFORMATION_METADATA: Record<string, TransformationMetadata> = {
  'MOVE_1': {
    picked: 1,
    placed: 1,
    delta: 0
  },
  'ADD_1': {
    picked: 0,
    placed: 1,
    delta: 1
  },
  'REMOVE_1': {
    picked: 1,
    placed: 0,
    delta: -1
  },
  'MOVE_2': {
    picked: 2,
    placed: 2,
    delta: 0
  },
  'ADD_2': {
    picked: 0,
    placed: 2,
    delta: 2
  },
  'REMOVE_2': {
    picked: 2,
    placed: 0,
    delta: -2
  },
  'MOVE_SUB': {
    picked: 2,
    placed: 1,
    delta: -1
  },
  'MOVE_ADD': {
    picked: 1,
    placed: 2,
    delta: 1
  }
};

/**
 * 变换组合 - 用于描述一个完整的变换方案
 */
export interface TransformationCombination {
  /** 总共移动的火柴数 */
  totalMoved: number;
  /** 操作序列 */
  operations: string[];
  /** 总picked */
  totalPicked: number;
  /** 总placed */
  totalPlaced: number;
  /** 总delta */
  totalDelta: number;
}

/**
 * 生成满足收支平衡的所有变换组合
 * @param N 移动的火柴数量
 * @returns 所有满足条件的组合方案
 */
export function generateBalancedCombinations(N: number): TransformationCombination[] {
  const combinations: TransformationCombination[] = [];
  const operations = Object.keys(TRANSFORMATION_METADATA);
  
  /**
   * DFS 搜索所有可能的组合
   * @param current 当前操作序列
   * @param picked 已使用的火柴数
   * @param placed 已放置的火柴数
   */
  function dfs(current: string[], picked: number, placed: number) {
    // 收支平衡条件：picked = N, placed = N, delta = 0
    if (picked === N && placed === N) {
      combinations.push({
        totalMoved: N,
        operations: [...current],
        totalPicked: picked,
        totalPlaced: placed,
        totalDelta: placed - picked
      });
      return;
    }
    
    // 剪枝：超出预算
    if (picked > N || placed > N) {
      return;
    }
    
    // 剪枝：不可能达到平衡
    // 如果剩余可用火柴数不足，提前终止
    const remainingPicked = N - picked;
    const remainingPlaced = N - placed;
    if (remainingPicked < 0 || remainingPlaced < 0) {
      return;
    }
    
    // 尝试每种操作
    for (const op of operations) {
      const meta = TRANSFORMATION_METADATA[op];
      const newPicked = picked + meta.picked;
      const newPlaced = placed + meta.placed;
      
      // 剪枝：不要超出预算
      if (newPicked > N || newPlaced > N) {
        continue;
      }
      
      current.push(op);
      dfs(current, newPicked, newPlaced);
      current.pop();
    }
  }
  
  dfs([], 0, 0);
  
  // 去重：将排列视为同一组合
  // 例如 [ADD_2, REMOVE_2] 和 [REMOVE_2, ADD_2] 是同一组合
  const uniqueCombinations = deduplicateCombinations(combinations);
  
  return uniqueCombinations;
}

/**
 * 对组合去重（将不同排列视为同一组合）
 * @param combinations 原始组合列表
 * @returns 去重后的组合列表
 */
function deduplicateCombinations(combinations: TransformationCombination[]): TransformationCombination[] {
  const seen = new Set<string>();
  const unique: TransformationCombination[] = [];
  
  for (const combo of combinations) {
    // 将操作排序后作为唯一标识（字典序）
    const signature = [...combo.operations].sort().join(',');
    
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(combo);
    }
  }
  
  return unique;
}

/**
 * 获取移动 N 根火柴的推荐组合策略
 * 根据实际规则可用性和效率优化
 */
export function getRecommendedCombinations(N: number): TransformationCombination[] {
  const all = generateBalancedCombinations(N);
  
  // 过滤掉过于复杂的组合（操作步骤过多）
  const maxSteps = N * 3; // 启发式：最多 3*N 步操作
  const filtered = all.filter(c => c.operations.length <= maxSteps);
  
  // 按操作步骤数排序（优先尝试简单组合）
  filtered.sort((a, b) => a.operations.length - b.operations.length);
  
  return filtered;
}

/**
 * 当前支持的最大移动数
 */
export const MAX_SUPPORTED_MOVE_COUNT = 2;

/**
 * 检查移动数是否在支持范围内
 */
export function isMoveCountSupported(moveCount: number): boolean {
  return Number.isInteger(moveCount) && moveCount >= 1 && moveCount <= MAX_SUPPORTED_MOVE_COUNT;
}
