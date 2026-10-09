import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Sliders,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { Project, WatermarkData, PhotoRecord, ConstructionStage } from '../types';
import { WatermarkOverlay } from './WatermarkOverlay';
import { applyWatermark } from '../utils/watermark';
import { getCurrentLocation } from '../utils/geo';
import { savePhoto } from '../db/indexedDb';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation as CapGeo } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface CameraViewProps {
  activeProject: Project;
  watermarkData: WatermarkData;
  setWatermarkData: React.Dispatch<React.SetStateAction<WatermarkData>>;
  photos?: PhotoRecord[];
  onOpenSettings: () => void;
  onOpenGallery: () => void;
  onPhotoTaken: (photo: PhotoRecord) => void;
}

const QUICK_STAGES: ConstructionStage[] = ['施工前', '施工中', '施工後', '隱蔽查驗', '自主檢查'];

export const CameraView: React.FC<CameraViewProps> = ({
  activeProject,
  watermarkData,
  setWatermarkData,
  photos = [],
  onOpenSettings,
  onOpenGallery,
  onPhotoTaken,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [lastPhotoThumb, setLastPhotoThumb] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );

  // Update watermark timestamp continuously
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setWatermarkData((prev) => ({ ...prev, timestamp: timeStr }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [setWatermarkData]);

  // Initial GPS location grab
  useEffect(() => {
    getCurrentLocation().then((geo) => {
      if (geo.address || geo.coords) {
        setWatermarkData((prev) => ({
          ...prev,
          locationText: geo.address || prev.locationText || activeProject.defaultLocation,
          gpsCoords: geo.coords,
        }));
      }
    });
  }, [activeProject, setWatermarkData]);

  // Start Camera Stream
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isCancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // If running inside Android Capacitor app, ensure permissions are granted
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await CapCamera.checkPermissions();
          if (perm.camera !== 'granted') {
            const req = await CapCamera.requestPermissions({ permissions: ['camera'] });
            if (req.camera !== 'granted') {
              if (!isCancelled) {
                setCameraError('請允許相機權限以進行工程拍照驗收');
              }
              return;
            }
          }
        } catch (permErr) {
          console.warn('Capacitor checkPermissions error:', permErr);
        }
      }

      try {
        // Dynamic orientation detection
        const landscapeMode = window.innerWidth > window.innerHeight;
        setIsLandscape(landscapeMode);

        // 使用 ideal 與 advanced 解析度配置，保證相機感光元件支援橫直向切換
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: landscapeMode ? 1920 : 1080 },
            height: { ideal: landscapeMode ? 1080 : 1920 },
          },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          newStream.getTracks().forEach((t) => t.stop());
          return;
        }

        currentStream = newStream;
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }

        // Check torch support
        const track = newStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('Camera access issue:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? '請點擊下方按鈕允許相機權限以使用工程相機'
            : '無法啟動相機裝置，請點擊重試或使用相簿照片加浮水印'
        );
      }
    };

    startCamera();

    // 監聽螢幕旋轉（直向/橫向切換）與尺寸變化，確保橫向畫面不會黑屏或中斷
    let orientationTimer: any = null;
    const handleOrientationChange = () => {
      clearTimeout(orientationTimer);
      orientationTimer = setTimeout(() => {
        if (!isCancelled) {
          const curLandscape = window.innerWidth > window.innerHeight;
          setIsLandscape(curLandscape);
          // 重新載入相機串流，自動適配當前直向或橫向的解析度，避免 Android 驅動黑屏
          setRetryCount((prev) => prev + 1);
        }
      }, 250);
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      isCancelled = true;
      clearTimeout(orientationTimer);
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, retryCount]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch failed:', e);
    }
  };

  // Switch Front/Back Lens
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Take Photo
  const capturePhoto = async () => {
    if (isCapturing) return;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }

    // Flash animation
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 150);

    setIsCapturing(true);

    try {
      let dataUrl = '';
      let rawDataUrl = '';
      let w = 1920;
      let h = 1080;
      if (videoRef.current && stream) {
        const video = videoRef.current;
        w = video.videoWidth || 1920;
        h = video.videoHeight || 1080;
        // Capture pure raw snapshot
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = w;
        rawCanvas.height = h;
        const rCtx = rawCanvas.getContext('2d');
        if (rCtx) {
          rCtx.drawImage(video, 0, 0, w, h);
          rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.98);
        }
        dataUrl = await applyWatermark(video, watermarkData);
      } else if (Capacitor.isNativePlatform()) {
        try {
          const image = await CapCamera.getPhoto({
            quality: 100,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera,
            saveToGallery: false,
            correctOrientation: true,
          });

          if (image.dataUrl) {
            rawDataUrl = image.dataUrl;
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = image.dataUrl!;
            });

            w = img.naturalWidth || img.width;
            h = img.naturalHeight || img.height;
            dataUrl = await applyWatermark(img, watermarkData);
          }
        } catch (capErr: any) {
          console.warn('Native camera capture fallback:', capErr);
          if (capErr.message && capErr.message.includes('User cancelled')) {
            setIsCapturing(false);
            return;
          }
        }
      }

      if (!dataUrl) {
        fileInputRef.current?.click();
        setIsCapturing(false);
        return;
      }

      const photoRecord: PhotoRecord = {
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        projectId: activeProject.id,
        timestamp: Date.now(),
        watermarkedDataUrl: dataUrl,
        rawDataUrl: rawDataUrl || dataUrl,
        watermarkData: { ...watermarkData },
        width: w,
        height: h,
      };

      await savePhoto(photoRecord);
      setLastPhotoThumb(dataUrl);
      onPhotoTaken(photoRecord);
    } catch (err) {
      console.error('Capture failed:', err);
      alert('拍照處理失敗，請重試');
    } finally {
      setIsCapturing(false);
    }
  };

  // Fallback: Pick image from device storage/album and burn watermark
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const img = new Image();
      img.onload = async () => {
        const dataUrl = await applyWatermark(img, watermarkData);
        const photoRecord: PhotoRecord = {
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          projectId: activeProject.id,
          timestamp: Date.now(),
          watermarkedDataUrl: dataUrl,
          watermarkData: { ...watermarkData },
          width: img.width,
          height: img.height,
        };
        await savePhoto(photoRecord);
        setLastPhotoThumb(dataUrl);
        onPhotoTaken(photoRecord);
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`relative w-full h-full flex-1 bg-black overflow-hidden select-none min-h-0 ${
      isLandscape ? 'flex flex-row' : 'flex flex-col'
    }`}>
      {/* Top Floating Controls */}
      <div className={`absolute top-0 z-30 flex items-center justify-between p-3 pointer-events-auto bg-gradient-to-b from-black/80 via-black/30 to-transparent ${
        isLandscape ? 'left-0 right-24' : 'inset-x-0'
      }`}>
        {/* Project Badge */}
        <div className="flex items-center gap-2">
          <div className="bg-[#141c1b]/90 border border-[#b7e854]/40 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#b7e854] animate-pulse" />
            <span className="text-xs font-bold text-white max-w-[140px] sm:max-w-[220px] truncate">
              {activeProject.name}
            </span>
          </div>
        </div>

        {/* Quick Actions (Torch, Switch Camera, Watermark Settings) */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                torchOn ? 'bg-[#b7e854] text-black' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={switchCamera}
            className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md"
            title="切換前後鏡頭"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-full bg-black/50 text-[#b7e854] hover:bg-black/70 backdrop-blur-md flex items-center gap-1"
            title="設定工程銘牌"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Camera Viewfinder / Preview (100% full flex area) */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0 min-w-0">
        {cameraError ? (
          <div className="p-6 text-center max-w-sm z-20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">相機無法啟動</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">{cameraError}</p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    try {
                      await CapCamera.requestPermissions({ permissions: ['camera'] });
                    } catch (e) {
                      console.warn(e);
                    }
                  }
                  setRetryCount((c) => c + 1);
                }}
                className="w-full py-3 bg-[#b7e854] text-black font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                授權並重新開啟相機
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-[#141c1b] border border-[#27302e] hover:border-gray-500 text-gray-200 font-medium rounded-xl flex items-center justify-center gap-2 text-xs shadow-md active:scale-95 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                選擇本機相片加浮水印
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Live Watermark Overlay Preview */}
            <WatermarkOverlay data={watermarkData} />
          </>
        )}

        {/* Shutter White Flash Animation */}
        {flashAnimation && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-150 pointer-events-none" />
        )}

        {/* Hidden Fallback File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Floating Quick Part/Stage Pill in Landscape Mode */}
        {isLandscape && (
          <div className="absolute bottom-3 left-4 z-30 flex items-center gap-2 max-w-[70%]">
            <div className="bg-black/75 backdrop-blur-md border border-white/20 rounded-xl p-1.5 flex items-center gap-2 shadow-xl">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
                {QUICK_STAGES.map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => setWatermarkData((prev) => ({ ...prev, stage: stg }))}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all ${
                      watermarkData.stage === stg
                        ? 'bg-[#b7e854] text-[#0b1112] shadow'
                        : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {stg}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={watermarkData.partName}
                onChange={(e) => setWatermarkData((prev) => ({ ...prev, partName: e.target.value }))}
                placeholder="點擊輸入工項部位..."
                className="w-48 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#b7e854]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Control Deck: Right sidebar in Landscape, Bottom bar in Portrait */}
      {isLandscape ? (
        /* Landscape Right Shutter Sidebar (Standard camera grip ergonomics) */
        <div className="relative z-30 w-24 bg-black/90 border-l border-white/10 flex flex-col items-center justify-around py-4 shrink-0 shadow-2xl">
          {/* Gallery Thumbnail Preview */}
          <button
            onClick={onOpenGallery}
            className="w-12 h-12 rounded-2xl bg-[#141c1b] border-2 border-[#27302e] overflow-hidden flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform"
          >
            {lastPhotoThumb ? (
              <img src={lastPhotoThumb} alt="最後照片" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Shutter Button */}
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="w-16 h-16 rounded-full border-4 border-white/90 p-1 flex items-center justify-center active:scale-95 transition-all shadow-2xl relative"
          >
            <div className="w-full h-full rounded-full bg-[#b7e854] flex items-center justify-center hover:bg-[#a6d542] transition-colors">
              <Camera className="w-7 h-7 text-[#0b1112]" />
            </div>
          </button>

          {/* Import Photo / File Fallback */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl bg-[#141c1b] border-2 border-[#27302e] flex flex-col items-center justify-center text-gray-300 hover:text-white hover:scale-105 active:scale-95 transition-transform"
            title="從手機相簿加浮水印"
          >
            <Upload className="w-4 h-4" />
            <span className="text-[9px] mt-0.5 font-medium">相簿</span>
          </button>
        </div>
      ) : (
        /* Portrait Bottom Control Deck with Safe Area */
        <div className="relative z-30 bg-gradient-to-t from-black via-black/95 to-black/70 pt-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] px-3 sm:px-4 flex flex-col gap-2 shrink-0">
          {/* Quick Stage Selector Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_STAGES.map((stg) => (
              <button
                key={stg}
                type="button"
                onClick={() => setWatermarkData((prev) => ({ ...prev, stage: stg }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  watermarkData.stage === stg
                    ? 'bg-[#b7e854] text-[#0b1112] shadow-md scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >
                {stg}
              </button>
            ))}
            {/* 若為自訂階段，顯示在捷徑列上 */}
            {!QUICK_STAGES.includes(watermarkData.stage) && watermarkData.stage && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-[#b7e854] text-[#0b1112] shadow-md scale-105"
              >
                ★ {watermarkData.stage}
              </button>
            )}
          </div>

          {/* Quick Part Name Input Inline (Full Width) */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={watermarkData.partName}
              onChange={(e) => setWatermarkData((prev) => ({ ...prev, partName: e.target.value }))}
              placeholder="點擊輸入本次工項部位 (例如: 1F天花板配管)"
              className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#b7e854]"
            />
          </div>

          {/* Shutter Controls Bar */}
          <div className="flex items-center justify-between px-3 sm:px-6 pt-0.5">
            {/* Gallery Thumbnail Preview */}
            <button
              onClick={onOpenGallery}
              className="w-12 h-12 rounded-2xl bg-[#141c1b] border-2 border-[#27302e] overflow-hidden flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform"
            >
              {lastPhotoThumb ? (
                <img src={lastPhotoThumb} alt="最後照片" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              disabled={isCapturing}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white/90 p-1 flex items-center justify-center active:scale-95 transition-all shadow-2xl relative"
            >
              <div className="w-full h-full rounded-full bg-[#b7e854] flex items-center justify-center hover:bg-[#a6d542] transition-colors">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-[#0b1112]" />
              </div>
            </button>

            {/* Import Photo / File Fallback */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-2xl bg-[#141c1b] border-2 border-[#27302e] flex flex-col items-center justify-center text-gray-300 hover:text-white hover:scale-105 active:scale-95 transition-transform"
              title="從手機相簿加浮水印"
            >
              <Upload className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-medium">相簿</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
