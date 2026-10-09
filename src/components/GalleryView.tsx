import React, { useState, useRef } from 'react';
import { PhotoRecord, Project, ConstructionStage, WatermarkData } from '../types';
import {
  FileText,
  Trash2,
  Download,
  CheckSquare,
  Square,
  ZoomIn,
  X,
  Calendar,
  MapPin,
  Building,
  Tag,
  Edit,
  Upload,
  Layers,
  FolderInput,
  CheckCircle,
} from 'lucide-react';
import { deletePhotos, savePhoto, savePhotos } from '../db/indexedDb';
import { EditPhotoModal } from './EditPhotoModal';
import { BatchEditModal } from './BatchEditModal';

interface GalleryViewProps {
  photos: PhotoRecord[];
  activeProject: Project;
  defaultWatermarkData: WatermarkData;
  onRefreshPhotos: () => void;
  onOpenWordExport: (selectedPhotos: PhotoRecord[]) => void;
}

const STAGES: (ConstructionStage | '全部')[] = [
  '全部',
  '施工前',
  '施工中',
  '施工後',
  '隱蔽查驗',
  '自主檢查',
];

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  activeProject,
  defaultWatermarkData,
  onRefreshPhotos,
  onOpenWordExport,
}) => {
  const [filterStage, setFilterStage] = useState<ConstructionStage | '全部'>('全部');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoRecord | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<PhotoRecord | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter photos by active project and stage
  const projectPhotos = photos.filter((p) => p.projectId === activeProject.id);
  const filteredPhotos =
    filterStage === '全部'
      ? projectPhotos
      : projectPhotos.filter((p) => p.watermarkData.stage === filterStage);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPhotos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPhotos.map((p) => p.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`確定要刪除選取的 ${selectedIds.length} 張照片嗎？此操作無法還原。`)) {
      await deletePhotos(selectedIds);
      setSelectedIds([]);
      onRefreshPhotos();
    }
  };

  const handleDownloadSingle = (photo: PhotoRecord) => {
    const a = document.createElement('a');
    a.href = photo.watermarkedDataUrl;
    a.download = `${photo.watermarkData.projectName}_${photo.watermarkData.stage}_${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 批次匯入現有手機相簿相片 (多選)
  const handleBatchImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    const newRecords: PhotoRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // 讀取相片真實寬高
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = dataUrl;
        });

        // 讀取檔案時間或當前時間
        const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
        const timeStr = `${fileDate.getFullYear()}-${String(fileDate.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(fileDate.getDate()).padStart(2, '0')} ${String(fileDate.getHours()).padStart(
          2,
          '0'
        )}:${String(fileDate.getMinutes()).padStart(2, '0')}:${String(
          fileDate.getSeconds()
        ).padStart(2, '0')}`;

        const record: PhotoRecord = {
          id: 'imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          projectId: activeProject.id,
          timestamp: file.lastModified || Date.now(),
          watermarkedDataUrl: dataUrl, // 先以原圖顯示，後續可逐張或批次補壓銘牌
          rawDataUrl: dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          isImported: true,
          hasWatermark: false,
          watermarkData: {
            ...defaultWatermarkData,
            projectId: activeProject.id,
            projectName: activeProject.name,
            contractor: activeProject.contractor,
            locationText: activeProject.defaultLocation || defaultWatermarkData.locationText,
            timestamp: timeStr,
            partName: file.name.replace(/\.[^/.]+$/, '').slice(0, 30), // 預設以檔案名為初始工項
            stage: '施工中',
          },
        };

        newRecords.push(record);
      } catch (err) {
        console.warn('Importing file failed:', file.name, err);
      }
    }

    if (newRecords.length > 0) {
      await savePhotos(newRecords);
      onRefreshPhotos();
      alert(`成功匯入 ${newRecords.length} 張手機照片！\n您可在相簿中勾選進行「批次修改銘牌」或點擊照片「逐張編輯」。`);
    }

    setIsImporting(false);
    e.target.value = '';
  };

  const selectedPhotoRecords = projectPhotos.filter((p) => selectedIds.includes(p.id));

  return (
    <div className="flex-1 flex flex-col bg-[#0b1112] text-[#f5f6ef] overflow-hidden select-none">
      {/* 隱藏的多選檔案輸入框 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleBatchImport}
        className="hidden"
      />

      {/* Top Bar */}
      <div className="p-3.5 sm:p-4 bg-[#141c1b] border-b border-[#27302e] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>{activeProject.name}</span>
              <span className="text-xs bg-[#b7e854]/20 text-[#b7e854] px-2 py-0.5 rounded-full font-semibold">
                {projectPhotos.length} 張相片
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">現場施工查驗與照片歸檔清冊</p>
          </div>

          <div className="flex items-center gap-2">
            {/* 批次匯入手機相片按鈕 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#b7e854] text-[#0b1112] hover:bg-[#a6d542] font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              title="匯入手機相簿已拍照片"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>{isImporting ? '匯入中...' : '匯入相片'}</span>
            </button>

            <button
              onClick={handleSelectAll}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#192421] hover:bg-[#27302e] text-gray-300 flex items-center gap-1.5 border border-[#27302e]"
            >
              {selectedIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#b7e854]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selectedIds.length === filteredPhotos.length && filteredPhotos.length > 0
                ? '取消全選'
                : '全選'}
            </button>
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {STAGES.map((stg) => (
            <button
              key={stg}
              onClick={() => setFilterStage(stg)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterStage === stg
                  ? 'bg-[#b7e854] text-[#0b1112] font-bold shadow-md'
                  : 'bg-[#0b1112] text-gray-400 hover:text-white border border-[#27302e]'
              }`}
            >
              {stg}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24">
        {filteredPhotos.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#141c1b] flex items-center justify-center mb-3">
              <CameraIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium">目前尚無此階段的照片</p>
            <p className="text-xs text-gray-600 mt-1">請切換到相機分頁進行現場拍照</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              return (
                <div
                  key={photo.id}
                  className={`group relative rounded-xl overflow-hidden border transition-all bg-[#141c1b] ${
                    isSelected
                      ? 'border-[#b7e854] ring-2 ring-[#b7e854]'
                      : 'border-[#27302e] hover:border-gray-500'
                  }`}
                >
                  {/* Photo Thumbnail */}
                  <div
                    className="aspect-[4/3] bg-black/50 cursor-pointer overflow-hidden relative"
                    onClick={() => setPreviewPhoto(photo)}
                  >
                    <img
                      src={photo.watermarkedDataUrl}
                      alt={photo.watermarkData.partName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Stage & Import Badge on Image */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md bg-black/75 text-white backdrop-blur-xs">
                        {photo.watermarkData.stage}
                      </span>
                      {photo.isImported && !photo.hasWatermark && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded shadow-md bg-blue-600/90 text-white">
                          相簿匯入
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-2 text-xs flex items-center justify-between">
                    <div className="truncate pr-1">
                      <div className="font-semibold text-white truncate text-[11px]">
                        {photo.watermarkData.partName || '未指定工項'}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {photo.watermarkData.timestamp.split(' ')[0]}
                      </div>
                    </div>

                    {/* Select Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(photo.id);
                      }}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#b7e854]" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar (Protected from bottom navigation bar & system bar) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-[calc(4.8rem+max(0.6rem,env(safe-area-inset-bottom,0px)))] inset-x-3 sm:inset-x-4 max-w-lg mx-auto z-40 bg-[#141c1b] border border-[#b7e854] rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="text-xs font-semibold text-white pl-1 sm:pl-2">
            已選 <span className="text-[#b7e854] font-bold text-sm">{selectedIds.length}</span> 張
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 批次修改銘牌按鈕 */}
            <button
              onClick={() => setIsBatchEditOpen(true)}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-[#27302e] hover:bg-[#34403d] text-[#b7e854] font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
              title="批次設定工項與階段"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>批次修改</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors active:scale-95"
              title="刪除選取相片"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenWordExport(selectedPhotoRecords)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#b7e854] text-[#0b1112] font-black text-xs flex items-center gap-1 shadow-lg hover:bg-[#a6d542] active:scale-95 transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word 報告</span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white p-4 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Bar with clear safe distance from status bar & camera punch hole */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#b7e854] text-[#0b1112]">
                {previewPhoto.watermarkData.stage}
              </span>
              <span className="font-bold text-sm truncate max-w-[150px] sm:max-w-[200px]">
                {previewPhoto.watermarkData.partName || '未指定工項'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingPhoto(previewPhoto)}
                className="px-3 py-1.5 rounded-xl bg-[#b7e854] text-[#0b1112] font-black text-xs flex items-center gap-1 shadow-md hover:bg-[#a6d542] active:scale-95 transition-all"
                title="修改銘牌與備註"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>修改說明</span>
              </button>
              <button
                onClick={() => handleDownloadSingle(previewPhoto)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                title="下載這張照片"
              >
                <Download className="w-4 h-4" />
              </button>
              {/* 大尺寸關閉按鈕，避免被手機頂部狀態欄遮住不好點選 */}
              <button
                data-close-modal="true"
                onClick={() => setPreviewPhoto(null)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all shadow-md"
                title="關閉預覽"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden my-2">
            <img
              src={previewPhoto.watermarkedDataUrl}
              alt="放大檢視"
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Bottom Info Sheet */}
          <div className="bg-[#141c1b] border border-[#27302e] rounded-xl p-3.5 text-xs space-y-1.5 max-w-lg mx-auto w-full">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10">
              <span className="text-gray-400 font-semibold">相片資訊與備註</span>
              <button
                onClick={() => setEditingPhoto(previewPhoto)}
                className="text-[#b7e854] font-bold text-xs flex items-center gap-1 hover:underline"
              >
                <Edit className="w-3 h-3" />
                點此編輯
              </button>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-[#b7e854]" />
              <span>{previewPhoto.watermarkData.timestamp}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-[#b7e854]" />
              <span className="truncate">{previewPhoto.watermarkData.locationText || '現場'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Building className="w-3.5 h-3.5 text-[#b7e854]" />
              <span>
                {previewPhoto.watermarkData.contractor} (
                {previewPhoto.watermarkData.inspector || '工程師'})
              </span>
            </div>
            {previewPhoto.watermarkData.note && (
              <div className="pt-1 text-emerald-300 border-t border-white/10 text-[11px]">
                說明：{previewPhoto.watermarkData.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Photo Watermark and Notes Modal */}
      {editingPhoto && (
        <EditPhotoModal
          isOpen={Boolean(editingPhoto)}
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={async (updated) => {
            await savePhoto(updated);
            onRefreshPhotos();
            if (previewPhoto && previewPhoto.id === updated.id) {
              setPreviewPhoto(updated);
            }
          }}
        />
      )}

      {/* Batch Edit Modal */}
      {isBatchEditOpen && (
        <BatchEditModal
          isOpen={isBatchEditOpen}
          selectedPhotos={selectedPhotoRecords}
          onClose={() => setIsBatchEditOpen(false)}
          onSave={async (updatedList) => {
            await savePhotos(updatedList);
            onRefreshPhotos();
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
};

function CameraIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
