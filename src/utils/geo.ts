import { Geolocation as CapGeolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface GeoResult {
  coords: string;
  address: string;
}

export async function getCurrentLocation(): Promise<GeoResult> {
  let lat = 0;
  let lng = 0;
  let hasCoords = false;

  if (Capacitor.isNativePlatform()) {
    try {
      const pos = await CapGeolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 6000,
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      hasCoords = true;
    } catch (capErr) {
      console.warn('Capacitor getCurrentPosition error:', capErr);
    }
  }

  if (!hasCoords && !navigator.geolocation) {
    return { coords: '', address: '' };
  }

  return new Promise((resolve) => {
    const processCoords = async (latitude: number, longitude: number) => {
      const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=zh-TW`,
          { signal: controller.signal }
        );
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const addr = data.display_name || '';
          const parts = [];
          if (data.address) {
            const a = data.address;
            if (a.city || a.county) parts.push(a.city || a.county);
            if (a.suburb || a.town || a.district) parts.push(a.suburb || a.town || a.district);
            if (a.road) parts.push(a.road);
            if (a.house_number) parts.push(a.house_number + '號');
          }
          const cleanAddr = parts.length > 0 ? parts.join('') : addr.split(',').slice(0, 3).join('');
          resolve({ coords, address: cleanAddr || coords });
          return;
        }
      } catch {
        // Fallback to coordinates
      }
      resolve({ coords, address: `經緯度: ${coords}` });
    };

    if (hasCoords) {
      processCoords(lat, lng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        processCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Browser geolocation error:', err.message);
        resolve({ coords: '', address: '' });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  });
}
