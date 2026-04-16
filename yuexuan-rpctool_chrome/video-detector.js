/**
 * RPCtool Chrome Extension - Video Detector
 * Detects and manages video downloads on supported sites
 * Based on NeatDownloadManager implementation
 * @version 2.0.0
 */

// ==================== Constants ====================
const CONSTANTS = {
  ICON_URL: chrome.runtime.getURL('images/logo32.png'),
  CLOSE_URL: chrome.runtime.getURL('images/close16.png'),
  SMALL_FILE_THRESHOLD: 6291456, // 6MB
  SCAN_INTERVAL: 5000,
  POSITION_CHECK_INTERVAL: 500,
  POSITION_CHECK_MAX_COUNT: 10,
  FACEBOOK_VIDEO_DELAY: 4000,
  SUPPORTED_SITES: ['*'],
  VIDEO_ELEMENTS: ['VIDEO', 'AUDIO', 'OBJECT', 'EMBED']
};

// ==================== Utility Functions ====================
const Utils = {
  getElement(id) {
    return document.getElementById(id);
  },

  isFacebook() {
    const host = document.location.host.toLowerCase();
    const index = host.indexOf('facebook.com');
    return index !== -1 && host.length - index === 12;
  },

  hashCode(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash;
  },

  getOffset(element) {
    if (!element) return null;
    try {
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left + window.pageXOffset),
        top: Math.round(rect.top + window.pageYOffset)
      };
    } catch (e) {
      return null;
    }
  },

  formatFileSize(fileSize, fileExtension) {
    const ext = (fileExtension || 'MP4').toUpperCase();
    if (!fileSize || fileSize < 0) {
      return `${ext} File`;
    }
    if (fileSize < 1000) return `${fileSize} Bytes`;
    if (fileSize < 1e6) return `${(fileSize / 1e3).toFixed(1)} KB`;
    if (fileSize < 1e9) return `${(fileSize / 1e6).toFixed(2)} MB`;
    return `${(fileSize / 1e9).toFixed(3)} GB`;
  },

  formatVideoLabel(videoInfo) {
    const ext = (videoInfo.fileExtension || 'mp4').toUpperCase();
    const quality = videoInfo.quality ? ` [${videoInfo.quality}]` : '';
    
    if (!videoInfo.fileSize || videoInfo.fileSize <= 0) {
      return `${ext}${quality}`;
    }
    
    const size = Utils.formatFileSize(videoInfo.fileSize);
    return `${ext}${quality} ${size}`;
  }
};

// ==================== Video Panel Class ====================
class VideoPanel {
  constructor(detector, videoElement, panelId) {
    this.detector = detector;
    this.video = videoElement;
    this.panelId = panelId;
    this.element = null;
    this.tableId = `neatTable${panelId}`;
    this.headerCellId = `neatHCell${panelId}`;
    this.closeImgId = `CloseImg${panelId}`;
    this.position = { left: 0, top: 0 };
    this.isExpanded = false; // false = collapsed (show only header), true = expanded (show all)
    this.items = [];
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.headerClicked = false;
    this.hasVideoElement = !!videoElement;

    this.updatePosition = this.updatePosition.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseOut.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
  }

  updatePosition() {
    if (this.element) {
      this.element.style.left = this.position.left + 'px';
      this.element.style.top = this.position.top + 'px';
      this.element.style.zIndex = parseInt(this.element.style.zIndex || 100000000) + 500;
    }
  }

  toggleDisplay(forceExpand) {
    console.log('[VideoPanel] toggleDisplay called, forceExpand:', forceExpand, 'isExpanded:', this.isExpanded);
    
    // If forceExpand is true, always expand; otherwise toggle
    if (forceExpand === true) {
      this.isExpanded = true;
    } else if (forceExpand === false) {
      this.isExpanded = false;
    } else {
      // Toggle
      this.isExpanded = !this.isExpanded;
    }
    
    const rows = Utils.getElement(this.tableId)?.rows;
    if (!rows) {
      console.log('[VideoPanel] toggleDisplay: no rows found');
      return;
    }
    
    console.log('[VideoPanel] toggleDisplay: isExpanded now', this.isExpanded, 'rows:', rows.length);
    for (let i = 1; i < rows.length; i++) {
      rows[i].style.display = this.isExpanded ? '' : 'none';
      console.log('[VideoPanel] toggleDisplay: row', i, 'display set to', this.isExpanded ? 'visible' : 'hidden');
    }
  }

