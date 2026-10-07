import React, { useState } from 'react';
import {
  HardHat,
  FolderPlus,
  Compass,
  Camera,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Project } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: (selectedOrCreatedProject: Project) => void;
  existingProjects: Project[];
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onFinish,
  existingProjects,
}) => {
  const [step, setStep] = useState<'welcome' | 'create_or_choose' | 'tutorial'>('welcome');
  const [chosenProject, setChosenProject] = useState<Project | null>(null);

  // Form states for creating new project
  const [name, setName] = useState('');
  const [company, setCompany] = useState('工程建設股份有限公司');
  const [contractor, setContractor] = useState('互盛（股）有限公司');
  const [defaultLocation, setDefaultLocation] = useState('現場');

  if (!isOpen) return null;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入工程案場名稱');
      return;
    }
    const newProj: Project = {
      id: 'proj_' + Date.now(),
      name: name.trim(),
      company: company.trim() || '工程建設股份有限公司',
      contractor: contractor.trim() || '互盛（股）有限公司',
      defaultLocation: defaultLocation.trim() || '現場',
      createdAt: Date.now(),
    };
    setChosenProject(newProj);
    setStep('tutorial');
  };

  const handleSelectExisting = (p: Project) => {
    setChosenProject(p);
    setStep('tutorial');
  };

  const handleCompleteTutorial = () => {
    if (chosenProject) {
      onFinish(chosenProject);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141c1b] border border-[#27302e] w-full max-w-md rounded-2xl flex flex-col shadow-2xl text-[#f5f6ef] overflow-hidden">
        
        {/* Step 1: 歡迎畫面 */}
        {step === 'welcome' && (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#b7e854] flex items-center justify-center text-[#0b1112] mb-4 shadow-lg shadow-[#b7e854]/20 animate-bounce">
              <HardHat className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">歡迎使用工程驗收相機</h2>
            <p className="text-xs text-gray-300 leading-relaxed mb-6 max-w-xs">
              專為工地查驗與工程驗收設計！一鍵拍照烙印高對比工程銘牌，自動匯出 A4 公共工程標準 Word 施工相片報告。
            </p>

            <button
              onClick={() => setStep('create_or_choose')}
              className="w-full py-3.5 rounded-xl bg-[#b7e854] text-[#0b1112] font-black flex items-center justify-center gap-2 hover:bg-[#a5d742] active:scale-95 transition-all shadow-md text-sm"
            >
              <span>開始設定工程案場</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: 選擇或新建案場 */}
        {step === 'create_or_choose' && (
          <div className="p-6 flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <FolderPlus className="w-5 h-5 text-[#b7e854]" />
              <h3 className="text-base font-bold text-white">設定本次施工案場</h3>
            </div>

            {/* 新建案場表單 */}
            <form onSubmit={handleCreateNew} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  工程案場名稱 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：信義大樓室內裝修工程"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">施作廠商</label>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  placeholder="互盛（股）有限公司"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">施工地點</label>
                <input
                  type="text"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  placeholder="例：台北市信義區松仁路 100 號"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-[#b7e854] text-[#0b1112] font-black text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>建立並使用此案場</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* 若已有既有案場，允許直接選取 */}
            {existingProjects.length > 0 && (
              <div className="border-t border-[#27302e] pt-4">
                <span className="block text-xs text-gray-400 mb-2 font-medium">
                  或直接點選既有案場：
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {existingProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectExisting(p)}
                      className="w-full p-2.5 rounded-xl border border-[#27302e] bg-[#0b1112] hover:border-[#b7e854] flex items-center justify-between text-left transition-colors"
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold text-white truncate">{p.name}</div>
                        <div className="text-[11px] text-gray-400 truncate">{p.contractor}</div>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-[#192421] text-[#b7e854] rounded-lg shrink-0 font-bold">
                        選擇
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: 快速操作教學引導 */}
        {step === 'tutorial' && (
          <div className="p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#b7e854]" />
              <h3 className="text-base font-bold text-white">3 步驟上手教學</h3>
            </div>

            <div className="space-y-3.5 mb-6 text-xs">
              <div className="flex items-start gap-3 bg-[#0b1112] p-3 rounded-xl border border-[#27302e]">
                <div className="w-7 h-7 rounded-lg bg-[#b7e854]/20 text-[#b7e854] flex items-center justify-center font-black shrink-0 text-sm">
                  1
                </div>
                <div>
                  <div className="font-bold text-white mb-0.5">點擊底部標籤切換施工階段</div>
                  <div className="text-gray-400 text-[11px]">
                    拍照前可直接點選「施工前/施工中/施工後」或自訂標籤，銘牌即時更新。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#0b1112] p-3 rounded-xl border border-[#27302e]">
                <div className="w-7 h-7 rounded-lg bg-[#b7e854]/20 text-[#b7e854] flex items-center justify-center font-black shrink-0 text-sm">
                  2
                </div>
                <div>
                  <div className="font-bold text-white mb-0.5">直接按下中央快門鍵拍照</div>
                  <div className="text-gray-400 text-[11px]">
                    直接在 App 畫面上一鍵拍照！高對比銘牌即時燒錄在照片底部，直拍橫拍均清晰。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#0b1112] p-3 rounded-xl border border-[#27302e]">
                <div className="w-7 h-7 rounded-lg bg-[#b7e854]/20 text-[#b7e854] flex items-center justify-center font-black shrink-0 text-sm">
                  3
                </div>
                <div>
                  <div className="font-bold text-white mb-0.5">點擊頂部「產出報告」</div>
                  <div className="text-gray-400 text-[11px]">
                    自動產生 1 頁 2 張公共工程標準 Word 檔，直接分享給監造或業主，無失真、不模糊！
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteTutorial}
              className="w-full py-3.5 rounded-xl bg-[#b7e854] text-[#0b1112] font-black text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>進入相機，開始拍攝！</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
