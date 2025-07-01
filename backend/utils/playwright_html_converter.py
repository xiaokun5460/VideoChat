"""
Playwright HTML转图片统一处理器

提供高质量的HTML到PNG图片转换功能，支持并发处理和浏览器实例复用
"""

import os
import asyncio
import logging
import time
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import platform  # 新增

# 解决Windows环境事件循环问题
if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
# 环境变量设置
os.environ['PLAYWRIGHT_DISABLE_FIREFOX'] = '1'
os.environ['PLAYWRIGHT_DISABLE_WEBKIT'] = '1'

from playwright.async_api import async_playwright, Browser, BrowserContext

class PlaywrightHTMLConverter:
    """
    Playwright HTML转图片转换器

    支持浏览器实例复用和并发处理，提供高性能的HTML转图片功能
    """

    def __init__(self, max_concurrent_tasks: int = 3, browser_pool_size: int = 2):
        """
        初始化转换器

        Args:
            max_concurrent_tasks: 最大并发任务数
            browser_pool_size: 浏览器实例池大小
        """
        self.max_concurrent_tasks = max_concurrent_tasks
        self.browser_pool_size = browser_pool_size
        self.default_viewport = {'width': 1200, 'height': 800}
        self.default_browser_args = [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--hide-scrollbars',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--run-all-compositor-stages-before-draw',
            '--disable-background-networking'
        ]

        # 浏览器实例池
        self._browser_pool: List[Browser] = []
        self._browser_semaphore = asyncio.Semaphore(browser_pool_size)
        self._task_semaphore = asyncio.Semaphore(max_concurrent_tasks)
        self._playwright_context = None
        self._initialized = False
        self._stats = {
            'total_conversions': 0,
            'successful_conversions': 0,
            'failed_conversions': 0,
            'total_time': 0.0,
            'browser_reuses': 0
        }

    async def _initialize(self):
        """初始化Playwright和浏览器池"""
        if self._initialized:
            return

        try:
            logging.info("🚀 初始化Playwright HTML转换器...")
            self._playwright_context = await async_playwright().start()

            # 预创建浏览器实例池
            for i in range(self.browser_pool_size):
                browser = await self._playwright_context.chromium.launch(
                    headless=True,
                    args=self.default_browser_args
                )
                self._browser_pool.append(browser)
                logging.info(f"✅ 浏览器实例 {i+1}/{self.browser_pool_size} 创建成功")

            self._initialized = True
            logging.info(f"🎉 Playwright转换器初始化完成，浏览器池大小: {self.browser_pool_size}")

        except Exception as e:
            logging.error(f"❌ Playwright转换器初始化失败: {str(e)}")
            raise

    @asynccontextmanager
    async def _get_browser(self):
        """获取浏览器实例的上下文管理器"""
        await self._initialize()

        async with self._browser_semaphore:
            if not self._browser_pool:
                raise RuntimeError("浏览器池为空")

            browser = self._browser_pool.pop(0)
            self._stats['browser_reuses'] += 1

            try:
                yield browser
            finally:
                # 将浏览器实例放回池中
                self._browser_pool.append(browser)

    async def convert_html_to_image(
        self,
        html_content: str,
        output_path: str,
        viewport: Optional[Dict[str, int]] = None,
        wait_timeout: int = 2000,
        element_selector: Optional[str] = None,
        full_page: bool = False
    ) -> bool:
        """
        将HTML内容转换为PNG图片（支持并发处理）

        Args:
            html_content: HTML内容字符串
            output_path: 输出图片路径
            viewport: 视口大小，默认1200x800
            wait_timeout: 等待渲染完成的超时时间（毫秒）
            element_selector: 要截图的元素选择器，如果为None则截取整个页面
            full_page: 是否截取完整页面

        Returns:
            bool: 转换是否成功

        Raises:
            Exception: 转换失败时抛出异常
        """
        start_time = time.time()

        # 使用信号量控制并发数量
        async with self._task_semaphore:
            try:
                self._stats['total_conversions'] += 1
                logging.info(f"🎨 开始HTML转图片 [{self._stats['total_conversions']}]: {output_path}")

                # 确保输出目录存在
                output_dir = os.path.dirname(output_path)
                if output_dir:
                    os.makedirs(output_dir, exist_ok=True)

                # 使用默认视口或自定义视口
                viewport_config = viewport or self.default_viewport

                # 从浏览器池获取实例
                async with self._get_browser() as browser:
                    # 创建新的浏览器上下文（隔离会话）
                    context = await browser.new_context(viewport=viewport_config)

                    try:
                        # 创建页面
                        page = await context.new_page()

                        # 设置HTML内容
                        await page.set_content(html_content, wait_until='networkidle')

                        # 等待内容完全渲染
                        await page.wait_for_timeout(wait_timeout)

                        # 根据配置进行截图
                        if element_selector:
                            # 截取指定元素
                            element = await page.query_selector(element_selector)
                            if element:
                                await element.screenshot(
                                    path=output_path,
                                    type='png'
                                )
                                logging.info(f"✅ 元素截图完成: {element_selector}")
                            else:
                                # 元素未找到，使用全页面截图
                                await page.screenshot(
                                    path=output_path,
                                    type='png',
                                    full_page=full_page
                                )
                                logging.warning(f"⚠️ 元素未找到 {element_selector}，使用全页面截图")
                        else:
                            # 全页面或视口截图
                            await page.screenshot(
                                path=output_path,
                                type='png',
                                full_page=full_page
                            )
                            logging.info(f"✅ 页面截图完成，full_page={full_page}")

                    finally:
                        # 关闭上下文（自动清理页面）
                        await context.close()

                # 验证文件是否成功生成
                if os.path.exists(output_path):
                    file_size = os.path.getsize(output_path)
                    elapsed_time = time.time() - start_time
                    self._stats['successful_conversions'] += 1
                    self._stats['total_time'] += elapsed_time

                    logging.info(f"✅ HTML转图片成功，文件大小: {file_size} 字节，耗时: {elapsed_time:.2f}s")
                    return True
                else:
                    raise Exception("图片文件未成功生成")

            except Exception as e:
                self._stats['failed_conversions'] += 1
                elapsed_time = time.time() - start_time
                logging.error(f"❌ HTML转图片失败 (耗时: {elapsed_time:.2f}s): {type(e).__name__}: {str(e)}")
                raise Exception(f"Playwright转换失败: {str(e)}")
    
    async def convert_mindmap_html(
        self,
        html_content: str,
        output_path: str
    ) -> bool:
        """
        专门用于思维导图的HTML转图片
        
        Args:
            html_content: 思维导图HTML内容
            output_path: 输出图片路径
            
        Returns:
            bool: 转换是否成功
        """
        return await self.convert_html_to_image(
            html_content=html_content,
            output_path=output_path,
            viewport={'width': 1200, 'height': 800},
            wait_timeout=2000,
            element_selector='.container',  # 思维导图容器
            full_page=False
        )
    
    async def convert_content_export(
        self,
        html_content: str,
        output_path: str
    ) -> bool:
        """
        专门用于内容导出的HTML转图片
        
        Args:
            html_content: 内容HTML
            output_path: 输出图片路径
            
        Returns:
            bool: 转换是否成功
        """
        # 根据内容长度动态调整视口高度
        content_length = len(html_content)
        base_height = 800
        content_height = min(content_length // 8, 1200)  # 动态高度，最大1200px
        estimated_height = base_height + content_height
        
        return await self.convert_html_to_image(
            html_content=html_content,
            output_path=output_path,
            viewport={'width': 1200, 'height': estimated_height},
            wait_timeout=3000,  # 内容导出需要更长的渲染时间
            element_selector='.export-container',  # 内容导出容器
            full_page=True
        )

    def get_stats(self) -> Dict[str, Any]:
        """获取转换器统计信息"""
        stats = self._stats.copy()
        if stats['total_conversions'] > 0:
            stats['success_rate'] = (stats['successful_conversions'] / stats['total_conversions']) * 100
            stats['average_time'] = stats['total_time'] / stats['successful_conversions'] if stats['successful_conversions'] > 0 else 0
        else:
            stats['success_rate'] = 0
            stats['average_time'] = 0

        stats['browser_pool_size'] = len(self._browser_pool)
        stats['max_concurrent_tasks'] = self.max_concurrent_tasks
        return stats

    async def cleanup(self):
        """清理资源"""
        if not self._initialized:
            return

        logging.info("🧹 开始清理Playwright转换器资源...")

        # 关闭所有浏览器实例
        for browser in self._browser_pool:
            try:
                await browser.close()
            except Exception as e:
                logging.warning(f"⚠️ 关闭浏览器实例失败: {str(e)}")

        self._browser_pool.clear()

        # 停止Playwright
        if self._playwright_context:
            try:
                await self._playwright_context.stop()
            except Exception as e:
                logging.warning(f"⚠️ 停止Playwright失败: {str(e)}")

        self._initialized = False
        logging.info("✅ Playwright转换器资源清理完成")

    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self._initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.cleanup()


# 创建全局转换器实例（支持并发处理）
html_converter = PlaywrightHTMLConverter(
    max_concurrent_tasks=3,  # 最大并发任务数
    browser_pool_size=2      # 浏览器实例池大小
)