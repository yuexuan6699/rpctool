/**
 * RPCtool Chrome Extension - Background Service Worker
 * Aria2 download manager with interception, context menu, and video detection
 * @version 2.0.0
 */

// ==================== URL Filter Module (Inline) ====================
/**
 * RPCtool Chrome Extension - URL Filter Module
 * Advanced URL filtering with blacklist/whitelist support
 * @version 2.0.0
 */

// ==================== Constants ====================
const FILTER_CONSTANTS = {
  FILTER_MODE: {
    BLACKLIST: 'blacklist',
    WHITELIST: 'whitelist'
  },
  MATCH_TYPE: {
    EXACT: 'exact',
    CONTAINS: 'contains',
    STARTS_WITH: 'starts_with',
    ENDS_WITH: 'ends_with',
    WILDCARD: 'wildcard',
    REGEX: 'regex'
  },
  DEFAULTS: {
    mode: 'blacklist',
    caseSensitive: false
  }
};

// ==================== URL Pattern Parser ====================
const URLPatternParser = {
  /**
   * Parse a pattern string and determine its match type
   * @param {string} pattern - The pattern to parse
   * @returns {Object} Parsed pattern info
   */
  parse(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      return null;
    }

    const trimmed = pattern.trim();
    if (!trimmed) {
      return null;
    }

    // Detect regex pattern (wrapped in /)
    if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
      return {
        type: FILTER_CONSTANTS.MATCH_TYPE.REGEX,
        pattern: trimmed.slice(1, -1),
        original: trimmed
      };
    }

    // Detect wildcard pattern
    if (trimmed.includes('*')) {
      return {
        type: FILTER_CONSTANTS.MATCH_TYPE.WILDCARD,
        pattern: trimmed,
        original: trimmed
      };
    }

    // Detect starts with pattern
    if (trimmed.startsWith('^')) {
      return {
        type: FILTER_CONSTANTS.MATCH_TYPE.STARTS_WITH,
        pattern: trimmed.slice(1),
        original: trimmed
      };
    }

    // Detect ends with pattern
    if (trimmed.endsWith('$')) {
      return {
        type: FILTER_CONSTANTS.MATCH_TYPE.ENDS_WITH,
        pattern: trimmed.slice(0, -1),
        original: trimmed
      };
    }

    // Default to contains pattern
    return {
      type: FILTER_CONSTANTS.MATCH_TYPE.CONTAINS,
      pattern: trimmed,
      original: trimmed
    };
  },

  /**
   * Convert wildcard pattern to regex
   * @param {string} pattern - Wildcard pattern
   * @returns {RegExp} Regex object
   */
  wildcardToRegex(pattern) {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  },

  /**
   * Validate a pattern
   * @param {string} pattern - Pattern to validate
   * @returns {Object} Validation result
   */
  validate(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      return { valid: false, error: 'Pattern must be a non-empty string' };
    }

    const trimmed = pattern.trim();
    if (!trimmed) {
      return { valid: false, error: 'Pattern cannot be empty' };
    }

    // Validate regex pattern
    if (trimmed.startsWith('/') && trimmed.endsWith('/')) {
      try {
        new RegExp(trimmed.slice(1, -1));
        return { valid: true, type: FILTER_CONSTANTS.MATCH_TYPE.REGEX };
      } catch (e) {
        return { valid: false, error: `Invalid regex: ${e.message}` };
      }
    }

    // Check for invalid characters
    const invalidChars = /[\s\n\r\t]/;
    if (invalidChars.test(trimmed)) {
      return { valid: false, error: 'Pattern contains whitespace characters' };
    }

    return { valid: true, type: this.parse(trimmed)?.type || FILTER_CONSTANTS.MATCH_TYPE.CONTAINS };
  }
};

// ==================== URL Matcher ====================
const URLMatcher = {
  /**
   * Match URL against a parsed pattern
   * @param {string} url - URL to match
   * @param {Object} parsedPattern - Parsed pattern object
   * @returns {boolean} Match result
   */
  match(url, parsedPattern) {
    if (!url || !parsedPattern) {
      return false;
    }

    const urlLower = url.toLowerCase();
    const patternLower = parsedPattern.pattern.toLowerCase();

    switch (parsedPattern.type) {
      case FILTER_CONSTANTS.MATCH_TYPE.EXACT:
        return urlLower === patternLower;

      case FILTER_CONSTANTS.MATCH_TYPE.CONTAINS:
        return urlLower.includes(patternLower);

      case FILTER_CONSTANTS.MATCH_TYPE.STARTS_WITH:
        return urlLower.startsWith(patternLower);

      case FILTER_CONSTANTS.MATCH_TYPE.ENDS_WITH:
        return urlLower.endsWith(patternLower);

      case FILTER_CONSTANTS.MATCH_TYPE.WILDCARD:
        const regex = URLPatternParser.wildcardToRegex(parsedPattern.pattern);
        return regex.test(url);

      case FILTER_CONSTANTS.MATCH_TYPE.REGEX:
        try {
          const reg = new RegExp(parsedPattern.pattern, 'i');
          return reg.test(url);
        } catch {
          return false;
        }

      default:
        return urlLower.includes(patternLower);
    }
  },

  /**
   * Extract hostname from URL
   * @param {string} url - URL to extract from
   * @returns {string} Hostname
   */
  getHostname(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).hostname.toLowerCase();
      }
      // Handle bare hostnames
      return url.toLowerCase().split('/')[0].split(':')[0];
    } catch {
      return url.toLowerCase();
    }
  },

  /**
   * Match hostname against pattern
   * @param {string} hostname - Hostname to match
   * @param {Object} parsedPattern - Parsed pattern
   * @returns {boolean} Match result
   */
  matchHostname(hostname, parsedPattern) {
    if (!hostname || !parsedPattern) {
      return false;
    }

    const hostLower = hostname.toLowerCase();
    const patternLower = parsedPattern.pattern.toLowerCase();

    switch (parsedPattern.type) {
      case FILTER_CONSTANTS.MATCH_TYPE.EXACT:
        return hostLower === patternLower;

      case FILTER_CONSTANTS.MATCH_TYPE.CONTAINS:
        return hostLower.includes(patternLower);

      case FILTER_CONSTANTS.MATCH_TYPE.STARTS_WITH:
        return hostLower.startsWith(patternLower);

      case FILTER_CONSTANTS.MATCH_TYPE.ENDS_WITH:
        return hostLower.endsWith(patternLower);

      case FILTER_CONSTANTS.MATCH_TYPE.WILDCARD:
        const regex = URLPatternParser.wildcardToRegex(parsedPattern.pattern);
        return regex.test(hostLower);

      case FILTER_CONSTANTS.MATCH_TYPE.REGEX:
        try {
          const reg = new RegExp(parsedPattern.pattern, 'i');
          return reg.test(hostLower);
        } catch {
          return false;
        }

      default:
        return hostLower.includes(patternLower);
    }
  }
};

