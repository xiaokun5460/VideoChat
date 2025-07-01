"""
VideoChat API 完整测试脚本

测试所有API接口的功能和响应
"""

import json
import requests
import time
from typing import Dict, Any, Optional
import io


class APITester:
    """API测试器"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.test_results = []
        self.test_file_id = None
        self.test_task_id = None
        
    def test_request(
        self, 
        method: str, 
        endpoint: str, 
        description: str,
        data: Optional[Dict] = None,
        files: Optional[Dict] = None,
        expected_status: int = 200
    ) -> Dict[str, Any]:
        """执行API测试请求"""
        url = f"{self.base_url}{endpoint}"
        
        print(f"\n🧪 测试: {description}")
        print(f"   {method} {endpoint}")
        
        try:
            start_time = time.time()
            
            # 准备请求参数
            kwargs = {}
            if files:
                # 文件上传请求
                kwargs['files'] = files
                if data:
                    kwargs['data'] = data
            elif data:
                # JSON请求
                kwargs['json'] = data
            
            # 发送请求
            response = requests.request(method, url, **kwargs)
            duration = time.time() - start_time
            
            # 解析响应
            try:
                response_data = response.json()
            except:
                response_data = {"error": "Invalid JSON response", "text": response.text}
            
            status_code = response.status_code
            
            # 检查响应状态
            success = status_code == expected_status
            
            result = {
                "description": description,
                "method": method,
                "endpoint": endpoint,
                "status_code": status_code,
                "expected_status": expected_status,
                "success": success,
                "duration": round(duration, 3),
                "response": response_data
            }
            
            if success:
                print(f"   ✅ 成功 ({duration:.3f}s)")
                if isinstance(response_data, dict) and response_data.get('success'):
                    print(f"   📊 响应: {response_data.get('message', 'OK')}")
                elif isinstance(response_data, dict) and not response_data.get('success'):
                    print(f"   ⚠️  业务失败: {response_data.get('message', 'Unknown error')}")
            else:
                print(f"   ❌ 失败 - 状态码: {status_code}, 期望: {expected_status}")
                print(f"   📊 响应: {response_data}")
            
            self.test_results.append(result)
            return result
            
        except Exception as e:
            print(f"   💥 异常: {str(e)}")
            result = {
                "description": description,
                "method": method,
                "endpoint": endpoint,
                "success": False,
                "error": str(e),
                "duration": 0
            }
            self.test_results.append(result)
            return result
    
    def create_test_file(self) -> io.BytesIO:
        """创建测试文件"""
        content = b"This is a test audio file content for VideoChat API testing."
        return io.BytesIO(content)
    
    def run_all_tests(self):
        """运行所有API测试"""
        print("🚀 开始VideoChat API完整测试")
        print("=" * 60)
        
        # 1. 系统管理API测试
        self.test_system_apis()
        
        # 2. 文件管理API测试
        self.test_file_apis()
        
        # 3. 任务管理API测试
        self.test_task_apis()
        
        # 4. 转录API测试
        self.test_transcription_apis()
        
        # 5. AI服务API测试
        self.test_ai_apis()
        
        # 6. 生成测试报告
        self.generate_report()
    
    def test_system_apis(self):
        """测试系统管理API"""
        print("\n" + "="*20 + " 系统管理API测试 " + "="*20)
        
        # 根路径
        self.test_request("GET", "/", "API根路径")
        
        # 健康检查
        self.test_request("GET", "/api/system/health", "系统健康检查")
        
        # 系统统计
        self.test_request("GET", "/api/system/stats", "系统统计信息")
        
        # 系统配置
        self.test_request("GET", "/api/system/config", "系统配置信息")
        
        # 版本信息
        self.test_request("GET", "/api/system/version", "版本信息")
        
        # 系统优化
        self.test_request("POST", "/api/system/optimize", "系统优化")
    
    def test_file_apis(self):
        """测试文件管理API"""
        print("\n" + "="*20 + " 文件管理API测试 " + "="*20)
        
        # 文件统计
        self.test_request("GET", "/api/files/stats/overview", "文件统计信息")
        
        # 文件列表（空）
        self.test_request("GET", "/api/files/", "获取文件列表（空）")
        
        # 文件上传
        test_file = self.create_test_file()
        upload_result = self.test_request(
            "POST", 
            "/api/files/upload", 
            "文件上传",
            data={"description": "测试文件", "tags": "test,api"},
            files={"file": ("test.mp3", test_file, "audio/mpeg")}
        )
        
        # 保存文件ID用于后续测试
        if upload_result.get('success') and upload_result.get('response', {}).get('success'):
            self.test_file_id = upload_result['response']['data']['id']
            print(f"   📝 保存测试文件ID: {self.test_file_id}")
        
        # 如果有文件ID，测试其他文件API
        if self.test_file_id:
            # 获取文件详情
            self.test_request("GET", f"/api/files/{self.test_file_id}", "获取文件详情")
            
            # 更新文件信息
            self.test_request(
                "PUT", 
                f"/api/files/{self.test_file_id}", 
                "更新文件信息",
                data={"description": "更新后的测试文件"}
            )
            
            # 文件列表（有数据）
            self.test_request("GET", "/api/files/", "获取文件列表（有数据）")
            
            # 文件统计（有数据）
            self.test_request("GET", "/api/files/stats/overview", "文件统计信息（有数据）")
    
    def test_task_apis(self):
        """测试任务管理API"""
        print("\n" + "="*20 + " 任务管理API测试 " + "="*20)
        
        # 任务统计
        self.test_request("GET", "/api/tasks/stats/overview", "任务统计信息")
        
        # 任务列表（空）
        self.test_request("GET", "/api/tasks/", "获取任务列表（空）")
        
        # 活跃任务
        self.test_request("GET", "/api/tasks/active", "获取活跃任务")
        
        # 创建任务
        task_data = {
            "task_type": "transcription",
            "file_id": self.test_file_id,
            "parameters": {"language": "auto"}
        }
        
        create_result = self.test_request(
            "POST", 
            "/api/tasks/", 
            "创建转录任务",
            data=task_data
        )
        
        # 保存任务ID用于后续测试
        if create_result.get('success') and create_result.get('response', {}).get('success'):
            self.test_task_id = create_result['response']['data']['task_id']
            print(f"   📝 保存测试任务ID: {self.test_task_id}")
        
        # 如果有任务ID，测试其他任务API
        if self.test_task_id:
            # 等待一下让任务开始
            time.sleep(1)
            
            # 获取任务详情
            self.test_request("GET", f"/api/tasks/{self.test_task_id}", "获取任务详情")
            
            # 任务列表（有数据）
            self.test_request("GET", "/api/tasks/", "获取任务列表（有数据）")
            
            # 活跃任务（有数据）
            self.test_request("GET", "/api/tasks/active", "获取活跃任务（有数据）")
            
            # 等待任务完成或取消任务
            time.sleep(2)
            
            # 尝试取消任务
            self.test_request("POST", f"/api/tasks/{self.test_task_id}/cancel", "取消任务")
            
            # 获取任务结果
            self.test_request("GET", f"/api/tasks/{self.test_task_id}/result", "获取任务结果")
        
        # 清理任务
        self.test_request("POST", "/api/tasks/cleanup", "清理过期任务", data={"days": 0})
    
    def test_transcription_apis(self):
        """测试转录API"""
        print("\n" + "="*20 + " 转录API测试 " + "="*20)
        
        # 转录统计
        self.test_request("GET", "/api/transcriptions/stats/overview", "转录统计信息")
        
        # 转录列表
        self.test_request("GET", "/api/transcriptions/", "获取转录列表")
        
        # 如果有文件ID，测试转录相关API
        if self.test_file_id:
            # 根据文件ID获取转录
            self.test_request("GET", f"/api/transcriptions/file/{self.test_file_id}", "根据文件ID获取转录")
        
        # 如果有任务ID，测试任务相关转录API
        if self.test_task_id:
            # 根据任务ID获取转录
            self.test_request("GET", f"/api/transcriptions/task/{self.test_task_id}", "根据任务ID获取转录")
    
    def test_ai_apis(self):
        """测试AI服务API"""
        print("\n" + "="*20 + " AI服务API测试 " + "="*20)
        
        # AI统计
        self.test_request("GET", "/api/ai/stats/overview", "AI服务统计信息")
        
        # 测试文本
        test_text = "这是一个测试文本，用于验证AI服务的各种功能。包含了一些基本的内容，可以用来测试总结、分析等功能。"
        
        # AI总结（非流式）
        self.test_request(
            "POST", 
            "/api/ai/summary", 
            "AI总结（非流式）",
            data={"text": test_text, "stream": False}
        )
        
        # AI详细总结（非流式）
        self.test_request(
            "POST", 
            "/api/ai/detailed-summary", 
            "AI详细总结（非流式）",
            data={"text": test_text, "stream": False}
        )
        
        # AI思维导图（非流式）
        self.test_request(
            "POST", 
            "/api/ai/mindmap", 
            "AI思维导图（非流式）",
            data={"text": test_text, "stream": False}
        )
        
        # AI对话（非流式）
        chat_data = {
            "messages": [
                {"role": "user", "content": "你好，请介绍一下VideoChat系统"}
            ],
            "context": test_text,
            "stream": False
        }
        self.test_request(
            "POST", 
            "/api/ai/chat", 
            "AI对话（非流式）",
            data=chat_data
        )
        
        # AI教学评估（非流式）
        self.test_request(
            "POST",
            "/api/ai/teaching-evaluation",
            "AI教学评估（非流式）",
            data={"text": test_text, "stream": False}
        )

    def generate_report(self):
        """生成测试报告"""
        print("\n" + "="*20 + " 测试报告 " + "="*20)

        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result.get('success', False))
        failed_tests = total_tests - successful_tests

        print(f"\n📊 测试总结:")
        print(f"   总测试数: {total_tests}")
        print(f"   成功: {successful_tests} ✅")
        print(f"   失败: {failed_tests} ❌")
        print(f"   成功率: {(successful_tests/total_tests*100):.1f}%")

        if failed_tests > 0:
            print(f"\n❌ 失败的测试:")
            for result in self.test_results:
                if not result.get('success', False):
                    print(f"   - {result['description']}")
                    if 'error' in result:
                        print(f"     错误: {result['error']}")
                    elif 'status_code' in result:
                        print(f"     状态码: {result['status_code']} (期望: {result.get('expected_status', 200)})")

        # 性能统计
        durations = [r.get('duration', 0) for r in self.test_results if r.get('success', False)]
        avg_duration = 0
        max_duration = 0
        min_duration = 0

        if durations:
            avg_duration = sum(durations) / len(durations)
            max_duration = max(durations)
            min_duration = min(durations)

            print(f"\n⚡ 性能统计:")
            print(f"   平均响应时间: {avg_duration:.3f}s")
            print(f"   最快响应: {min_duration:.3f}s")
            print(f"   最慢响应: {max_duration:.3f}s")

        # 保存详细报告到文件
        report_file = "api_test_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "successful_tests": successful_tests,
                    "failed_tests": failed_tests,
                    "success_rate": round(successful_tests/total_tests*100, 1)
                },
                "performance": {
                    "avg_duration": round(avg_duration, 3) if durations else 0,
                    "max_duration": round(max_duration, 3) if durations else 0,
                    "min_duration": round(min_duration, 3) if durations else 0
                },
                "detailed_results": self.test_results
            }, f, ensure_ascii=False, indent=2)

        print(f"\n📄 详细报告已保存到: {report_file}")

        # 清理测试数据
        if self.test_file_id:
            print(f"\n🧹 清理测试数据...")
            self.test_request("DELETE", f"/api/files/{self.test_file_id}", "清理测试文件")


def main():
    """主函数"""
    print("VideoChat API 完整测试工具")
    print("确保VideoChat服务正在 http://localhost:8001 运行")
    
    # 检查服务是否运行
    try:
        response = requests.get("http://localhost:8001/api/system/health", timeout=5)
        if response.status_code != 200:
            print("❌ 服务未运行或不可访问")
            return
    except Exception as e:
        print(f"❌ 无法连接到服务: {e}")
        print("请确保VideoChat服务正在运行: uvicorn app:app --host 0.0.0.0 --port 8001")
        return
    
    # 运行测试
    tester = APITester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()
