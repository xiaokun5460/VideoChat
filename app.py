import uvicorn
import os

if __name__ == "__main__":
    # 确保工作目录正确
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[os.path.join(script_dir, "backend")],  # 使用绝对路径
        reload_excludes=["node_modules", "uploads"]  # 排除这些目录
    ) 