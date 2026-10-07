export type ConstructionStage =
  | '施工前'
  | '施工中'
  | '施工後'
  | '自主檢查'
  | '材料進場'
  | '隱蔽查驗'
  | '缺失改善'
  | string;

export type WatermarkTemplate = 'none' | 'dark_strip' | 'standard_board' | 'classic_tw' | 'corner_badge';

export interface Project {
  id: string;
  name: string;
  company: string;
  contractor: string;
  defaultLocation: string;
  createdAt: number;
}

export interface WatermarkData {
  projectId: string;
  projectName: string;
  partName: string; // 施工部位 / 工項 (例如：1F 柱鋼筋綁紮、客廳天花板角材)
  stage: ConstructionStage;
  contractor: string; // 施作廠商
  inspector: string; // 查驗 / 紀錄人員
  timestamp: string; // 格式化日期時間
  locationText: string; // 地點或地址
  gpsCoords?: string; // 經緯度座標
  weather: string; // 晴 / 陰 / 雨
  note: string; // 施工備註說明
  templateStyle: WatermarkTemplate;
  boardSize?: 'compact' | 'standard'; // 銘牌尺寸大小：精簡/標準
}

export interface PhotoRecord {
  id: string;
  projectId: string;
  timestamp: number;
  watermarkedDataUrl: string;
  rawDataUrl?: string; // 原始未加浮水印照片，方便後續重新修改烙印
  watermarkData: WatermarkData;
  width: number;
  height: number;
}
