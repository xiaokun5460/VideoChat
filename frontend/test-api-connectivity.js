/**
 * API连通性测试脚本
 * 验证前端与后端API的基础连通性
 */

const API_BASE_URL = 'http://localhost:8000/api'

// 测试基础API连通性
async function testAPIConnectivity() {
  console.log('🚀 开始API连通性测试...\n')

  const tests = [
    {
      name: '系统健康检查',
      method: 'GET',
      url: `${API_BASE_URL}/health`,
      expectedStatus: 200,
    },

    {
      name: 'AI总结API结构测试',
      method: 'POST',
      url: `${API_BASE_URL}/summary`,
      body: { text: 'test', stream: false },
      expectedStatus: [200, 422], // 422表示参数验证错误，说明端点存在
    },
    {
      name: '思维导图API结构测试',
      method: 'POST',
      url: `${API_BASE_URL}/mindmap`,
      body: { text: 'test', stream: false },
      expectedStatus: [200, 422],
    },
    {
      name: 'AI对话API结构测试',
      method: 'POST',
      url: `${API_BASE_URL}/chat`,
      body: {
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        context: '',
        stream: false,
      },
      expectedStatus: [200, 422],
    },
  ]

  let passedTests = 0
  let totalTests = tests.length

  for (const test of tests) {
    try {
      console.log(`📡 测试: ${test.name}`)

      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
      }

      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(test.url, options)
      const expectedStatuses = Array.isArray(test.expectedStatus)
        ? test.expectedStatus
        : [test.expectedStatus]

      if (expectedStatuses.includes(response.status)) {
        console.log(`   ✅ 通过 (状态码: ${response.status})`)
        passedTests++
      } else {
        console.log(`   ❌ 失败 (期望: ${expectedStatuses.join('/')}, 实际: ${response.status})`)
        const errorText = await response.text()
        console.log(`   📄 响应: ${errorText.substring(0, 200)}...`)
      }
    } catch (error) {
      console.log(`   ❌ 网络错误: ${error.message}`)
    }
    console.log('')
  }

  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`)

  if (passedTests === totalTests) {
    console.log('🎉 所有API连通性测试通过！')
  } else {
    console.log('⚠️  部分API测试失败，请检查后端服务状态')
  }
}

// 运行测试
testAPIConnectivity().catch(console.error)
