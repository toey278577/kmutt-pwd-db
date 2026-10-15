import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// แจ้งเมื่อมีเวอร์ชันใหม่ของระบบ (หลัง deploy) — เดิมแท็บที่เปิดค้างไว้ยังเห็นหน้าตาเก่า จนกว่าจะรีเฟรชเอง
// ตัวเก็บไฟล์ในเครื่อง (service worker) อัปเดตตัวเองอัตโนมัติเหมือนเดิม แต่หน้าเว็บไม่รีโหลดเอง
// เพราะอาจกำลังกรอกฟอร์มค้างอยู่ → ขึ้นแถบให้ผู้ใช้กดโหลดใหม่เมื่อพร้อม
const CHECK_EVERY = 15 * 60 * 1000;   // แท็บที่เปิดทิ้งไว้ทั้งวัน — เช็คทุก 15 นาที + ทุกครั้งที่สลับกลับมาที่แท็บ

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined;
    const sw = navigator.serviceWorker;
    const hadController = !!sw.controller;              // เปิดครั้งแรก (ยังไม่เคยติดตั้ง) ไม่นับว่าเป็นเวอร์ชันใหม่
    const onChange = () => { if (hadController) setReady(true); };
    sw.addEventListener('controllerchange', onChange);
    let timer;
    const check = () => { if (navigator.onLine) sw.getRegistration().then((r) => r?.update()).catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    sw.register('/sw.js', { scope: '/' }).then(() => {
      timer = setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', onVisible);
    }).catch(() => {});
    window.__checkAppUpdate = check;   // ให้ชุดทดสอบ/คนดูแลสั่งเช็คได้ทันที
    return () => { sw.removeEventListener('controllerchange', onChange); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  if (!ready) return null;
  return (
    <div role="status" data-update-banner
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9997] w-[calc(100%-2rem)] max-w-md animate-pop-in">
      <div className="flex items-center gap-3 rounded-2xl bg-white border border-orange-200 shadow-xl px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <RefreshCw size={17} className="text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">มีเวอร์ชันใหม่ของระบบ</p>
          <p className="text-xs text-gray-500">กรอกข้อมูลค้างอยู่ บันทึกก่อนแล้วค่อยกด</p>
        </div>
        <button onClick={() => window.location.reload()}
          className="flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all whitespace-nowrap">
          โหลดใหม่
        </button>
      </div>
    </div>
  );
}
