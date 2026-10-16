// เวลาเข้าระบบ (ตั๋ว JWT อายุ 8 ชม.)
// · อ่านเวลาหมดอายุจากตั๋ว
// · ตัวกลางระหว่าง api (อยู่นอก React) กับกล่องขอรหัสผ่าน (components/SessionGuard.jsx)

// เวลาหมดอายุของตั๋ว (ms) · อ่านไม่ได้ = null
export function tokenExpiry(token) {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return p.exp ? p.exp * 1000 : null;
  } catch { return null; }
}

export const isExpired = (token) => {
  const exp = tokenExpiry(token);
  return exp != null && exp <= Date.now();
};

// หมดเวลาระหว่างใช้งาน → คำขอทุกตัวที่โดน 401 รอกล่องเดียวกัน แล้วส่งซ้ำด้วยตั๋วใหม่ (ข้อมูลที่กรอกค้างไม่หาย)
let pending = null;

export function waitForRelogin() {
  if (!pending) {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    pending = { promise, resolve, reject };
    window.dispatchEvent(new CustomEvent('session:expired'));
  }
  return pending.promise;
}

export function reloginDone(token) { pending?.resolve(token); pending = null; }
export function reloginCancel() { pending?.reject(new Error('logout')); pending = null; }