// ==================== Filter List Manager ====================
class FilterList {
  constructor(rawList = '') {
    this.rawList = rawList;
    this.patterns = [];
    this.invalidPatterns = [];
    this.parse(rawList);
  }

  /**
   * Parse raw list string into patterns
   * @param {string} rawList - Raw list string (one per line)
   */
  parse(rawList) {
    this.rawList = rawList || '';
    this.patterns = [];
    this.invalidPatterns = [];

    if (!rawList) {
      return;
    }

    const lines = rawList.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      const validation = URLPatternParser.validate(line);

      if (validation.valid) {
        const parsed = URLPatternParser.parse(line);
        if (parsed) {
          this.patterns.push({
            ...parsed,
            lineNumber: i + 1,
            original: line
          });
        }
      } else {
        this.invalidPatterns.push({
          pattern: line,
          lineNumber: i + 1,
          error: validation.error
        });
      }
    }
  }

  /**
   * Check if URL matches any pattern in the list
   * @param {string} url - URL to check
   * @returns {Object} Match result
   */
  matches(url) {
    const hostname = URLMatcher.getHostname(url);

    for (const pattern of this.patterns) {
      // Try matching full URL first
      if (URLMatcher.match(url, pattern)) {
        return {
          matched: true,
          pattern: pattern.original,
          lineNumber: pattern.lineNumber,
          matchType: 'url'
        };
      }

      // Try matching hostname
      if (URLMatcher.matchHostname(hostname, pattern)) {
        return {
          matched: true,
          pattern: pattern.original,
          lineNumber: pattern.lineNumber,
          matchType: 'hostname'
        };
      }
    }

    return { matched: false };
  }

  /**
   * Get list statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      total: this.patterns.length + this.invalidPatterns.length,
      valid: this.patterns.length,
      invalid: this.invalidPatterns.length
    };
  }

  /**
   * Get formatted list for display
   * @returns {string} Formatted list
   */
  toString() {
    return this.patterns.map(p => p.original).join('\n');
  }

  /**
   * Add a pattern to the list
   * @param {string} pattern - Pattern to add
   * @returns {Object} Result
   */
  add(pattern) {
    const validation = URLPatternParser.validate(pattern);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const parsed = URLPatternParser.parse(pattern);
    if (parsed) {
      this.patterns.push({
        ...parsed,
        lineNumber: this.patterns.length + 1,
        original: pattern.trim()
      });
      this.rawList = this.toString();
      return { success: true };
    }

    return { success: false, error: 'Failed to parse pattern' };
  }

  /**
   * Remove a pattern from the list
   * @param {string} pattern - Pattern to remove
   * @returns {boolean} Success
   */
  remove(pattern) {
    const index = this.patterns.findIndex(p => p.original === pattern.trim());
    if (index !== -1) {
      this.patterns.splice(index, 1);
      this.rawList = this.toString();
      return true;
    }
    return false;
  }

  /**
   * Check if list is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.patterns.length === 0;
  }
}

// ==================== URL Filter Engine ====================
class URLFilterEngine {
  constructor(config = {}) {
    this.mode = config.mode || FILTER_CONSTANTS.DEFAULTS.mode;
    this.whitelist = new FilterList(config.whitelist || '');
    this.blacklist = new FilterList(config.blocklist || '');
  }

  /**
   * Update filter configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.mode) {
      this.mode = config.mode;
    }
    if (config.whitelist !== undefined) {
      this.whitelist = new FilterList(config.whitelist);
    }
    if (config.blocklist !== undefined) {
      this.blacklist = new FilterList(config.blocklist);
    }
  }

  /**
   * Check if URL should be allowed
   * @param {string} url - URL to check
   * @returns {Object} Decision result
   */
  shouldAllow(url) {
    if (!url || typeof url !== 'string') {
      return {
        allowed: false,
        reason: 'Invalid URL',
        mode: this.mode
      };
    }

    // Blacklist mode: Allow all except blacklisted
    if (this.mode === FILTER_CONSTANTS.FILTER_MODE.BLACKLIST) {
      const blacklistMatch = this.blacklist.matches(url);

      if (blacklistMatch.matched) {
        return {
          allowed: false,
          reason: 'URL matches blacklist',
          matchedPattern: blacklistMatch.pattern,
          lineNumber: blacklistMatch.lineNumber,
          matchType: blacklistMatch.matchType,
          mode: this.mode
        };
      }

      return {
        allowed: true,
        reason: 'URL not in blacklist',
        mode: this.mode
      };
    }

    // Whitelist mode: Only allow whitelisted
    if (this.mode === FILTER_CONSTANTS.FILTER_MODE.WHITELIST) {
      const whitelistMatch = this.whitelist.matches(url);

      if (whitelistMatch.matched) {
        return {
          allowed: true,
          reason: 'URL matches whitelist',
          matchedPattern: whitelistMatch.pattern,
          lineNumber: whitelistMatch.lineNumber,
          matchType: whitelistMatch.matchType,
          mode: this.mode
        };
      }

      return {
        allowed: false,
        reason: 'URL not in whitelist',
        mode: this.mode
      };
    }

    return {
      allowed: false,
      reason: 'Unknown filter mode',
      mode: this.mode
    };
  }

  /**
   * Check if URL should be intercepted (for download interception)
   * @param {string} url - URL to check
   * @returns {boolean} Should intercept
   */
  shouldIntercept(url) {
    const result = this.shouldAllow(url);
    return result.allowed;
  }

  /**
   * Get filter statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      mode: this.mode,
      whitelist: this.whitelist.getStats(),
      blacklist: this.blacklist.getStats()
    };
  }

  /**
   * Validate a pattern string
   * @param {string} pattern - Pattern to validate
   * @returns {Object} Validation result
   */
  static validatePattern(pattern) {
    return URLPatternParser.validate(pattern);
  }

  /**
   * Get supported match types
   * @returns {Array} Match types
   */
  static getMatchTypes() {
    return Object.values(FILTER_CONSTANTS.MATCH_TYPE);
  }
}

