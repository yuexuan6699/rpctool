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

// ==================== Export for different environments ====================
const URLFilter = {
  URLFilterEngine,
  FilterList,
  URLMatcher,
  URLPatternParser,
  FILTER_CONSTANTS
};

// Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLFilter;
}

// Browser window
if (typeof window !== 'undefined') {
  window.URLFilter = URLFilter;
}

// Web Worker / Service Worker (self)
if (typeof self !== 'undefined') {
  self.URLFilter = URLFilter;
}
