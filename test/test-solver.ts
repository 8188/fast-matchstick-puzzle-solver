/**
 * 测试求解器 - 使用cases.json中的测试案例
 */

import casesData from './cases.json';

interface TestCase {
  equation: string;
  expectedSolutions: number;
  description?: string;
  maxMutations?: number;
}

interface TestCases {
  standardMode1Match: TestCase[];
  handwrittenMode1Match: TestCase[];
  standardMode2Match: TestCase[];
  handwrittenMode2Match: TestCase[];
}

const cases: TestCases = casesData as TestCases;

interface TestResult {
  equation: string;
  expected: number;
  actual: number;
  success: boolean;
  solutions?: string[];
  error?: string;
}

// API基地址
const API_BASE = 'http://localhost:8080';

/**
 * 清除服务器端缓存
 */
async function clearServerCache(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear cache');
    }
    
    const result = await response.json();
    console.log('🧹 缓存已清除:', result);
  } catch (error: any) {
    throw new Error(`Clear cache error: ${error.message}`);
  }
}

/**
 * 获取缓存统计信息
 */
async function getCacheStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get cache stats');
    }
    
    return await response.json();
  } catch (error: any) {
    throw new Error(`Get cache stats error: ${error.message}`);
  }
}

/**
 * 调用API求解
 */
async function solveEquation(
  equation: string, 
  mode: 'standard' | 'handwritten' = 'standard',
  moveCount: 1 | 2 = 1,
  maxMutations = 10000
): Promise<any> {
  try {
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
        maxMutations
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return await response.json();
  } catch (error: any) {
    throw new Error(`API Error: ${error.message}`);
  }
}

/**
 * 运行单个测试
 */
async function runTest(
  testCase: TestCase,
  mode: 'standard' | 'handwritten' = 'standard',
  moveCount: 1 | 2 = 1
): Promise<TestResult> {
  try {
    const result = await solveEquation(
      testCase.equation, 
      mode, 
      moveCount, 
      testCase.maxMutations || 10000
    );
    const actualCount = result.solutions?.length || 0;
    
    return {
      equation: testCase.equation,
      expected: testCase.expectedSolutions,
      actual: actualCount,
      success: actualCount >= testCase.expectedSolutions, // 至少达到期望数量
      solutions: result.solutions?.map((s: any) => s.equation) || []
    };
  } catch (error: any) {
    return {
      equation: testCase.equation,
      expected: testCase.expectedSolutions,
      actual: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * 主测试函数
 */
async function main() {
  const startTime = performance.now();
  console.log('🧪 开始测试求解器...\n');
  
  // 检查是否需要清除缓存（命令行参数）
  const shouldClearCache = process.argv.includes('--no-cache');
  
  if (shouldClearCache) {
    console.log('🧹 清除缓存中...');
    await clearServerCache();
    console.log('✅ 缓存已清除\n');
  } else {
    // 显示当前缓存状态
    try {
      const stats = await getCacheStats();
      console.log('📊 当前缓存状态:');
      console.log(`   - 转换缓存: ${stats.transformationCacheSize} 条`);
      console.log(`   - 验证缓存: ${stats.validationCacheSize} 条`);
      console.log('   💡 使用 --no-cache 参数可清除缓存测试真实速度\n');
    } catch (error) {
      console.log('⚠️  无法获取缓存状态（可能服务器未运行）\n');
    }
  }
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // ========== 标准模式 - 移动1根 ==========
  console.log('═══════════════════════════════════');
  console.log('📋 标准模式测试（移动1根）');
  console.log('═══════════════════════════════════\n');
  
  for (const testCase of cases.standardMode1Match) {
    const result = await runTest(testCase, 'standard', 1);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        // 显示所有解
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 手写模式 - 移动1根 ==========
  console.log('\n═══════════════════════════════════');
  console.log('✍️  手写模式测试（移动1根）');
  console.log('═══════════════════════════════════\n');
  
  for (const testCase of cases.handwrittenMode1Match) {
    const result = await runTest(testCase, 'handwritten', 1);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 标准模式 - 移动2根 ==========
  console.log('\n═══════════════════════════════════');
  console.log('🔥 标准模式测试（移动2根）');
  console.log('═══════════════════════════════════\n');
  
  for (const testCase of cases.standardMode2Match) {
    const result = await runTest(testCase, 'standard', 2);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 手写模式 - 移动2根 ==========
  console.log('\n═══════════════════════════════════');
  console.log('🔥 手写模式测试（移动2根）');
  console.log('═══════════════════════════════════\n');
  
  for (const testCase of cases.handwrittenMode2Match) {
    const result = await runTest(testCase, 'handwritten', 2);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 总结 ==========
  const totalTests = cases.standardMode1Match.length + cases.handwrittenMode1Match.length + 
                     cases.standardMode2Match.length + cases.handwrittenMode2Match.length;
  
  const totalTime = performance.now() - startTime;
  
  console.log('\n═══════════════════════════════════');
  console.log(`📊 总测试结果: ${totalPassed}/${totalTests} 通过`);
  console.log(`⏱️  总执行时间: ${totalTime.toFixed(2)}ms`);
  console.log('═══════════════════════════════════');
  
  if (totalFailed > 0) {
    console.log(`\n❌ 失败: ${totalFailed}/${totalTests}`);
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  }
}

// 运行测试
main().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
