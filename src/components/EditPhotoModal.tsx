import React, { useState } from 'react';
import { PhotoRecord, ConstructionStage } from '../types';
import { X, Save, Edit3 } from 'lucide-react';
import { applyWatermark } from '../utils/watermark';

interface EditPhotoModalProps {
  photo: PhotoRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPhoto: PhotoRecord) => Promise<void>;
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

export const EditPhotoModal: React.FC<EditPhotoModalProps> = ({
  photo,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    partName: photo.watermarkData.partName || '',
    stage: photo.watermarkData.stage || '施工中',
    contractor: photo.watermarkData.contractor || '',
    locationText: photo.watermarkData.locationText || '',
    note: photo.watermarkData.note || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedWatermarkData = {
        ...photo.watermarkData,
        partName: formData.partName.trim(),
        stage: formData.stage,
        contractor: formData.contractor.trim(),
        locationText: formData.locationText.trim(),
        note: formData.note.trim(),
      };

      // 載入底圖重新壓製浮水印
      // 若有保存 rawDataUrl 則用原圖壓印；若無則用既有圖片重新壓製
      const baseImgSrc = photo.rawDataUrl || photo.watermarkedDataUrl;
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = baseImgSrc;
      });

      const newWatermarkedUrl = await applyWatermark(img, updatedWatermarkData);

      const updatedRecord: PhotoRecord = {
        ...photo,
        watermarkedDataUrl: newWatermarkedUrl,
        watermarkData: updatedWatermarkData,
      };

      await onSave(updatedRecord);
      onClose();
    } catch (err) {
      console.error('Update photo failed:', err);
      alert('更新照片銘牌失敗，請重試');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141c1b] border border-[#27302e] w-full max-w-md rounded-2xl flex flex-col shadow-2xl text-[#f5f6ef] overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27302e] shrink-0">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#b7e854]" />
            <h3 className="text-base font-bold text-white">修改相片銘牌與說明</h3>
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
        <form onSubmit={handleSave} className="p-4 space-y-3.5 overflow-y-auto">
          {/* 施工階段 */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">施工階段</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {STAGES.map((stg) => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, stage: stg }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    formData.stage === stg
                      ? 'bg-[#b7e854] text-[#0b1112] font-bold shadow-md'
                      : 'bg-[#192421] text-gray-300 hover:bg-[#27302e]'
                  }`}
                >
                  {stg}
                </button>
              ))}
            </div>
            {/* 自訂階段輸入 */}
            <input
              type="text"
              placeholder="或輸入自訂階段"
              value={!STAGES.includes(formData.stage) ? formData.stage : ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, stage: e.target.value }))}
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          {/* 施工部位 / 工項 */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">施工工項 / 部位</label>
            <input
              type="text"
              value={formData.partName}
              onChange={(e) => setFormData((prev) => ({ ...prev, partName: e.target.value }))}
              placeholder="例：1F天花板配管、地下室防水層施作"
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          {/* 施作廠商 */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">施作廠商</label>
            <input
              type="text"
              value={formData.contractor}
              onChange={(e) => setFormData((prev) => ({ ...prev, contractor: e.target.value }))}
              placeholder="例：互盛（股）有限公司"
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          {/* 施工地點 */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">拍攝地點</label>
            <input
              type="text"
              value={formData.locationText}
              onChange={(e) => setFormData((prev) => ({ ...prev, locationText: e.target.value }))}
              placeholder="例：現場、松仁路 100 號"
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          {/* 備註說明（Word 匯出查驗說明） */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              查驗說明 / 備註（同步更新 Word 報告）
            </label>
            <textarea
              rows={3}
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="請輸入查驗說明，例如：現場施作情形正常，符合工程圖說規範要求。"
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#27302e]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#b7e854] text-[#0b1112] text-xs font-black flex items-center gap-1.5 shadow-md hover:bg-[#a6d542] active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '正在重新烙印...' : '儲存並重新烙印'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
