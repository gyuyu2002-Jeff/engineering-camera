import React, { useState } from 'react';
import { Project, PhotoRecord } from '../types';
import {
  FolderPlus,
  Building,
  CheckCircle2,
  Trash2,
  MapPin,
  Briefcase,
  Plus,
  X,
} from 'lucide-react';
import { saveProject, deleteProject } from '../db/indexedDb';

interface ProjectManagerProps {
  projects: Project[];
  activeProject: Project;
  photos: PhotoRecord[];
  onSelectProject: (project: Project) => void;
  onRefreshProjects: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  activeProject,
  photos,
  onSelectProject,
  onRefreshProjects,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [contractor, setContractor] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入工程案場名稱');
      return;
    }

    const newProj: Project = {
      id: 'proj_' + Date.now(),
      name: name.trim(),
      company: company.trim() || '工程建設',
      contractor: contractor.trim() || '互盛（股）有限公司',
      defaultLocation: defaultLocation.trim() || '現場',
      createdAt: Date.now(),
    };

    await saveProject(newProj);
    setName('');
    setCompany('');
    setContractor('');
    setDefaultLocation('');
    setIsAdding(false);
    onRefreshProjects();
    onSelectProject(newProj);
  };

  const handleDelete = async (p: Project) => {
    if (projects.length <= 1) {
      alert('系統中至少需保留一個工程專案');
      return;
    }
    if (window.confirm(`確定要刪除「${p.name}」及其所有工程照片嗎？`)) {
      await deleteProject(p.id);
      onRefreshProjects();
      if (activeProject.id === p.id) {
        const remaining = projects.filter((item) => item.id !== p.id);
        if (remaining.length > 0) {
          onSelectProject(remaining[0]);
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b1112] text-[#f5f6ef] overflow-y-auto p-4 select-none pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">工程案場專案管理</h2>
          <p className="text-xs text-gray-400">切換或建立工區，拍照自動歸類</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-3.5 py-2 bg-[#b7e854] text-[#0b1112] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md hover:bg-[#a6d542] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增案場
        </button>
      </div>

      {/* Project Cards List */}
      <div className="space-y-3">
        {projects.map((proj) => {
          const isActive = proj.id === activeProject.id;
          const photoCount = photos.filter((p) => p.projectId === proj.id).length;

          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-[#141c1b] border-[#b7e854] ring-1 ring-[#b7e854] shadow-lg'
                  : 'bg-[#141c1b]/70 border-[#27302e] hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base text-white">{proj.name}</h3>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[11px] bg-[#b7e854] text-[#0b1112] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> 使用中
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-gray-500" />
                      <span>{proj.company || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                      <span>{proj.contractor || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      <span className="truncate max-w-[220px]">{proj.defaultLocation || '現場'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg font-semibold">
                    {photoCount} 張照片
                  </span>
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(proj);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5"
                      title="刪除案場"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141c1b] border border-[#27302e] w-full max-w-md rounded-2xl shadow-2xl p-5 text-[#f5f6ef]">
            <div className="flex items-center justify-between pb-3 border-b border-[#27302e] mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#b7e854]" />
                新增工程案場專案
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">工程案場名稱 *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：大同區公辦都更二期新建工程"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">業主 / 起造單位</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="例：宏基營造開發股份有限公司"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">承包廠商 / 施工單位</label>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  placeholder="例：大信工程行"
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">預設工地地址 / 地點</label>
                <input
                  type="text"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  placeholder="例：台北市大同區重慶北路三段..."
                  className="w-full bg-[#0b1112] border border-[#27302e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b7e854]"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#b7e854] text-[#0b1112] font-bold rounded-xl text-sm hover:bg-[#a6d542] transition-colors shadow-lg"
                >
                  確認建立案場
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
