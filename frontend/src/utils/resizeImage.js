// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด — รูปจากมือถือ 5-10MB เหลือไม่กี่ร้อย KB
// (เดิมส่งไฟล์เต็มขนาด รูปเกิน ~3.7MB อัปโหลดไม่ผ่านทั้งที่หน้าจอบอกว่ารับได้ 5MB)
// รูปถ่าย 1 นิ้ว/รูปกิจกรรมใช้ 1200px ก็คมพอทั้งบนจอและตอนพิมพ์

export const MAX_INPUT_BYTES = 20 * 1024 * 1024;   // รับไฟล์ต้นฉบับได้ถึง 20MB (ย่อแล้วค่อยส่ง)
const MAX_SIDE = 1200;
const QUALITY = 0.85;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('อ่านไฟล์รูปไม่ได้ — ไฟล์อาจเสีย หรือไม่ใช่ไฟล์รูป'));
  img.src = src;
});

const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
  reader.readAsDataURL(file);
});

// คืน data URL แบบ JPEG ที่ย่อแล้ว · โยน Error ภาษาไทยถ้าไฟล์ใช้ไม่ได้
export async function resizeImage(file) {
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) throw new Error('รองรับเฉพาะไฟล์ JPG / PNG / WebP');
  if (file.size > MAX_INPUT_BYTES) throw new Error('ไฟล์ใหญ่เกิน 20MB');

  const original = await readAsDataURL(file);
  const img = await loadImage(original);   // เบราว์เซอร์หมุนรูปตาม EXIF ให้แล้ว (รูปมือถือไม่ตะแคง)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';   // PNG พื้นใส → พื้นขาว (JPEG ไม่มีพื้นใส ไม่งั้นกลายเป็นดำ)
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', QUALITY);
}
