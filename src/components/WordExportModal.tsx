import React, { useState } from 'react';
import { PhotoRecord, Project } from '../types';
import {
  FileText,
  X,
  CheckCircle,
  Download,
  Share2,
  FolderDown,
  Info,
  ExternalLink,
} from 'lucide-react';
import { exportWordReport, shareWordFile } from '../utils/wordExport';
import saveAs from 'file-saver';

interface WordExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: PhotoRecord[];
  activeProject: Project;
}

export const WordExportModal: React.FC<WordExportModalProps> = ({
  isOpen,
  onClose,
  selectedPhotos,
  activeProject,
}) => {
  const [reportTitle, setReportTitle] = useState('工程施工相片紀錄表');
  const [layout, setLayout] = useState<'2_per_page' | '4_per_page'>('2_per_page');
  const [signerName, setSignerName] = useState('工務現場工程師');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessInfo, setExportSuccessInfo] = useState<{
    fileName: string;
    blob: Blob;
    canShare: boolean;
    filePath?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExport = async (autoShareAfterExport: boolean = false) => {
    if (selectedPhotos.length === 0) return;
    setIsExporting(true);

    try {
      const result = await exportWordReport(selectedPhotos, {
        reportTitle,
        project: activeProject,
        layout,
        includeNote: true,
        signerName,
      });

      setExportSuccessInfo({
        fileName: result.fileName,
        blob: result.blob,
        canShare: result.canShare,
        filePath: result.filePath,
      });

      if (autoShareAfterExport) {
        // Trigger share immediately
        await shareWordFile(result.blob, result.fileName, result.filePath);
      }
    } catch (err) {
      console.error('Word export failed:', err);
      alert('匯出 Word 報告失敗，請確認照片數據正常');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!exportSuccessInfo) return;
    await shareWordFile(exportSuccessInfo.blob, exportSuccessInfo.fileName, exportSuccessInfo.filePath);
  };

  const handleReDownload = () => {
    if (!exportSuccessInfo) return;
    saveAs(exportSuccessInfo.blob, exportSuccessInfo.fileName);
  };

  const handleClose = () => {
    setExportSuccessInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#141c1b] border border-[#27302e] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl text-[#f5f6ef] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27302e] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">匯出 Word (.docx) 工程報告</h2>
              <p className="text-xs text-gray-400">已選取 {selectedPhotos.length} 張工程照片</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {exportSuccessInfo ? (
            /* 匯出成功與檔案位置導引面板 */
            <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-[#b7e854] flex items-center justify-center mb-2.5">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">Word 報告已成功匯出！</h3>
                <p className="text-xs text-emerald-300 font-mono mt-1 break-all px-2">
                  {exportSuccessInfo.fileName}
                </p>
              </div>

              {/* 手機儲存位置指引區塊 */}
              <div className="bg-[#0b1112] border border-[#27302e] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#b7e854]">
                  <FolderDown className="w-4 h-4 shrink-0" />
                  <span>檔案儲存在手機哪裡？</span>
                </div>

                <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
                  <div className="p-2.5 bg-[#141c1b] rounded-xl border border-white/10">
                    <div className="font-semibold text-white mb-0.5">📂 手機儲存路徑：</div>
                    <div className="text-gray-400 font-mono text-[11px]">
                      內部儲存空間 / Documents (文件) 或 Download (下載)
                    </div>
                  </div>

                  <div className="space-y-1 text-gray-400 pl-1 text-[11px]">
                    <p>• 打開手機內建的 <strong className="text-white">「檔案」</strong> 或 <strong className="text-white">「我的檔案」</strong> App。</p>
                    <p>• 點進 <strong className="text-white">「文件 (Documents)」</strong> 或 <strong className="text-white">「下載內容 (Download)」</strong> 即可看到剛產出的 Word 檔案。</p>
                    <p className="text-[#b7e854]">• 最方便的方式：點擊下方「立即分享檔案」直接傳送給 LINE 群組或聯絡人！</p>
                  </div>
                </div>
              </div>

              {/* 快捷操作按鈕組 */}
              <div className="space-y-2 pt-1">
                {exportSuccessInfo.canShare && (
                  <button
                    onClick={handleShare}
                    className="w-full py-3.5 bg-[#b7e854] text-[#0b1112] font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#a6d542] transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    立即分享檔案 (LINE / 郵件 / 雲端硬碟)
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleReDownload}
                    className="py-2.5 bg-[#192421] border border-[#27302e] text-gray-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-[#27302e]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    再次下載
                  </button>

                  <button
                    onClick={handleClose}
                    className="py-2.5 bg-white/10 text-white font-semibold rounded-xl text-xs hover:bg-white/15"
                  >
                    完成關閉
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 匯出設定表單 */
            <>
              {/* 報告標題 */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">報告文件標題</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              {/* 版面樣式選擇 */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Word 排版規格</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLayout('2_per_page')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      layout === '2_per_page'
                        ? 'border-[#b7e854] bg-[#b7e854]/10 ring-1 ring-[#b7e854]'
                        : 'border-[#27302e] bg-[#0b1112] text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#b7e854] mb-1">A4 一頁 2 張 (推薦)</div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      大尺寸照片清晰，附詳細查驗表格，適合正式公文、業主與監造送審。
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayout('4_per_page')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      layout === '4_per_page'
                        ? 'border-[#b7e854] bg-[#b7e854]/10 ring-1 ring-[#b7e854]'
                        : 'border-[#27302e] bg-[#0b1112] text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#b7e854] mb-1">A4 一頁 4 張</div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      精簡 2x2 排版，節省紙張，適合內部存檔或大量進度快速清冊。
                    </div>
                  </button>
                </div>
              </div>

              {/* 專案資訊摘要 */}
              <div className="bg-[#0b1112] border border-[#27302e] rounded-xl p-3 text-xs space-y-1.5 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">專案名稱：</span>
                  <span className="font-medium text-white truncate max-w-[240px]">
                    {activeProject.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">承包廠商：</span>
                  <span>{activeProject.contractor || activeProject.company || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">工程地點：</span>
                  <span className="truncate max-w-[240px]">{activeProject.defaultLocation || '現場'}</span>
                </div>
              </div>

              {/* 紀錄人員簽核 */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">製表/簽核人員</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="工程師 / 查驗人員姓名"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              {/* 提示訊息 */}
              <div className="flex items-start gap-2 text-[11px] text-gray-400 bg-white/5 p-2.5 rounded-xl">
                <Info className="w-4 h-4 text-[#b7e854] shrink-0 mt-0.5" />
                <span>
                  產出的 Word 檔案將直接下載至手機<strong>「Download（下載）」</strong>資料夾，產出後可直接點擊分享傳送至 LINE 或以 Word App 開啟。
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer (Safe area padding for bottom gesture navigation) */}
        {/* Footer (Safe area padding for bottom gesture navigation) */}
        {!exportSuccessInfo && (
          <div className="p-4 border-t border-[#27302e] bg-[#0b1112] shrink-0 pb-[max(1.2rem,calc(var(--sab) + 0.8rem))] space-y-2">
            <button
              onClick={() => handleExport(true)}
              disabled={isExporting}
              className="w-full py-3.5 bg-[#b7e854] text-[#0b1112] font-bold rounded-xl hover:bg-[#a6d542] transition-colors flex items-center justify-center gap-2 text-base shadow-lg disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#0b1112] border-t-transparent rounded-full animate-spin" />
                  正在產生並準備分享...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  一鍵產出並直接分享 (LINE / 郵件)
                </>
              )}
            </button>

            <button
              onClick={() => handleExport(false)}
              disabled={isExporting}
              className="w-full py-2.5 bg-[#192421] border border-[#27302e] text-gray-200 font-semibold rounded-xl hover:bg-[#27302e] transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#b7e854]" />
              僅儲存至手機文件夾 (Download)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
