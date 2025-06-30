"""
告警系统

提供基于规则的告警功能，支持多种通知方式
"""

import asyncio
import time
import json
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
from utils.logger import logger, LogCategory
from utils.metrics import metrics_collector


class AlertSeverity(Enum):
    """告警严重程度"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(Enum):
    """告警状态"""
    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class Alert:
    """告警对象"""
    id: str
    rule_name: str
    severity: AlertSeverity
    message: str
    metric_name: str
    current_value: float
    threshold: float
    status: AlertStatus
    created_at: float
    resolved_at: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AlertRule:
    """告警规则"""
    name: str
    metric_name: str
    operator: str  # gt, lt, gte, lte, eq, ne
    threshold: float
    severity: AlertSeverity
    duration: int  # 持续时间（秒）
    message_template: str
    enabled: bool = True
    cooldown: int = 300  # 冷却时间（秒）
    metadata: Optional[Dict[str, Any]] = None


class AlertManager:
    """告警管理器"""
    
    def __init__(self):
        self.rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.notification_handlers: List[Callable] = []
        self.rule_states: Dict[str, Dict] = {}  # 规则状态跟踪
        self._monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        
        # 预定义规则
        self._init_default_rules()
    
    def _init_default_rules(self):
        """初始化默认告警规则"""
        default_rules = [
            AlertRule(
                name="high_cpu_usage",
                metric_name="cpu_usage_percent",
                operator="gt",
                threshold=80.0,
                severity=AlertSeverity.WARNING,
                duration=60,
                message_template="CPU使用率过高: {current_value:.1f}% (阈值: {threshold}%)"
            ),
            AlertRule(
                name="critical_cpu_usage",
                metric_name="cpu_usage_percent",
                operator="gt",
                threshold=95.0,
                severity=AlertSeverity.CRITICAL,
                duration=30,
                message_template="CPU使用率严重过高: {current_value:.1f}% (阈值: {threshold}%)"
            ),
            AlertRule(
                name="high_memory_usage",
                metric_name="memory_usage_percent",
                operator="gt",
                threshold=85.0,
                severity=AlertSeverity.WARNING,
                duration=60,
                message_template="内存使用率过高: {current_value:.1f}% (阈值: {threshold}%)"
            ),
            AlertRule(
                name="critical_memory_usage",
                metric_name="memory_usage_percent",
                operator="gt",
                threshold=95.0,
                severity=AlertSeverity.CRITICAL,
                duration=30,
                message_template="内存使用率严重过高: {current_value:.1f}% (阈值: {threshold}%)"
            ),
            AlertRule(
                name="high_error_rate",
                metric_name="http_requests_errors_total",
                operator="gt",
                threshold=10.0,
                severity=AlertSeverity.ERROR,
                duration=120,
                message_template="HTTP错误率过高: {current_value:.1f} (阈值: {threshold})"
            ),
            AlertRule(
                name="transcription_failures",
                metric_name="transcription_failed_total",
                operator="gt",
                threshold=5.0,
                severity=AlertSeverity.WARNING,
                duration=300,
                message_template="转录失败次数过多: {current_value:.0f} (阈值: {threshold})"
            )
        ]
        
        for rule in default_rules:
            self.add_rule(rule)
    
    def add_rule(self, rule: AlertRule):
        """添加告警规则"""
        self.rules[rule.name] = rule
        self.rule_states[rule.name] = {
            "first_trigger_time": None,
            "last_alert_time": 0,
            "consecutive_triggers": 0
        }
        
        logger.info(
            f"添加告警规则: {rule.name}",
            category=LogCategory.SYSTEM,
            extra_data={"rule": rule.name, "metric": rule.metric_name}
        )
    
    def remove_rule(self, rule_name: str):
        """移除告警规则"""
        if rule_name in self.rules:
            del self.rules[rule_name]
            del self.rule_states[rule_name]
            
            logger.info(
                f"移除告警规则: {rule_name}",
                category=LogCategory.SYSTEM
            )
    
    def add_notification_handler(self, handler: Callable[[Alert], None]):
        """添加通知处理器"""
        self.notification_handlers.append(handler)
    
    async def start_monitoring(self, check_interval: int = 30):
        """开始监控"""
        if self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_task = asyncio.create_task(self._monitor_loop(check_interval))
        
        logger.info(
            "告警监控已启动",
            category=LogCategory.SYSTEM,
            extra_data={"check_interval": check_interval}
        )
    
    async def stop_monitoring(self):
        """停止监控"""
        if not self._monitoring:
            return
        
        self._monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("告警监控已停止", category=LogCategory.SYSTEM)
    
    async def _monitor_loop(self, check_interval: int):
        """监控循环"""
        while self._monitoring:
            try:
                await self._check_all_rules()
                await asyncio.sleep(check_interval)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "告警监控循环错误",
                    category=LogCategory.SYSTEM,
                    exception=e
                )
                await asyncio.sleep(check_interval)
    
    async def _check_all_rules(self):
        """检查所有规则"""
        current_time = time.time()
        
        for rule_name, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            try:
                await self._check_rule(rule, current_time)
            except Exception as e:
                logger.error(
                    f"检查告警规则失败: {rule_name}",
                    category=LogCategory.SYSTEM,
                    exception=e
                )
    
    async def _check_rule(self, rule: AlertRule, current_time: float):
        """检查单个规则"""
        # 获取指标值
        metric = metrics_collector.get_metric(rule.metric_name)
        if not metric:
            return
        
        current_value = metric.get_latest_value()
        if current_value is None:
            return
        
        # 检查条件
        triggered = self._evaluate_condition(rule.operator, current_value, rule.threshold)
        rule_state = self.rule_states[rule.name]
        
        if triggered:
            # 记录首次触发时间
            if rule_state["first_trigger_time"] is None:
                rule_state["first_trigger_time"] = current_time
                rule_state["consecutive_triggers"] = 1
            else:
                rule_state["consecutive_triggers"] += 1
            
            # 检查是否满足持续时间要求
            duration_met = (current_time - rule_state["first_trigger_time"]) >= rule.duration
            
            # 检查冷却时间
            cooldown_passed = (current_time - rule_state["last_alert_time"]) >= rule.cooldown
            
            if duration_met and cooldown_passed:
                await self._trigger_alert(rule, current_value, current_time)
                rule_state["last_alert_time"] = current_time
        
        else:
            # 重置状态
            if rule_state["first_trigger_time"] is not None:
                rule_state["first_trigger_time"] = None
                rule_state["consecutive_triggers"] = 0
                
                # 检查是否有活跃的告警需要解决
                await self._resolve_alerts(rule.name, current_time)
    
    def _evaluate_condition(self, operator: str, current_value: float, threshold: float) -> bool:
        """评估条件"""
        if operator == "gt":
            return current_value > threshold
        elif operator == "gte":
            return current_value >= threshold
        elif operator == "lt":
            return current_value < threshold
        elif operator == "lte":
            return current_value <= threshold
        elif operator == "eq":
            return current_value == threshold
        elif operator == "ne":
            return current_value != threshold
        else:
            return False
    
    async def _trigger_alert(self, rule: AlertRule, current_value: float, current_time: float):
        """触发告警"""
        alert_id = f"{rule.name}_{int(current_time)}"
        
        # 生成告警消息
        message = rule.message_template.format(
            current_value=current_value,
            threshold=rule.threshold,
            metric_name=rule.metric_name
        )
        
        # 创建告警对象
        alert = Alert(
            id=alert_id,
            rule_name=rule.name,
            severity=rule.severity,
            message=message,
            metric_name=rule.metric_name,
            current_value=current_value,
            threshold=rule.threshold,
            status=AlertStatus.ACTIVE,
            created_at=current_time,
            metadata=rule.metadata
        )
        
        # 存储告警
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # 记录日志
        logger.warning(
            f"告警触发: {rule.name}",
            category=LogCategory.SYSTEM,
            extra_data={
                "alert_id": alert_id,
                "rule": rule.name,
                "severity": rule.severity.value,
                "message": message,
                "current_value": current_value,
                "threshold": rule.threshold
            }
        )
        
        # 发送通知
        await self._send_notifications(alert)
    
    async def _resolve_alerts(self, rule_name: str, current_time: float):
        """解决告警"""
        resolved_alerts = []
        
        for alert_id, alert in self.active_alerts.items():
            if alert.rule_name == rule_name and alert.status == AlertStatus.ACTIVE:
                alert.status = AlertStatus.RESOLVED
                alert.resolved_at = current_time
                resolved_alerts.append(alert_id)
                
                logger.info(
                    f"告警已解决: {rule_name}",
                    category=LogCategory.SYSTEM,
                    extra_data={"alert_id": alert_id, "rule": rule_name}
                )
        
        # 从活跃告警中移除
        for alert_id in resolved_alerts:
            del self.active_alerts[alert_id]
    
    async def _send_notifications(self, alert: Alert):
        """发送通知"""
        for handler in self.notification_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(alert)
                else:
                    handler(alert)
            except Exception as e:
                logger.error(
                    "发送告警通知失败",
                    category=LogCategory.SYSTEM,
                    exception=e,
                    extra_data={"alert_id": alert.id}
                )
    
    def get_active_alerts(self) -> List[Alert]:
        """获取活跃告警"""
        return list(self.active_alerts.values())
    
    def get_alert_history(self, limit: int = 100) -> List[Alert]:
        """获取告警历史"""
        return self.alert_history[-limit:]
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """获取告警统计"""
        total_alerts = len(self.alert_history)
        active_alerts = len(self.active_alerts)
        
        # 按严重程度统计
        severity_stats = {}
        for severity in AlertSeverity:
            severity_stats[severity.value] = sum(
                1 for alert in self.alert_history 
                if alert.severity == severity
            )
        
        # 按规则统计
        rule_stats = {}
        for alert in self.alert_history:
            rule_stats[alert.rule_name] = rule_stats.get(alert.rule_name, 0) + 1
        
        return {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "severity_distribution": severity_stats,
            "rule_distribution": rule_stats,
            "rules_count": len(self.rules)
        }


# 默认通知处理器
async def console_notification_handler(alert: Alert):
    """控制台通知处理器"""
    severity_colors = {
        AlertSeverity.INFO: "\033[36m",      # 青色
        AlertSeverity.WARNING: "\033[33m",   # 黄色
        AlertSeverity.ERROR: "\033[31m",     # 红色
        AlertSeverity.CRITICAL: "\033[35m"   # 紫色
    }
    
    color = severity_colors.get(alert.severity, "")
    reset = "\033[0m"
    
    logging.info(f"{color}[ALERT {alert.severity.value.upper()}]{reset} {alert.message}")


# 全局告警管理器实例
alert_manager = AlertManager()

# 添加默认通知处理器
alert_manager.add_notification_handler(console_notification_handler)
