import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, PhotoRecord } from '../types';

interface EngineeringCameraDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-createdAt': number };
  };
  photos: {
    key: string;
    value: PhotoRecord;
    indexes: {
      'by-projectId': string;
      'by-timestamp': number;
    };
  };
}

const DB_NAME = 'EngineeringCameraDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EngineeringCameraDB>> | null = null;

export async function getDb(): Promise<IDBPDatabase<EngineeringCameraDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EngineeringCameraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('by-projectId', 'projectId');
          photoStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

// Project Operations
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  const projects = await db.getAllFromIndex('projects', 'by-createdAt');
  if (projects.length === 0) {
    // Seed a default project if empty
    const defaultProj: Project = {
      id: 'default-project',
      name: '信義大樓室內裝修工程',
      company: '宏達營造股份有限公司',
      contractor: '互盛（股）有限公司',
      defaultLocation: '台北市信義區松仁路100號',
      createdAt: Date.now(),
    };
    await db.put('projects', defaultProj);
    return [defaultProj];
  }
  return projects.reverse();
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.put('projects', project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('projects', id);
  // Also delete associated photos
  const tx = db.transaction('photos', 'readwrite');
  const index = tx.store.index('by-projectId');
  let cursor = await index.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Photo Operations
export async function getAllPhotos(projectId?: string): Promise<PhotoRecord[]> {
  const db = await getDb();
  let photos: PhotoRecord[];
  if (projectId) {
    photos = await db.getAllFromIndex('photos', 'by-projectId', projectId);
  } else {
    photos = await db.getAllFromIndex('photos', 'by-timestamp');
  }
  return photos.sort((a, b) => b.timestamp - a.timestamp);
}

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const db = await getDb();
  await db.put('photos', photo);
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('photos', id);
}

export async function deletePhotos(ids: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('photos', 'readwrite');
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}