  onDownload(index) {
    console.log('[VideoPanel] onDownload called with index:', index, 'items:', this.items);
    this.toggleDisplay(true);
    const videoId = this.items[index];
    console.log('[VideoPanel] Sending download request for videoId:', videoId);
    this.detector.sendDownloadRequest(videoId);
  }

  createVideoRow(index) {
    const detector = this.detector;
    const videoInfo = detector.videoData[this.items[index]];
    const table = Utils.getElement(this.tableId);
    if (!table) return;

    const row = table.insertRow(-1);
    row.style.cssText = 'all:revert;padding:0px;margin:0px;width:100%;line-height:100% !important;height:21px !important';
    // Header row (index 0) is always visible, other rows are hidden until expanded
    row.style.display = index === 0 ? '' : 'none';

    const cell = row.insertCell(0);
    cell.style.cssText = 'all:revert;letter-spacing:normal;line-height:100% !important;width:100%;height:21px !important;margin:0px;padding:0px;padding-left:5px;vertical-align:middle;color:black !important;cursor:default;border:dotted 1px black;background:#c9dff2 !important;direction:ltr;text-align:left;font-family:tahoma !important;font-style:normal;font-weight:bold;font-size:8pt !important;';

    const label = Utils.formatVideoLabel(videoInfo);

    if (index === 0) {
      // First item - create header row with icon and close button
      cell.innerHTML = (
        `<table style='all:revert;border-spacing:0px;border-collapse:separate;padding:0px;margin:0px;width:100%;border:solid 1px black;direction:ltr;line-height:100% !important;'>` +
        `<tr style='all:revert;padding:0px;margin:0px;line-height:100% !important;height:21px !important'>` +
        `<td style='all:revert;background:#c9dff2 !important;padding:0px;margin:0px;width:20px;height:21px !important;text-align:center;vertical-align:middle;line-height:100% !important;'>` +
        `<img src='${CONSTANTS.ICON_URL}' style='width:16px;height:16px;cursor:pointer;' title='YAAW Video Panel'/>` +
        `</td>` +
        `<td id='HeaderCellID' style='all:revert;letter-spacing:normal;padding:0px;margin:0px;vertical-align:middle;color:black !important;cursor:default;background:#c9dff2 !important;direction:ltr;text-align:center;font-family:tahoma !important;font-style:normal;font-weight:bold;font-size:8pt !important;height:21px !important;line-height:100% !important;'></td>` +
        `<td style='all:revert;background:#c9dff2 !important;padding:0px;margin:0px;width:20px;height:21px !important;text-align:center;vertical-align:middle;line-height:100% !important;'>` +
        `<img id='CloseImgID' src='${CONSTANTS.CLOSE_URL}' style='width:16px;height:16px;cursor:pointer;'/>` +
        `</td></tr></table>`
      ).replace('HeaderCellID', this.headerCellId).replace('CloseImgID', this.closeImgId);

      cell.style.paddingLeft = '0px';

      const headerCell = Utils.getElement(this.headerCellId);
      if (headerCell) {
        // Show file count if multiple files, otherwise show filename
        const headerText = this.items.length > 1 ? ` ${this.items.length} Files` : ' ' + label;
        headerCell.innerText = headerText;
        headerCell.onmouseover = function() { this.style.color = 'red'; };
        headerCell.onmouseout = function() { this.style.color = 'black'; };
        headerCell.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('[VideoPanel] Header cell clicked, items:', this.items.length);
          if (this.items.length === 1) {
            // Only one file - download it
            this.onDownload(0);
          } else {
            // Multiple files - toggle display to show all
            this.toggleDisplay();
          }
        };
      }

      const closeImg = Utils.getElement(this.closeImgId);
      if (closeImg) {
        closeImg.onclick = () => {
          if (this.element) this.element.style.display = 'none';
        };
      }
    } else {
      // Additional items - show as numbered download buttons below header
      cell.innerText = ` ${index}. ${label}`;
      cell.style.paddingLeft = '10px';
      cell.onmouseover = function() {
        this.style.background = 'white';
        this.style.color = 'red';
      };
      cell.onmouseout = function() {
        this.style.background = '#c9dff2';
        this.style.color = 'black';
      };
      row.onmousedown = () => {
        this.onDownload(index);
      };
    }
  }

  addVideo(videoId) {
    const detector = this.detector;
    const videoInfo = detector.videoData[videoId];
    
    // Always use fixed position at top-left corner
    const positionType = 'fixed';
    this.position = {
      left: 10,
      top: 10
    };

    if (!this.element) {
      // Create panel container
      this.element = document.createElement('DIV');
      this.element.style.cssText = `all:revert;padding:0px;margin:0px;position:${positionType};z-index:2147483647;width:228px;left:${this.position.left}px;top:${this.position.top}px;direction:ltr;text-align:center;background:#c9dff2 !important;line-height:100% !important;`;
      this.element.id = `yuexuanDiv${this.panelId}`;
      document.body.appendChild(this.element);

      // Create table
      const table = document.createElement('TABLE');
      table.id = this.tableId;
      table.style.cssText = 'all:revert;border-spacing:0px;border-collapse:separate;padding:0px;margin:0px;line-height:100% !important;direction:ltr;width:100%;';
      this.element.appendChild(table);

      // Add event listeners
      this.addEventListener(this.element, 'mousemove', this.onMouseMove);
      this.addEventListener(this.element, 'mousedown', this.onMouseDown);
      this.addEventListener(this.element, 'mouseup', this.onMouseUp);
      this.addEventListener(this.element, 'mouseout', this.onMouseOut);
      this.addEventListener(this.element, 'mouseover', this.onMouseOut);
    } else {
      this.updatePosition();
    }

    // Check for duplicates
    const label = Utils.formatVideoLabel(videoInfo);
    for (let i = 0; i < this.items.length; i++) {
      const existingLabel = Utils.formatVideoLabel(detector.videoData[this.items[i]]);
      if (label === existingLabel && videoInfo.type !== 'hls') {
        this.items[i] = videoId;
        if (this.element) this.element.style.display = '';
        this.updatePosition();
        return;
      }
    }

    this.items.push(videoId);
    const index = this.items.length - 1;
    const table = Utils.getElement(this.tableId);

    if (index === 0) {
      // First file - create header row
      this.createVideoRow(0);
    } else {
      // Multiple files - clear table and recreate all rows
      if (table) {
        table.innerHTML = '';
      }
      // Recreate header row with updated file count
      this.createVideoRow(0);
      // Create rows for all files (they will be hidden initially)
      for (let i = 1; i < this.items.length; i++) {
        this.createVideoRow(i);
      }
    }

    // Ensure header row is visible
    const rows = table?.rows;
    if (rows && rows[0]) {
      rows[0].style.display = '';
    }
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler.bind(this));
  }

  onMouseDown(e) {
    if (e.button === 0) {
      this.isDragging = true;
      this.headerClicked = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      e.stopPropagation();
      e.preventDefault();
    }
  }

  onMouseMove(e) {
    if (this.isDragging) {
      this.toggleDisplay(true);
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      if (!this.headerClicked && (dx || dy)) {
        this.headerClicked = true;
      }
      this.position.left += dx;
      this.position.top += dy;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.updatePosition();
    } else {
      this.headerClicked = false;
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onMouseOut() {
    this.isDragging = false;
  }
}

// ==================== Video Detector Class ====================
class VideoDetector {
  constructor() {
    this.videoData = {};
    this.panels = {};
    this.mouseX = -1;
    this.mouseY = -1;

    this.init();
  }

  init() {
    // Setup background message listener for webRequest detected videos
    this.setupBackgroundMessageListener();

    // Setup port connection to background
    this.setupPortConnection();

    // Setup Facebook observer if on Facebook
    if (Utils.isFacebook()) {
      this.setupFacebookObserver();
    }

    // Setup event listeners
    this.addEventListener(window, 'keydown', this.onKeyDown, true);
    this.addEventListener(window, 'keyup', this.onKeyUp, true);
    this.addEventListener(window, 'mouseup', this.onMouseUp, true);
    this.addEventListener(window, 'resize', this.onResize);
    this.addEventListener(document, 'DOMContentLoaded', this.onDOMContentLoaded);
    this.addEventListener(document, 'click', this.onDocumentClick);

    // Scan for videos
    this.scanForVideos();
  }

  setupBackgroundMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'VIDEO_DETECTED') {
        this.handleBackgroundDetectedVideo(request.videoInfo);
        sendResponse({ received: true });
      }
    });
  }

  handleBackgroundDetectedVideo(videoInfo) {
    console.log('[VideoDetector] handleBackgroundDetectedVideo called with:', videoInfo);
    
    const videoId = Utils.hashCode(videoInfo.url);

    if (this.videoData[videoId]) {
      console.log('[VideoDetector] Video already exists:', videoId);
      return;
    }

    const fileExtension = videoInfo.fileExtension || 'mp4';
    const formattedInfo = {
      id: videoId,
      url: videoInfo.url,
      fileExtension: fileExtension,
      fileName: videoInfo.fileName || `video_${videoId}`,
      fileSize: videoInfo.size || 0,
      contentType: videoInfo.contentType || '',
      type: videoInfo.type || 'video'
    };

    console.log('[VideoDetector] Storing formattedInfo:', formattedInfo);
    this.processVideoData(formattedInfo, window.location.href, null, true);
  }

  setupPortConnection() {
    this.port = chrome.runtime.connect({ name: 'video-detector' });
    this.port.onMessage.addListener(this.handleMessage.bind(this));
    this.port.onDisconnect.addListener(() => {
      this.cleanup();
    });

    // Send initial message
    this.sendInitialMessage();
  }

  sendInitialMessage() {
    this.port.postMessage([
      2,
      null,
      window.location.href,
      this.getTitle()
    ]);
  }

  setupFacebookObserver() {
    this.fbObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        this.checkFacebookVideos(mutation.target);
      });
    });
    this.fbObserver.observe(document, { childList: true, subtree: true });
  }

  addEventListener(target, event, handler, capture = false) {
    target.addEventListener(event, handler.bind(this), capture);
  }

  getTitle() {
    try {
      let title = document.title || document.getElementsByTagName('title')[0]?.innerText || '';
      title = title.trim();
      return title ? title.replace(/[ \t\r\n\u25B6]+/g, ' ').trim() : '';
    } catch (e) {
      return '';
    }
  }

  onKeyDown(e) {
    if (e.keyCode === 8 || e.keyCode === 46) {
      this.port.postMessage([4, true]);
    }
  }

  onKeyUp(e) {
    if (e.keyCode === 8 || e.keyCode === 46) {
      this.port.postMessage([4, false]);
    }
  }

  onMouseUp(e) {
    if (e.button === 0) {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }
  }

  onResize() {
    if (this.resizeTimeout) return;
    this.resizeTimeout = setTimeout(() => {
      for (const panelId in this.panels) {
        const panel = this.panels[panelId];
        if (panel.video) {
          const offset = Utils.getOffset(panel.video);
          if (offset) {
            try {
              document.body.removeChild(panel.element);
            } catch (e) {}
            panel.position = {
              left: Math.max(0, offset.left),
              top: Math.max(0, offset.top - 21)
            };
            document.body.appendChild(panel.element);
            panel.updatePosition();
          }
        }
      }
      this.resizeTimeout = null;
    }, 500);
  }

  onDOMContentLoaded() {
    this.scanForVideos();
    this.checkVimeoVideos();
  }

  onDocumentClick() {
    for (const panelId in this.panels) {
      this.panels[panelId].toggleDisplay(true);
    }
  }

  getVideoElement(url, referrer) {
    const videoElements = ['VIDEO', 'AUDIO', 'OBJECT', 'EMBED'];
    let foundElement = null;
    let maxArea = 0;
    let candidate = null;
    let lastElement = null;

    // Check active element
    const activeElement = document.activeElement;
    let relatedElement = activeElement && videoElements.includes(activeElement.tagName) ? activeElement : null;

    // Check element at mouse position
    if (!relatedElement && this.mouseX >= 0 && this.mouseY >= 0) {
      const elementAtPoint = document.elementFromPoint(this.mouseX, this.mouseY);
      if (elementAtPoint && videoElements.includes(elementAtPoint.tagName)) {
        relatedElement = elementAtPoint;
      }
    }

    // Search for matching video elements
    for (let i = 0; i < videoElements.length; i++) {
      const elements = document.getElementsByTagName(videoElements[i]);
      for (let j = 0; j < elements.length; j++) {
        const elem = elements[j];
        if (i === 2 && elem.type.toLowerCase() !== 'application/x-shockwave-flash') {
          continue;
        }

        const src = elem.src || elem.data;
        if (src && (src === url || src === referrer)) {
          foundElement = elem;
          break;
        }

        if (relatedElement) {
          continue;
        }

        if (!candidate) {
          const width = elem.clientWidth;
          const height = elem.clientHeight;
          if (width && height) {
            const style = window.getComputedStyle(elem);
            if (!style || style.visibility !== 'hidden') {
              const area = width * height;
              if (height < 1.4 * width && width < 3 * height && area > maxArea) {
                maxArea = area;
                candidate = elem;
              }
              if (!lastElement) {
                lastElement = elem;
              }
            }
          }
        }
      }
      if (foundElement) break;
    }

    if (!foundElement) {
      foundElement = relatedElement || candidate || lastElement || document.querySelectorAll('video,audio')[0];
    }

    // Handle EMBED inside OBJECT
    if (foundElement && foundElement.tagName === 'EMBED' && !foundElement.clientWidth && !foundElement.clientHeight) {
      const parent = foundElement.parentElement;
      if (parent && parent.tagName === 'OBJECT') {
        foundElement = parent;
      }
    }

    return foundElement || null;
  }

  processVideoData(videoInfo, referrer, videoElement, skipSizeCheck) {
    // Skip blob URLs - they are browser-internal virtual URLs that Aria2 cannot download
    if (videoInfo.url && videoInfo.url.startsWith('blob:')) {
      console.log('[VideoDetector] Skipping blob URL:', videoInfo.url.substring(0, 50) + '...');
      return;
    }

    if (!videoInfo.id) {
      videoInfo.id = Utils.hashCode(videoInfo.url);
    }

    videoElement = videoElement || this.getVideoElement(videoInfo.url, referrer);

    // Use a single panel for all videos (fixed at top-left corner)
    let existingPanel = this.panels[0];
    
    if (!existingPanel) {
      // Create single panel
      existingPanel = new VideoPanel(this, null, 0);
      this.panels[0] = existingPanel;
    }

    // Check for duplicate TS files
    const label = Utils.formatVideoLabel(videoInfo);
    for (let i = 0; i < existingPanel.items.length; i++) {
      const existingLabel = Utils.formatVideoLabel(this.videoData[existingPanel.items[i]]);
      if (label.trim().indexOf('TS File') === 0 && label === existingLabel) {
        return;
      }
    }

    this.videoData[videoInfo.id] = videoInfo;
    existingPanel.addVideo(videoInfo.id);
  }

  sendDownloadRequest(videoId) {
    const videoInfo = this.videoData[videoId];
    if (!videoInfo) {
      console.warn('[VideoDetector] Video info not found for ID:', videoId);
      return;
    }

    console.log('[VideoDetector] Sending download request with videoInfo:', videoInfo);

    const message = {
      type: 'DOWNLOAD_VIDEO',
      videoInfo: {
        url: videoInfo.url,
        fileName: videoInfo.fileName || `video_${videoInfo.id}`,
        fileExtension: videoInfo.fileExtension || 'mp4'
      }
    };
    console.log('[VideoDetector] Actual message being sent:', message);

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[VideoDetector] Download request failed:', chrome.runtime.lastError);
        return;
      }
      if (response?.success) {
        console.log('[VideoDetector] Download started successfully, GID:', response.gid);
      } else {
        console.error('[VideoDetector] Download failed:', response?.error || 'Unknown error');
      }
    });
  }

  handleMessage(response) {
    const command = response[0];

    switch (command) {
      case 1:
        this.processVideoData(response[1], response[2], null, true);
        break;
      case 3:
        if (response[1]) {
          // Update last video info
        }
        this.sendInitialMessage();
        break;
      case 5:
        this.showAllPanels();
        break;
      case 11:
        this.removeAllPanels();
        setTimeout(() => this.checkVimeoVideos(), 4000);
        break;
    }
  }

  showAllPanels() {
    try {
      for (const panelId in this.panels) {
        const panel = this.panels[panelId];
        if (panel.element) {
          panel.element.style.display = '';
        }
      }
    } catch (e) {}
  }

  removeAllPanels() {
    try {
      for (const panelId in this.panels) {
        const panel = this.panels[panelId];
        if (panel.element) {
          document.body.removeChild(panel.element);
        }
      }
    } catch (e) {}
    this.panels = {};
    this.videoData = {};
  }

  scanForVideos() {
    const videos = document.querySelectorAll('video, audio');
    videos.forEach(video => {
      const src = video.src || video.currentSrc;
      if (src && !this.videoData[Utils.hashCode(src)]) {
        this.processVideoData({
          id: Utils.hashCode(src),
          url: src,
          fileExtension: 'mp4',
          fileSize: 0
        }, window.location.href, video, false);
      }
    });
  }

  checkFacebookVideos(target) {
    const links = target.querySelectorAll('a[href*="/videos/"]');
    if (!links.length) return;

    Array.from(links).forEach(link => {
      if (!link.getAttribute('YUEXUAN_FB')) {
        link.setAttribute('YUEXUAN_FB', 1);
        const match = link.href.match(/.*\/videos\/(\d+)\/.*/i);
        if (match) {
          this.fetchFacebookVideo(link, match[1]);
        }
      }
    });
  }

  fetchFacebookVideo(linkElement, videoId) {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000;
    xhr.open('GET', `https://www.facebook.com/video/embed?video_id=${videoId}`, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        const sdMatch = /"sd_src_no_ratelimit":"(.*?)"/.exec(xhr.responseText);
        const hdMatch = /"hd_src_no_ratelimit":"(.*?)"/.exec(xhr.responseText);

        const urls = {
          sd: sdMatch && sdMatch[1] ? sdMatch[1].replace(/\\/g, '') : '',
          hd: hdMatch && hdMatch[1] ? hdMatch[1].replace(/\\/g, '') : ''
        };

        const videoElement = this.findParentVideo(linkElement);
        if (urls.hd) {
          this.processVideoData({
            id: Utils.hashCode(urls.hd),
            url: urls.hd,
            fileExtension: 'mp4',
            fileSize: 0,
            quality: 'HD'
          }, window.location.href, videoElement, false);
        }
        if (urls.sd) {
          this.processVideoData({
            id: Utils.hashCode(urls.sd),
            url: urls.sd,
            fileExtension: 'mp4',
            fileSize: 0,
            quality: 'SD'
          }, window.location.href, videoElement, false);
        }
      }
    };
    xhr.send();
  }

  findParentVideo(element) {
    let parent = element;
    while ((parent = parent.parentElement)) {
      const videos = parent.querySelectorAll('video');
      if (videos.length > 0) {
        return videos[0];
      }
    }
    return null;
  }

  checkVimeoVideos() {
    const scripts = document.getElementsByTagName('SCRIPT');
    const progressiveRegex = /"progressive":\s*\[/;

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src) continue;
      if (!progressiveRegex.test(script.innerText)) continue;

      const text = script.innerText;
      const startIdx = text.indexOf('"progressive"');
      if (startIdx < 0) continue;

      const endIdx = text.indexOf(']', startIdx);
      if (endIdx < 0) continue;

      const jsonStr = text.substr(startIdx, endIdx - startIdx + 1);
      let data = null;
      try {
        data = JSON.parse('{' + jsonStr + '}');
      } catch (e) {}

      if (data && data.progressive) {
        setTimeout(() => {
          data.progressive.forEach(item => {
            this.processVideoData({
              id: Utils.hashCode(item.url),
              url: item.url,
              fileExtension: 'mp4',
              fileSize: 0,
              quality: item.quality
            }, window.location.href, null, false);
          });
        }, 4000);
        break;
      }
    }
  }

  cleanup() {
    this.removeAllPanels();
    this.port = null;
  }
}

// Initialize when DOM is ready
if (!window.yuexuanVideoDetector) {
  window.yuexuanVideoDetector = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new VideoDetector();
    });
  } else {
    new VideoDetector();
  }
}
