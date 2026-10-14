// คำนวณว่าใครถึงรอบติดตามผลแล้ว — ตาม requirement: ติดตามหลังจบอบรม 3 เดือน / 6 เดือน / 1 ปี
//
// นับจากวันสิ้นสุดของรุ่น (training_batches.end_date)
// แต่ละรอบมี "ช่วง" ของมัน: เปิดก่อนครบกำหนด 1 เดือน ไปจนถึงตอนที่ช่วงของรอบถัดไปเปิด
// บันทึกติดตามผลที่ลงวันที่อยู่ในช่วงไหน = ทำรอบนั้นแล้ว
//   เช่น ติดตามตอนเดือนที่ 7 → นับเป็นรอบ 6 เดือน (รอบ 3 เดือนถือว่าขาดไป)

const ROUNDS = [3, 6, 12];          // เดือนหลังจบอบรม
const OPEN_BEFORE_DAYS = 30;        // เปิดช่วงให้ติดตามได้ก่อนครบกำหนดกี่วัน
const LAST_ROUND_GRACE_DAYS = 180;  // รอบสุดท้ายเลยมาเกินนี้แล้ว เลิกเตือน (ไม่งั้นรุ่นเก่าๆ จะค้างเต็มรายการ)
const DAY = 86_400_000;

// บวกเดือนแบบไม่ล้นเดือน (31 ม.ค. + 1 เดือน = 28/29 ก.พ. ไม่ใช่ 3 มี.ค.) — คิดเป็น UTC ล้วน ตรงกับคอลัมน์ @db.Date
function addMonths(d, n) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}

// "วันนี้" ตามเวลาไทย เป็นเที่ยงคืน UTC ให้เทียบกับวันที่ใน DB ได้ตรงๆ
function todayBangkok(now = new Date()) {
  const s = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
  return new Date(`${s}T00:00:00Z`);
}

// person: { endDate: Date, followUpDates: Date[] }
// คืน { rounds: [{ months, due, state }], current: { months, due, daysLeft, status } | null }
//   state: done | missed | current | future     status: upcoming | overdue
function evaluatePerson(endDate, followUpDates, today) {
  const dues = ROUNDS.map((m) => addMonths(endDate, m));
  const opens = dues.map((d) => new Date(d.getTime() - OPEN_BEFORE_DAYS * DAY));
  const times = followUpDates.map((d) => d.getTime());

  const done = opens.map((open, i) => {
    const close = i + 1 < opens.length ? opens[i + 1].getTime() : Infinity;
    return times.some((t) => t >= open.getTime() && t < close);
  });

  // รอบปัจจุบัน = รอบล่าสุดที่ช่วงเปิดแล้ว
  let cur = -1;
  opens.forEach((open, i) => { if (open <= today) cur = i; });

  const rounds = ROUNDS.map((months, i) => ({
    months,
    due: dues[i],
    state: done[i] ? 'done' : i < cur ? 'missed' : i === cur ? 'current' : 'future',
  }));

  let current = null;
  if (cur >= 0 && !done[cur]) {
    const daysLeft = Math.round((dues[cur] - today) / DAY);
    const expired = cur === ROUNDS.length - 1 && -daysLeft > LAST_ROUND_GRACE_DAYS;
    if (!expired) {
      current = { months: ROUNDS[cur], due: dues[cur], daysLeft, status: daysLeft > 0 ? 'upcoming' : 'overdue' };
    }
  }
  return { rounds, current };
}

module.exports = { evaluatePerson, addMonths, todayBangkok, ROUNDS };
