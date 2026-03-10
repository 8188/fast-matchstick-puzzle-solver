/**
 * 测试 moveCount 参数验证和泛化模型
 */

const API_BASE = 'http://localhost:8080';

async function testMoveCountValidation() {
  console.log('🧪 测试 moveCount 参数验证\n');
  
  // 测试正常范围内的值
  const validCases = [
    { moveCount: 1, expected: true },
    { moveCount: 2, expected: true },
  ];
  
  for (const testCase of validCases) {
    try {
      const response = await fetch(`${API_BASE}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equation: '1+3=5',
          mode: 'standard',
          moveCount: testCase.moveCount
        }),
      });
      
      if (response.ok) {
        console.log(`✅ moveCount=${testCase.moveCount}: 通过`);
      } else {
        console.log(`❌ moveCount=${testCase.moveCount}: 意外失败`);
      }
    } catch (error: any) {
      console.log(`❌ moveCount=${testCase.moveCount}: ${error.message}`);
    }
  }
  
  // 测试超出范围的值
  const invalidCases = [
    { moveCount: 0, reason: '小于最小值' },
    { moveCount: 3, reason: '超出当前支持范围' },
    { moveCount: 1.5, reason: '非整数' },
    { moveCount: -1, reason: '负数' },
  ];
  
  console.log('\n测试无效 moveCount:');
  for (const testCase of invalidCases) {
    try {
      const response = await fetch(`${API_BASE}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equation: '1+3=5',
          mode: 'standard',
          moveCount: testCase.moveCount
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.log(`✅ moveCount=${testCase.moveCount} (${testCase.reason}): 正确拒绝`);
        console.log(`   错误信息: ${error.error}`);
      } else {
        console.log(`❌ moveCount=${testCase.moveCount} (${testCase.reason}): 应该被拒绝但通过了`);
      }
    } catch (error: any) {
      console.log(`✅ moveCount=${testCase.moveCount} (${testCase.reason}): 正确拒绝`);
    }
  }
}

async function testGeneralizedModel() {
  console.log('\n\n🔬 测试泛化收支平衡模型\n');
  
  // 测试组合生成算法
  const { generateBalancedCombinations, getRecommendedCombinations } = await import('../backend/src/utils/TransformationMetadata.js');
  
  console.log('移动1根火柴的组合:');
  const n1Combos = generateBalancedCombinations(1);
  console.log(`  生成 ${n1Combos.length} 个组合`);
  console.log(`  示例: ${n1Combos.slice(0, 5).map(c => c.operations.join('+')).join(', ')}`);
  
  console.log('\n移动2根火柴的组合:');
  const n2Combos = generateBalancedCombinations(2);
  console.log(`  生成 ${n2Combos.length} 个组合`);
  console.log(`  推荐组合: ${getRecommendedCombinations(2).slice(0, 10).map(c => c.operations.join('+')).join(', ')}`);
  
  console.log('\n移动3根火柴的组合 (理论生成):');
  const n3Combos = generateBalancedCombinations(3);
  console.log(`  生成 ${n3Combos.length} 个组合`);
  console.log(`  推荐组合: ${getRecommendedCombinations(3).slice(0, 10).map(c => c.operations.join('+')).join(', ')}`);
  
  // 验证收支平衡
  console.log('\n验证收支平衡条件:');
  for (const n of [1, 2, 3]) {
    const combos = generateBalancedCombinations(n);
    const allBalanced = combos.every(c => 
      c.totalPicked === n && 
      c.totalPlaced === n && 
      c.totalDelta === 0
    );
    console.log(`  N=${n}: ${allBalanced ? '✅' : '❌'} 所有组合满足收支平衡`);
  }
}

async function main() {
  console.log('═══════════════════════════════════');
  console.log('Phase 2 泛化模型测试');
  console.log('═══════════════════════════════════\n');
  
  await testMoveCountValidation();
  await testGeneralizedModel();
  
  console.log('\n═══════════════════════════════════');
  console.log('✅ Phase 2 测试完成');
  console.log('═══════════════════════════════════');
}

main().catch(console.error);
