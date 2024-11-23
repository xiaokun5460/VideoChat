import re
from typing import Optional

class UrlProcessor:
    @staticmethod
    def normalize_url(url: str) -> Optional[str]:
        """
        标准化不同平台的URL
        """
        # YouTube
        youtube_patterns = [
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)',
            r'(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)'
        ]
        for pattern in youtube_patterns:
            match = re.match(pattern, url)
            if match:
                return f'https://www.youtube.com/watch?v={match.group(1)}'

        # Bilibili
        bilibili_patterns = [
            r'(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/([a-zA-Z0-9]+)',
            r'(?:https?:\/\/)?b23\.tv\/([a-zA-Z0-9]+)'
        ]
        for pattern in bilibili_patterns:
            match = re.match(pattern, url)
            if match:
                return f'https://www.bilibili.com/video/{match.group(1)}'

        # 抖音
        douyin_pattern = r'(?:https?:\/\/)?(?:www\.)?douyin\.com\/video\/([0-9]+)'
        match = re.match(douyin_pattern, url)
        if match:
            return f'https://www.douyin.com/video/{match.group(1)}'

        # TikTok
        tiktok_pattern = r'(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/([0-9]+)'
        match = re.match(tiktok_pattern, url)
        if match:
            return f'https://www.tiktok.com/video/{match.group(1)}'

        return url

    @staticmethod
    def get_platform(url: str) -> str:
        """
        获取URL对应的平台
        """
        if 'youtube.com' in url or 'youtu.be' in url:
            return 'youtube'
        elif 'bilibili.com' in url or 'b23.tv' in url:
            return 'bilibili'
        elif 'douyin.com' in url:
            return 'douyin'
        elif 'tiktok.com' in url:
            return 'tiktok'
        else:
            return 'unknown' 