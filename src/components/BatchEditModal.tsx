import React, { useState } from 'react';
import { PhotoRecord, ConstructionStage } from '../types';
import { X, CheckCircle, Sliders, Layers, Sparkles } from 'lucide-react';
import { applyWatermark } from '../utils/watermark';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedPhotos: PhotoRecord[];
  onClose: () => void;
  onSave: (updatedPhotos: PhotoRecord[]) => Promise<void>;
}

const STAGES: ConstructionStage[] = [
  '施工前',
  '施工中',
  '施工後',
  '自主檢查',
  '材料進場',
  '隱蔽查驗',
  '缺失改善',
];

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  selectedPhotos,
  onClose,
  onSave,
}) => {
  const [partName, setPartName] = useState('');
  const [stage, setStage] = useState<ConstructionStage | ''>('');
  const [contractor, setContractor] = useState('');
  const [applyWatermarkNow, setApplyWatermarkNow] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName && !stage && !contractor && !applyWatermarkNow) {
      alert('請至少填寫一項要批次修改的內容或勾選重新壓製浮水印');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedPhotos.length });

    try {
      const updatedPhotos: PhotoRecord[] = [];

      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        const updatedWatermarkData = {
          ...photo.watermarkData,
          partName: partName.trim() ? partName.trim() : photo.watermarkData.partName,
          stage: stage ? stage : photo.watermarkData.stage,
          contractor: contractor.trim() ? contractor.trim() : photo.watermarkData.contractor,
        };

        let watermarkedUrl = photo.watermarkedDataUrl;

        // 如果要求壓印/重新壓製浮水印
        if (applyWatermarkNow) {
          const baseImgSrc = photo.rawDataUrl || photo.watermarkedDataUrl;
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = baseImgSrc;
          });
          watermarkedUrl = await applyWatermark(img, updatedWatermarkData);
        }

        updatedPhotos.push({
          ...photo,
          watermarkedDataUrl: watermarkedUrl,
          watermarkData: updatedWatermarkData,
          hasWatermark: applyWatermarkNow ? true : photo.hasWatermark,
        });

        setProgress({ current: i + 1, total: selectedPhotos.length });
      }

      await onSave(updatedPhotos);
      onClose();
    } catch (err) {
      console.error('Batch update failed:', err);
      alert('批次更新失敗，請重試');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141c1b] border border-[#27302e] w-full max-w-md rounded-2xl flex flex-col shadow-2xl text-[#f5f6ef] overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27302e] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#b7e854]/20 text-[#b7e854]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">批次修改相片銘牌</h3>
              <p className="text-xs text-gray-400">已選取 {selectedPhotos.length} 張相片進行批次設定</p>
            </div>
          </div>
          <button
            type="button"
            data-close-modal="true"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-gray-300 hover:text-white transition-all"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Batch Part Name */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-200 flex items-center justify-between">
              <span>統一設定工項部位</span>
              <span className="text-[10px] text-gray-500 font-normal">留空表示維持個別相片原設定</span>
            </label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="例如：1F 消防排煙管裝設"
              className="w-full bg-[#0b1112] border border-[#27302e] focus:border-[#b7e854] rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Batch Stage */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-200 flex items-center justify-between">
              <span>統一設定施工階段</span>
              <span className="text-[10px] text-gray-500 font-normal">留空表示維持個別相片原階段</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {STAGES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStage(stage === s ? '' : s)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    stage === s
                      ? 'bg-[#b7e854] text-[#0b1112] shadow-md scale-102'
                      : 'bg-[#0b1112] text-gray-300 border border-[#27302e] hover:border-gray-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Contractor */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-200 flex items-center justify-between">
              <span>統一設定施作廠商</span>
              <span className="text-[10px] text-gray-500 font-normal">留空表示維持原廠商</span>
            </label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="例如：互盛（股）有限公司"
              className="w-full bg-[#0b1112] border border-[#27302e] focus:border-[#b7e854] rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Apply Watermark Toggle */}
          <div className="p-3 bg-[#0b1112] border border-[#27302e] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#b7e854]" />
              <div>
                <div className="font-bold text-white text-xs">批次壓製 / 更新銘牌浮水印</div>
                <div className="text-[10px] text-gray-400">依新工項與每張照片拍攝時間重新烙印</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={applyWatermarkNow}
              onChange={(e) => setApplyWatermarkNow(e.target.checked)}
              className="w-4 h-4 accent-[#b7e854] cursor-pointer"
            />
          </div>

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="p-3 rounded-xl bg-[#0b1112] border border-[#b7e854]/40 flex flex-col gap-1.5 animate-pulse">
              <div className="flex justify-between text-xs text-white">
                <span className="font-bold">正在批次處理照片浮水印...</span>
                <span className="text-[#b7e854] font-bold">{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full h-1.5 bg-[#27302e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#b7e854] transition-all duration-200"
                  style={{
                    width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-[#27302e] text-gray-400 hover:text-white font-medium active:scale-95 transition-all text-xs"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-[#b7e854] text-[#0b1112] font-black shadow-lg hover:bg-[#a6d542] active:scale-95 transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isProcessing ? '處理中...' : '開始批次套用'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
