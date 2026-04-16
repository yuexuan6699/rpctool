/**
 * RPCtool Chrome Extension - Options Page
 * Settings management and UI controller with enhanced validation
 * @version 2.0.0
 */

// ==================== Constants ====================
const CONSTANTS = {
  DEFAULT_RPC: 'http://localhost:16800/jsonrpc',
  DEFAULT_FILE_SIZE_MB: 10,
  NOTIFICATION_DURATION: 3000,
  LANGUAGES: ['en', 'zh_CN'],
  FILTER_MODE: {
    BLACKLIST: 'blacklist',
    WHITELIST: 'whitelist'
  }
};

// ==================== I18n Texts ====================
const i18nText = {
  en: {
    pageTitle: 'yuexuan-rpctool Settings',
    generalSettingsTitle: 'General Settings',
    contextMenuLabel: 'Enable Context Menu',
    autoRenameLabel: 'Auto Rename',
    interceptionLabel: 'Download Interception',
    fileSizeLabel: 'File Size (MB):',
    fileSizeHint: 'Minimum file size to trigger interception (enter 0 to intercept all downloads)',
    contentDetectionTitle: 'Content Detection',
    contentDetectionLabel: 'Content Detection Panel',
    contentDetectionInfo: 'Detect all videos and audio on any website and show download panel',
    webRequestDetectionLabel: 'Network Request Detection',
    webRequestDetectionInfo: 'Monitor all network requests to detect video/audio streams (mp4, m3u8, mpd, etc.) from any website',
    rpcServersTitle: 'RPC Servers',
    addRpcLabel: 'Add RPC',
    urlFiltersTitle: 'URL Filters',
    urlFiltersDesc: 'Control which sites should be intercepted. Use patterns to match URLs or domains.',
    blacklistModeLabel: 'Blacklist Mode',
    whitelistModeLabel: 'Whitelist Mode',
    filterModeInfo: 'Blacklist: Intercept all downloads except from listed sites. Whitelist: Only intercept downloads from listed sites.',
    whitelistLabel: 'Whitelist',
    blocklistLabel: 'Blacklist',
    saveLabel: 'Save Settings',
    resetLabel: 'Reset to Default',
    saveSuccess: 'Settings saved successfully!',
    resetConfirm: 'Are you sure you want to reset all settings?',
    settingsReset: 'Settings reset to default!',
    removeLabel: 'Remove',
    rpcNamePlaceholder: 'Name',
    rpcPathPlaceholder: 'JSON-RPC Path',
    rpcSecretPlaceholder: 'RPC Secret',
    patternHelpTitle: 'Pattern Syntax',
    rulesCount: 'rules',
    validCount: 'Valid',
    invalidCount: 'Invalid',
    validationError: 'Validation Error',
    validationWarning: 'Warning',
    invalidFileSize: 'File size must be a non-negative number (0 or greater)',
    invalidRpcUrl: 'Invalid RPC URL format',
    emptyRpcName: 'RPC name cannot be empty',
    patternSyntax: [
      'example.com - Contains match (matches anywhere in URL)',
      '*.example.com - Wildcard match (matches subdomains)',
      '^https:// - Starts with match (^ prefix)',
      '.exe$ - Ends with match ($ suffix)',
      '/regex/ - Regular expression (wrapped in /)',
      'Lines starting with # are treated as comments'
    ]
  },
  zh_CN: {
    pageTitle: '月晅-RPCtool 设置',
    generalSettingsTitle: '常规设置',
    contextMenuLabel: '启用右键菜单',
    autoRenameLabel: '自动文件重命名',
    interceptionLabel: '下载拦截',
    fileSizeLabel: '文件大小 (MB):',
    fileSizeHint: '触发拦截的最小文件大小（输入0拦截所有下载）',
    contentDetectionTitle: '内容检测',
    contentDetectionLabel: '内容检测面板',
    contentDetectionInfo: '检测所有网站的视频和音频并显示下载面板',
    webRequestDetectionLabel: '网络请求检测',
    webRequestDetectionInfo: '监控所有网络请求以检测视频/音频流（mp4、m3u8、mpd等）',
    rpcServersTitle: 'RPC 服务器',
    addRpcLabel: '添加 RPC',
    urlFiltersTitle: '网址过滤器',
    urlFiltersDesc: '控制哪些网站应该被拦截。使用模式匹配 URL 或域名。',
    blacklistModeLabel: '黑名单模式',
    whitelistModeLabel: '白名单模式',
    filterModeInfo: '黑名单：拦截所有下载，除了列表中的网站。白名单：只拦截列表中的网站。',
    whitelistLabel: '白名单',
    blocklistLabel: '黑名单',
    saveLabel: '保存设置',
    resetLabel: '恢复默认',
    saveSuccess: '设置保存成功!',
    resetConfirm: '确定要重置所有设置吗?',
    settingsReset: '设置已恢复默认!',
    removeLabel: '删除',
    rpcNamePlaceholder: '名称',
    rpcPathPlaceholder: 'JSON-RPC 路径',
    rpcSecretPlaceholder: 'RPC 密钥',
    patternHelpTitle: '模式语法',
    rulesCount: '条规则',
    validCount: '有效',
    invalidCount: '无效',
    validationError: '验证错误',
    validationWarning: '警告',
    invalidFileSize: '文件大小必须是非负数（0或更大）',
    invalidRpcUrl: 'RPC URL 格式无效',
    emptyRpcName: 'RPC 名称不能为空',
    patternSyntax: [
      'example.com - 包含匹配（匹配 URL 中任意位置）',
      '*.example.com - 通配符匹配（匹配子域名）',
      '^https:// - 开头匹配（^ 前缀）',
      '.exe$ - 结尾匹配（$ 后缀）',
      '/regex/ - 正则表达式（用 / 包裹）',
      '以 # 开头的行被视为注释'
    ]
  }
};

