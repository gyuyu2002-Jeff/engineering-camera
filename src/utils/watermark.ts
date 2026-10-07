import { WatermarkData } from '../types';

/**
 * Draws watermarked image on high-resolution canvas and returns Data URL
 */
export async function applyWatermark(
  imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap,
  data: WatermarkData
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  let width = 0;
  let height = 0;

  if (imageSource instanceof HTMLVideoElement) {
    width = imageSource.videoWidth || 1280;
    height = imageSource.videoHeight || 720;
  } else if (imageSource instanceof HTMLImageElement) {
    width = imageSource.naturalWidth || imageSource.width;
    height = imageSource.naturalHeight || imageSource.height;
  } else {
    width = imageSource.width;
    height = imageSource.height;
  }

  // Ensure minimum sharp resolution
  canvas.width = width;
  canvas.height = height;

  // Draw source image
  ctx.drawImage(imageSource, 0, 0, width, height);

  // Base scale relative to min dimension (ensures readability regardless of vertical/horizontal orientation)
  const baseDim = Math.min(width, height);
  const scale = Math.max(1, baseDim / 720);

  switch (data.templateStyle) {
    case 'none':
      // 無看板：保留純照片原圖
      break;
    case 'classic_tw':
      drawClassicTaiwanBoard(ctx, width, height, scale, data);
      break;
    case 'dark_strip':
      drawDarkBottomStrip(ctx, width, height, scale, data);
      break;
    case 'corner_badge':
      drawCornerBadge(ctx, width, height, scale, data);
      break;
    case 'standard_board':
    default:
      drawStandardModernBoard(ctx, width, height, scale, data);
      break;
  }

  return canvas.toDataURL('image/jpeg', 0.98);
}

// Stage badge color helper
function getStageColor(stage: string): { bg: string; text: string } {
  switch (stage) {
    case '施工前':
      return { bg: '#3b82f6', text: '#ffffff' }; // 藍色
    case '施工中':
      return { bg: '#f59e0b', text: '#ffffff' }; // 橙黃
    case '施工後':
      return { bg: '#10b981', text: '#ffffff' }; // 綠色
    case '隱蔽查驗':
      return { bg: '#8b5cf6', text: '#ffffff' }; // 紫色
    case '材料進場':
      return { bg: '#06b6d4', text: '#ffffff' }; // 青色
    case '自主檢查':
      return { bg: '#14b8a6', text: '#ffffff' }; // 藍綠
    default:
      return { bg: '#ef4444', text: '#ffffff' }; // 紅色
  }
}

/**
 * 1. 現代標準工程銘牌 (Standard Modern Board) - 位於右下角或左下角
 */
