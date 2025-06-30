"""
简化的指标收集器

替代复杂的metrics.py，提供基础的指标收集功能
优化版本：减少导入，提升性能
"""

import time
import threading
import logging
from typing import Dict, Any, Optional


class SimpleCounter:
    """简单计数器"""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self._value = 0
        self._lock = threading.Lock()
    
    def increment(self, value: float = 1):
        """增加计数"""
        with self._lock:
            self._value += value
    
    def get_value(self) -> float:
        """获取当前值"""
        return self._value
    
    def reset(self):
        """重置计数"""
        with self._lock:
            self._value = 0


class SimpleGauge:
    """简单仪表盘"""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self._value = 0.0
        self._lock = threading.Lock()
    
    def set_value(self, value: float):
        """设置值"""
        with self._lock:
            self._value = value
    
    def get_value(self) -> float:
        """获取当前值"""
        return self._value


class SimpleHistogram:
    """简单直方图"""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self._values = []
        self._lock = threading.Lock()
    
    def observe(self, value: float):
        """观察一个值"""
        with self._lock:
            self._values.append(value)
            # 保持最近1000个值
            if len(self._values) > 1000:
                self._values = self._values[-1000:]
    
    def get_statistics(self) -> Dict[str, float]:
        """获取统计信息"""
        with self._lock:
            if not self._values:
                return {"count": 0, "sum": 0, "min": 0, "max": 0, "avg": 0}
            
            count = len(self._values)
            total = sum(self._values)
            min_val = min(self._values)
            max_val = max(self._values)
            avg = total / count if count > 0 else 0
            
            return {
                "count": count,
                "sum": total,
                "min": min_val,
                "max": max_val,
                "avg": avg
            }