// ==================== Configuration Manager ====================
const ConfigManager = {
  async get(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error(`[ConfigManager] Failed to get "${key}":`, error);
      return defaultValue;
    }
  },

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`[ConfigManager] Failed to set "${key}":`, error);
      return false;
    }
  },

  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('[ConfigManager] Failed to clear:', error);
      return false;
    }
  }
};

// ==================== I18n Manager ====================
const I18nManager = {
  currentLang: 'en',

  getText(key) {
    return i18nText[this.currentLang]?.[key] || i18nText.en[key] || key;
  },

  setLanguage(lang) {
    this.currentLang = i18nText[lang] ? lang : 'en';
    this.updatePageText();
  },

  updatePageText() {
    const text = i18nText[this.currentLang] || i18nText.en;

    const elements = {
      'pageTitle': text.pageTitle,
      'generalSettingsTitle': text.generalSettingsTitle,
      'contextMenuLabel': text.contextMenuLabel,
      'autoRenameLabel': text.autoRenameLabel,
      'interceptionLabel': text.interceptionLabel,
      'fileSizeLabel': text.fileSizeLabel,
      'fileSizeHint': text.fileSizeHint,
      'contentDetectionTitle': text.contentDetectionTitle,
      'contentDetectionLabel': text.contentDetectionLabel,
      'contentDetectionInfo': text.contentDetectionInfo,
      'webRequestDetectionLabel': text.webRequestDetectionLabel,
      'webRequestDetectionInfo': text.webRequestDetectionInfo,
      'rpcServersTitle': text.rpcServersTitle,
      'addRpcLabel': text.addRpcLabel,
      'urlFiltersTitle': text.urlFiltersTitle,
      'urlFiltersDesc': text.urlFiltersDesc,
      'blacklistModeLabel': text.blacklistModeLabel,
      'whitelistModeLabel': text.whitelistModeLabel,
      'filterModeInfo': text.filterModeInfo,
      'whitelistLabel': text.whitelistLabel,
      'blocklistLabel': text.blocklistLabel,
      'saveLabel': text.saveLabel,
      'resetLabel': text.resetLabel,
      'removeLabel': text.removeLabel,
      'patternHelpTitle': text.patternHelpTitle
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    // Update pattern help list
    const patternHelpList = document.getElementById('patternHelpList');
    if (patternHelpList && text.patternSyntax) {
      patternHelpList.innerHTML = text.patternSyntax
        .map(syntax => `<li>${syntax}</li>`)
        .join('');
    }

    document.title = text.pageTitle;
  }
};

// ==================== Validation Manager ====================
const ValidationManager = {
  validateFileSize(value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      return { valid: false, error: I18nManager.getText('invalidFileSize') };
    }
    return { valid: true, value: num };
  },

  validateRpcUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: I18nManager.getText('invalidRpcUrl') };
    }

    try {
      const trimmed = url.trim();
      if (!trimmed) {
        return { valid: false, error: I18nManager.getText('invalidRpcUrl') };
      }

      // Basic URL validation
      if (!trimmed.match(/^https?:\/\/.+/i)) {
        return { valid: false, error: I18nManager.getText('invalidRpcUrl') };
      }

      return { valid: true, value: trimmed };
    } catch {
      return { valid: false, error: I18nManager.getText('invalidRpcUrl') };
    }
  },

  validateRpcName(name) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { valid: false, error: I18nManager.getText('emptyRpcName') };
    }
    return { valid: true, value: name.trim() };
  }
};

