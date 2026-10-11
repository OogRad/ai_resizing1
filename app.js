/**
 * BatchPixel - Client-Side Image Resizer
 * 100% In-Browser Memory Canvas Processing (Zero Server Transmission)
 */

(function () {
  'use strict';

  // =========================================================================
  // State
  // =========================================================================
  const state = {
    items: [], // Array of { id, file, name, originalWidth, originalHeight, originalSize, previewUrl }
    mode: 'width', // 'width' | 'height' | 'longest' | 'shortest' | 'percent'
    pixelValue: 1280,
    percentValue: 50,
    format: 'original', // 'original' | 'image/jpeg' | 'image/png' | 'image/webp'
    quality: 0.9,
    isProcessingZip: false
  };

  // =========================================================================
  // DOM Elements
  // =========================================================================
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const btnSelectFiles = document.getElementById('btnSelectFiles');

  // Mode tabs & inputs
  const modeTabs = document.querySelectorAll('.mode-tab');
  const pixelInputWrapper = document.getElementById('pixelInputWrapper');
  const percentInputWrapper = document.getElementById('percentInputWrapper');
  const pixelValueInput = document.getElementById('pixelValueInput');
  const pixelInputLabel = document.getElementById('pixelInputLabel');
  const pixelPresets = document.getElementById('pixelPresets');
  const pixelHelperText = document.getElementById('pixelHelperText');

  const percentRangeInput = document.getElementById('percentRangeInput');
  const percentValueInput = document.getElementById('percentValueInput');
  const percentPresets = document.getElementById('percentPresets');

  const formatSelect = document.getElementById('formatSelect');
  const qualityWrapper = document.getElementById('qualityWrapper');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityDisplay = document.getElementById('qualityDisplay');
  const btnResetSettings = document.getElementById('btnResetSettings');

  // Batch actions & stats
  const fileCountBadge = document.getElementById('fileCountBadge');
  const metaSummaryGroup = document.getElementById('metaSummaryGroup');
  const totalOriginalSizeBadge = document.getElementById('totalOriginalSizeBadge');
  const currentModeSummaryBadge = document.getElementById('currentModeSummaryBadge');
  const statusIndicator = document.querySelector('.status-indicator');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnDownloadAllZip = document.getElementById('btnDownloadAllZip');

  // Progress Bar
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercentText = document.getElementById('progressPercentText');
  const progressFillBar = document.getElementById('progressFillBar');

  // Gallery
  const imageGrid = document.getElementById('imageGrid');
  const emptyPlaceholder = document.getElementById('emptyPlaceholder');
  const itemCountPill = document.getElementById('itemCountPill');
  const toastContainer = document.getElementById('toastContainer');

  // =========================================================================
  // Mode Metadata Configuration
  // =========================================================================
  const MODE_CONFIGS = {
    width: {
      label: '목표 X축 너비 (Width)',
      helper: '가로폭을 지정한 픽셀로 고정하고, 원본 종횡비에 맞춰 세로를 자동 계산합니다.',
      defaultPixel: 1280,
      presets: [
        { label: '640px', val: 640 },
        { label: '1080px', val: 1080 },
        { label: '1280px', val: 1280 },
        { label: '1920px (FHD)', val: 1920 },
        { label: '2560px (QHD)', val: 2560 }
      ]
    },
    height: {
      label: '목표 Y축 높이 (Height)',
      helper: '세로높이를 지정한 픽셀로 고정하고, 원본 종횡비에 맞춰 가로를 자동 계산합니다.',
      defaultPixel: 720,
      presets: [
        { label: '480px', val: 480 },
        { label: '720px (HD)', val: 720 },
        { label: '1080px (FHD)', val: 1080 },
        { label: '1440px', val: 1440 },
        { label: '2160px (4K)', val: 2160 }
      ]
    },
    longest: {
      label: '목표 긴축 길이 (Longest Edge)',
      helper: '가로/세로 중 더 긴 쪽을 지정 픽셀에 맞추고, 짧은 쪽은 비례 축소/확대합니다.',
      defaultPixel: 1920,
      presets: [
        { label: '1024px', val: 1024 },
        { label: '1280px', val: 1280 },
        { label: '1920px (FHD)', val: 1920 },
        { label: '2560px', val: 2560 },
        { label: '3840px (4K)', val: 3840 }
      ]
    },
    shortest: {
      label: '목표 짧은축 길이 (Shortest Edge)',
      helper: '가로/세로 중 더 짧은 쪽을 지정 픽셀에 맞추고, 긴 쪽은 비례 축소/확대합니다.',
      defaultPixel: 1080,
      presets: [
        { label: '480px', val: 480 },
        { label: '720px', val: 720 },
        { label: '1080px', val: 1080 },
        { label: '1440px', val: 1440 },
        { label: '2000px', val: 2000 }
      ]
    },
    percent: {
      label: '리사이징 비율 (%)',
      helper: '가로와 세로를 원본 대비 동일한 비율(%)로 조절합니다.',
      defaultPercent: 50
    }
  };

  // =========================================================================
  // Calculation Utilities
  // =========================================================================

  /**
   * Calculate target dimensions based on original dimensions and current state
   */
  function calculateTargetDimensions(origW, origH) {
    if (!origW || !origH) return { width: 0, height: 0, ratio: 1 };

    let targetW = origW;
    let targetH = origH;

    switch (state.mode) {
      case 'width': {
        const val = Math.max(1, state.pixelValue);
        targetW = val;
        targetH = Math.max(1, Math.round(origH * (val / origW)));
        break;
      }
      case 'height': {
        const val = Math.max(1, state.pixelValue);
        targetH = val;
        targetW = Math.max(1, Math.round(origW * (val / origH)));
        break;
      }
      case 'longest': {
        const val = Math.max(1, state.pixelValue);
        if (origW >= origH) {
          targetW = val;
          targetH = Math.max(1, Math.round(origH * (val / origW)));
        } else {
          targetH = val;
          targetW = Math.max(1, Math.round(origW * (val / origH)));
        }
        break;
      }
      case 'shortest': {
        const val = Math.max(1, state.pixelValue);
        if (origW <= origH) {
          targetW = val;
          targetH = Math.max(1, Math.round(origH * (val / origW)));
        } else {
          targetH = val;
          targetW = Math.max(1, Math.round(origW * (val / origH)));
        }
        break;
      }
      case 'percent': {
        const ratio = Math.max(0.01, state.percentValue / 100);
        targetW = Math.max(1, Math.round(origW * ratio));
        targetH = Math.max(1, Math.round(origH * ratio));
        break;
      }
    }

    return {
      width: targetW,
      height: targetH,
      ratioW: (targetW / origW).toFixed(2),
      ratioH: (targetH / origH).toFixed(2)
    };
  }

  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function getOutputExtension(originalName, mimeType) {
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    if (state.format === 'image/jpeg') return '.jpg';
    if (state.format === 'image/png') return '.png';
    if (state.format === 'image/webp') return '.webp';
    return ext || '.jpg';
  }

  function getFinalMimeType(originalMimeType) {
    if (state.format !== 'original') {
      return state.format;
    }
    // 원본이 지원되는 래스터 포맷인지 확인
    if (['image/jpeg', 'image/png', 'image/webp'].includes(originalMimeType)) {
      return originalMimeType;
    }
    return 'image/png';
  }

  // =========================================================================
  // Canvas Resizing Engine (100% In-Memory)
  // =========================================================================

  /**
   * Loads an image file into an Image element via Object URL
   */
  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        resolve({ img, objectUrl, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };
      img.src = objectUrl;
    });
  }

  /**
   * Resizes an image file to a Blob using HTML5 Canvas API
   */
  async function resizeImageToBlob(item) {
    const { img, objectUrl } = await loadImageElement(item.file);
    const { width: targetW, height: targetH } = calculateTargetDimensions(item.originalWidth, item.originalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: true });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const mimeType = getFinalMimeType(item.file.type);

    // JPEG로 출력할 때는 투명 배경이 검은색으로 채워지는 것을 방지하기 위해 흰색 배경으로 채움
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // 고품질 드로잉
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // 리소스 정리
    URL.revokeObjectURL(objectUrl);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: targetW,
              height: targetH,
              mimeType
            });
          } else {
            reject(new Error('Canvas Blob 생성 실패'));
          }
        },
        mimeType,
        mimeType === 'image/png' ? undefined : state.quality
      );
    });
  }

  // =========================================================================
  // UI Notifications & Toasts
  // =========================================================================
  function showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#059669" stroke-width="2">
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
    if (type === 'success') {
      iconSvg = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
      `;
    } else if (type === 'error') {
      iconSvg = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" stroke-width="2">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" />
        </svg>
      `;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // =========================================================================
  // Rendering & UI Sync
  // =========================================================================

  function updateBatchBar() {
    const totalCount = state.items.length;
    itemCountPill.textContent = totalCount;

    if (totalCount === 0) {
      statusIndicator.classList.remove('ready');
      fileCountBadge.textContent = '업로드된 이미지 없음';
      metaSummaryGroup.style.display = 'none';
      btnClearAll.disabled = true;
      btnDownloadAllZip.disabled = true;
      emptyPlaceholder.style.display = 'flex';
      return;
    }

    statusIndicator.classList.add('ready');
    fileCountBadge.textContent = `${totalCount}개 이미지 준비 완료`;
    metaSummaryGroup.style.display = 'flex';

    const totalBytes = state.items.reduce((acc, cur) => acc + cur.originalSize, 0);
    totalOriginalSizeBadge.textContent = `원본 합계: ${formatBytes(totalBytes)}`;

    // Mode summary badge
    let modeText = '';
    if (state.mode === 'width') modeText = `X축(너비) ${state.pixelValue}px`;
    else if (state.mode === 'height') modeText = `Y축(높이) ${state.pixelValue}px`;
    else if (state.mode === 'longest') modeText = `긴축 ${state.pixelValue}px`;
    else if (state.mode === 'shortest') modeText = `짧은축 ${state.pixelValue}px`;
    else if (state.mode === 'percent') modeText = `비율 ${state.percentValue}%`;

    currentModeSummaryBadge.textContent = `모드: ${modeText}`;
    btnClearAll.disabled = false;
    btnDownloadAllZip.disabled = false;
    emptyPlaceholder.style.display = 'none';
  }

  /**
   * Re-evaluates target dimensions on all rendered cards without re-adding them
   */
  function refreshCardDimensions() {
    state.items.forEach((item) => {
      const cardEl = document.getElementById(`card-${item.id}`);
      if (!cardEl) return;

      const targetDimEl = cardEl.querySelector('.target-dim-val');
      const { width: targetW, height: targetH } = calculateTargetDimensions(item.originalWidth, item.originalHeight);
      if (targetDimEl) {
        targetDimEl.textContent = `${targetW} × ${targetH}`;
      }
    });
    updateBatchBar();
  }

  /**
   * Creates a card DOM element for an image item
   */
  function createImageCard(item) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `card-${item.id}`;

    const { width: targetW, height: targetH } = calculateTargetDimensions(item.originalWidth, item.originalHeight);

    card.innerHTML = `
      <div class="image-card-thumb-wrap">
        <img src="${item.previewUrl}" alt="${escapeHtml(item.name)}" loading="lazy">
        <button type="button" class="btn-card-remove" title="목록에서 제거" data-action="remove" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="image-card-body">
        <div class="card-file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        
        <div class="dimension-compare-box">
          <div class="dim-col">
            <span class="dim-tag">원본</span>
            <span class="dim-val">${item.originalWidth} × ${item.originalHeight}</span>
          </div>
          <div class="dim-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </div>
          <div class="dim-col target">
            <span class="dim-tag">리사이즈</span>
            <span class="dim-val target-dim-val">${targetW} × ${targetH}</span>
          </div>
        </div>

        <div class="card-meta-row">
          <span>${formatBytes(item.originalSize)}</span>
          <span class="file-ext-tag">${item.file.type.split('/')[1]?.toUpperCase() || 'IMG'}</span>
        </div>

        <button type="button" class="btn-card-download" data-action="download" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          개별 다운로드
        </button>
      </div>
    `;

    // Event listeners on card buttons
    const removeBtn = card.querySelector('[data-action="remove"]');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });

    const downloadBtn = card.querySelector('[data-action="download"]');
    downloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await downloadSingleImage(item);
    });

    return card;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // File Handling (Upload & Process)
  // =========================================================================

  async function handleFiles(fileList) {
    const validFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));

    if (validFiles.length === 0) {
      showToast('지원되는 이미지 파일을 선택해주세요.', 'warning');
      return;
    }

    let loadedCount = 0;

    for (const file of validFiles) {
      try {
        const { objectUrl, width, height } = await loadImageElement(file);
        const item = {
          id: 'img_' + Math.random().toString(36).substring(2, 9) + Date.now(),
          file,
          name: file.name,
          originalWidth: width,
          originalHeight: height,
          originalSize: file.size,
          previewUrl: objectUrl
        };

        state.items.push(item);
        const cardEl = createImageCard(item);
        imageGrid.appendChild(cardEl);
        loadedCount++;
      } catch (err) {
        console.error('이미지 로드 실패:', file.name, err);
      }
    }

    if (loadedCount > 0) {
      updateBatchBar();
      showToast(`${loadedCount}개의 이미지를 불러왔습니다.`, 'success');
    }
  }

  function removeItem(id) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      const [removed] = state.items.splice(index, 1);
      URL.revokeObjectURL(removed.previewUrl);
      const cardEl = document.getElementById(`card-${id}`);
      if (cardEl) cardEl.remove();
      updateBatchBar();
    }
  }

  function clearAllItems() {
    state.items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });
    state.items = [];
    imageGrid.querySelectorAll('.image-card').forEach((el) => el.remove());
    updateBatchBar();
    showToast('모든 이미지가 제거되었습니다.');
  }

  // =========================================================================
  // Download Handlers
  // =========================================================================

  /**
   * Individual image download
   */
  async function downloadSingleImage(item) {
    try {
      showToast(`'${item.name}' 리사이징 중...`);
      const { blob, width, height } = await resizeImageToBlob(item);

      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      const ext = getOutputExtension(item.name, blob.type);
      const filename = `[resized]_${baseName}_${width}x${height}${ext}`;

      const link = document.createElement('a');
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      showToast(`'${filename}' 다운로드 완료!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('이미지 리사이징 중 오류가 발생했습니다.', 'error');
    }
  }

  /**
   * Batch download as .ZIP via JSZip
   */
  async function downloadBatchZip() {
    if (state.items.length === 0 || state.isProcessingZip) return;

    if (typeof JSZip === 'undefined') {
      showToast('JSZip 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.', 'error');
      return;
    }

    state.isProcessingZip = true;
    btnDownloadAllZip.disabled = true;
    btnClearAll.disabled = true;

    // Show Progress UI
    progressBarContainer.style.display = 'block';
    progressFillBar.style.width = '0%';
    progressPercentText.textContent = '0%';
    progressStatusText.textContent = `전체 이미지 리사이징 진행 중... (0 / ${state.items.length})`;

    try {
      const zip = new JSZip();
      const folder = zip.folder('resized_images');
      const total = state.items.length;

      // 1. 순차적으로 각 이미지 캔버스 리사이징 수행
      for (let i = 0; i < total; i++) {
        const item = state.items[i];
        progressStatusText.textContent = `이미지 처리 중 (${i + 1} / ${total}): ${item.name}`;
        
        const { blob, width, height } = await resizeImageToBlob(item);
        const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        const ext = getOutputExtension(item.name, blob.type);
        const filename = `${baseName}_${width}x${height}${ext}`;

        folder.file(filename, blob);

        // 진행률 업데이트 (리사이즈 단계: 전체 작업의 70%)
        const progressPercent = Math.round(((i + 1) / total) * 70);
        progressFillBar.style.width = `${progressPercent}%`;
        progressPercentText.textContent = `${progressPercent}%`;

        // UI 렌더링 양보
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      // 2. JSZip 압축 파일 생성 (나머지 30%)
      progressStatusText.textContent = 'ZIP 파일 압축 생성 중...';

      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        (metadata) => {
          const overallPercent = 70 + Math.round(metadata.percent * 0.3);
          progressFillBar.style.width = `${overallPercent}%`;
          progressPercentText.textContent = `${overallPercent}%`;
        }
      );

      // 3. 압축 파일 다운로드 트리거
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const zipFileName = `BatchPixel_${state.mode}_${timestamp}.zip`;

      const link = document.createElement('a');
      const zipUrl = URL.createObjectURL(zipBlob);
      link.href = zipUrl;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(zipUrl);

      progressStatusText.textContent = '일괄 ZIP 압축 다운로드 완료!';
      progressFillBar.style.width = '100%';
      progressPercentText.textContent = '100%';
      showToast(`${total}개 파일 ZIP 다운로드 완료!`, 'success');

      setTimeout(() => {
        progressBarContainer.style.display = 'none';
      }, 2500);

    } catch (err) {
      console.error('ZIP 생성 오류:', err);
      showToast('ZIP 압축 중 오류가 발생했습니다.', 'error');
      progressBarContainer.style.display = 'none';
    } finally {
      state.isProcessingZip = false;
      btnDownloadAllZip.disabled = false;
      btnClearAll.disabled = false;
    }
  }

  // =========================================================================
  // Mode Change & Settings Management
  // =========================================================================

  function setMode(newMode) {
    if (!MODE_CONFIGS[newMode]) return;
    state.mode = newMode;

    // Update Tab UI
    modeTabs.forEach((tab) => {
      const isCurrent = tab.dataset.mode === newMode;
      tab.classList.toggle('active', isCurrent);
      const radio = tab.querySelector('input[type="radio"]');
      if (radio) radio.checked = isCurrent;
    });

    const config = MODE_CONFIGS[newMode];

    if (newMode === 'percent') {
      pixelInputWrapper.classList.add('hidden');
      percentInputWrapper.classList.remove('hidden');
    } else {
      percentInputWrapper.classList.add('hidden');
      pixelInputWrapper.classList.remove('hidden');

      pixelInputLabel.textContent = config.label;
      pixelHelperText.textContent = config.helper;

      // Re-populate presets
      pixelPresets.innerHTML = '';
      config.presets.forEach((preset) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'badge-btn';
        btn.dataset.val = preset.val;
        btn.textContent = preset.label;
        btn.addEventListener('click', () => {
          pixelValueInput.value = preset.val;
          state.pixelValue = preset.val;
          refreshCardDimensions();
        });
        pixelPresets.appendChild(btn);
      });

      // Default value adjustment if needed
      if (!state.pixelValue || state.pixelValue <= 0) {
        state.pixelValue = config.defaultPixel;
        pixelValueInput.value = config.defaultPixel;
      }
    }

    refreshCardDimensions();
  }

  function resetSettings() {
    setMode('width');
    state.pixelValue = 1280;
    pixelValueInput.value = 1280;
    state.percentValue = 50;
    percentValueInput.value = 50;
    percentRangeInput.value = 50;
    state.format = 'original';
    formatSelect.value = 'original';
    state.quality = 0.9;
    qualitySlider.value = 90;
    qualityDisplay.textContent = '90%';
    refreshCardDimensions();
    showToast('설정이 기본값으로 초기화되었습니다.');
  }

  // =========================================================================
  // Event Bindings
  // =========================================================================

  function initEventListeners() {
    // Dropzone Drag & Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFiles(dt.files);
      }
    });

    dropZone.addEventListener('click', (e) => {
      // Button inside or background
      if (e.target !== btnSelectFiles && !btnSelectFiles.contains(e.target)) {
        fileInput.click();
      }
    });

    btnSelectFiles.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset input to allow re-uploading same file
      }
    });

    // Window global drag prevent
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    // Mode tabs click
    modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        setMode(mode);
      });
    });

    // Pixel input change
    pixelValueInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.pixelValue = isNaN(val) ? 0 : val;
      refreshCardDimensions();
    });

    // Percent inputs sync
    percentRangeInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      percentValueInput.value = val;
      state.percentValue = val;
      refreshCardDimensions();
    });

    percentValueInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        percentRangeInput.value = Math.min(300, Math.max(1, val));
        state.percentValue = val;
        refreshCardDimensions();
      }
    });

    // Percent Presets
    percentPresets.querySelectorAll('.badge-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val, 10);
        percentValueInput.value = val;
        percentRangeInput.value = Math.min(300, Math.max(1, val));
        state.percentValue = val;
        refreshCardDimensions();
      });
    });

    // Format selection
    formatSelect.addEventListener('change', (e) => {
      state.format = e.target.value;
      qualityWrapper.style.opacity = state.format === 'image/png' ? '0.4' : '1';
      showToast(`출력 포맷: ${formatSelect.options[formatSelect.selectedIndex].text}`);
    });

    // Quality slider
    qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.quality = val / 100;
      qualityDisplay.textContent = `${val}%`;
    });

    // Reset settings
    btnResetSettings.addEventListener('click', resetSettings);

    // Batch Actions
    btnClearAll.addEventListener('click', clearAllItems);
    btnDownloadAllZip.addEventListener('click', downloadBatchZip);
  }

  // =========================================================================
  // Initialize
  // =========================================================================
  function init() {
    setMode('width');
    initEventListeners();
    updateBatchBar();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
