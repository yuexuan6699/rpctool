# yuexuan-rpctool

A powerful Chrome extension designed as a Web frontend management assistant for Aria2 download tools. It provides multiple convenient ways to send network resources to Aria2 for download management.

## Features

### Download Interception
- Automatically intercepts browser downloads and sends them to Aria2
- Configurable file size threshold (set to 0 to intercept all downloads)
- Smart URL filtering with blacklist/whitelist support

### Context Menu Integration
- Right-click on any link to send it directly to Aria2
- Support for multiple RPC servers with submenu organization

### Video & Audio Detection
- **Content Detection Panel**: Detects videos and audio on any website and displays a floating download panel
- **Network Request Detection**: Monitors all network requests to detect video/audio streams (MP4, M3U8, MPD, etc.)
- Supports Facebook, Vimeo, and all major video platforms
- Special handling for HLS streams and DASH streams

### URL Filtering
Advanced URL filtering system with multiple match types:
- **Contains match**: `example.com` (matches anywhere in URL)
- **Wildcard match**: `*.example.com` (matches subdomains)
- **Starts with**: `^https://` (^ prefix)
- **Ends with**: `.exe$` ($ suffix)
- **Regex match**: `/pattern/` (wrapped in /)
- Comment support: Lines starting with # are ignored

Two filter modes:
- **Blacklist Mode**: Intercept all downloads except from listed sites
- **Whitelist Mode**: Only intercept downloads from listed sites

## Installation

### From Source
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `yuexuan-rpctool_chrome` folder

### Configure Aria2
Ensure your Aria2 RPC server is running. Default configuration:
- RPC URL: `http://localhost:16800/jsonrpc`

## Configuration

Click the extension icon to open the settings page where you can configure:

### General Settings
- **Context Menu**: Enable/disable right-click menu integration
- **Auto Rename**: Advanced feature for automatic file renaming
- **Download Interception**: Enable/disable automatic download interception
- **File Size**: Minimum file size (MB) to trigger interception

### Content Detection
- **Content Detection Panel**: Show floating download panel for detected media
- **Network Request Detection**: Monitor network requests for media streams

### RPC Servers
Add and manage multiple Aria2 RPC servers:
- Name: Display name for the server
- JSON-RPC Path: Full URL to the Aria2 RPC endpoint

### URL Filters
Configure blacklist and whitelist patterns to control which sites are intercepted.

## File Structure

```
yuexuan-rpctool_chrome/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for download interception
├── video-detector.js      # Content script for video detection
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── js/
│   └── url-filter.js      # URL filtering module
├── _locales/
│   ├── en/                # English translations
│   └── zh_CN/             # Chinese translations
└── images/                # Extension icons
```

## Technical Details

### Manifest V3
This extension uses Chrome Extension Manifest V3 with:
- Service worker for background tasks
- Content scripts for video detection
- Web Request API for network monitoring

### Permissions
- `cookies`: Access cookies for authentication
- `notifications`: Show download status notifications
- `tabs`: Interact with browser tabs
- `contextMenus`: Add right-click menu items
- `downloads`: Intercept browser downloads
- `storage`: Save extension settings
- `webRequest`: Monitor network requests
- `host_permissions`: Access all URLs for video detection

## Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Microsoft Edge 88+
- Other Chromium-based browsers with Manifest V3 support

## License

This project is based on YAAW (Yet Another Aria2 Web Frontend).

## Version History

### v2.0.0
- Migrated to Manifest V3
- Added advanced URL filtering with pattern matching
- Added network request detection for video streams
- Improved video detection panel UI
- Added bilingual support (English/Chinese)
- Enhanced settings page with modern UI
