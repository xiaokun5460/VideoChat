# VideoChat 流式API使用指南 🚀

## 概述

VideoChat现在支持完整的流式响应功能，让AI内容生成过程实时可见，提供类似ChatGPT的用户体验！

## 🎯 核心特性

### ✅ 已实现功能
- **统一API封装** - 所有后端接口的统一调用方式
- **流式响应支持** - 实时显示AI生成内容
- **错误处理机制** - 统一的错误处理和用户反馈
- **请求取消功能** - 支持中断正在进行的请求
- **加载状态管理** - 完整的加载状态跟踪

### 🔧 支持的接口
1. **文件上传转录** - `/api/upload`
2. **简要总结** - `/api/summary` (支持流式)
3. **详细总结** - `/api/detailed-summary` (支持流式)
4. **思维导图** - `/api/mindmap-image`
5. **AI对话** - `/api/chat` (支持流式)
6. **智能评价** - `/api/ai/evaluate-teaching` (支持流式)

## 📖 使用方法

### 1. 基础API调用

```javascript
import { useAPICall } from './hooks/useAPI';
import { generateSummary } from './services/api';

const MyComponent = () => {
  const summaryAPI = useAPICall();

  const handleGenerateSummary = async () => {
    try {
      const result = await summaryAPI.execute(
        (options) => generateSummary(text, options),
        {
          loadingMessage: '正在生成总结...',
          successMessage: '总结生成完成',
          errorMessage: '生成失败',
          onSuccess: (data) => {
            console.log('总结结果:', data.summary);
          }
        }
      );
    } catch (error) {
      console.error('生成失败:', error);
    }
  };

  return (
    <button 
      onClick={handleGenerateSummary}
      loading={summaryAPI.loading}
    >
      生成总结
    </button>
  );
};
```

### 2. 流式API调用

```javascript
import { useStreamAPI } from './hooks/useAPI';
import { generateDetailedSummary } from './services/api';

const StreamComponent = () => {
  const streamAPI = useStreamAPI();

  const handleStreamSummary = async () => {
    await streamAPI.executeStream(
      (options) => generateDetailedSummary(text, options),
      {
        loadingMessage: '正在生成详细总结...',
        successMessage: '总结完成',
        onChunk: (chunk) => {
          // 实时接收数据块
          console.log('实时数据:', chunk);
        },
        onComplete: () => {
          console.log('生成完成');
        }
      }
    );
  };

  return (
    <div>
      <button 
        onClick={handleStreamSummary}
        loading={streamAPI.loading}
        disabled={streamAPI.streaming}
      >
        开始流式生成
      </button>
      
      <button 
        onClick={streamAPI.cancel}
        disabled={!streamAPI.streaming}
      >
        停止生成
      </button>
      
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {streamAPI.content}
      </div>
    </div>
  );
};
```

### 3. 批量API调用

```javascript
import { useBatchAPI } from './hooks/useAPI';

const BatchComponent = () => {
  const batchAPI = useBatchAPI();

  const handleBatchProcess = async () => {
    const apiCalls = [
      () => generateSummary(text1),
      () => generateSummary(text2),
      () => generateSummary(text3)
    ];

    await batchAPI.executeBatch(apiCalls, {
      onProgress: (progress, completed, total) => {
        console.log(`进度: ${progress}% (${completed}/${total})`);
      },
      onComplete: (results, errors) => {
        console.log('批量处理完成:', results);
      }
    });
  };

  return (
    <div>
      <button onClick={handleBatchProcess}>
        批量处理
      </button>
      <div>进度: {batchAPI.progress}%</div>
    </div>
  );
};
```

## 🧪 测试流式响应

### 访问测试页面
在浏览器中访问：`http://localhost:3000?page=stream-test`

### 测试功能
1. **简要总结流式测试** - 实时查看总结生成过程
2. **详细总结流式测试** - 查看详细分析的生成
3. **AI对话流式测试** - 体验实时对话效果
4. **智能评价流式测试** - 观看评价报告的生成

## 🔧 配置选项

### API配置
```javascript
// 在 services/api.js 中
const API_BASE_URL = 'http://localhost:8000';  // 后端地址
const DEFAULT_TIMEOUT = 30000;                 // 默认超时时间
```

### 流式响应配置
```javascript
// 启用/禁用流式响应
const useStream = true;  // true: 流式, false: 普通

// 流式响应选项
{
  stream: true,
  onChunk: (chunk) => { /* 处理数据块 */ },
  onComplete: () => { /* 完成回调 */ },
  onError: (error) => { /* 错误处理 */ }
}
```

## 🚨 注意事项

1. **后端支持** - 确保后端接口支持流式响应
2. **网络稳定** - 流式响应对网络稳定性要求较高
3. **错误处理** - 流式过程中的错误需要特殊处理
4. **内存管理** - 长时间流式响应注意内存使用

## 🔄 从旧版本迁移

### 替换旧的fetch调用
```javascript
// 旧版本
const response = await fetch('/api/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
});

// 新版本
const result = await summaryAPI.execute(
  (options) => generateSummary(text, options),
  { loadingMessage: '生成中...' }
);
```

### 启用流式响应
```javascript
// 将现有的普通调用改为流式
await streamAPI.executeStream(
  (options) => generateSummary(text, options),
  {
    onChunk: (chunk) => updateUI(chunk),
    onComplete: () => console.log('完成')
  }
);
```

## 📚 更多示例

查看 `src/components/StreamDemo/StreamDemo.jsx` 获取完整的使用示例。

## 🐛 故障排除

### 常见问题
1. **流式响应不工作** - 检查后端是否支持流式响应
2. **请求超时** - 调整timeout配置
3. **内容显示异常** - 检查onChunk处理逻辑

### 调试技巧
```javascript
// 启用详细日志
console.log('API请求:', options);
console.log('流式数据:', chunk);
console.log('完成状态:', streamAPI.streaming);
```

---

🎉 **恭喜！你现在可以享受流畅的实时AI体验了！**
