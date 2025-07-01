/**
 * 简化版API测试脚本
 * 逐个测试API端点，快速定位问题
 */

const API_BASE_URL = 'http://localhost:8000/api';

// 测试单个API的通用函数
async function testAPI(name, url, method = 'GET', body = null) {
  console.log(`\n🧪 测试: ${name}`);
  console.log(`   URL: ${method} ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
      console.log(`   Body: ${JSON.stringify(body)}`);
    }
    
    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应时间: ${endTime - startTime}ms`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ 成功: ${JSON.stringify(data).substring(0, 100)}...`);
      return { success: true, data, status: response.status };
    } else {
      const errorText = await response.text();
      console.log(`   ❌ 失败: ${errorText.substring(0, 200)}...`);
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ 网络错误: ${error.message}`);
    return { success: false, error: error.message, status: 0 };
  }
}

// 主测试函数
async function runSimpleTests() {
  console.log('🚀 开始简化API测试...\n');
  
  const tests = [
    {
      name: '系统健康检查',
      url: `${API_BASE_URL}/health`,
      method: 'GET'
    },
    {
      name: 'AI总结功能',
      url: `${API_BASE_URL}/summary`,
      method: 'POST',
      body: { text: '这是一个简短的测试文本。', stream: false }
    },
    {
      name: '思维导图生成',
      url: `${API_BASE_URL}/mindmap`,
      method: 'POST',
      body: { text: '人工智能包括机器学习和深度学习。', stream: false }
    },
    {
      name: 'AI对话功能',
      url: `${API_BASE_URL}/chat`,
      method: 'POST',
      body: { 
        messages: [{ role: 'user', content: '你好' }], 
        context: '', 
        stream: false 
      }
    },
    {
      name: '详细总结功能',
      url: `${API_BASE_URL}/detailed-summary`,
      method: 'POST',
      body: { text: '这是一个测试文本，用于详细总结。', stream: false }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testAPI(test.name, test.url, test.method, test.body);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    // 添加延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${passed}/${passed + failed} 通过`);
  
  if (passed === tests.length) {
    console.log('🎉 所有基础API测试通过！');
  } else {
    console.log('⚠️  部分API测试失败');
  }
}

// 运行测试
runSimpleTests().catch(console.error);