class SimpleMetricsCollector:
    """
    简化的指标收集器

    线程安全的指标收集器，支持计数器、仪表盘和直方图三种指标类型
    自动初始化常用的系统和业务指标

    Attributes:
        counters: 计数器指标字典
        gauges: 仪表盘指标字典
        histograms: 直方图指标字典
    """

    def __init__(self) -> None:
        """初始化指标收集器"""
        self.counters: Dict[str, SimpleCounter] = {}
        self.gauges: Dict[str, SimpleGauge] = {}
        self.histograms: Dict[str, SimpleHistogram] = {}
        self._lock = threading.Lock()

        # 初始化基础指标
        self._init_basic_metrics()
    
    def _init_basic_metrics(self):
        """初始化基础指标"""
        try:
            # HTTP请求指标
            self.get_counter("http_requests_total", "HTTP请求总数")
            self.get_counter("http_errors_total", "HTTP错误总数")
            self.get_histogram("http_duration_seconds", "HTTP请求持续时间")
            
            # 转录指标
            self.get_counter("transcription_total", "转录总数")
            self.get_counter("transcription_success", "转录成功数")
            self.get_counter("transcription_failed", "转录失败数")
            
            # 缓存指标
            self.get_counter("cache_hits", "缓存命中数")
            self.get_counter("cache_misses", "缓存未命中数")
            
            # 系统指标
            self.get_gauge("cpu_usage", "CPU使用率")
            self.get_gauge("memory_usage", "内存使用率")
            self.get_gauge("active_connections", "活跃连接数")
            
        except Exception as e:
            logging.info(f"⚠️ 指标初始化失败: {e}")
    
    def get_counter(self, name: str, description: str = "") -> SimpleCounter:
        """获取或创建计数器"""
        with self._lock:
            if name not in self.counters:
                self.counters[name] = SimpleCounter(name, description)
            return self.counters[name]
    
    def get_gauge(self, name: str, description: str = "") -> SimpleGauge:
        """获取或创建仪表盘"""
        with self._lock:
            if name not in self.gauges:
                self.gauges[name] = SimpleGauge(name, description)
            return self.gauges[name]
    
    def get_histogram(self, name: str, description: str = "") -> SimpleHistogram:
        """获取或创建直方图"""
        with self._lock:
            if name not in self.histograms:
                self.histograms[name] = SimpleHistogram(name, description)
            return self.histograms[name]
    
    def record_request(self, method: str, path: str, status_code: int, duration_ms: float):
        """记录HTTP请求"""
        try:
            # 记录总请求数
            self.get_counter("http_requests_total").increment()
            
            # 记录错误
            if status_code >= 400:
                self.get_counter("http_errors_total").increment()
            
            # 记录持续时间
            self.get_histogram("http_duration_seconds").observe(duration_ms / 1000)
        except Exception as e:
            import logging
            logging.warning(f"记录请求指标失败: {e}")

    def record_transcription(self, duration_seconds: float, success: bool):
        """记录转录指标"""
        try:
            self.get_counter("transcription_total").increment()

            if success:
                self.get_counter("transcription_success").increment()
            else:
                self.get_counter("transcription_failed").increment()
        except Exception as e:
            import logging
            logging.warning(f"记录转录指标失败: {e}")

    def record_cache_hit(self, cache_type: str = "default"):
        """记录缓存命中"""
        try:
            self.get_counter("cache_hits").increment()
        except Exception as e:
            import logging
            logging.warning(f"记录缓存命中失败: {e}")

    def record_cache_miss(self, cache_type: str = "default"):
        """记录缓存未命中"""
        try:
            self.get_counter("cache_misses").increment()
        except Exception as e:
            import logging
            logging.warning(f"记录缓存未命中失败: {e}")

    def update_system_metrics(self, cpu_percent: float, memory_percent: float, active_connections: int):
        """更新系统指标"""
        try:
            self.get_gauge("cpu_usage").set_value(cpu_percent)
            self.get_gauge("memory_usage").set_value(memory_percent)
            self.get_gauge("active_connections").set_value(active_connections)
        except Exception as e:
            import logging
            logging.warning(f"更新系统指标失败: {e}")
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """获取所有指标"""
        result = {}
        
        try:
            # 计数器指标
            for name, counter in self.counters.items():
                result[name] = {
                    "type": "counter",
                    "value": counter.get_value(),
                    "description": counter.description
                }
            
            # 仪表盘指标
            for name, gauge in self.gauges.items():
                result[name] = {
                    "type": "gauge",
                    "value": gauge.get_value(),
                    "description": gauge.description
                }
            
            # 直方图指标
            for name, histogram in self.histograms.items():
                stats = histogram.get_statistics()
                result[name] = {
                    "type": "histogram",
                    "statistics": stats,
                    "description": histogram.description
                }
        
        except Exception as e:
            logging.info(f"⚠️ 获取指标失败: {e}")
            result["error"] = str(e)
        
        return result
    
    def get_prometheus_format(self) -> str:
        """获取Prometheus格式的指标"""
        lines = []
        
        try:
            # 计数器
            for name, counter in self.counters.items():
                lines.append(f"# HELP {name} {counter.description}")
                lines.append(f"# TYPE {name} counter")
                lines.append(f"{name} {counter.get_value()}")
            
            # 仪表盘
            for name, gauge in self.gauges.items():
                lines.append(f"# HELP {name} {gauge.description}")
                lines.append(f"# TYPE {name} gauge")
                lines.append(f"{name} {gauge.get_value()}")
            
            # 直方图
            for name, histogram in self.histograms.items():
                stats = histogram.get_statistics()
                lines.append(f"# HELP {name} {histogram.description}")
                lines.append(f"# TYPE {name} histogram")
                lines.append(f"{name}_count {stats['count']}")
                lines.append(f"{name}_sum {stats['sum']}")
        
        except Exception as e:
            lines.append(f"# ERROR: {e}")
        
        return "\n".join(lines)
    
    def reset_all(self):
        """重置所有指标"""
        try:
            for counter in self.counters.values():
                counter.reset()
            
            for gauge in self.gauges.values():
                gauge.set_value(0)
            
            for histogram in self.histograms.values():
                histogram._values.clear()
        except Exception as e:
            logging.info(f"⚠️ 重置指标失败: {e}")


# 创建全局实例
simple_metrics_collector = SimpleMetricsCollector()