function drawStandardModernBoard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  data: WatermarkData
) {
  const isCompact = data.boardSize === 'compact';
  const isPortrait = h > w; // 是否為直立拍照
  
  // 提升尺寸係數與字級，直立照片給予更大佔比（寬度 70%~75%），確保插入 Word 縮圖時字體依然清晰銳利
  const sizeFactor = isCompact ? 1.05 : 1.25;
  const pad = 20 * scale;
  const widthRatio = isPortrait 
    ? (isCompact ? 0.65 : 0.78)
    : (isCompact ? 0.48 : 0.58);
  const boardW = Math.min(w * widthRatio, 620 * scale);
  const boardH = (isCompact ? 190 : 240) * scale;
  const x = w - boardW - pad;
  const y = h - boardH - pad;

  ctx.save();
  // 採用 96% 高不透明黑底，提升對比度
  ctx.fillStyle = 'rgba(5, 10, 12, 0.96)';
  ctx.strokeStyle = '#b7e854';
  ctx.lineWidth = 3 * scale;

  ctx.beginPath();
  roundRect(ctx, x, y, boardW, boardH, 12 * scale);
  ctx.fill();
  ctx.stroke();

  // 頂部工程名稱欄 (亮檸檬綠、粗體加強)
  ctx.fillStyle = '#b7e854';
  ctx.font = `bold ${Math.round(22 * scale * (sizeFactor / 1.15))}px "Microsoft JhengHei", sans-serif`;
  ctx.fillText(
    data.projectName || '未命名工程',
    x + 16 * scale,
    y + 32 * scale,
    boardW - (isCompact ? 95 : 115) * scale
  );

  // 施工階段膠囊徽章
  const stageCol = getStageColor(data.stage);
  const badgeW = (isCompact ? 80 : 92) * scale;
  const badgeH = 25 * scale;
  const badgeX = x + boardW - badgeW - 14 * scale;
  const badgeY = y + 12 * scale;

  ctx.fillStyle = stageCol.bg;
  ctx.beginPath();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12 * scale);
  ctx.fill();

  ctx.fillStyle = stageCol.text;
  ctx.font = `bold ${Math.round(14 * scale)}px "Microsoft JhengHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(data.stage, badgeX + badgeW / 2, badgeY + 17 * scale);
  ctx.textAlign = 'left';

  // 分隔線
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 14 * scale, y + 44 * scale);
  ctx.lineTo(x + boardW - 14 * scale, y + 44 * scale);
  ctx.stroke();

  // 詳細內容表格
  const items = [
    { label: '部位工項', value: data.partName || '未指定工項' },
    { label: '拍攝時間', value: data.timestamp },
    { label: '現場地點', value: data.locationText || '現場' },
  ];

  if (!isCompact) {
    items.push({
      label: '施作單位',
      value: `${data.contractor || '現場工程'} ${data.inspector ? `(${data.inspector})` : ''}`,
    });
  }

  if (data.note) {
    items.push({ label: '備註說明', value: data.note });
  }

  let lineY = y + 68 * scale;
  const labelW = (isCompact ? 76 : 84) * scale;
  const lineHeight = (isCompact ? 26 : 30) * scale;

  items.forEach((item) => {
    // 標籤 Label: 高對比亮琥珀黃/銀灰，加粗
    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${Math.round(15 * scale)}px "Microsoft JhengHei", sans-serif`;
    ctx.fillText(item.label, x + 16 * scale, lineY);

    // 內容 Value: 純白、粗體，確保在任何縮放比例下均清晰
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft JhengHei", sans-serif`;
    ctx.fillText(
      item.value,
      x + 16 * scale + labelW,
      lineY,
      boardW - labelW - 30 * scale
    );

    lineY += lineHeight;
  });

  ctx.restore();
}

/**
 * 2. 台灣公共工程經典白底黑字/工程綠底白字看板 (Classic Taiwan Board)
 */
function drawClassicTaiwanBoard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  data: WatermarkData
) {
  const pad = 24 * scale;
  const boardW = Math.min(w * 0.62, 600 * scale);
  const rows = [
    { title: '工程名稱', val: data.projectName },
    { title: '施工項目', val: data.partName },
    { title: '查驗階段', val: data.stage },
    { title: '拍攝時間', val: data.timestamp },
    { title: '拍攝地點', val: data.locationText || data.gpsCoords || '現場' },
    { title: '承造廠商', val: data.contractor },
    { title: '檢查人員', val: data.inspector || '工務代表' },
  ];

  if (data.note) {
    rows.push({ title: '備註說明', val: data.note });
  }

  const rowHeight = 32 * scale;
  const headerHeight = 42 * scale;
  const boardH = headerHeight + rows.length * rowHeight;
  const x = w - boardW - pad;
  const y = h - boardH - pad;

  ctx.save();
  // 白色經典黑框
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, boardW, boardH);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5 * scale;
  ctx.strokeRect(x, y, boardW, boardH);

  // 看板抬頭（深綠底白字）
  ctx.fillStyle = '#166534';
  ctx.fillRect(x, y, boardW, headerHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(20 * scale)}px "Microsoft JhengHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('施工現場檢驗相片紀錄板', x + boardW / 2, y + 28 * scale);

  // 表格繪製
  const titleW = 105 * scale;
  let currY = y + headerHeight;

  ctx.textAlign = 'left';
  rows.forEach((row) => {
    // 橫線
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x, currY);
    ctx.lineTo(x + boardW, currY);
    ctx.stroke();

    // 標題欄底色
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(x, currY, titleW, rowHeight);

    // 直線
    ctx.beginPath();
    ctx.moveTo(x + titleW, currY);
    ctx.lineTo(x + titleW, currY + rowHeight);
    ctx.stroke();

    // 標題字
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${Math.round(15 * scale)}px "Microsoft JhengHei", sans-serif`;
    ctx.fillText(row.title, x + 12 * scale, currY + 22 * scale);

    // 內容字
    if (row.title === '查驗階段') {
      const stageCol = getStageColor(data.stage);
      ctx.fillStyle = stageCol.bg;
      ctx.font = `bold ${Math.round(17 * scale)}px "Microsoft JhengHei", sans-serif`;
    } else {
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft JhengHei", sans-serif`;
    }
    ctx.fillText(row.val || '—', x + titleW + 14 * scale, currY + 22 * scale, boardW - titleW - 24 * scale);

    currY += rowHeight;
  });

  ctx.restore();
}

