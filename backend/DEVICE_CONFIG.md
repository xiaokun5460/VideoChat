# 设备配置说明

本文档说明如何在 VideoChat 项目中配置 CPU 和 GPU 模式。

## 配置选项

在 `backend/config.py` 文件的 `STT_CONFIG` 中，您可以配置以下设备相关选项：

### 设备模式 (`device`)

```python
"device": "auto"  # 可选值: "auto", "gpu", "cpu"
```

- **`auto`** (默认): 自动检测，优先使用GPU，如果GPU不可用则自动回退到CPU
- **`gpu`**: 强制使用GPU，如果GPU不可用会抛出错误
- **`cpu`**: 强制使用CPU

### 计算精度 (`compute_type`)

```python
"compute_type_gpu": "float16",  # GPU模式下的计算精度
"compute_type_cpu": "int8"      # CPU模式下的计算精度
```

#### GPU模式可选精度：
- **`float16`** (推荐): 较快的推理速度，适中的内存使用
- **`float32`**: 更高精度，但速度较慢，内存使用更多

#### CPU模式可选精度：
- **`int8`** (推荐): 最快的CPU推理速度，最低内存使用
- **`int16`**: 平衡精度和速度
- **`float32`**: 最高精度，但速度最慢

## 使用场景

### 1. 开发环境 (推荐使用 auto)
```python
STT_CONFIG = {
    "device": "auto",
    "compute_type_gpu": "float16",
    "compute_type_cpu": "int8"
}
```

### 2. 生产环境有GPU (强制GPU)
```python
STT_CONFIG = {
    "device": "gpu",
    "compute_type_gpu": "float16",
    "compute_type_cpu": "int8"  # 不会使用，但保留配置
}
```

### 3. 生产环境仅CPU (强制CPU)
```python
STT_CONFIG = {
    "device": "cpu",
    "compute_type_gpu": "float16",  # 不会使用，但保留配置
    "compute_type_cpu": "int8"
}
```

### 4. 高精度需求 (牺牲速度)
```python
STT_CONFIG = {
    "device": "auto",
    "compute_type_gpu": "float32",
    "compute_type_cpu": "float32"
}
```

## 性能对比

| 配置 | 速度 | 精度 | 内存使用 | 适用场景 |
|------|------|------|----------|----------|
| GPU + float16 | 最快 | 高 | 中等 | 生产环境推荐 |
| GPU + float32 | 快 | 最高 | 高 | 高精度需求 |
| CPU + int8 | 中等 | 中等 | 最低 | 资源受限环境 |
| CPU + float32 | 慢 | 高 | 高 | CPU高精度需求 |

## 启动日志

根据配置，您会看到不同的启动日志：

- `✅ 强制使用GPU模式加载Whisper模型` - 强制GPU模式成功
- `✅ 强制使用CPU模式加载Whisper模型` - 强制CPU模式
- `✅ 自动检测：使用GPU模式加载Whisper模型` - 自动检测使用GPU
- `✅ 自动检测：使用CPU模式加载Whisper模型` - 自动检测回退到CPU
- `❌ GPU模式失败: [错误信息]` - 强制GPU模式失败

## 故障排除

### GPU不可用的常见原因：
1. 没有安装CUDA
2. CUDA版本不兼容
3. GPU内存不足
4. 没有安装GPU版本的PyTorch

### 解决方案：
1. 使用 `device: "cpu"` 强制CPU模式
2. 或使用 `device: "auto"` 让系统自动回退
