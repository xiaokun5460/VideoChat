/**
 * 测试文件列表获取功能
 */

import axios from 'axios';

// 配置axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testFileList() {
  console.log('🔍 测试文件列表获取功能...\n');
  
  try {
    // 测试获取文件列表
    console.log('1. 获取所有文件列表:');
    const allFiles = await apiClient.get('/files?page=1&page_size=10');
    console.log('Status:', allFiles.status);
    console.log('Response:', JSON.stringify(allFiles.data, null, 2));
    console.log('');
    
    // 测试获取音频文件
    console.log('2. 获取音频文件列表:');
    const audioFiles = await apiClient.get('/files?page=1&page_size=10&file_type=audio');
    console.log('Status:', audioFiles.status);
    console.log('Response:', JSON.stringify(audioFiles.data, null, 2));
    console.log('');
    
    // 测试获取视频文件
    console.log('3. 获取视频文件列表:');
    const videoFiles = await apiClient.get('/files?page=1&page_size=10&file_type=video');
    console.log('Status:', videoFiles.status);
    console.log('Response:', JSON.stringify(videoFiles.data, null, 2));
    console.log('');
    
    console.log('✅ 文件列表获取测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// 运行测试
testFileList();
