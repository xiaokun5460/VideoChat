#!/usr/bin/env python3
"""
GPU检测测试脚本
用于诊断Whisper模型GPU加速问题
"""

import sys
import logging

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

def test_pytorch_cuda():
    """测试PyTorch和CUDA"""
    print("🔍 测试PyTorch和CUDA环境...")
    
    try:
        import torch
        print(f"✅ PyTorch版本: {torch.__version__}")
        
        # 检查CUDA可用性
        cuda_available = torch.cuda.is_available()
        print(f"🎯 CUDA可用: {cuda_available}")
        
        if cuda_available:
            # GPU详细信息
            gpu_count = torch.cuda.device_count()
            print(f"🚀 GPU数量: {gpu_count}")
            
            for i in range(gpu_count):
                gpu_name = torch.cuda.get_device_name(i)
                gpu_memory = torch.cuda.get_device_properties(i).total_memory / 1024**3
                print(f"   GPU {i}: {gpu_name} ({gpu_memory:.1f}GB)")
            
            # 测试GPU操作
            try:
                x = torch.tensor([1.0]).cuda()
                print(f"✅ GPU测试成功: {x}")
            except Exception as e:
                print(f"❌ GPU测试失败: {e}")
        else:
            print("⚠️ CUDA不可用，可能原因：")
            print("   1. 未安装NVIDIA GPU驱动")
            print("   2. 未安装CUDA Toolkit")
            print("   3. 安装的是CPU版本的PyTorch")
            print("   4. GPU不支持CUDA")
            
    except ImportError:
        print("❌ PyTorch未安装")
        print("   请安装PyTorch: pip install torch")
        return False
    except Exception as e:
        print(f"❌ PyTorch测试失败: {e}")
        return False
    
    return cuda_available

def test_faster_whisper():
    """测试faster-whisper"""
    print("\n🔍 测试faster-whisper...")
    
    try:
        from faster_whisper import WhisperModel
        print("✅ faster-whisper已安装")
        
        # 测试模型加载
        print("🔄 测试模型加载...")
        
        # 先测试CPU模式
        try:
            model_cpu = WhisperModel("tiny", device="cpu", compute_type="int8")
            print("✅ CPU模式加载成功")
            del model_cpu
        except Exception as e:
            print(f"❌ CPU模式加载失败: {e}")
        
        # 如果CUDA可用，测试GPU模式
        if test_pytorch_cuda():
            try:
                model_gpu = WhisperModel("tiny", device="cuda", compute_type="float16")
                print("✅ GPU模式加载成功")
                del model_gpu
            except Exception as e:
                print(f"❌ GPU模式加载失败: {e}")
                print("   可能原因：")
                print("   1. faster-whisper版本不支持GPU")
                print("   2. CUDA版本不兼容")
                print("   3. GPU内存不足")
        
    except ImportError:
        print("❌ faster-whisper未安装")
        print("   请安装: pip install faster-whisper")
        return False
    except Exception as e:
        print(f"❌ faster-whisper测试失败: {e}")
        return False
    
    return True

def test_config():
    """测试配置"""
    print("\n🔍 测试VideoChat配置...")
    
    try:
        from config import STT_CONFIG
        print("✅ 配置加载成功")
        print(f"   模型: {STT_CONFIG.get('whisper_model', 'unknown')}")
        print(f"   设备: {STT_CONFIG.get('device', 'unknown')}")
        print(f"   语言: {STT_CONFIG.get('language', 'unknown')}")
        print(f"   GPU计算类型: {STT_CONFIG.get('compute_type_gpu', 'unknown')}")
        print(f"   CPU计算类型: {STT_CONFIG.get('compute_type_cpu', 'unknown')}")
        
    except Exception as e:
        print(f"❌ 配置测试失败: {e}")
        return False
    
    return True

def test_model_manager():
    """测试模型管理器"""
    print("\n🔍 测试模型管理器...")
    
    try:
        from utils.model_manager import model_manager
        print("✅ 模型管理器导入成功")
        
        # 获取状态
        status = model_manager.get_status()
        print(f"   模型已加载: {status['model_loaded']}")
        print(f"   引用计数: {status['reference_count']}")
        print(f"   内存使用: {status['memory_usage_mb']}MB")
        
        # 测试模型加载
        print("🔄 测试模型加载...")
        import asyncio
        
        async def test_load():
            model = await model_manager.get_model()
            print("✅ 模型加载成功")
            await model_manager.release_model()
            print("✅ 模型释放成功")
        
        asyncio.run(test_load())
        
    except Exception as e:
        print(f"❌ 模型管理器测试失败: {e}")
        return False
    
    return True

def main():
    """主函数"""
    print("🚀 VideoChat GPU检测诊断工具")
    print("=" * 50)
    
    results = []
    
    # 测试PyTorch和CUDA
    results.append(("PyTorch/CUDA", test_pytorch_cuda()))
    
    # 测试faster-whisper
    results.append(("faster-whisper", test_faster_whisper()))
    
    # 测试配置
    results.append(("配置系统", test_config()))
    
    # 测试模型管理器
    results.append(("模型管理器", test_model_manager()))
    
    # 总结
    print("\n" + "=" * 50)
    print("📊 测试结果总结:")
    
    all_passed = True
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"   {name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 所有测试通过！GPU加速应该可以正常工作。")
    else:
        print("\n⚠️ 部分测试失败，请检查上述错误信息。")
    
    print("\n💡 建议:")
    print("   1. 确保安装了NVIDIA GPU驱动")
    print("   2. 确保安装了CUDA Toolkit")
    print("   3. 安装GPU版本的PyTorch: pip install torch --index-url https://download.pytorch.org/whl/cu118")
    print("   4. 确保faster-whisper支持GPU: pip install faster-whisper[gpu]")

if __name__ == "__main__":
    main()