// ==================== Filter UI Manager ====================
const FilterUIManager = {
  blacklistFilter: null,
  whitelistFilter: null,

  init() {
    this.bindEvents();
    this.updateFilterModeUI();
  },

  bindEvents() {
    const blacklistTextarea = document.getElementById('blocklist');
    const whitelistTextarea = document.getElementById('whitelist');

    if (blacklistTextarea) {
      blacklistTextarea.addEventListener('input', () => this.validateBlacklist());
    }

    if (whitelistTextarea) {
      whitelistTextarea.addEventListener('input', () => this.validateWhitelist());
    }

    // Filter mode radio buttons
    const modeRadios = document.querySelectorAll('input[name="filterMode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.updateFilterModeUI());
    });
  },

  validateBlacklist() {
    const textarea = document.getElementById('blocklist');
    const value = textarea.value;

    this.blacklistFilter = new window.URLFilter.FilterList(value);
    this.updateFilterStats('blacklist', this.blacklistFilter);
    this.updateFilterVisualState(textarea, this.blacklistFilter);

    return this.blacklistFilter;
  },

  validateWhitelist() {
    const textarea = document.getElementById('whitelist');
    const value = textarea.value;

    this.whitelistFilter = new window.URLFilter.FilterList(value);
    this.updateFilterStats('whitelist', this.whitelistFilter);
    this.updateFilterVisualState(textarea, this.whitelistFilter);

    return this.whitelistFilter;
  },

  updateFilterStats(prefix, filterList) {
    const stats = filterList.getStats();

    const badge = document.getElementById(`${prefix}Badge`);
    const validSpan = document.getElementById(`${prefix}Valid`);
    const invalidSpan = document.getElementById(`${prefix}Invalid`);

    if (badge) {
      badge.textContent = `${stats.valid} ${I18nManager.getText('rulesCount')}`;
    }

    if (validSpan) {
      validSpan.textContent = `${I18nManager.getText('validCount')}: ${stats.valid}`;
    }

    if (invalidSpan) {
      invalidSpan.textContent = `${I18nManager.getText('invalidCount')}: ${stats.invalid}`;
    }
  },

  updateFilterVisualState(textarea, filterList) {
    const stats = filterList.getStats();
    const feedback = document.getElementById(textarea.id === 'blocklist' ? 'blacklistFeedback' : 'whitelistFeedback');

    textarea.classList.remove('error', 'success');

    if (stats.invalid > 0) {
      textarea.classList.add('error');
      if (feedback) {
        const invalidPatterns = filterList.invalidPatterns
          .map(p => `Line ${p.lineNumber}: ${p.error}`)
          .join('\n');
        feedback.textContent = invalidPatterns;
        feedback.className = 'validation-feedback error show';
      }
    } else if (stats.valid > 0) {
      textarea.classList.add('success');
      if (feedback) {
        feedback.className = 'validation-feedback';
      }
    } else {
      if (feedback) {
        feedback.className = 'validation-feedback';
      }
    }
  },

  updateFilterModeUI() {
    const isBlacklist = document.getElementById('modeBlacklist')?.checked;
    const blacklistContainer = document.getElementById('blacklistContainer');
    const whitelistContainer = document.getElementById('whitelistContainer');

    if (blacklistContainer) {
      const badge = blacklistContainer.querySelector('.badge');
      if (isBlacklist) {
        badge.classList.remove('inactive');
        blacklistContainer.style.opacity = '1';
      } else {
        badge.classList.add('inactive');
        blacklistContainer.style.opacity = '0.6';
      }
    }

    if (whitelistContainer) {
      const badge = whitelistContainer.querySelector('.badge');
      if (!isBlacklist) {
        badge.classList.remove('inactive');
        whitelistContainer.style.opacity = '1';
      } else {
        badge.classList.add('inactive');
        whitelistContainer.style.opacity = '0.6';
      }
    }
  },

  getCurrentMode() {
    const blacklistRadio = document.getElementById('modeBlacklist');
    return blacklistRadio?.checked ? CONSTANTS.FILTER_MODE.BLACKLIST : CONSTANTS.FILTER_MODE.WHITELIST;
  },

  getFilterData() {
    return {
      mode: this.getCurrentMode(),
      whitelist: document.getElementById('whitelist')?.value || '',
      blocklist: document.getElementById('blocklist')?.value || ''
    };
  }
};

