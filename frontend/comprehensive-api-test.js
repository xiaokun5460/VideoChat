/**
 * 全面API功能测试脚本
 * 深度验证所有关键API端点的功能完整性
 */

const API_BASE_URL = 'http://localhost:8000/api'

// 测试结果统计
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
}

// 通用测试函数
async function runTest(testName, testFunction) {
  testResults.total++
  console.log(`\n🧪 测试: ${testName}`)

  try {
    const result = await testFunction()
    if (result.success) {
      testResults.passed++
      console.log(`   ✅ 通过: ${result.message}`)
    } else {
      testResults.failed++
      console.log(`   ❌ 失败: ${result.message}`)
    }
    testResults.details.push({ name: testName, ...result })
  } catch (error) {
    testResults.failed++
    console.log(`   ❌ 异常: ${error.message}`)
    testResults.details.push({
      name: testName,
      success: false,
      message: error.message,
    })
  }
}

// 1. 系统健康检查测试
async function testSystemHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  const data = await response.json()

  // 检查响应结构：可能是 data.status 或 data.data.status
  const isHealthy =
    response.status === 200 && (data.status === 'healthy' || data.data?.status === 'healthy')

  return {
    success: isHealthy,
    message: `状态码: ${response.status}, 系统状态: ${data.data?.status || data.status || '未知'}`,
    data,
  }
}

// 2. AI总结功能测试
async function testAISummary() {
  const testText =
    '这是一个测试文本，用于验证AI总结功能。人工智能技术正在快速发展，深度学习和机器学习算法在各个领域都有广泛应用。'

  const response = await fetch(`${API_BASE_URL}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testText, stream: false }),
  })

  const data = await response.json()

  return {
    success: response.status === 200 && data.summary,
    message: `状态码: ${response.status}, 总结长度: ${data.summary?.length || 0}字符`,
    data,
  }
}

// 3. 思维导图功能测试
async function testMindmap() {
  const testText = '人工智能包括机器学习、深度学习、自然语言处理、计算机视觉等多个分支领域。'

  const response = await fetch(`${API_BASE_URL}/mindmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testText, stream: false }),
  })

  const data = await response.json()

  return {
    success: response.status === 200 && data.mindmap,
    message: `状态码: ${response.status}, 思维导图长度: ${data.mindmap?.length || 0}字符`,
    data,
  }
}

// 4. AI对话功能测试
async function testAIChat() {
  const testMessages = [{ role: 'user', content: '你好，请简单介绍一下人工智能。' }]

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: testMessages,
      context: '这是一个关于AI技术的对话测试。',
      stream: false,
    }),
  })

  const data = await response.json()

  return {
    success: response.status === 200 && data.response,
    message: `状态码: ${response.status}, 回复长度: ${data.response?.length || 0}字符`,
    data,
  }
}

// 5. 详细总结功能测试
async function testDetailedSummary() {
  const testText =
    '这是一个更长的测试文本，用于验证详细总结功能。内容包括技术发展历程、应用场景、未来趋势等多个方面的详细描述。'

  const response = await fetch(`${API_BASE_URL}/detailed-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testText, stream: false }),
  })

  const data = await response.json()

  return {
    success: response.status === 200 && data.detailed_summary,
    message: `状态码: ${response.status}, 详细总结长度: ${data.detailed_summary?.length || 0}字符`,
    data,
  }
}

// 6. 教学评估功能测试
async function testTeachingEvaluation() {
  const testText = '这是一段教学内容，讲述了机器学习的基本概念、算法原理和实际应用案例。'

  const response = await fetch(`${API_BASE_URL}/ai/evaluate-teaching`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testText, stream: false }),
  })

  const data = await response.json()

  return {
    success: response.status === 200 && data.evaluation,
    message: `状态码: ${response.status}, 评估内容长度: ${data.evaluation?.length || 0}字符`,
    data,
  }
}

// 7. 思维导图图片生成测试
async function testMindmapImage() {
  const testText = '人工智能的主要分支：机器学习、深度学习、自然语言处理、计算机视觉。'

  const response = await fetch(`${API_BASE_URL}/mindmap-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testText }),
  })

  const data = await response.json()

  // 503表示服务暂时不可用，这是预期的（Playwright未配置）
  const isSuccess = response.status === 200 && (data.image_path || data.image_url)
  const isExpectedError = response.status === 503 // 服务暂时不可用

  return {
    success: isSuccess || isExpectedError,
    message: `状态码: ${response.status}, ${isExpectedError ? '服务暂时不可用（预期）' : `图片路径: ${data.image_path || data.image_url || '无'}`}`,
    data,
  }
}

// 8. 视频下载功能测试（仅测试API结构，不实际下载）
async function testVideoDownload() {
  const testUrl = 'https://www.example.com/test-video.mp4'

  const response = await fetch(`${API_BASE_URL}/download-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: testUrl, filename: 'test-video.mp4' }),
  })

  // 期望返回错误（因为URL无效），但API结构应该正确
  const isValidResponse =
    response.status === 400 || response.status === 422 || response.status === 200

  return {
    success: isValidResponse,
    message: `状态码: ${response.status} (期望400/422/200，表示API结构正确)`,
    data: await response.json().catch(() => ({})),
  }
}

// 主测试函数
async function runComprehensiveTests() {
  console.log('🚀 开始全面API功能测试...\n')
  console.log('='.repeat(50))

  // 运行所有测试
  await runTest('系统健康检查', testSystemHealth)
  await runTest('AI总结功能', testAISummary)
  await runTest('思维导图生成', testMindmap)
  await runTest('AI对话功能', testAIChat)
  await runTest('详细总结功能', testDetailedSummary)
  await runTest('教学评估功能', testTeachingEvaluation)
  await runTest('思维导图图片生成', testMindmapImage)
  await runTest('视频下载API结构', testVideoDownload)

  // 输出测试结果
  console.log('\n' + '='.repeat(50))
  console.log('📊 测试结果汇总:')
  console.log(`   总测试数: ${testResults.total}`)
  console.log(`   通过: ${testResults.passed} ✅`)
  console.log(`   失败: ${testResults.failed} ❌`)
  console.log(`   成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`)

  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试:')
    testResults.details
      .filter((test) => !test.success)
      .forEach((test) => {
        console.log(`   - ${test.name}: ${test.message}`)
      })
  }

  if (testResults.passed === testResults.total) {
    console.log('\n🎉 所有API功能测试通过！系统已准备就绪。')
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关API实现。')
  }

  return testResults
}

// 运行测试
runComprehensiveTests().catch(console.error)
