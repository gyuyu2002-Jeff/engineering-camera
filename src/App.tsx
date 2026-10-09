import React, { useState, useEffect } from 'react';
import {
  Camera,
  Images,
  FolderKanban,
  FileText,
  SlidersHorizontal,
  HardHat,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Project, WatermarkData, PhotoRecord } from './types';
import { getAllProjects, getAllPhotos } from './db/indexedDb';
import { CameraView } from './components/CameraView';
import { GalleryView } from './components/GalleryView';
import { ProjectManager } from './components/ProjectManager';
import { WatermarkSettingsModal } from './components/WatermarkSettingsModal';
import { WordExportModal } from './components/WordExportModal';
import { OnboardingModal } from './components/OnboardingModal';
import { saveProject } from './db/indexedDb';
import { App as CapApp } from '@capacitor/app';
import { Camera as CapCamera } from '@capacitor/camera';
import { Geolocation as CapGeolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'projects'>('camera');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  // Watermark state
  const [watermarkData, setWatermarkData] = useState<WatermarkData>({
    projectId: '',
    projectName: '',
    partName: '',
    stage: '施工中',
    contractor: '互盛（股）有限公司',
    inspector: '工務代表',
    timestamp: '',
    locationText: '',
    weather: '晴',
    note: '',
    templateStyle: 'dark_strip', // 預設：底部通欄工務條
    boardSize: 'standard', // 預設：標準版
  });

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWordExportOpen, setIsWordExportOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [exportSelectedPhotos, setExportSelectedPhotos] = useState<PhotoRecord[]>([]);

  // Load projects and photos from IndexedDB on startup
  const loadData = async () => {
    const projs = await getAllProjects();
    setProjects(projs);

    const hasOnboarded = localStorage.getItem('has_onboarded_v1');
    if (!hasOnboarded) {
      setIsOnboardingOpen(true);
    }

    if (projs.length > 0 && !activeProject) {
      setActiveProject(projs[0]);
      setWatermarkData((prev) => ({
        ...prev,
        projectId: projs[0].id,
        projectName: projs[0].name,
        contractor: projs[0].contractor || '互盛（股）有限公司',
        locationText: projs[0].defaultLocation,
      }));
    }

    const allPhotos = await getAllPhotos();
    setPhotos(allPhotos);
  };

  // 在 App 啟動時一次性請求相機與定位權限，避免使用中分散詢問或閃退
  const requestAppPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      // 1. 檢查並請求相機權限
      const camStatus = await CapCamera.checkPermissions();
      if (camStatus.camera !== 'granted') {
        await CapCamera.requestPermissions({ permissions: ['camera'] });
      }
    } catch (e) {
      console.warn('Camera permission request error:', e);
    }

    try {
      // 2. 檢查並請求定位權限
      const geoStatus = await CapGeolocation.checkPermissions();
      if (geoStatus.location !== 'granted') {
        await CapGeolocation.requestPermissions({ permissions: ['location'] });
      }
    } catch (e) {
      console.warn('Location permission request error:', e);
    }
  };

  useEffect(() => {
    requestAppPermissions();
    loadData();

    // 監聽 Android 硬體返回鍵：優先關閉彈窗與編輯模式，避免直接退出 App
    const backListenerPromise = CapApp.addListener('backButton', () => {
      // 1. 若有開啟自訂相片編輯彈窗，由該彈窗監聽或關閉
      const customCloseBtn = document.querySelector('[data-close-modal="true"]') as HTMLElement | null;
      if (customCloseBtn) {
        customCloseBtn.click();
        return;
      }

      // 2. 依序關閉全域彈窗
      if (isWordExportOpen) {
        setIsWordExportOpen(false);
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (isOnboardingOpen) {
        setIsOnboardingOpen(false);
        return;
      }

      // 3. 若在相簿或專案頁，返回相機主畫面
      if (activeTab !== 'camera') {
        setActiveTab('camera');
        return;
      }

      // 4. 若已在相機首頁，最小化退至背景
      CapApp.minimizeApp();
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove());
    };
  }, [isWordExportOpen, isSettingsOpen, isOnboardingOpen, activeTab]);

  // Update watermark info when active project changes
  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    setWatermarkData((prev) => ({
      ...prev,
      projectId: project.id,
      projectName: project.name,
      contractor: project.contractor,
      locationText: project.defaultLocation || prev.locationText,
    }));
  };

  const handlePhotoTaken = (newPhoto: PhotoRecord) => {
    setPhotos((prev) => [newPhoto, ...prev]);
  };

  const openWordExportWithPhotos = (selectedList: PhotoRecord[]) => {
    setExportSelectedPhotos(selectedList);
    setIsWordExportOpen(true);
  };

  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0b1112] text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#b7e854] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">正在載入工程相機模組...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0b1112] text-[#f5f6ef] overflow-hidden">
      {/* Top App Bar with safe area (Minimized in landscape on camera screen) */}
      <header className={`bg-[#141c1b] border-b border-[#27302e] px-4 pt-[max(0.4rem,env(safe-area-inset-top,0px))] pb-2 flex items-center justify-between z-20 shrink-0 ${activeTab === 'camera' ? 'landscape:hidden' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#b7e854] flex items-center justify-center text-[#0b1112] shadow-md">
            <HardHat className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-white flex items-center gap-1.5">
              <span>工程驗收相機</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-[#b7e854] text-[#0b1112] rounded shadow-sm">
                v1.9.6
              </span>
            </h1>
          </div>
        </div>

        {/* Quick Word Export Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const projPhotos = photos.filter((p) => p.projectId === activeProject.id);
              openWordExportWithPhotos(projPhotos.slice(0, 10)); // Default export up to 10 latest
            }}
            className="text-xs px-3 py-1.5 rounded-xl bg-[#192421] border border-[#27302e] text-[#b7e854] font-semibold flex items-center gap-1.5 hover:bg-[#27302e] active:scale-95 transition-all shadow-sm"
            title="產出 Word 報告"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>產出報告</span>
          </button>
        </div>
      </header>

      {/* Main View Area (Responsive flex-1, prevents overflow) */}
      <main className="flex-1 relative flex flex-col overflow-hidden min-h-0">
        {activeTab === 'camera' && (
          <CameraView
            activeProject={activeProject}
            watermarkData={watermarkData}
            setWatermarkData={setWatermarkData}
            photos={photos}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenGallery={() => setActiveTab('gallery')}
            onPhotoTaken={handlePhotoTaken}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            photos={photos}
            activeProject={activeProject}
            defaultWatermarkData={watermarkData}
            onRefreshPhotos={loadData}
            onOpenWordExport={openWordExportWithPhotos}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectManager
            projects={projects}
            activeProject={activeProject}
            photos={photos}
            onSelectProject={handleSelectProject}
            onRefreshProjects={loadData}
          />
        )}
      </main>

      {/* Bottom Navigation Tabs (Hidden in landscape on camera screen so camera gets 100% full height) */}
      <nav
        className={`bg-[#141c1b] border-t border-[#27302e] px-4 sm:px-8 flex items-center justify-around z-30 shrink-0 min-h-[4.2rem] pt-1.5 shadow-[0_-6px_25px_rgba(0,0,0,0.7)] ${activeTab === 'camera' ? 'landscape:hidden' : ''}`}
        style={{
          paddingBottom: 'max(1.25rem, calc(var(--sab) + 0.65rem))',
        }}
      >
        <button
          onClick={() => setActiveTab('camera')}
          className={`min-w-[72px] min-h-[46px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'camera'
              ? 'text-[#b7e854] bg-[#b7e854]/15 font-bold shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Camera className="w-5 h-5 mb-1" />
          <span className="text-[11px] font-bold tracking-tight">現場拍照</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`min-w-[72px] min-h-[46px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
            activeTab === 'gallery'
              ? 'text-[#b7e854] bg-[#b7e854]/15 font-bold shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Images className="w-5 h-5 mb-1" />
          <span className="text-[11px] font-bold tracking-tight">工程相簿</span>
          {photos.filter((p) => p.projectId === activeProject.id).length > 0 && (
            <span className="absolute top-1 right-2 bg-[#b7e854] text-[#0b1112] text-[9px] font-extrabold rounded-full px-1.5 py-0.2 min-w-[16px] text-center shadow-md">
              {photos.filter((p) => p.projectId === activeProject.id).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`min-w-[72px] min-h-[46px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'projects'
              ? 'text-[#b7e854] bg-[#b7e854]/15 font-bold shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <FolderKanban className="w-5 h-5 mb-1" />
          <span className="text-[11px] font-bold tracking-tight">案場專案</span>
        </button>
      </nav>

      {/* Settings Modal */}
      <WatermarkSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        data={watermarkData}
        onChange={setWatermarkData}
      />

      {/* Word Export Modal */}
      <WordExportModal
        isOpen={isWordExportOpen}
        onClose={() => setIsWordExportOpen(false)}
        selectedPhotos={
          exportSelectedPhotos.length > 0
            ? exportSelectedPhotos
            : photos.filter((p) => p.projectId === activeProject.id)
        }
        activeProject={activeProject}
      />

      {/* Onboarding & Project Setup Guide Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        existingProjects={projects}
        onFinish={async (proj) => {
          localStorage.setItem('has_onboarded_v1', 'true');
          setIsOnboardingOpen(false);
          await saveProject(proj);
          const updated = await getAllProjects();
          setProjects(updated);
          handleSelectProject(proj);
        }}
      />
    </div>
  );
};