// Export URLFilter for use in background.js
const URLFilter = {
  URLFilterEngine,
  FilterList,
  URLMatcher,
  URLPatternParser,
  FILTER_CONSTANTS
};

// ==================== End of URL Filter Module ====================

// ==================== Constants ====================
const CONSTANTS = {
  DEFAULT_RPC: 'http://localhost:16800/jsonrpc',
  NOTIFICATION_TIMEOUT: 3000,
  DEFAULT_FILE_SIZE_MB: 10,
  VIDEO_PANEL_ID: 'yuexuan-video',
  SUPPORTED_VIDEO_SITES: ['*'], // Support all websites
  FILTER_MODE: {
    BLACKLIST: 'blacklist',
    WHITELIST: 'whitelist'
  }
};

// ==================== Configuration Management ====================
const ConfigManager = {
  async get(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error(`[ConfigManager] Failed to get config "${key}":`, error);
      return defaultValue;
    }
  },

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`[ConfigManager] Failed to set config "${key}":`, error);
      return false;
    }
  },

  async getRpcList() {
    const rpcLists = await this.get('rpcLists');
    return rpcLists?.length ? rpcLists : [{ name: 'Motrix RPC', path: CONSTANTS.DEFAULT_RPC }];
  },

  async getInterceptionConfig() {
    const [isInterception, fileSize, isBlacklistMode, whitelist, blocklist] = await Promise.all([
      this.get('isInterception', true),
      this.get('fileSize', CONSTANTS.DEFAULT_FILE_SIZE_MB),
      this.get('isBlacklistMode', true),
      this.get('whitelist', ''),
      this.get('blocklist', '')
    ]);

    return {
      isInterception,
      fileSize,
      mode: isBlacklistMode ? CONSTANTS.FILTER_MODE.BLACKLIST : CONSTANTS.FILTER_MODE.WHITELIST,
      whitelist,
      blocklist
    };
  }
};

