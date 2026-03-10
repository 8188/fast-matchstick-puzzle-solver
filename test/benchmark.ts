/**
 * 性能基准测试
 * 对比 Memory Provider 和原始实现的性能差异
 */

interface BenchmarkResult {
  mode: string;
  moveCount: number;
  equation: string;
  executionTime: number;
  candidatesExplored: number;
  solutions: number;
  cacheHitRate?: number;
  validationTimeMs?: number;
  transformationCacheSize?: number;
  validationCacheSize?: number;
  uniqueTokensCount?: number;
}

// API基地址
const API_BASE = 'http://localhost:8080';

/**
 * 执行单个基准测试
 */
async function runBenchmark(
  equation: string,
  mode: 'standard' | 'handwritten',
  moveCount: 1 | 2
): Promise<BenchmarkResult> {
  const response = await fetch(`${API_BASE}/api/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      equation,
      mode,
      moveCount,
      maxSolutions: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  return {
    mode,
    moveCount,
    equation,
    executionTime: result.executionTime,
    candidatesExplored: result.candidatesExplored,
    solutions: result.solutions?.length || 0,
    cacheHitRate: result.cacheHitRate,
    validationTimeMs: result.validationTimeMs,
    transformationCacheSize: result.transformationCacheSize,
    validationCacheSize: result.validationCacheSize,
    uniqueTokensCount: result.uniqueTokensCount,
  };
}

/**
 * 运行多次测试取平均值
 */
async function runMultipleTimes(
  equation: string,
  mode: 'standard' | 'handwritten',
  moveCount: 1 | 2,
  iterations: number = 5
): Promise<BenchmarkResult> {
  const results: BenchmarkResult[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await runBenchmark(equation, mode, moveCount);
    results.push(result);
    // 短暂延迟避免过快请求
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 计算平均值
  const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / iterations;
  const avgCandidates = Math.round(results.reduce((sum, r) => sum + r.candidatesExplored, 0) / iterations);
  const avgCacheHitRate = results.reduce((sum, r) => sum + (r.cacheHitRate || 0), 0) / iterations;
  const avgValidationTime = results.reduce((sum, r) => sum + (r.validationTimeMs || 0), 0) / iterations;
  
  return {
    ...results[0],
    executionTime: avgExecutionTime,
    candidatesExplored: avgCandidates,
    cacheHitRate: avgCacheHitRate,
    validationTimeMs: avgValidationTime,
  };
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🔬 开始性能基准测试...\n');
  
  const testCases = [
    // 移动1根 - 简单案例
    { equation: '8+3-4=0', mode: 'standard' as const, moveCount: 1 as const, label: '简单-移动1根' },
    { equation: '9/3=2', mode: 'standard' as const, moveCount: 1 as const, label: '除法-移动1根' },
    
    // 移动2根 - 中等复杂度
    { equation: '1+3=5', mode: 'standard' as const, moveCount: 2 as const, label: '中等-移动2根' },
    { equation: '5+5=8', mode: 'standard' as const, moveCount: 2 as const, label: '中等-移动2根' },
    
    // 移动2根 - 高复杂度
    { equation: '79-39=17', mode: 'standard' as const, moveCount: 2 as const, label: '复杂-移动2根' },
    { equation: '94-35=48', mode: 'standard' as const, moveCount: 2 as const, label: '复杂-移动2根' },
    { equation: '1+7=8+8', mode: 'standard' as const, moveCount: 2 as const, label: '高复杂-移动2根' },
  ];
  
  console.log('═══════════════════════════════════');
  console.log('📊 性能指标统计');
  console.log('═══════════════════════════════════\n');
  
  const results: BenchmarkResult[] = [];
  
  for (const testCase of testCases) {
    console.log(`🧪 测试: ${testCase.equation} (${testCase.label})`);
    
    const result = await runMultipleTimes(
      testCase.equation,
      testCase.mode,
      testCase.moveCount,
      3  // 运行3次取平均
    );
    
    results.push(result);
    
    console.log(`   执行时间: ${result.executionTime.toFixed(2)}ms`);
    console.log(`   候选数量: ${result.candidatesExplored}`);
    console.log(`   解的数量: ${result.solutions}`);
    console.log(`   缓存命中率: ${((result.cacheHitRate || 0) * 100).toFixed(1)}%`);
    console.log(`   验证耗时: ${(result.validationTimeMs || 0).toFixed(2)}ms (${((result.validationTimeMs || 0) / result.executionTime * 100).toFixed(1)}%)`);
    console.log(`   转换缓存: ${result.transformationCacheSize} 条`);
    console.log(`   验证缓存: ${result.validationCacheSize} 条`);
    console.log(`   唯一Token: ${result.uniqueTokensCount} 个\n`);
  }
  
  // 统计汇总
  console.log('═══════════════════════════════════');
  console.log('📈 性能汇总');
  console.log('═══════════════════════════════════\n');
  
  const move1Results = results.filter(r => r.moveCount === 1);
  const move2Results = results.filter(r => r.moveCount === 2);
  
  if (move1Results.length > 0) {
    const avgTime1 = move1Results.reduce((sum, r) => sum + r.executionTime, 0) / move1Results.length;
    const avgCandidates1 = move1Results.reduce((sum, r) => sum + r.candidatesExplored, 0) / move1Results.length;
    const avgCacheHit1 = move1Results.reduce((sum, r) => sum + (r.cacheHitRate || 0), 0) / move1Results.length;
    
    console.log('移动1根平均性能:');
    console.log(`   平均执行时间: ${avgTime1.toFixed(2)}ms`);
    console.log(`   平均候选数量: ${Math.round(avgCandidates1)}`);
    console.log(`   平均缓存命中率: ${(avgCacheHit1 * 100).toFixed(1)}%\n`);
  }
  
  if (move2Results.length > 0) {
    const avgTime2 = move2Results.reduce((sum, r) => sum + r.executionTime, 0) / move2Results.length;
    const avgCandidates2 = move2Results.reduce((sum, r) => sum + r.candidatesExplored, 0) / move2Results.length;
    const avgCacheHit2 = move2Results.reduce((sum, r) => sum + (r.cacheHitRate || 0), 0) / move2Results.length;
    const avgValidation2 = move2Results.reduce((sum, r) => sum + (r.validationTimeMs || 0), 0) / move2Results.length;
    
    console.log('移动2根平均性能:');
    console.log(`   平均执行时间: ${avgTime2.toFixed(2)}ms`);
    console.log(`   平均候选数量: ${Math.round(avgCandidates2)}`);
    console.log(`   平均缓存命中率: ${(avgCacheHit2 * 100).toFixed(1)}%`);
    console.log(`   平均验证耗时: ${avgValidation2.toFixed(2)}ms (${(avgValidation2 / avgTime2 * 100).toFixed(1)}%)\n`);
  }
  
  // 性能建议
  console.log('═══════════════════════════════════');
  console.log('💡 性能优化建议');
  console.log('═══════════════════════════════════\n');
  
  const overallCacheHitRate = results.reduce((sum, r) => sum + (r.cacheHitRate || 0), 0) / results.length;
  const overallValidationRatio = results.reduce((sum, r) => sum + (r.validationTimeMs || 0) / r.executionTime, 0) / results.length;
  
  if (overallCacheHitRate < 0.8) {
    console.log('⚠️  缓存命中率偏低，考虑预热缓存或增加缓存容量');
  } else {
    console.log('✅ 缓存命中率良好');
  }
  
  if (overallValidationRatio > 0.3) {
    console.log('⚠️  验证耗时占比较高，考虑优化表达式求值器');
  } else {
    console.log('✅ 验证耗时占比合理');
  }
  
  console.log('\n🎉 基准测试完成！');
}

main().catch(console.error);
