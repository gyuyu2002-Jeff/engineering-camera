import React, { useState } from 'react';
import { WatermarkData, ConstructionStage, WatermarkTemplate } from '../types';
import { X, MapPin, RefreshCw, Layers } from 'lucide-react';
import { getCurrentLocation } from '../utils/geo';

interface WatermarkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WatermarkData;
  onChange: (newData: WatermarkData) => void;
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

const TEMPLATES: {
  id: WatermarkTemplate;
  name: string;
  desc: string;
  badge: string;
  previewClass: string;
}[] = [
  {
    id: 'none',
    name: '1. 無看板',
    desc: '保留純相片視野，不烙印任何文字看板',
    badge: '純淨畫面',
    previewClass: 'border-dashed border-gray-600 bg-gray-900/50',
  },
  {
    id: 'dark_strip',
    name: '2. 底部通欄工務條',
    desc: '橫貫底部高對比資訊黑條，視野最廣（推薦）',
    badge: '預設推薦',
    previewClass: 'bg-black border-t-2 border-[#b7e854]',
  },
  {
    id: 'standard_board',
    name: '3. 現代板',
    desc: '右下角黑底亮綠立體銘牌，字體大且清晰',
    badge: '高對比',
    previewClass: 'bg-black/90 border border-[#b7e854]',
  },
  {
    id: 'classic_tw',
    name: '4. 台灣公共工程板',
    desc: '傳統綠白雙色表格驗收看板，經典標準格式',
    badge: '公共工程',
    previewClass: 'bg-white border-2 border-black text-black',
  },
];