// ==================== URL Utilities ====================
const URLUtils = {
  extractAuth(url) {
    const match = url.match(/^(?:(?![^:@]+:[^:@/]*@)[^:/?#.]+:)?(?:\/\/)?(?:([^:@]*(?::[^:@]*)?)?@)?/);
    return match ? match[1] : null;
  },

  removeAuth(url) {
    return url.replace(/^((?![^:@]+:[^:@/]*@)[^:/?#.]+:)?(\/\/)?(?:(?:[^:@]*(?::[^:@]*)?)?@)?(.*)/, '$1$2$3');
  },

  parseRPCUrl(url) {
    try {
      const cleanUrl = this.removeAuth(url);
      const parseURL = new URL(cleanUrl);
      let authStr = this.extractAuth(url);

      if (authStr && !authStr.includes('token:')) {
        authStr = `Basic ${btoa(authStr)}`;
      }

      const paramsString = parseURL.hash.substring(1);
      const options = {};
      const searchParams = new URLSearchParams(paramsString);
      for (const [key, value] of searchParams) {
        options[key] = value || 'enabled';
      }

      const path = parseURL.origin + parseURL.pathname;
      return { authStr, path, options };
    } catch (error) {
      console.error('[URLUtils] Failed to parse RPC URL:', error);
      return { authStr: null, path: url, options: {} };
    }
  },

  getHostName(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http')) {
      try {
        return decodeURI(new URL(url).hostname);
      } catch {
        return '';
      }
    }
    return url;
  }
};

// ==================== HTTP Client ====================
const HTTPClient = {
  async send(url, options) {
    const response = await fetch(url, options);
    const responseText = await response.text();
    console.log('[HTTPClient] Response status:', response.status, 'body:', responseText);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText}`);
    }
    return responseText;
  },

  buildAria2Request(authStr, path, data) {
    if (authStr?.startsWith('token')) {
      data.params.unshift(authStr);
    }

    const request = {
      url: path,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    };

    if (authStr?.startsWith('Basic')) {
      request.options.headers.Authorization = authStr;
    }

    return request;
  }
};

// ==================== Notification Manager ====================
const NotificationManager = {
  _notificationCounter: 0,
  _activeNotifications: new Set(),

  show(id, options, timeout = CONSTANTS.NOTIFICATION_TIMEOUT) {
    chrome.notifications.create(id, options);
    if (timeout > 0) {
      setTimeout(() => chrome.notifications.clear(id), timeout);
    }
  },

  showDownloadStart(fileName, iconUrl) {
    this.show(`download-start-${Date.now()}`, {
      type: 'basic',
      title: chrome.i18n.getMessage('startDownload') || 'Download Started',
      message: fileName || chrome.i18n.getMessage('downloadSuccess') || 'Download added to Aria2',
      iconUrl: iconUrl || 'images/icon.jpg'
    });
  },

  showDownloadError() {
    this.show(`download-error-${Date.now()}`, {
      type: 'basic',
      title: chrome.i18n.getMessage('downloadFailed') || 'Download Failed',
      message: chrome.i18n.getMessage('downloadFailedDesc') || 'Failed to add download to Aria2',
      iconUrl: 'images/icon.jpg'
    });
  }
};

// ==================== Aria2 Client ====================
const Aria2Client = {
  async sendDownload(rpcPath, fileDownloadInfo, secret = '') {
    try {
      console.log('[Aria2Client] sendDownload called with:', { rpcPath, fileDownloadInfo, secret });
      
      let { authStr, path, options } = URLUtils.parseRPCUrl(rpcPath);
      
      // If secret is provided, use it as token authentication
      if (secret) {
        authStr = `token:${secret}`;
        console.log('[Aria2Client] Using secret as token authentication');
      }
      
      console.log('[Aria2Client] Parsed RPC URL:', { authStr, path, options });

      if (!fileDownloadInfo.link || typeof fileDownloadInfo.link !== 'string') {
        throw new Error('Invalid download link');
      }

      let cookies = [];
      try {
        cookies = await chrome.cookies.getAll({ url: fileDownloadInfo.link });
        console.log('[Aria2Client] Got cookies:', cookies.length);
      } catch (cookieError) {
        console.warn('[Aria2Client] Failed to get cookies:', cookieError);
      }

      const formattedCookies = cookies.map(cookie => `${cookie.name}=${cookie.value}`);
      const headers = [
        `Cookie: ${formattedCookies.join('; ')}`,
        `User-Agent: ${navigator.userAgent}`
      ];

      const rpcData = {
        jsonrpc: '2.0',
        method: 'aria2.addUri',
        id: Date.now(),
        params: [
          [fileDownloadInfo.link],
          { header: headers }
        ]
      };

      const rpcOption = rpcData.params[1];

      if (fileDownloadInfo.fileName) {
        rpcOption.out = fileDownloadInfo.fileName;
      }

      Object.assign(rpcOption, options);

      console.log('[Aria2Client] RPC data:', JSON.stringify(rpcData, null, 2));

      const parameter = HTTPClient.buildAria2Request(authStr, path, rpcData);
      console.log('[Aria2Client] Sending request to:', parameter.url);

      const responseText = await HTTPClient.send(parameter.url, parameter.options);
      console.log('[Aria2Client] Response:', responseText);

      // Parse Aria2 response
      let rpcResponse;
      try {
        rpcResponse = JSON.parse(responseText);
      } catch (e) {
        console.error('[Aria2Client] Failed to parse response:', e);
        NotificationManager.showDownloadError();
        return { success: false, error: 'Invalid response' };
      }

      // Check for Aria2 error
      if (rpcResponse.error) {
        console.error('[Aria2Client] RPC error:', rpcResponse.error);
        NotificationManager.showDownloadError();
        return { success: false, error: rpcResponse.error.message || 'RPC error' };
      }

      // Check for successful result
      if (rpcResponse.result) {
        console.log('[Aria2Client] Download added successfully, GID:', rpcResponse.result);
        NotificationManager.showDownloadStart(fileDownloadInfo.fileName, fileDownloadInfo.icon);
        return { success: true, gid: rpcResponse.result };
      }

      NotificationManager.showDownloadError();
      return { success: false, error: 'Unknown response' };
    } catch (error) {
      console.error('[Aria2Client] Download failed:', error);
      NotificationManager.showDownloadError();
      return { success: false, error: error.message };
    }
  }
};

// ==================== URL Filter Service ====================
const URLFilterService = {
  filterEngine: null,
  lastConfig: null,
  _initializing: false,
  _initPromise: null,
  _pendingInterceptors: new Set(),

  // 获取 URLFilter 对象（支持不同环境）
  _getURLFilter() {
    // URLFilter is now defined inline, so it's always available
    return URLFilter;
  },

  async initialize() {
    // 防止并发初始化竞态条件
    if (this._initializing && this._initPromise) {
      return this._initPromise;
    }

    this._initializing = true;
    this._initPromise = this._doInitialize();
    
    try {
      const result = await this._initPromise;
      return result;
    } finally {
      this._initializing = false;
      this._initPromise = null;
    }
  },

  async _doInitialize() {
    try {
      const config = await ConfigManager.getInterceptionConfig();
      this.filterEngine = new URLFilter.URLFilterEngine({
        mode: config.mode,
        whitelist: config.whitelist,
        blocklist: config.blocklist
      });
      this.lastConfig = config;
      console.log('[URLFilterService] Initialized successfully');
      return this.filterEngine;
    } catch (error) {
      console.error('[URLFilterService] Initialization failed:', error);
      // 创建默认引擎避免后续错误
      this.filterEngine = new URLFilter.URLFilterEngine({
        mode: 'blacklist',
        whitelist: '',
        blocklist: ''
      });
      return this.filterEngine;
    }
  },

  async refreshIfNeeded() {
    const config = await ConfigManager.getInterceptionConfig();

    // Check if config has changed
    if (this.lastConfig &&
        this.lastConfig.mode === config.mode &&
        this.lastConfig.whitelist === config.whitelist &&
        this.lastConfig.blocklist === config.blocklist) {
      return this.filterEngine;
    }

    return this.initialize();
  },

  async shouldIntercept(url) {
    await this.refreshIfNeeded();

    if (!this.filterEngine) {
      return false;
    }

    const result = this.filterEngine.shouldAllow(url);

    // Log for debugging
    if (result.matchedPattern) {
      console.log(`[URLFilterService] URL ${url} matched pattern: ${result.matchedPattern} (${result.matchType})`);
    }

    return result.allowed;
  },

  getStats() {
    return this.filterEngine?.getStats() || null;
  },

  // 跟踪正在处理的下载项，防止重复拦截
  isProcessing(downloadId) {
    return this._pendingInterceptors.has(downloadId);
  },

  markProcessing(downloadId) {
    this._pendingInterceptors.add(downloadId);
  },

  unmarkProcessing(downloadId) {
    this._pendingInterceptors.delete(downloadId);
  }
};

// ==================== Download Interceptor ====================
const DownloadInterceptor = {
  _downloadStates: new Map(),

  async shouldIntercept(downloadItem) {
    const config = await ConfigManager.getInterceptionConfig();

    if (!config.isInterception) {
      return false;
    }

    const url = downloadItem.referrer || downloadItem.url;

    if (downloadItem.error ||
        !url?.startsWith('http')) {
      return false;
    }

    // 防止重复拦截
    if (URLFilterService.isProcessing(downloadItem.id)) {
      return false;
    }

    // Use URL Filter Service for URL filtering
    const shouldInterceptUrl = await URLFilterService.shouldIntercept(url);
    if (!shouldInterceptUrl) {
      return false;
    }

    // 对于正在进行的下载，检查文件大小
    // 如果 fileSize 为 0，则拦截所有下载
    if (downloadItem.state === 'in_progress') {
      const fileSizeMB = config.fileSize !== undefined ? config.fileSize : CONSTANTS.DEFAULT_FILE_SIZE_MB;
      if (fileSizeMB === 0) {
        return true; // 0 表示拦截所有下载
      }
      const fileSizeBytes = fileSizeMB * 1024 * 1024;
      return downloadItem.fileSize >= fileSizeBytes;
    }

    // 对于 interrupted 状态的文件，如果能获取到最终大小
    if (downloadItem.state === 'interrupted' && downloadItem.fileSize > 0) {
      const fileSizeMB = config.fileSize !== undefined ? config.fileSize : CONSTANTS.DEFAULT_FILE_SIZE_MB;
      if (fileSizeMB === 0) {
        return true; // 0 表示拦截所有下载
      }
      const fileSizeBytes = fileSizeMB * 1024 * 1024;
      return downloadItem.fileSize >= fileSizeBytes;
    }

    // 如果状态未知但有文件大小信息，假设需要拦截
    return downloadItem.fileSize > 0;
  },

  async cancelDownload(downloadId, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        await chrome.downloads.cancel(downloadId);
        await chrome.downloads.erase({ id: downloadId });
        console.log(`[DownloadInterceptor] Successfully cancelled download ${downloadId}`);
        return true;
      } catch (error) {
        console.warn(`[DownloadInterceptor] Cancel attempt ${i + 1} failed for download ${downloadId}:`, error?.message || error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
      }
    }
    console.error(`[DownloadInterceptor] Failed to cancel download ${downloadId} after ${retries} attempts`);
    return false;
  },

  async intercept(downloadItem) {
    try {
      const shouldIntercept = await this.shouldIntercept(downloadItem);
      if (!shouldIntercept) {
        return;
      }

      // 标记为正在处理
      URLFilterService.markProcessing(downloadItem.id);

      const url = downloadItem.finalUrl || downloadItem.url;
      const referrer = downloadItem.referrer || '';
      const fileName = decodeURIComponent(downloadItem.filename)
        .split(/[/\\]/)
        .pop();

      console.log(`[DownloadInterceptor] Intercepting download: ${fileName} (ID: ${downloadItem.id}, URL: ${url})`);

      // 先尝试取消浏览器下载
      await this.cancelDownload(downloadItem.id, 5);

      // 然后发送 RPC 请求给 Aria2
      try {
        const rpcList = await ConfigManager.getRpcList();
        const iconUrl = await this.getDownloadIcon(downloadItem.id);
        await Aria2Client.sendDownload(rpcList[0].path, {
          link: url,
          fileName,
          icon: iconUrl
        }, rpcList[0].secret);
      } catch (rpcError) {
        console.error('[DownloadInterceptor] RPC call failed:', rpcError);
        // 如果 RPC 失败，下载仍然被取消了，这是预期行为
      }

      // 延迟解除标记，确保完全处理完毕
      setTimeout(() => {
        URLFilterService.unmarkProcessing(downloadItem.id);
      }, 1000);
    } catch (error) {
      console.error('[DownloadInterceptor] Interception failed:', error);
      URLFilterService.unmarkProcessing(downloadItem.id);
    }
  },

  async getDownloadIcon(downloadId) {
    try {
      if (!downloadId || typeof downloadId !== 'number') {
        return 'images/icon.jpg';
      }
      const iconUrl = await chrome.downloads.getFileIcon(downloadId);
      return iconUrl || 'images/icon.jpg';
    } catch {
      return 'images/icon.jpg';
    }
  }
};

// ==================== Context Menu Manager ====================
const ContextMenuManager = {
  _isUpdating: false,
  _pendingUpdate: false,

  async update() {
    // 防止并发更新
    if (this._isUpdating) {
      this._pendingUpdate = true;
      return;
    }

    this._isUpdating = true;

    try {
      await chrome.contextMenus.removeAll();

      const isEnabled = await ConfigManager.get('isContextMenus', true);
      if (!isEnabled) {
        return;
      }

      const rpcList = await ConfigManager.getRpcList();

      // Remove duplicate RPC paths to avoid "duplicate id" error
      const uniqueRpcList = [];
      const seenPaths = new Set();
      rpcList.forEach(rpc => {
        if (!seenPaths.has(rpc.path)) {
          seenPaths.add(rpc.path);
          uniqueRpcList.push(rpc);
        }
      });

      if (uniqueRpcList.length === 0) {
        return;
      }

      if (uniqueRpcList.length === 1) {
        await chrome.contextMenus.create({
          id: 'rpctool-single',
          title: uniqueRpcList[0].name,
          contexts: ['link']
        });
      } else {
        await chrome.contextMenus.create({
          id: 'rpctool-parent',
          title: chrome.i18n.getMessage('downloadWithAria2') || 'Download with Aria2',
          contexts: ['link']
        });

        for (let index = 0; index < uniqueRpcList.length; index++) {
          await chrome.contextMenus.create({
            id: `rpctool-rpc-${index}`,
            parentId: 'rpctool-parent',
            title: uniqueRpcList[index].name,
            contexts: ['link']
          });
        }
      }
    } catch (error) {
      console.error('[ContextMenuManager] Failed to update context menus:', error);
    } finally {
      this._isUpdating = false;

      // 如果有待处理的更新，执行它
      if (this._pendingUpdate) {
        this._pendingUpdate = false;
        await this.update();
      }
    }
  },

  handleClick(info) {
    if (!info.linkUrl) {
      return;
    }

    // Handle single RPC menu
    if (info.menuItemId === 'rpctool-single') {
      ConfigManager.getRpcList().then(rpcList => {
        if (rpcList.length > 0) {
          Aria2Client.sendDownload(rpcList[0].path, { link: info.linkUrl }, rpcList[0].secret);
        }
      });
      return;
    }

    // Handle parent menu (should not happen, but just in case)
    if (info.menuItemId === 'rpctool-parent') {
      return;
    }

    // Handle child RPC menus
    if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('rpctool-rpc-')) {
      const index = parseInt(info.menuItemId.replace('rpctool-rpc-', ''), 10);
      ConfigManager.getRpcList().then(rpcList => {
        // Remove duplicates to match the menu creation logic
        const uniqueRpcList = [];
        const seenPaths = new Set();
        rpcList.forEach(rpc => {
          if (!seenPaths.has(rpc.path)) {
            seenPaths.add(rpc.path);
            uniqueRpcList.push(rpc);
          }
        });

        if (index >= 0 && index < uniqueRpcList.length) {
          Aria2Client.sendDownload(uniqueRpcList[index].path, { link: info.linkUrl }, uniqueRpcList[index].secret);
        }
      });
    }
  }
};

// ==================== RPCtool Tab Manager ====================
// Modified: Open options page instead of RPCtool (rpctool folder removed)
const RPCtoolTabManager = {
  async open() {
    const optionsUrl = chrome.runtime.getURL('options.html');

    try {
      const tabs = await chrome.tabs.query({ url: optionsUrl });

      if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
          await chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        await chrome.tabs.create({ url: optionsUrl });
      }
    } catch (error) {
      console.error('[RPCtoolTabManager] Failed to open options page:', error);
      await chrome.tabs.create({ url: optionsUrl });
    }
  }
};

// ==================== Video Download Handler ====================
const VideoDownloadHandler = {
  async handle(message) {
    const isEnabled = await ConfigManager.get('isContentDetection', true);
    if (!isEnabled) {
      return;
    }

    const [command, videoInfo, url, title, fileSizeStr] = message;

    if (command !== 6 || !videoInfo?.url) {
      return;
    }

    try {
      const rpcList = await ConfigManager.getRpcList();

      let fileName = this.sanitizeFileName(title || 'video');
      if (videoInfo.fileExtension) {
        fileName += `.${videoInfo.fileExtension.toLowerCase()}`;
      }

      await Aria2Client.sendDownload(rpcList[0].path, {
        link: videoInfo.url,
        fileName
      });
    } catch (error) {
      console.error('[VideoDownloadHandler] Failed to download video:', error);
    }
  },

  sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'video';
  },

  // Handle video detected from webRequest - send to content script to show download button
  async handleWebRequestVideo(videoInfo) {
    console.log('[VideoDownloadHandler] handleWebRequestVideo called with:', videoInfo);
    
    const isEnabled = await ConfigManager.get('isWebRequestDetection', true);
    if (!isEnabled) {
      console.log('[VideoDownloadHandler] WebRequest detection disabled');
      return;
    }

    try {
      // Send to content script to show download panel instead of downloading immediately
      const tabId = videoInfo.tabId;
      console.log('[VideoDownloadHandler] Sending to tab:', tabId);
      
      if (tabId && tabId > 0) {
        chrome.tabs.sendMessage(tabId, {
          type: 'VIDEO_DETECTED',
          videoInfo: {
            url: videoInfo.url,
            fileName: videoInfo.fileName,
            fileExtension: videoInfo.fileExtension,
            contentType: videoInfo.contentType,
            size: videoInfo.size,
            type: videoInfo.type
          }
        }).then(() => {
          console.log('[VideoDownloadHandler] Message sent successfully to tab:', tabId);
        }).catch(err => {
          // Tab may not have content script injected
          console.log('[VideoDownloadHandler] Could not send to tab:', err);
        });
      }
    } catch (error) {
      console.error('[VideoDownloadHandler] Failed to send video info:', error);
    }
  },

  // Actually download the video when user clicks download button
  async downloadVideo(videoInfo) {
    try {
      console.log('[VideoDownloadHandler] Starting download for:', videoInfo);
      
      const rpcList = await ConfigManager.getRpcList();
      console.log('[VideoDownloadHandler] RPC list:', rpcList);
      
      if (!rpcList || rpcList.length === 0) {
        console.error('[VideoDownloadHandler] No RPC servers configured');
        return { success: false, error: 'No RPC servers configured' };
      }

      let fileName = this.sanitizeFileName(videoInfo.fileName || 'video');
      if (videoInfo.fileExtension && !fileName.endsWith(`.${videoInfo.fileExtension}`)) {
        fileName += `.${videoInfo.fileExtension.toLowerCase()}`;
      }

      console.log('[VideoDownloadHandler] Sending to Aria2:', {
        path: rpcList[0].path,
        link: videoInfo.url,
        fileName
      });

      const result = await Aria2Client.sendDownload(rpcList[0].path, {
        link: videoInfo.url,
        fileName
      }, rpcList[0].secret);

      console.log('[VideoDownloadHandler] Aria2 result:', result);
      return result;  // Return the full result object, not just result.success
    } catch (error) {
      console.error('[VideoDownloadHandler] Failed to download video:', error);
      return { success: false, error: error.message };
    }
  }
};

// ==================== Web Request Video Detector ====================
const WebRequestVideoDetector = {
  // Video file extensions and MIME types
  VIDEO_EXTENSIONS: /\.(mp4|webm|mkv|avi|mov|flv|f4v|m4v|mpg|mpeg|mpe|wmv|ogv|3gp|3gpp|ts|m2ts|mts|vob|rm|rmvb|asf|divx|xvid)(\?|#|$)/i,
  VIDEO_MIME_TYPES: /^video\/(mp4|webm|x-matroska|avi|quicktime|x-flv|mpeg|mp2t|x-ms-wmv|ogg|3gpp|mpegurl|x-mpegurl|x-m4v|x-m2ts)/i,
  AUDIO_EXTENSIONS: /\.(mp3|aac|m4a|ogg|oga|wav|wma|flac|alac|opus|wem)(\?|#|$)/i,
  AUDIO_MIME_TYPES: /^audio\/(mpeg|mp4|ogg|wav|x-ms-wma|flac|aac|opus|webm)/i,
  HLS_EXTENSIONS: /\.(m3u8|m3u)(\?|#|$)/i,
  DASH_EXTENSIONS: /\.(mpd)(\?|#|$)/i,

  // Skip list - domains and patterns to ignore
  SKIP_PATTERNS: [
    /google\.com/,
    /googleapis\.com/,
    /gstatic\.com/,
    /doubleclick\.net/,
    /google-analytics\.com/,
    /googletagmanager\.com/,
    /facebook\.com\/tr/,
    /analytics/,
    /tracking/,
    /beacon/,
    /pixel/,
    /\.woff2?$/,
    /\.ttf$/,
    /\.eot$/,
    /\.css$/,
    /\.js$/,
    /\.json$/,
    /\.xml$/,
    /\.svg$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.webp$/,
    /\.ico$/
  ],

  // Track processed URLs to avoid duplicates
  processedUrls: new Set(),
  processedUrlsMaxSize: 1000,

  async init() {
    if (!chrome.webRequest) {
      console.warn('[WebRequestVideoDetector] webRequest API not available');
      return;
    }

    // Check if webRequest detection is enabled
    const isEnabled = await ConfigManager.get('isWebRequestDetection', true);
    if (!isEnabled) {
      console.log('[WebRequestVideoDetector] Disabled by user settings');
      return;
    }

    // Listen for completed requests
    chrome.webRequest.onCompleted.addListener(
      (details) => this.handleRequest(details),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    // Also listen for headers received to catch redirects
    chrome.webRequest.onHeadersReceived.addListener(
      (details) => this.handleRequest(details),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    console.log('[WebRequestVideoDetector] Initialized');
  },

  shouldSkip(url) {
    return this.SKIP_PATTERNS.some(pattern => pattern.test(url));
  },

  getHeaderValue(headers, name) {
    const header = headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  },

  parseContentDisposition(disposition) {
    if (!disposition) return null;
    const match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n\r]*)\1/);
    return match ? match[2] : null;
  },

  getFileExtension(url, contentType, fileName) {
    // Try to get from filename
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext && ext.length <= 10) return ext;
    }

    // Try to get from URL
    const urlMatch = url.match(/\.([a-zA-Z0-9]{1,10})(?:[?#]|$)/);
    if (urlMatch) return urlMatch[1].toLowerCase();

    // Try to get from Content-Type
    if (contentType) {
      const mimeMap = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/x-matroska': 'mkv',
        'video/avi': 'avi',
        'video/quicktime': 'mov',
        'video/x-flv': 'flv',
        'video/mpeg': 'mpg',
        'video/mp2t': 'ts',
        'video/x-ms-wmv': 'wmv',
        'video/ogg': 'ogv',
        'video/3gpp': '3gp',
        'application/x-mpegurl': 'm3u8',
        'application/vnd.apple.mpegurl': 'm3u8',
        'application/dash+xml': 'mpd',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'm4a',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'audio/flac': 'flac',
        'audio/aac': 'aac',
        'audio/opus': 'opus'
      };
      const baseType = contentType.split(';')[0].trim().toLowerCase();
      if (mimeMap[baseType]) return mimeMap[baseType];
    }

    return null;
  },

  isVideoContent(url, contentType, fileName) {
    // Check URL extension
    if (this.VIDEO_EXTENSIONS.test(url)) return true;
    if (this.HLS_EXTENSIONS.test(url)) return true;
    if (this.DASH_EXTENSIONS.test(url)) return true;

    // Check Content-Type
    if (contentType && this.VIDEO_MIME_TYPES.test(contentType)) return true;

    // Check filename
    if (fileName && this.VIDEO_EXTENSIONS.test(fileName)) return true;

    return false;
  },

  isAudioContent(url, contentType, fileName) {
    if (this.AUDIO_EXTENSIONS.test(url)) return true;
    if (contentType && this.AUDIO_MIME_TYPES.test(contentType)) return true;
    if (fileName && this.AUDIO_EXTENSIONS.test(fileName)) return true;
    return false;
  },

  addProcessedUrl(url) {
    this.processedUrls.add(url);
    // Limit set size
    if (this.processedUrls.size > this.processedUrlsMaxSize) {
      const first = this.processedUrls.values().next().value;
      this.processedUrls.delete(first);
    }
  },

  isProcessed(url) {
    return this.processedUrls.has(url);
  },

  async handleRequest(details) {
    // Only process successful responses
    if (details.statusCode < 200 || details.statusCode >= 300) return;

    // Skip certain request types
    if (details.type === 'main_frame' || details.type === 'sub_frame') return;

    const url = details.url;

    // Skip if already processed
    if (this.isProcessed(url)) return;

    // Skip unwanted patterns
    if (this.shouldSkip(url)) return;

    // Get response headers
    const headers = details.responseHeaders || [];
    const contentType = this.getHeaderValue(headers, 'content-type');
    const contentLength = this.getHeaderValue(headers, 'content-length');
    const contentDisposition = this.getHeaderValue(headers, 'content-disposition');

    // Parse filename from Content-Disposition
    const dispositionFileName = this.parseContentDisposition(contentDisposition);

    // Get file extension
    const fileExtension = this.getFileExtension(url, contentType, dispositionFileName);

    // Check if it's video or audio content
    const isVideo = this.isVideoContent(url, contentType, dispositionFileName);
    const isAudio = this.isAudioContent(url, contentType, dispositionFileName);

    if (!isVideo && !isAudio) return;

    // Skip small files (likely ads or previews)
    const size = parseInt(contentLength) || 0;
    if (size > 0 && size < 524288) { // Less than 512KB
      return;
    }

    // Mark as processed
    this.addProcessedUrl(url);

    // Determine file type label
    let typeLabel = 'Video';
    if (isAudio) typeLabel = 'Audio';
    if (this.HLS_EXTENSIONS.test(url)) typeLabel = 'HLS Stream';
    if (this.DASH_EXTENSIONS.test(url)) typeLabel = 'DASH Stream';

    // Build filename
    let fileName = dispositionFileName || '';
    if (!fileName) {
      try {
        const urlObj = new URL(url);
        const pathName = urlObj.pathname;
        fileName = pathName.split('/').pop() || 'download';
        // Remove query parameters from filename
        fileName = fileName.split('?')[0];
      } catch {
        fileName = 'download';
      }
    }

    // Clean up filename
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (!fileName || fileName === 'download') {
      fileName = `${typeLabel.toLowerCase().replace(' ', '_')}_${Date.now()}`;
    }

    console.log(`[WebRequestVideoDetector] Detected ${typeLabel}:`);
    console.log('  URL:', url);
    console.log('  FileName:', fileName);
    console.log('  FileExtension:', fileExtension);
    console.log('  Size:', size > 0 ? `${(size / 1048576).toFixed(2)} MB` : 'Unknown');
    console.log('  Type:', typeLabel);

    // Send to video download handler
    VideoDownloadHandler.handleWebRequestVideo({
      url,
      fileName,
      fileExtension: fileExtension || (isVideo ? 'mp4' : 'mp3'),
      contentType,
      size,
      type: typeLabel.toLowerCase(),
      tabId: details.tabId
    });
  }
};

// ==================== Event Listeners ====================
chrome.contextMenus.onClicked.addListener((info) => {
  ContextMenuManager.handleClick(info);
});

chrome.action.onClicked.addListener(() => {
  RPCtoolTabManager.open();
});

chrome.notifications.onClicked.addListener(() => {
  // Notification click does nothing - intentionally left empty
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.rpcLists || changes.isContextMenus) {
    ContextMenuManager.update();
  }

  // Refresh filter if filter settings changed
  if (changes.isBlacklistMode || changes.whitelist || changes.blocklist) {
    URLFilterService.initialize();
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'yuexuan-video') {
    port.onMessage.addListener((message) => {
      VideoDownloadHandler.handle(message);
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'DOWNLOAD_VIDEO') {
    console.log('[Background] Received DOWNLOAD_VIDEO request:', request);
    if (!request.videoInfo || !request.videoInfo.url) {
      console.error('[Background] Invalid videoInfo:', request.videoInfo);
      sendResponse({ success: false, error: 'Invalid videoInfo: missing url' });
      return true;
    }
    VideoDownloadHandler.downloadVideo(request.videoInfo).then(result => {
      // result is now an object with success, gid, and error properties
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
});

// ==================== Initialization ====================
const ExtensionInitializer = {
  async init() {
    try {
      // Initialize URL Filter Service
      await URLFilterService.initialize();

      await ContextMenuManager.update();

      const isAutoRename = await ConfigManager.get('isAutoRename', true);

      if (chrome.downloads) {
        if (isAutoRename && chrome.downloads.onDeterminingFilename) {
          chrome.downloads.onDeterminingFilename.addListener((downloadItem) => {
            DownloadInterceptor.intercept(downloadItem);
          });
        } else if (chrome.downloads.onCreated) {
          chrome.downloads.onCreated.addListener((downloadItem) => {
            DownloadInterceptor.intercept(downloadItem);
          });
        }
      }

      console.log('[ExtensionInitializer] RPCtool Extension initialized successfully');
      console.log('[ExtensionInitializer] URL Filter stats:', URLFilterService.getStats());
    } catch (error) {
      console.error('[ExtensionInitializer] Initialization failed:', error);
    }
  }
};

// Start the extension
ExtensionInitializer.init();

// Initialize WebRequest Video Detector
WebRequestVideoDetector.init();
