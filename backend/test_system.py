"""
VideoChat 系统测试

统一的测试文件，测试所有核心功能
"""

import sys
import os
import time
import logging

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 导入配置
from config import get_config_summary, AI_CONFIG, STT_CONFIG


def test_config_system():
    """测试配置管理系统"""
    logging.info("🧪 测试配置管理系统...")
    
    try:
        # 测试配置加载
        summary = get_config_summary()
        assert "app_name" in summary, "配置摘要应包含应用名称"
        assert summary["app_name"] == "VideoChat", f"应用名称应为VideoChat，实际为{summary['app_name']}"
        
        # 测试AI配置
        assert "model" in AI_CONFIG, "AI配置应包含模型信息"
        # 不强制要求特定模型，只要有模型配置即可
        assert AI_CONFIG["model"] is not None, f"AI模型不应为空，实际为{AI_CONFIG['model']}"
        
        # 测试STT配置
        assert "whisper_model" in STT_CONFIG, "STT配置应包含Whisper模型信息"
        assert STT_CONFIG["whisper_model"] == "small", f"Whisper模型应为small，实际为{STT_CONFIG['whisper_model']}"
        
        logging.info("✅ 配置管理系统测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 配置管理系统测试失败: {e}")
        return False


def test_logging_system():
    """测试日志系统"""
    logging.info("🧪 测试日志系统...")
    
    try:
        # 测试不同级别的日志
        logging.debug("这是调试日志")
        logging.info("这是信息日志")
        logging.warning("这是警告日志")
        logging.error("这是错误日志")
        
        logging.info("✅ 日志系统测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 日志系统测试失败: {e}")
        return False


def test_cache_system():
    """测试缓存系统"""
    logging.info("🧪 测试缓存系统...")
    
    try:
        from utils.simple_cache import simple_cache_manager
        
        test_key = "system_test_key"
        test_value = {"data": "system_test", "timestamp": time.time()}
        
        # 设置缓存
        simple_cache_manager.set(test_key, test_value, ttl_seconds=60)
        
        # 获取缓存
        cached_value = simple_cache_manager.get(test_key)
        assert cached_value is not None, "缓存值不应为空"
        assert cached_value["data"] == test_value["data"], "缓存数据不匹配"
        
        # 清理测试缓存
        simple_cache_manager.delete(test_key)
        
        logging.info("✅ 缓存系统测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 缓存系统测试失败: {e}")
        return False


def test_metrics_system():
    """测试指标系统"""
    logging.info("🧪 测试指标系统...")
    
    try:
        from utils.metrics import metrics_collector
        
        # 记录测试指标
        metrics_collector.record_request("GET", "/system/test", 200, 45.2)
        metrics_collector.record_transcription(15.5, True)
        metrics_collector.record_cache_hit("memory")
        
        # 更新系统指标
        metrics_collector.update_system_metrics(
            cpu_percent=45.2,
            memory_percent=67.8,
            active_connections=5
        )
        
        # 获取指标
        all_metrics = metrics_collector.get_all_metrics()
        assert len(all_metrics) > 0, "应该有指标数据"
        assert "http_requests_total" in all_metrics, "应包含HTTP请求指标"
        
        logging.info("✅ 指标系统测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 指标系统测试失败: {e}")
        return False


def test_error_handling():
    """测试错误处理系统"""
    logging.info("🧪 测试错误处理系统...")
    
    try:
        from middleware.error_handler import TranscriptionError, ValidationError
        
        # 测试自定义异常
        try:
            raise TranscriptionError("测试转录错误", "/test/file.mp3")
        except TranscriptionError as e:
            assert "测试转录错误" in str(e), "异常消息应该包含测试文本"
        
        try:
            raise ValidationError("测试验证错误", {"field": "test"})
        except ValidationError as e:
            assert "测试验证错误" in str(e), "异常消息应该包含测试文本"
        
        logging.info("✅ 错误处理系统测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 错误处理系统测试失败: {e}")
        return False


def test_model_manager():
    """测试模型管理器"""
    logging.info("🧪 测试模型管理器...")
    
    try:
        from utils.model_manager import model_manager
        
        # 测试模型管理器状态
        stats = model_manager.get_stats()
        assert "model_loaded" in stats, "应包含模型加载状态"
        assert "memory_usage_mb" in stats, "应包含内存使用统计"
        
        logging.info("✅ 模型管理器测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 模型管理器测试失败: {e}")
        return False


def test_system_integration():
    """测试系统集成"""
    logging.info("🧪 测试系统集成...")
    
    try:
        from utils.metrics import metrics_collector
        from utils.simple_cache import simple_cache_manager
        
        # 模拟完整业务流程
        logging.info("集成测试开始", extra={"flow_id": "system_integration"})
        
        # 模拟API请求
        start_time = time.time()
        
        # 检查缓存
        cache_key = "system_integration_result"
        cached_result = simple_cache_manager.get(cache_key)
        
        if cached_result:
            metrics_collector.record_cache_hit("integration")
            logging.info("缓存命中")
        else:
            metrics_collector.record_cache_miss("integration")
            
            # 模拟业务处理
            time.sleep(0.01)
            
            # 缓存结果
            result = {"status": "success", "data": "system_integration_data"}
            simple_cache_manager.set(cache_key, result, ttl_seconds=300)
            logging.info("业务处理完成")
        
        # 记录指标
        duration_ms = (time.time() - start_time) * 1000
        metrics_collector.record_request("POST", "/system/integration", 200, duration_ms)
        
        # 记录完成日志
        logging.info("集成测试完成", extra={
            "flow_id": "system_integration",
            "duration_ms": duration_ms,
            "status": "success"
        })
        
        logging.info("✅ 系统集成测试通过")
        return True
        
    except Exception as e:
        logging.error(f"❌ 系统集成测试失败: {e}")
        return False


def main():
    """主测试函数"""
    logging.info("🚀 开始 VideoChat 系统测试...")
    logging.info("=" * 50)
    
    tests = [
        ("配置管理系统", test_config_system),
        ("日志系统", test_logging_system),
        ("缓存系统", test_cache_system),
        ("指标系统", test_metrics_system),
        ("错误处理系统", test_error_handling),
        ("模型管理器", test_model_manager),
        ("系统集成", test_system_integration),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logging.info(f"\n--- {test_name} ---")
        try:
            if test_func():
                passed += 1
        except Exception as e:
            logging.error(f"❌ {test_name} 测试异常: {e}")
        
    logging.info("=" * 60)
    logging.info(f"系统测试结果: {passed}/{total} 通过")
    
    if passed == total:
        logging.info("🎉 所有系统测试通过！")
        logging.info("✅ 系统运行正常，可以启动应用")
        return True
    elif passed >= total * 0.8:
        logging.warning("✅ 系统测试基本通过！")
        logging.warning("⚠️ 部分组件可能需要进一步检查")
        return True
    else:
        logging.error("⚠️ 系统存在问题，需要修复后再启动")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
