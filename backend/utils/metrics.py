"""
指标收集器 - 优化版本

使用简化的指标收集器，提供基础的监控功能，减少代码冗余
"""

# 直接使用简化版本
from .simple_metrics import simple_metrics_collector

# 为了向后兼容，创建别名
metrics_collector = simple_metrics_collector

# 导出主要类型，供其他模块使用
from .simple_metrics import (
    SimpleCounter as Counter,
    SimpleGauge as Gauge, 
    SimpleHistogram as Histogram,
    SimpleMetricsCollector as MetricsCollector
)

# 便捷函数
def get_metrics_collector():
    """获取全局指标收集器实例"""
    return metrics_collector

def record_api_request(method: str, path: str, status_code: int, duration_ms: float):
    """记录API请求指标的便捷函数"""
    metrics_collector.record_request(method, path, status_code, duration_ms)

def record_transcription_result(duration_seconds: float, success: bool):
    """记录转录结果指标的便捷函数"""
    metrics_collector.record_transcription(duration_seconds, success)

def record_cache_operation(hit: bool, cache_type: str = "default"):
    """记录缓存操作指标的便捷函数"""
    if hit:
        metrics_collector.record_cache_hit(cache_type)
    else:
        metrics_collector.record_cache_miss(cache_type)

def update_system_status(cpu_percent: float, memory_percent: float, connections: int):
    """更新系统状态指标的便捷函数"""
    metrics_collector.update_system_metrics(cpu_percent, memory_percent, connections)

def get_all_metrics_data():
    """获取所有指标数据的便捷函数"""
    return metrics_collector.get_all_metrics()

def get_prometheus_data():
    """获取Prometheus格式数据的便捷函数"""
    return metrics_collector.get_prometheus_format()

# 导出所有公共接口
__all__ = [
    'metrics_collector',
    'Counter', 
    'Gauge',
    'Histogram', 
    'MetricsCollector',
    'get_metrics_collector',
    'record_api_request',
    'record_transcription_result', 
    'record_cache_operation',
    'update_system_status',
    'get_all_metrics_data',
    'get_prometheus_data'
]
