/**
 * 专门测试思维导图图片生成的脚本
 */

const API_BASE_URL = 'http://localhost:8000/api';

async function testMindmapImage() {
  console.log('🧪 测试思维导图图片生成...\n');
  
  const testText = "人工智能的主要分支：机器学习、深度学习、自然语言处理、计算机视觉。";
  
  try {
    console.log(`📝 测试文本: ${testText}`);
    console.log(`🚀 发送请求到: ${API_BASE_URL}/mindmap-image`);
    
    const response = await fetch(`${API_BASE_URL}/mindmap-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: testText })
    });
    
    console.log(`📊 响应状态码: ${response.status}`);
    console.log(`📊 响应头: ${JSON.stringify(Object.fromEntries(response.headers))}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 成功响应:`, data);
    } else {
      const errorText = await response.text();
      console.log(`❌ 错误响应:`, errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log(`📄 错误详情:`, errorJson);
      } catch (e) {
        console.log(`📄 原始错误文本:`, errorText);
      }
    }
    
  } catch (error) {
    console.log(`❌ 网络错误:`, error.message);
  }
}

testMindmapImage();
