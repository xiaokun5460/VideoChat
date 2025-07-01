/**
 * API集成连通性测试脚本
 * 验证前端API服务与后端的基本连通性
 */

import axios from 'axios'

// 配置axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
}

// 测试工具函数
function logTest(name, success, error = null) {
  testResults.total++
  if (success) {
    testResults.passed++
    console.log(`✅ ${name}`)
  } else {
    testResults.failed++
    console.log(`❌ ${name}`)
    if (error) {
      console.log(`   错误: ${error.message}`)
      testResults.errors.push({ test: name, error: error.message })
    }
  }
}

// 测试API端点
async function testApiEndpoint(name, method, url, data = null) {
  try {
    let response
    switch (method.toUpperCase()) {
      case 'GET':
        response = await apiClient.get(url)
        break
      case 'POST':
        response = await apiClient.post(url, data)
        break
      default:
        throw new Error(`不支持的HTTP方法: ${method}`)
    }
    
    // 检查响应格式
    if (response.data && typeof response.data === 'object') {
      if ('success' in response.data && 'data' in response.data && 'message' in response.data) {
        logTest(`${name} (StandardResponse格式)`, true)
        return response.data
      } else {
        logTest(`${name} (响应格式不符合StandardResponse)`, false, 
          new Error('响应格式不符合StandardResponse标准'))
        return null
      }
    } else {
      logTest(`${name} (无效响应)`, false, new Error('响应数据无效'))
      return null
    }
  } catch (error) {
    logTest(`${name}`, false, error)
    return null
  }
}

// 主测试函数
async function runApiTests() {
  console.log('🚀 开始API集成连通性测试...\n')
  
  // 1. 系统健康检查
  console.log('📊 系统管理API测试:')
  await testApiEndpoint('系统健康检查', 'GET', '/system/health')
  await testApiEndpoint('系统信息获取', 'GET', '/system/info')
  await testApiEndpoint('系统统计信息', 'GET', '/system/stats')
  console.log('')
  
  // 2. 文件管理API
  console.log('📁 文件管理API测试:')
  await testApiEndpoint('文件列表获取', 'GET', '/files?page=1&page_size=5')
  await testApiEndpoint('文件统计信息', 'GET', '/files/stats')
  await testApiEndpoint('存储配置获取', 'GET', '/files/config')
  console.log('')
  
  // 3. 转录服务API
  console.log('🎙️ 转录服务API测试:')
  await testApiEndpoint('转录历史获取', 'GET', '/transcriptions?page=1&page_size=5')
  await testApiEndpoint('支持语言列表', 'GET', '/transcriptions/languages')
  await testApiEndpoint('支持模型列表', 'GET', '/transcriptions/models')
  console.log('')
  
  // 4. AI服务API
  console.log('🤖 AI服务API测试:')
  // 注意：这些可能需要实际数据，所以可能会失败
  try {
    await testApiEndpoint('AI总结生成', 'POST', '/ai/summary', {
      text: '这是一个测试文本',
      stream: false
    })
  } catch (error) {
    logTest('AI总结生成 (需要有效数据)', false, error)
  }
  console.log('')
  
  // 5. 任务管理API
  console.log('⚙️ 任务管理API测试:')
  await testApiEndpoint('任务列表获取', 'GET', '/tasks?page=1&page_size=5')
  await testApiEndpoint('活跃任务列表', 'GET', '/tasks/progress/active')
  await testApiEndpoint('任务统计信息', 'GET', '/tasks/stats')
  await testApiEndpoint('任务类型配置', 'GET', '/tasks/config/types')
  console.log('')
  
  // 6. 错误处理测试
  console.log('🛡️ 错误处理测试:')
  try {
    await apiClient.get('/non-existent-endpoint')
    logTest('404错误处理', false, new Error('应该返回404错误'))
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logTest('404错误处理', true)
    } else {
      logTest('404错误处理', false, error)
    }
  }
  
  try {
    await apiClient.get('/files/invalid-file-id')
    logTest('无效参数错误处理', false, new Error('应该返回错误'))
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 404)) {
      logTest('无效参数错误处理', true)
    } else {
      logTest('无效参数错误处理', false, error)
    }
  }
  console.log('')
  
  // 输出测试结果
  console.log('📋 测试结果总结:')
  console.log(`总测试数: ${testResults.total}`)
  console.log(`通过: ${testResults.passed}`)
  console.log(`失败: ${testResults.failed}`)
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`)
  
  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试:')
    testResults.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`)
    })
  }
  
  if (testResults.passed === testResults.total) {
    console.log('\n🎉 所有测试通过！API集成工作完成！')
  } else if (testResults.passed / testResults.total >= 0.8) {
    console.log('\n✅ 大部分测试通过，API集成基本完成！')
  } else {
    console.log('\n⚠️ 部分测试失败，需要检查后端服务状态')
  }
}

// 检查后端服务是否运行
async function checkBackendStatus() {
  try {
    const response = await axios.get('http://localhost:8000/', { timeout: 5000 })
    console.log('✅ 后端服务运行正常')
    return true
  } catch (error) {
    console.log('❌ 后端服务未运行或无法连接')
    console.log('请确保后端服务在 http://localhost:8000 运行')
    return false
  }
}

// 主执行函数
async function main() {
  console.log('🔍 检查后端服务状态...')
  const backendRunning = await checkBackendStatus()
  
  if (!backendRunning) {
    console.log('\n⚠️ 无法连接到后端服务，跳过API测试')
    console.log('请启动后端服务后重新运行测试')
    return
  }
  
  console.log('')
  await runApiTests()
}

// 运行测试
main().catch(error => {
  console.error('测试执行失败:', error)
  process.exit(1)
})
