# VideoChat 配置指南

## 概述

VideoChat 使用现代化的配置管理系统，支持环境变量、配置验证、多环境部署等功能。

## 配置方式

### 1. 环境变量（推荐）

复制 `.env.template` 为 `.env` 文件，并根据需要修改配置：

```bash
cp .env.template .env
```

### 2. 直接修改配置文件

修改 `backend/config.py` 中的默认值（不推荐生产环境使用）。

## 主要配置项

### 基础配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 运行环境 | `ENVIRONMENT` | `development` | development/testing/staging/production |
| 应用名称 | `APP_NAME` | `VideoChat` | 应用名称 |
| 应用版本 | `APP_VERSION` | `1.0.0` | 应用版本号 |
| 安全密钥 | `SECRET_KEY` | - | 应用密钥（生产环境必须设置） |

### 服务器配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 监听地址 | `SERVER__HOST` | `0.0.0.0` | 服务器监听地址 |
| 端口 | `SERVER__PORT` | `8000` | 服务器端口 |
| 调试模式 | `SERVER__DEBUG` | `false` | 是否启用调试模式 |
| 热重载 | `SERVER__RELOAD` | `false` | 是否启用热重载 |
| 日志级别 | `SERVER__LOG_LEVEL` | `INFO` | DEBUG/INFO/WARNING/ERROR/CRITICAL |

### AI 服务配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| API 地址 | `AI__BASE_URL` | `https://api.openai.com/v1` | AI API 基础URL |
| API 密钥 | `AI__API_KEY` | - | AI API 密钥（必须设置） |
| 模型 | `AI__MODEL` | `gpt-3.5-turbo` | 使用的AI模型 |
| 超时时间 | `AI__TIMEOUT` | `30` | API请求超时时间（秒） |
| 重试次数 | `AI__MAX_RETRIES` | `3` | 最大重试次数 |

### 语音转文字配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 模型大小 | `STT__WHISPER_MODEL` | `small` | tiny/base/small/medium/large |
| 集束搜索 | `STT__BEAM_SIZE` | `5` | 集束搜索大小（1-20） |
| 语言 | `STT__LANGUAGE` | `zh` | 转录语言代码 |
| VAD过滤 | `STT__VAD_FILTER` | `true` | 是否启用VAD过滤 |
| 设备类型 | `STT__DEVICE` | `auto` | auto/gpu/cpu |
| GPU精度 | `STT__COMPUTE_TYPE_GPU` | `float16` | float16/float32 |
| CPU精度 | `STT__COMPUTE_TYPE_CPU` | `int8` | int8/int16/float32 |

### 视频下载配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 下载目录 | `DOWNLOAD__DOWNLOAD_DIR` | `uploads` | 下载文件保存目录 |
| 网络超时 | `DOWNLOAD__SOCKET_TIMEOUT` | `30` | 网络连接超时时间（秒） |
| 重试次数 | `DOWNLOAD__RETRIES` | `3` | 下载失败重试次数 |
| 并发数 | `DOWNLOAD__MAX_CONCURRENT_DOWNLOADS` | `3` | 最大并发下载数 |
| 下载时限 | `DOWNLOAD__MAX_DOWNLOAD_TIME` | `1800` | 最大下载时间（秒） |
| 文件大小限制 | `DOWNLOAD__MAX_FILE_SIZE` | `2147483648` | 最大文件大小（字节） |

## 环境配置示例

### 开发环境

```bash
ENVIRONMENT=development
SERVER__DEBUG=true
SERVER__RELOAD=true
SERVER__LOG_LEVEL=DEBUG
AI__API_KEY=your-dev-api-key
```

### 生产环境

```bash
ENVIRONMENT=production
SECRET_KEY=your-very-secure-secret-key-at-least-32-chars
SERVER__DEBUG=false
SERVER__RELOAD=false
SERVER__LOG_LEVEL=INFO
AI__API_KEY=your-prod-api-key
LOG_FILE=logs/videochat.log
```

## 配置验证

系统会自动验证配置的有效性：

- 必需字段检查
- 数据类型验证
- 取值范围验证
- 环境特定验证（如生产环境密钥检查）

## 配置热重载

支持运行时重新加载配置：

```python
from config import reload_config
reload_config()
```

## 故障排除

### 常见问题

1. **配置验证失败**
   - 检查环境变量格式是否正确
   - 确认必需字段已设置
   - 验证数值范围是否合法

2. **环境变量不生效**
   - 确认 `.env` 文件位置正确
   - 检查环境变量命名格式
   - 重启应用以加载新配置

3. **生产环境部署问题**
   - 确保设置了安全的 `SECRET_KEY`
   - 检查 AI API 密钥是否正确
   - 验证文件路径权限

### 调试配置

使用配置信息接口查看当前配置：

```bash
curl http://localhost:8000/api/health
```

或在代码中：

```python
from config import get_config_info
print(get_config_info())
```
