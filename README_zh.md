# 月晅-RPCtool

一款功能强大的 Chrome 浏览器扩展，专为 Aria2 下载工具打造的 Web 前端管理助手。它提供了多种便捷方式将网络资源发送到 Aria2 进行下载管理。

## 功能特性

### 下载拦截
- 自动拦截浏览器下载并发送到 Aria2
- 可配置的文件大小阈值（设置为 0 可拦截所有下载）
- 智能 URL 过滤，支持黑名单/白名单

### 右键菜单集成
- 右键点击任意链接即可直接发送到 Aria2
- 支持多个 RPC 服务器，子菜单自动组织

### 视频和音频检测
- **内容检测面板**：检测任意网站上的视频和音频，显示浮动下载面板
- **网络请求检测**：监控所有网络请求以检测视频/音频流（MP4、M3U8、MPD 等）
- 支持 Facebook、Vimeo 及所有主流视频平台
- 特殊处理 HLS 流和 DASH 流

### URL 过滤
高级 URL 过滤系统，支持多种匹配类型：
- **包含匹配**：`example.com`（匹配 URL 中任意位置）
- **通配符匹配**：`*.example.com`（匹配子域名）
- **开头匹配**：`^https://`（^ 前缀）
- **结尾匹配**：`.exe$`（$ 后缀）
- **正则匹配**：`/pattern/`（用 / 包裹）
- 注释支持：以 # 开头的行将被忽略

两种过滤模式：
- **黑名单模式**：拦截所有下载，除了列表中的网站
- **白名单模式**：只拦截列表中的网站

## 安装方法

### 从源码安装
1. 下载或克隆此仓库
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 在右上角启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择 `yuexuan-rpctool_chrome` 文件夹

### 配置 Aria2
确保您的 Aria2 RPC 服务器正在运行。默认配置：
- RPC 地址：`http://localhost:16800/jsonrpc`

## 配置说明

点击扩展图标打开设置页面，您可以配置以下选项：

### 常规设置
- **右键菜单**：启用/禁用右键菜单集成
- **自动文件重命名**：高级自动文件重命名功能
- **下载拦截**：启用/禁用自动下载拦截
- **文件大小**：触发拦截的最小文件大小（MB）

### 内容检测
- **内容检测面板**：为检测到的媒体显示浮动下载面板
- **网络请求检测**：监控网络请求以发现媒体流

### RPC 服务器
添加和管理多个 Aria2 RPC 服务器：
- 名称：服务器的显示名称
- JSON-RPC 路径：Aria2 RPC 端点的完整 URL

### 网址过滤器
配置黑名单和白名单模式，控制哪些网站被拦截。

## 文件结构

```
yuexuan-rpctool_chrome/
├── manifest.json          # 扩展清单（Manifest V3）
├── background.js          # 服务工作线程，处理下载拦截
├── video-detector.js      # 内容脚本，用于视频检测
├── options.html           # 设置页面 UI
├── options.js             # 设置页面逻辑
├── js/
│   └── url-filter.js      # URL 过滤模块
├── _locales/
│   ├── en/                # 英文翻译
│   └── zh_CN/             # 中文翻译
└── images/                # 扩展图标
```

## 技术细节

### Manifest V3
此扩展使用 Chrome Extension Manifest V3，包含：
- 服务工作线程处理后台任务
- 内容脚本进行视频检测
- Web Request API 监控网络

### 权限说明
- `cookies`：访问 cookie 用于认证
- `notifications`：显示下载状态通知
- `tabs`：与浏览器标签页交互
- `contextMenus`：添加右键菜单项
- `downloads`：拦截浏览器下载
- `storage`：保存扩展设置
- `webRequest`：监控网络请求
- `host_permissions`：访问所有 URL 进行视频检测

## 浏览器兼容性

- Chrome 88+（需要 Manifest V3 支持）
- Microsoft Edge 88+
- 其他支持 Manifest V3 的 Chromium 内核浏览器

## 许可证

本项目基于 YAAW（Yet Another Aria2 Web Frontend）开发。

## 版本历史

### v2.0.0
- 迁移至 Manifest V3
- 添加高级 URL 过滤和模式匹配
- 添加网络请求检测视频流
- 改进视频检测面板 UI
- 添加双语支持（中文/英文）
- 使用现代 UI 增强设置页面
