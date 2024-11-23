# VideoChat - 音视频内容一键总结 AI 工具 🎥 ✨

VideoChat 是一个强大的音视频内容处理工具，它能够自动转录音视频内容，生成文字摘要，并提供智能对话交互功能。通过 AI 技术，帮助用户快速理解和提取音视频内容的核心信息。🤖

## 视频演示

（等待上传）

## 功能特性 ⭐

### 1. 音视频转录 🎯
- 支持多种视频和音频格式文件 📁
- 批量上传和转录功能 📤
- 实时显示转录进度 ⏳
- 支持中断和继续转录 ⏯️
- 转录结果导出（VTT、SRT、TXT格式）📋

### 2. 内容总结 📝
- 生成简单总结 📌
- 生成详细总结 📑
- 生成思维导图 🌳
- 支持导出总结内容（Markdown格式）💾

### 3. 智能对话 💬
- 基于音视频内容的上下文对话 🗣️
- 实时对话响应 ⚡
- 支持复制对话内容 📋
- 支持中断生成 ✋

### 4. 其他特性 🎨
- 文件管理和预览 📂
- 实时播放音视频 ▶️
- 转录文本时间轴定位 ⏱️
- 多文件批量处理 📚

## 项目运行教程 🚀

1. **克隆项目**
- 使用 Git 克隆项目到本地：
```bash
git clone https://github.com/yourusername/VideoChat.git
cd VideoChat
```

2. **环境准备**
- 对于国内环境，你可能需要提前配置国内镜像源：

找到你Node.js的安装地址，在`{NodeJS_ROOT}/node_modules/npm/.npmrc`文件中，添加这行代码，更换为淘宝镜像源：

```bash
registry=https://registry.npm.taobao.org/
```

- 确保已安装 Python 3.8 或更高版本。
- 确保已安装 Node.js 14.x 或更高版本。
- 安装必要的依赖库：

```bash
pip install -r requirements.txt
cd frontend
npm install
```

3. **配置文件**
- 复制 `config.template.py` 文件为 `config.py`，并根据需要修改配置。
```bash
cd ../backend
cp config.template.py config.py
```

4. **运行后端**
```bash
cd ..
python app.py
```
- 后端默认运行在`http://localhost:8000`
- 你可以修改`app.py`文件中的`host`和`port`来修改后端地址。

5. **运行前端**
```bash
cd frontend
npm start
```
- 前端默认运行在`http://localhost:3000`
- 你可以修改`package.json`中的`proxy`来修改前端地址。

6. **访问应用**
- 打开浏览器，访问 `http://localhost:3000` 查看应用界面。