export const WatermarkSettingsModal: React.FC<WatermarkSettingsModalProps> = ({
  isOpen,
  onClose,
  data,
  onChange,
}) => {
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const handleRefreshGps = async () => {
    setIsLocating(true);
    try {
      const geo = await getCurrentLocation();
      if (geo.address || geo.coords) {
        onChange({
          ...data,
          locationText: geo.address || geo.coords,
          gpsCoords: geo.coords,
        });
      }
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#141c1b] border border-[#27302e] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl text-[#f5f6ef]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27302e]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#b7e854]" />
            <h2 className="text-lg font-bold">工程銘牌浮水印設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* 銘牌樣式選擇 (附視覺縮圖示意) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-300">看板風格與範例圖示</label>
              <span className="text-[11px] text-[#b7e854]">點擊選擇樣式</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onChange({ ...data, templateStyle: tpl.id })}
                  className={`p-3 text-left rounded-xl border text-xs transition-all relative flex flex-col justify-between gap-2 ${
                    data.templateStyle === tpl.id
                      ? 'border-[#b7e854] bg-[#b7e854]/10 text-white font-bold ring-2 ring-[#b7e854]'
                      : 'border-[#27302e] bg-[#0b1112] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#b7e854] font-bold text-sm">{tpl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                        {tpl.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 leading-snug">{tpl.desc}</div>
                  </div>

                  {/* 視覺範例示意縮圖 (Mini Diagram) */}
                  <div className="w-full h-12 rounded-lg bg-gray-800/80 border border-white/10 relative overflow-hidden flex flex-col justify-end p-1 select-none pointer-events-none">
                    {tpl.id === 'none' && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                        [ 純相片・無文字銘板 ]
                      </div>
                    )}
                    {tpl.id === 'dark_strip' && (
                      <div className="w-full h-5 bg-black/95 border-t border-[#b7e854] flex items-center justify-between px-1.5 text-[8px] text-white">
                        <span className="text-[#b7e854] font-bold">【施工中】信義大樓</span>
                        <span className="text-gray-300">2026/10/07 互盛</span>
                      </div>
                    )}
                    {tpl.id === 'standard_board' && (
                      <div className="self-end w-28 h-8 rounded bg-black/95 border border-[#b7e854] p-1 flex flex-col justify-center text-[8px] leading-tight text-white">
                        <div className="text-[#b7e854] font-bold truncate">信義裝修工程</div>
                        <div className="text-amber-200 truncate">部位: 天花板配管</div>
                      </div>
                    )}
                    {tpl.id === 'classic_tw' && (
                      <div className="self-end w-28 h-9 rounded bg-white border border-black text-black flex flex-col text-[7px] leading-tight">
                        <div className="bg-emerald-800 text-white text-center font-bold px-0.5">
                          相片紀錄板
                        </div>
                        <div className="px-0.5 flex justify-between border-t border-gray-300 text-gray-800">
                          <span>工程</span>
                          <span className="truncate">裝修工程</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 銘牌尺寸大小調整 (避免遮擋畫面) - 僅保留精簡版與標準版 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">銘牌佔比大小</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'compact', label: '精簡版 (不擋景)' },
                { id: 'standard', label: '標準版 (推薦)' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ ...data, boardSize: s.id as any })}
                  className={`py-2 px-1 text-center rounded-xl border text-xs transition-all ${
                    (data.boardSize || 'standard') === s.id
                      ? 'border-[#b7e854] bg-[#b7e854] text-[#0b1112] font-bold shadow-md'
                      : 'border-[#27302e] bg-[#0b1112] text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 施工階段 (支援自訂項目) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400">施工階段標記</label>
              <span className="text-[11px] text-[#b7e854]">目前：{data.stage}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {STAGES.map((stg) => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => onChange({ ...data, stage: stg })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    data.stage === stg
                      ? 'bg-[#b7e854] text-[#0b1112] font-bold shadow-md scale-105'
                      : 'bg-[#192421] text-gray-300 hover:bg-[#27302e]'
                  }`}
                >
                  {stg}
                </button>
              ))}
            </div>
            {/* 自訂階段輸入框 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="➕ 輸入自訂階段 (例: 地質鑽探、竣工查驗)"
                value={!STAGES.includes(data.stage) ? data.stage : ''}
                onChange={(e) => onChange({ ...data, stage: e.target.value })}
                className="flex-1 bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#b7e854]"
              />
            </div>
          </div>

          {/* 施工工項 / 部位 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">施工工項 / 部位名稱</label>
            <input
              type="text"
              value={data.partName}
              onChange={(e) => onChange({ ...data, partName: e.target.value })}
              placeholder="例：2F 走道輕鋼架暗架、管道間防水塗刷"
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          {/* 地點資訊 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-400">施工地點 / 經緯度地址</label>
              <button
                type="button"
                onClick={handleRefreshGps}
                disabled={isLocating}
                className="text-xs text-[#b7e854] flex items-center gap-1 hover:underline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? '定位中...' : '重新抓取 GPS'}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={data.locationText}
                onChange={(e) => onChange({ ...data, locationText: e.target.value })}
                placeholder="現場地址或經緯度"
                className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* 承造廠商 與 紀錄人員 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">施作廠商</label>
              <input
                type="text"
                value={data.contractor}
                onChange={(e) => onChange({ ...data, contractor: e.target.value })}
                placeholder="承包廠商名稱"
                className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">查驗/拍照人員</label>
              <input
                type="text"
                value={data.inspector}
                onChange={(e) => onChange({ ...data, inspector: e.target.value })}
                placeholder="工程師姓名"
                className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
              />
            </div>
          </div>

          {/* 施工說明 / 備註 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">查驗備註 / 說明文字</label>
            <textarea
              rows={2}
              value={data.note}
              onChange={(e) => onChange({ ...data, note: e.target.value })}
              placeholder="例：鋼筋間距實測 15cm，符合施工圖說自主檢查項目。"
              className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27302e] bg-[#0b1112] pb-[max(1rem,env(safe-area-inset-bottom,0px))] shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#b7e854] text-[#0b1112] font-bold rounded-xl hover:bg-[#a6d542] transition-colors"
          >
            完成設定並套用
          </button>
        </div>
      </div>
    </div>
  );
};
