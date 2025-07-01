/**
 * 测试全局任务管理系统
 */

const API_BASE_URL = 'http://localhost:8000/api';

// 测试获取活跃任务
async function testGetActiveTasks() {
  console.log('🧪 测试获取活跃任务...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/progress/active`);
    const data = await response.json();
    
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应:`, data);
    
    if (data.success) {
      const tasks = data.data.tasks || [];
      console.log(`   ✅ 成功获取 ${tasks.length} 个活跃任务`);
      
      tasks.forEach((task, index) => {
        console.log(`   任务 ${index + 1}:`);
        console.log(`     ID: ${task.task_id}`);
        console.log(`     类型: ${task.task_type}`);
        console.log(`     状态: ${task.status}`);
        console.log(`     进度: ${task.progress}%`);
        console.log(`     文件: ${task.file_name}`);
        console.log(`     步骤: ${task.current_step}`);
      });
    } else {
      console.log(`   ❌ 获取失败: ${data.message}`);
    }
  } catch (error) {
    console.log(`   ❌ 网络错误: ${error.message}`);
  }
}

// 测试上传文件并监控任务
async function testUploadAndMonitor() {
  console.log('\n🧪 测试文件上传和任务监控...');
  
  // 创建一个测试文件
  const testContent = 'This is a test audio file content for transcription testing.';
  const blob = new Blob([testContent], { type: 'audio/wav' });
  const file = new File([blob], 'test-audio.wav', { type: 'audio/wav' });
  
  try {
    console.log('   📤 开始上传文件...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    console.log(`   上传状态码: ${uploadResponse.status}`);
    
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log(`   ✅ 上传成功:`, uploadData);
      
      // 等待一下，然后检查活跃任务
      console.log('   ⏳ 等待2秒后检查任务状态...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testGetActiveTasks();
    } else {
      const errorText = await uploadResponse.text();
      console.log(`   ❌ 上传失败: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ 上传错误: ${error.message}`);
  }
}

// 测试任务进度流
async function testTaskProgressStream(taskId) {
  console.log(`\n🧪 测试任务进度流: ${taskId}`);
  
  try {
    const eventSource = new EventSource(`${API_BASE_URL}/progress/${taskId}/stream`);
    
    let updateCount = 0;
    const maxUpdates = 10; // 最多接收10个更新
    
    eventSource.onmessage = (event) => {
      updateCount++;
      console.log(`   📡 进度更新 ${updateCount}:`, JSON.parse(event.data));
      
      if (updateCount >= maxUpdates) {
        console.log('   ⏹️ 达到最大更新次数，关闭连接');
        eventSource.close();
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('   ❌ 流连接错误:', error);
      eventSource.close();
    };
    
    // 10秒后自动关闭
    setTimeout(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        console.log('   ⏰ 超时，关闭连接');
        eventSource.close();
      }
    }, 10000);
    
  } catch (error) {
    console.log(`   ❌ 流测试错误: ${error.message}`);
  }
}

// 主测试函数
async function runTaskSystemTests() {
  console.log('🚀 开始全局任务管理系统测试...\n');
  
  // 1. 测试获取活跃任务
  await testGetActiveTasks();
  
  // 2. 测试上传文件并监控任务
  await testUploadAndMonitor();
  
  // 3. 再次检查活跃任务
  console.log('\n🔄 再次检查活跃任务...');
  await testGetActiveTasks();
  
  console.log('\n✅ 任务管理系统测试完成！');
  console.log('\n💡 提示：');
  console.log('   - 如果看到活跃任务，说明任务跟踪系统正常工作');
  console.log('   - 前端全局任务管理器应该能显示这些任务');
  console.log('   - 可以在浏览器中打开应用查看任务弹窗');
}

// 运行测试
runTaskSystemTests().catch(console.error);
