import React from 'react';
import { WatermarkData } from '../types';

interface WatermarkOverlayProps {
  data: WatermarkData;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ data }) => {
  if (data.templateStyle === 'none') {
    return null;
  }

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case '施工前':
        return 'bg-blue-600 text-white';
      case '施工中':
        return 'bg-amber-500 text-white';
      case '施工後':
        return 'bg-emerald-600 text-white';
      case '隱蔽查驗':
        return 'bg-purple-600 text-white';
      case '自主檢查':
        return 'bg-teal-600 text-white';
      default:
        return 'bg-red-600 text-white';
    }
  };

  if (data.templateStyle === 'classic_tw') {
    return (
      <div className="absolute bottom-4 right-4 max-w-[85%] sm:max-w-md bg-white border-2 border-black shadow-2xl text-black text-xs font-sans pointer-events-none select-none">
        <div className="bg-emerald-800 text-white font-bold py-1 px-3 text-center text-xs tracking-wider">
          施工現場檢驗相片紀錄板
        </div>
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr className="border-t border-gray-400">
              <td className="bg-gray-100 font-bold px-2 py-0.5 border-r border-gray-400 w-20 text-gray-800">
                工程名稱
              </td>
              <td className="px-2 py-0.5 font-medium truncate max-w-[180px]">{data.projectName}</td>
            </tr>
            <tr className="border-t border-gray-400">
              <td className="bg-gray-100 font-bold px-2 py-0.5 border-r border-gray-400 text-gray-800">
                施工項目
              </td>
              <td className="px-2 py-0.5 font-medium truncate max-w-[180px]">{data.partName || '未指定'}</td>
            </tr>
            <tr className="border-t border-gray-400">
              <td className="bg-gray-100 font-bold px-2 py-0.5 border-r border-gray-400 text-gray-800">
                查驗階段
              </td>
              <td className="px-2 py-0.5 font-bold text-blue-700">{data.stage}</td>
            </tr>
            <tr className="border-t border-gray-400">
              <td className="bg-gray-100 font-bold px-2 py-0.5 border-r border-gray-400 text-gray-800">
                拍攝時間
              </td>
              <td className="px-2 py-0.5 text-gray-700">{data.timestamp}</td>
            </tr>
            <tr className="border-t border-gray-400">
              <td className="bg-gray-100 font-bold px-2 py-0.5 border-r border-gray-400 text-gray-800">
                拍攝地點
              </td>
              <td className="px-2 py-0.5 text-gray-700 truncate max-w-[180px]">{data.locationText || '現場'}</td>
            </tr>
            <tr className="border-t border-gray-400">
              <td className="bg-gray-100 font-bold px-2 py-0.5 border-r border-gray-400 text-gray-800">
                承造廠商
              </td>
              <td className="px-2 py-0.5 text-gray-700">{data.contractor || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (data.templateStyle === 'dark_strip') {
    return (
      <div className="absolute bottom-0 inset-x-0 bg-black/85 border-t-2 border-[#b7e854] p-3 text-white pointer-events-none select-none">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStageBadgeStyle(data.stage)}`}>
            {data.stage}
          </span>
          <span className="font-bold text-sm tracking-wide truncate">
            {data.projectName} ・ {data.partName || '施工工項'}
          </span>
        </div>
        <div className="text-[11px] text-gray-300 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>🕒 {data.timestamp}</span>
          <span>📍 {data.locationText || '現場'}</span>
          <span>🏢 {data.contractor || '承包商'}</span>
        </div>
      </div>
    );
  }

  if (data.templateStyle === 'corner_badge') {
    return (
      <div className="absolute top-4 right-4 bg-slate-900/90 border border-white/20 rounded-lg p-2.5 text-white max-w-[240px] pointer-events-none select-none shadow-xl text-xs">
        <div className="text-[#b7e854] font-bold text-sm truncate mb-0.5">{data.projectName}</div>
        <div className="font-semibold text-gray-200">
          【{data.stage}】{data.partName || '工項'}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">時間: {data.timestamp}</div>
        <div className="text-[11px] text-gray-400 truncate">地點: {data.locationText || '現場'}</div>
      </div>
    );
  }

  // standard_board (Default modern board)
  // standard_board (Default modern board)
  const isCompact = data.boardSize === 'compact';

  return (
    <div
      className={`absolute bottom-3 right-3 bg-black/95 border-2 border-[#b7e854] rounded-xl p-2.5 sm:p-3 shadow-2xl text-white pointer-events-none select-none backdrop-blur-md ${
        isCompact
          ? 'max-w-[70%] sm:max-w-[240px] text-[11px]'
          : 'max-w-[78%] sm:max-w-[280px] text-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/25 pb-1.5 mb-1.5">
        <span className="text-[#b7e854] font-black text-sm truncate tracking-tight">
          {data.projectName || '未命名工程'}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${getStageBadgeStyle(
            data.stage
          )}`}
        >
          {data.stage}
        </span>
      </div>
      <div className="space-y-1 leading-snug">
        <div className="flex items-baseline">
          <span className="text-amber-200 font-bold w-14 shrink-0 text-[11px]">部位工項</span>
          <span className="text-white font-bold truncate">{data.partName || '未指定'}</span>
        </div>
        <div className="flex items-baseline">
          <span className="text-amber-200 font-bold w-14 shrink-0 text-[11px]">拍攝時間</span>
          <span className="text-white font-bold truncate">{data.timestamp}</span>
        </div>
        <div className="flex items-baseline">
          <span className="text-amber-200 font-bold w-14 shrink-0 text-[11px]">現場地點</span>
          <span className="text-white font-bold truncate">{data.locationText || '現場'}</span>
        </div>
        {!isCompact && (
          <div className="flex items-baseline">
            <span className="text-amber-200 font-bold w-14 shrink-0 text-[11px]">施作單位</span>
            <span className="text-white font-bold truncate">{data.contractor || '現場工程'}</span>
          </div>
        )}
        {data.note && (
          <div className="flex items-baseline">
            <span className="text-amber-200 font-bold w-14 shrink-0 text-[11px]">備註說明</span>
            <span className="text-[#b7e854] font-bold truncate">{data.note}</span>
          </div>
        )}
      </div>
    </div>
  );
};