// ==================== RPC List Manager ====================
const RpcListManager = {
  container: null,

  init() {
    this.container = document.getElementById('rpcList');
  },

  async render() {
    if (!this.container) return;

    const rpcLists = await ConfigManager.get('rpcLists') ||
      [{ name: 'Motrix RPC', path: CONSTANTS.DEFAULT_RPC }];

    this.container.innerHTML = '';
    rpcLists.forEach((rpc, index) => {
      this.container.appendChild(this.createRpcItem(rpc, index));
    });
  },

  createRpcItem(rpc, index) {
    const div = document.createElement('div');
    div.className = 'rpc-item';
    div.dataset.index = index;

    div.innerHTML = `
      <input type="text" class="rpc-name" value="${this.escapeHtml(rpc.name)}"
             placeholder="${I18nManager.getText('rpcNamePlaceholder')}" required>
      <input type="text" class="rpc-path" value="${this.escapeHtml(rpc.path)}"
             placeholder="${I18nManager.getText('rpcPathPlaceholder')}" required>
      <input type="text" class="rpc-secret" value="${this.escapeHtml(rpc.secret || '')}"
             placeholder="${I18nManager.getText('rpcSecretPlaceholder')}">
      <button type="button" class="btn btn-reset remove-rpc" data-index="${index}">
        ${I18nManager.getText('removeLabel')}
      </button>
    `;

    // Add validation
    const nameInput = div.querySelector('.rpc-name');
    const pathInput = div.querySelector('.rpc-path');

    nameInput.addEventListener('blur', () => {
      const result = ValidationManager.validateRpcName(nameInput.value);
      this.updateInputValidationState(nameInput, result);
    });

    pathInput.addEventListener('blur', () => {
      const result = ValidationManager.validateRpcUrl(pathInput.value);
      this.updateInputValidationState(pathInput, result);
    });

    div.querySelector('.remove-rpc').addEventListener('click', () => this.remove(index));
    return div;
  },

  updateInputValidationState(input, result) {
    input.classList.remove('error', 'success');
    if (!result.valid) {
      input.classList.add('error');
    } else {
      input.classList.add('success');
    }
  },

  async add() {
    const rpcLists = await ConfigManager.get('rpcLists') || [];
    rpcLists.push({ name: 'New RPC', path: CONSTANTS.DEFAULT_RPC });
    await ConfigManager.set('rpcLists', rpcLists);
    await this.render();
  },

  async remove(index) {
    const rpcLists = await ConfigManager.get('rpcLists') || [];
    if (rpcLists.length <= 1) {
      alert('At least one RPC server is required');
      return;
    }
    rpcLists.splice(index, 1);
    await ConfigManager.set('rpcLists', rpcLists);
    await this.render();
  },

  getCurrentList() {
    if (!this.container) return [];

    const items = this.container.querySelectorAll('.rpc-item');
    const list = [];
    let hasErrors = false;

    items.forEach(item => {
      const nameInput = item.querySelector('.rpc-name');
      const pathInput = item.querySelector('.rpc-path');
      const secretInput = item.querySelector('.rpc-secret');

      const nameResult = ValidationManager.validateRpcName(nameInput.value);
      const pathResult = ValidationManager.validateRpcUrl(pathInput.value);

      if (!nameResult.valid || !pathResult.valid) {
        hasErrors = true;
        this.updateInputValidationState(nameInput, nameResult);
        this.updateInputValidationState(pathInput, pathResult);
        return;
      }

      list.push({
        name: nameResult.value,
        path: pathResult.value,
        secret: secretInput.value.trim()
      });
    });

    return { list, hasErrors };
  },

  escapeHtml(text) {
    if (text === null || text === undefined) {
      return '';
    }
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// ==================== Settings Manager ====================
const SettingsManager = {
  async load() {
    try {
      // 使用 Promise.allSettled 替代 Promise.all，确保单个失败不影响其他
      const results = await Promise.allSettled([
        ConfigManager.get('isContextMenus', true),
        ConfigManager.get('isAutoRename', true),
        ConfigManager.get('isInterception', true),
        ConfigManager.get('isContentDetection', true),
        ConfigManager.get('isWebRequestDetection', true),
        ConfigManager.get('fileSize', CONSTANTS.DEFAULT_FILE_SIZE_MB),
        ConfigManager.get('isBlacklistMode', true),
        ConfigManager.get('whitelist', ''),
        ConfigManager.get('blocklist', ''),
        ConfigManager.get('language', 'zh_CN')
      ]);

      // 提取结果，失败的使用默认值
      const [
        isContextMenus, isAutoRename, isInterception, isContentDetection, isWebRequestDetection,
        fileSize, isBlacklistMode, whitelist, blocklist, language
      ] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        console.warn(`[SettingsManager] Failed to load setting at index ${index}:`, result.reason);
        // 返回默认值
        const defaults = [true, true, true, true, true, CONSTANTS.DEFAULT_FILE_SIZE_MB, true, '', '', 'zh_CN'];
        return defaults[index];
      });

      this.setElementValue('isContextMenus', isContextMenus);
      this.setElementValue('isAutoRename', isAutoRename);
      this.setElementValue('isInterception', isInterception);
      this.setElementValue('isContentDetection', isContentDetection);
      this.setElementValue('isWebRequestDetection', isWebRequestDetection);
      this.setElementValue('fileSize', fileSize);
      this.setElementValue('whitelist', whitelist);
      this.setElementValue('blocklist', blocklist);
      this.setElementValue('languageSelect', language);

      // Set filter mode
      const modeBlacklist = document.getElementById('modeBlacklist');
      const modeWhitelist = document.getElementById('modeWhitelist');
      if (modeBlacklist && modeWhitelist) {
        modeBlacklist.checked = isBlacklistMode;
        modeWhitelist.checked = !isBlacklistMode;
      }

      I18nManager.setLanguage(language);
      await RpcListManager.render();

      // Initialize filter validation
      FilterUIManager.validateBlacklist();
      FilterUIManager.validateWhitelist();
      FilterUIManager.updateFilterModeUI();
    } catch (error) {
      console.error('[SettingsManager] Failed to load settings:', error);
    }
  },

  async save() {
    try {
      // Validate file size
      const fileSizeInput = document.getElementById('fileSize');
      const fileSizeResult = ValidationManager.validateFileSize(fileSizeInput.value);
      if (!fileSizeResult.valid) {
        this.showValidationError(fileSizeInput, fileSizeResult.error);
        return false;
      }

      // Validate RPC list
      const { list: rpcList, hasErrors: rpcHasErrors } = RpcListManager.getCurrentList();
      if (rpcHasErrors) {
        this.showMessage(I18nManager.getText('validationError'), 'error');
        return false;
      }

      // Get filter data
      const filterData = FilterUIManager.getFilterData();

      const settings = {
        isContextMenus: document.getElementById('isContextMenus')?.checked ?? true,
        isAutoRename: document.getElementById('isAutoRename')?.checked ?? true,
        isInterception: document.getElementById('isInterception')?.checked ?? true,
        isContentDetection: document.getElementById('isContentDetection')?.checked ?? true,
        isWebRequestDetection: document.getElementById('isWebRequestDetection')?.checked ?? true,
        fileSize: fileSizeResult.value,
        isBlacklistMode: filterData.mode === CONSTANTS.FILTER_MODE.BLACKLIST,
        whitelist: filterData.whitelist,
        blocklist: filterData.blocklist,
        language: document.getElementById('languageSelect')?.value || 'zh_CN',
        rpcLists: rpcList
      };

      const promises = Object.entries(settings).map(([key, value]) =>
        ConfigManager.set(key, value)
      );

      await Promise.all(promises);

      this.showMessage(I18nManager.getText('saveSuccess'), 'success');
      return true;
    } catch (error) {
      console.error('[SettingsManager] Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
      return false;
    }
  },

  showValidationError(input, message) {
    input.classList.add('error');
    input.focus();
    this.showMessage(message, 'error');

    // Remove error class after 3 seconds
    setTimeout(() => {
      input.classList.remove('error');
    }, 3000);
  },

  async reset() {
    const confirmed = confirm(I18nManager.getText('resetConfirm'));

    if (!confirmed) return;

    try {
      await ConfigManager.clear();
      await this.load();
      this.showMessage(I18nManager.getText('settingsReset'), 'success');
    } catch (error) {
      console.error('[SettingsManager] Failed to reset settings:', error);
      this.showMessage('Failed to reset settings', 'error');
    }
  },

  setElementValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    if (element.type === 'checkbox') {
      element.checked = value;
    } else {
      element.value = value;
    }
  },

  showMessage(message, type = 'success') {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;

    setTimeout(() => {
      messageEl.className = 'message';
    }, CONSTANTS.NOTIFICATION_DURATION);
  }
};

// ==================== Event Handlers ====================
const EventHandlers = {
  init() {
    // Save button
    document.getElementById('saveBtn')?.addEventListener('click', () => {
      SettingsManager.save();
    });

    // Reset button
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      SettingsManager.reset();
    });

    // Add RPC button
    document.getElementById('addRpc')?.addEventListener('click', () => {
      RpcListManager.add();
    });

    // Language selector
    document.getElementById('languageSelect')?.addEventListener('change', (e) => {
      I18nManager.setLanguage(e.target.value);
      RpcListManager.render();
    });

    // File size validation on blur
    document.getElementById('fileSize')?.addEventListener('blur', (e) => {
      const result = ValidationManager.validateFileSize(e.target.value);
      if (!result.valid) {
        e.target.classList.add('error');
      } else {
        e.target.classList.remove('error');
        e.target.classList.add('success');
      }
    });

    // File size input - remove error on input
    document.getElementById('fileSize')?.addEventListener('input', (e) => {
      e.target.classList.remove('error', 'success');
    });
  }
};

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
  RpcListManager.init();
  FilterUIManager.init();
  SettingsManager.load();
  EventHandlers.init();
});
