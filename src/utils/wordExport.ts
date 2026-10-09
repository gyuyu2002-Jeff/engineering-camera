import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  HeightRule,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import saveAs from 'file-saver';
import { PhotoRecord, Project } from '../types';

export interface WordExportOptions {
  reportTitle: string;
  project: Project;
  layout: 'grouped_by_item_stage' | '2_per_page' | '4_per_page';
  includeNote: boolean;
  signerName?: string;
}

// Convert base64 data URL to Uint8Array
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  canShare: boolean;
  filePath?: string;
}

export async function exportWordReport(
  photos: PhotoRecord[],
  options: WordExportOptions
): Promise<ExportResult> {
  if (photos.length === 0) {
    throw new Error('請至少選擇一張相片');
  }

  const { reportTitle, project, layout } = options;
  const todayStr = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Build document sections
  const children: (Paragraph | Table)[] = [];

  // 1. Document Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: reportTitle || '工程施工相片紀錄表',
          bold: true,
          size: 32, // 16pt
          font: 'Microsoft JhengHei',
        }),
      ],
    })
  );

  // 2. Project Summary Table
  const projectInfoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createHeaderCell('工程名稱', 18),
          createValueCell(project.name, 47),
          createHeaderCell('製表日期', 15),
          createValueCell(todayStr, 20),
        ],
      }),
      new TableRow({
        children: [
          createHeaderCell('承造廠商', 18),
          createValueCell(project.contractor || project.company || '—', 47),
          createHeaderCell('紀錄人員', 15),
          createValueCell(options.signerName || '現場工程師', 20),
        ],
      }),
      new TableRow({
        children: [
          createHeaderCell('施工地點', 18),
          createValueCell(project.defaultLocation || '施工現場', 82, 3),
        ],
      }),
    ],
  });

  children.push(projectInfoTable);
  children.push(new Paragraph({ spacing: { after: 100 } }));

  // 3. Photos and Details Table
  if (layout === 'grouped_by_item_stage') {
    // 【同工項階段分組（一欄多圖）】
    // 同一個工項在同一個施工階段（例如：1F天花板配管【施工前】）的 N 張照片放在同一個區塊欄目內
    // 依「工項名稱」分群，群內按「施工前 ➔ 施工中 ➔ 施工後 ➔ 隱蔽查驗 ➔ 自主檢查」標準階段順序排序
    const stageOrder: Record<string, number> = {
      施工前: 1,
      施工中: 2,
      施工後: 3,
      隱蔽查驗: 4,
      自主檢查: 5,
      材料進場: 6,
      缺失改善: 7,
    };

    // 建立群組：Key 為 `${partName}__SPLIT__${stage}`
    const groupsMap = new Map<string, { partName: string; stage: string; items: PhotoRecord[] }>();

    for (const p of photos) {
      const part = (p.watermarkData.partName || '一般工程項目').trim();
      const stg = (p.watermarkData.stage || '施工中').trim();
      const key = `${part}__SPLIT__${stg}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { partName: part, stage: stg, items: [] });
      }
      groupsMap.get(key)!.items.push(p);
    }

    const groups = Array.from(groupsMap.values()).sort((a, b) => {
      if (a.partName !== b.partName) {
        return a.partName.localeCompare(b.partName, 'zh-TW');
      }
      const orderA = stageOrder[a.stage] || 99;
      const orderB = stageOrder[b.stage] || 99;
      return orderA - orderB;
    });

    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const group = groups[gIdx];
      const count = group.items.length;

      // 決定縮小照片尺寸與欄寬 (若是 3 張，每張約 145pt，等比縮小橫排在同一行)
      const colWidthPercent = Math.floor(100 / Math.min(count, 3));
      const targetW = count >= 3 ? 142 : count === 2 ? 215 : 440;
      const targetH = count >= 3 ? 108 : count === 2 ? 155 : 220;

      // 照片列儲存格
      const photoCells: TableCell[] = group.items.map((p, pIdx) => {
        const bytes = dataUrlToUint8Array(p.watermarkedDataUrl);
        return new TableCell({
          width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
          shading: { fill: 'FFFFFF' },
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              keepNext: true,
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: { width: targetW, height: targetH },
                  type: 'jpg',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20 },
              children: [
                new TextRun({
                  text: `圖 ${pIdx + 1}`,
                  size: 16,
                  color: '64748B',
                  font: 'Microsoft JhengHei',
                }),
              ],
            }),
          ],
        });
      });

      // 第一張照片的時間與地點作為代表
      const repPhoto = group.items[0];
      const allNotes = group.items
        .map((p) => p.watermarkData.note?.trim())
        .filter(Boolean);
      const combinedNote =
        allNotes.length > 0
          ? Array.from(new Set(allNotes)).join('；')
          : '現場施作情形正常，符合工程圖說規範要求。';

      const groupTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // Row 1: 工項標題列
          new TableRow({
            cantSplit: true,
            children: [
              createHeaderCell(`工項 ${gIdx + 1}`, 15),
              createValueCell(group.partName, 35, 1, true),
              createHeaderCell('查驗階段', 15),
              createValueCell(`【${group.stage}】 (共 ${count} 張)`, 35, 1, true),
            ],
          }),
          // Row 2: 縮小照片並排列 (跨所有欄位)
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnSpan: 4,
                shading: { fill: 'FAFAFA' },
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({
                        children: photoCells,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          // Row 3: 查驗時間與地點
          new TableRow({
            cantSplit: true,
            children: [
              createHeaderCell('拍攝時間', 15),
              createValueCell(repPhoto.watermarkData.timestamp, 35),
              createHeaderCell('查驗地點', 15),
              createValueCell(repPhoto.watermarkData.locationText || '現場', 35),
            ],
          }),
          // Row 4: 查驗說明 (同工項同區塊共用)
          new TableRow({
            cantSplit: true,
            children: [
              createHeaderCell('查驗說明', 15),
              createValueCell(combinedNote, 85, 3),
            ],
          }),
        ],
      });

      children.push(groupTable);
      children.push(new Paragraph({ spacing: { after: 120 } }));
    }
  } else if (layout === '2_per_page') {
    // 2 photos per page: Each photo and its details are in a unified table with cantSplit so they never split across pages
    // Note on Page 1: Title (~40pt) + Project Table (~80pt) leaves ~640pt printable height.
    // Each photo card must be <= 300pt in height (Image ~210pt + Table info ~75pt = ~285pt)
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const imgBytes = dataUrlToUint8Array(photo.watermarkedDataUrl);

      const rawW = photo.width || 1920;
      const rawH = photo.height || 1080;
      const aspect = rawW / rawH;
      const isPortrait = aspect < 1.05; // 直向照片 (9:16 或 3:4)

      let photoCardTable: Table;

      if (isPortrait) {
        // 【直向照片特別優化：左右並排佈局】
        // 左邊：直向大照片 (寬約 205pt, 高約 270pt，照片尺寸比原本垂直壓在頂部時大將近 1 倍以上！)
        // 右邊：4 行工項說明詳細表格
        const targetH = 265;
        const targetW = Math.min(210, Math.round(targetH * aspect));

        photoCardTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Row 1: Header / Category / Stage
            new TableRow({
              cantSplit: true,
              children: [
                // 左側照片儲存格 (跨 4 列)
                new TableCell({
                  width: { size: 45, type: WidthType.PERCENTAGE },
                  rowSpan: 4,
                  shading: { fill: 'FFFFFF' },
                  margins: { top: 20, bottom: 20, left: 20, right: 20 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      keepNext: true,
                      children: [
                        new ImageRun({
                          data: imgBytes,
                          transformation: {
                            width: targetW,
                            height: targetH,
                          },
                          type: 'jpg',
                        }),
                      ],
                    }),
                  ],
                }),
                createHeaderCell(`照片 ${i + 1}`, 16),
                createValueCell(photo.watermarkData.partName || '一般工項', 21),
                createHeaderCell('查驗階段', 15),
                createValueCell(photo.watermarkData.stage, 18, 1, true),
              ],
            }),
            // Row 2: 拍攝時間
            new TableRow({
              cantSplit: true,
              children: [
                createHeaderCell('拍攝時間', 16),
                createValueCell(photo.watermarkData.timestamp, 54, 3),
              ],
            }),
            // Row 3: 拍攝地點
            new TableRow({
              cantSplit: true,
              children: [
                createHeaderCell('拍攝地點', 16),
                createValueCell(photo.watermarkData.locationText || '現場', 54, 3),
              ],
            }),
            // Row 4: 查驗說明
            new TableRow({
              cantSplit: true,
              children: [
                createHeaderCell('查驗說明', 16),
                createValueCell(
                  photo.watermarkData.note || '現場施作情形正常，符合工程圖說規範要求。',
                  54,
                  3
                ),
              ],
            }),
          ],
        });
      } else {
        // 【橫向照片：上下佈局】
        const maxW = 440;
        const maxH = 220;
        let targetW = maxW;
        let targetH = Math.round(targetW / aspect);
        if (targetH > maxH) {
          targetH = maxH;
          targetW = Math.round(targetH * aspect);
        }

        photoCardTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Row 0: The Photo Image itself (centered, full width of card)
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  columnSpan: 5,
                  shading: { fill: 'FFFFFF' },
                  margins: { top: 20, bottom: 20, left: 20, right: 20 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      keepNext: true,
                      spacing: { before: 10, after: 10 },
                      children: [
                        new ImageRun({
                          data: imgBytes,
                          transformation: {
                            width: targetW,
                            height: targetH,
                          },
                          type: 'jpg',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            // Row 1: Header / Category / Stage
            new TableRow({
              cantSplit: true,
              children: [
                createHeaderCell(`照片 ${i + 1}`, 15),
                createHeaderCell('部位/工項', 18),
                createValueCell(photo.watermarkData.partName || '一般工項', 32),
                createHeaderCell('查驗階段', 15),
                createValueCell(photo.watermarkData.stage, 20, 1, true),
              ],
            }),
            // Row 2: Timestamp & Location
            new TableRow({
              cantSplit: true,
              children: [
                createHeaderCell('拍攝時間', 15),
                createValueCell(photo.watermarkData.timestamp, 32, 2),
                createHeaderCell('拍攝地點', 15),
                createValueCell(photo.watermarkData.locationText || '現場', 38),
              ],
            }),
            // Row 3: Description / Note
            new TableRow({
              cantSplit: true,
              children: [
                createHeaderCell('查驗說明', 15),
                createValueCell(
                  photo.watermarkData.note || '現場施作情形正常，符合工程圖說規範要求。',
                  85,
                  4
                ),
              ],
            }),
          ],
        });
      }

      // If this is the start of a new page (even index photo after first pair: i >= 2 and i % 2 === 0), add clean pageBreak
      if (i > 0 && i % 2 === 0) {
        children.push(new Paragraph({ pageBreakBefore: true }));
      }

      children.push(photoCardTable);

      // Compact spacer between photos on same page
      if (i % 2 === 0 && i !== photos.length - 1) {
        children.push(new Paragraph({ spacing: { after: 60 } }));
      }
    }
  } else {
    // 4 photos per page (2 columns x 2 rows)
    for (let i = 0; i < photos.length; i += 2) {
      const p1 = photos[i];
      const p2 = photos[i + 1];

      const img1Bytes = dataUrlToUint8Array(p1.watermarkedDataUrl);
      const img2Bytes = p2 ? dataUrlToUint8Array(p2.watermarkedDataUrl) : null;

      const rowTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: img1Bytes,
                        transformation: { width: 260, height: 165 },
                        type: 'jpg',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: `【${p1.watermarkData.stage}】${p1.watermarkData.partName || ''}`,
                        bold: true,
                        size: 20,
                        font: 'Microsoft JhengHei',
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `時間: ${p1.watermarkData.timestamp}\n說明: ${p1.watermarkData.note || '正常'}`,
                        size: 18,
                        font: 'Microsoft JhengHei',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: img2Bytes && p2
                  ? [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            data: img2Bytes,
                            transformation: { width: 260, height: 165 },
                            type: 'jpg',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: `【${p2.watermarkData.stage}】${p2.watermarkData.partName || ''}`,
                            bold: true,
                            size: 20,
                            font: 'Microsoft JhengHei',
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `時間: ${p2.watermarkData.timestamp}\n說明: ${p2.watermarkData.note || '正常'}`,
                            size: 18,
                            font: 'Microsoft JhengHei',
                          }),
                        ],
                      }),
                    ]
                  : [new Paragraph({})],
              }),
            ],
          }),
        ],
      });

      children.push(rowTable);
      children.push(new Paragraph({ spacing: { after: 120 } }));

      if (i > 0 && (i + 2) % 4 === 0 && i + 2 < photos.length) {
        children.push(new Paragraph({ pageBreakBefore: true }));
      }
    }
  }

  // Build document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${project.name} 施工品質查驗紀錄`,
                    color: '888888',
                    size: 18,
                    font: 'Microsoft JhengHei',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: '第 ', font: 'Microsoft JhengHei' }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun({ text: ' 頁', font: 'Microsoft JhengHei' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${project.name}_施工照片報告_${todayStr.replace(/\//g, '')}.docx`;

  let filePath: string | undefined;
  let canShare = true;

  if (Capacitor.isNativePlatform()) {
    try {
      // Convert blob to base64
      const base64Data = await blobToBase64(blob);
      // Save directly into Android's public Documents directory
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      filePath = savedFile.uri;
    } catch (fsErr) {
      console.warn('Native filesystem write error:', fsErr);
      // Fallback to Cache directory if Documents fails
      try {
        const base64Data = await blobToBase64(blob);
        const cached = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        filePath = cached.uri;
      } catch (cacheErr) {
        console.error('Cache write failed:', cacheErr);
      }
    }
  } else {
    // Browser download
    saveAs(blob, fileName);
    try {
      const file = new File([blob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      canShare = Boolean(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch {
      canShare = false;
    }
  }

  return { blob, fileName, canShare, filePath };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const cleanBase64 = base64.split(',')[1] || '';
      resolve(cleanBase64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function shareWordFile(
  blob: Blob,
  fileName: string,
  filePath?: string
): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      let fileUri = filePath;
      if (!fileUri) {
        // Ensure file exists in Cache for sharing
        const base64Data = await blobToBase64(blob);
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        fileUri = saved.uri;
      }

      await Share.share({
        title: fileName,
        text: '工程施工相片紀錄表',
        url: fileUri,
        dialogTitle: '分享工程 Word 報告',
      });
      return true;
    }

    // Web Share API fallback
    const file = new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: fileName,
        text: '工程施工相片紀錄表',
      });
      return true;
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('Share error:', err);
    }
  }
  return false;
}

// Helpers for cell styling
function createHeaderCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: 'F1F5F9' },
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: 19,
            font: 'Microsoft JhengHei',
            color: '1E293B',
          }),
        ],
      }),
    ],
  });
}

function createValueCell(
  text: string,
  widthPercent: number,
  columnSpan: number = 1,
  isBoldHighlight: boolean = false
): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    columnSpan,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text || '—',
            size: 19,
            bold: isBoldHighlight,
            color: isBoldHighlight ? '2563EB' : '334155',
            font: 'Microsoft JhengHei',
          }),
        ],
      }),
    ],
  });
}