/**
 * 3. 底部通欄工務條 (Dark Strip)
 */
function drawDarkBottomStrip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  data: WatermarkData
) {
  const stripH = 110 * scale;
  const y = h - stripH;

  ctx.save();
  // 95% 高不透明黑底
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillRect(0, y, w, stripH);

  // 頂部亮黃綠 3px 邊框
  ctx.fillStyle = '#b7e854';
  ctx.fillRect(0, y, w, 4 * scale);

  // 第一行：[階段徽章] 工程名稱 | 工項
  const badgeCol = getStageColor(data.stage);
  const badgeW = 88 * scale;
  const badgeH = 28 * scale;

  ctx.fillStyle = badgeCol.bg;
  ctx.beginPath();
  roundRect(ctx, 20 * scale, y + 16 * scale, badgeW, badgeH, 6 * scale);
  ctx.fill();

  ctx.fillStyle = badgeCol.text;
  ctx.font = `bold ${Math.round(15 * scale)}px "Microsoft JhengHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(data.stage, 20 * scale + badgeW / 2, y + 36 * scale);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(22 * scale)}px "Microsoft JhengHei", sans-serif`;
  ctx.fillText(
    `${data.projectName || '未命名工程'} ・ ${data.partName || '未註明工項'}`,
    20 * scale + badgeW + 16 * scale,
    y + 38 * scale,
    w - badgeW - 60 * scale
  );

  // 第二行：時間、地點、廠商 (亮黃標籤 + 純白文字)
  ctx.fillStyle = '#fef08a';
  ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft JhengHei", sans-serif`;
  const infoText = `🕒 ${data.timestamp}   📍 ${data.locationText || '現場'}   🏢 ${data.contractor || '現場工程'}${data.inspector ? ` (${data.inspector})` : ''}${data.note ? `   📝 ${data.note}` : ''}`;
  ctx.fillText(infoText, 20 * scale, y + 78 * scale, w - 40 * scale);

  ctx.restore();
}

/**
 * 4. 極簡角落銘牌 (Corner Badge) - 佔比最小
 */
function drawCornerBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  data: WatermarkData
) {
  const pad = 20 * scale;
  const badgeW = Math.min(w * 0.45, 380 * scale);
  const badgeH = 120 * scale;
  const x = w - badgeW - pad;
  const y = pad;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5 * scale;

  ctx.beginPath();
  roundRect(ctx, x, y, badgeW, badgeH, 8 * scale);
  ctx.fill();
  ctx.stroke();

  // 標題
  ctx.fillStyle = '#b7e854';
  ctx.font = `bold ${16 * scale}px sans-serif`;
  ctx.fillText(data.projectName, x + 14 * scale, y + 26 * scale, badgeW - 28 * scale);

  // 內容
  ctx.fillStyle = '#ffffff';
  ctx.font = `${13 * scale}px sans-serif`;
  ctx.fillText(`【${data.stage}】${data.partName}`, x + 14 * scale, y + 52 * scale, badgeW - 28 * scale);
  ctx.fillText(`時間: ${data.timestamp}`, x + 14 * scale, y + 74 * scale, badgeW - 28 * scale);
  ctx.fillText(`地點: ${data.locationText || '現場'}`, x + 14 * scale, y + 96 * scale, badgeW - 28 * scale);

  ctx.restore();
}

// Helper: Canvas rounded rect
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
