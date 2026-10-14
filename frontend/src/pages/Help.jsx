import { useState } from 'react';
import {
  BookOpen, LogIn, Shield, Users, GraduationCap, Target,
  Building2, UserCog, ChevronRight, CheckCircle, LayoutDashboard,
  Printer, Camera, AlertCircle, FileText, Award, Info,
  Layers, TrendingUp, History,
} from 'lucide-react';

const sections = [
  { id: 'intro',      label: 'ภาพรวมระบบ',          icon: Info },
  { id: 'login',      label: 'การเข้าสู่ระบบ',        icon: LogIn },
  { id: 'roles',      label: 'สิทธิ์ผู้ใช้งาน',        icon: Shield },
  { id: 'dashboard',  label: 'Dashboard',             icon: LayoutDashboard },
  { id: 'batch',      label: 'จัดการรุ่น',            icon: Layers },
  { id: 'persons',    label: 'ข้อมูลคนพิการ',         icon: Users },
  { id: 'photo',      label: 'รูปถ่าย 1 นิ้ว',         icon: Camera },
  { id: 'training',   label: 'การอบรม & ฝึกงาน',      icon: GraduationCap },
  { id: 'assessment', label: 'ประเมินทักษะ',          icon: TrendingUp },
  { id: 'followup',   label: 'ติดตามผล',              icon: Target },
  { id: 'orgs',       label: 'สถานประกอบการ',         icon: Building2 },
  { id: 'report',     label: 'ออกรายงาน',             icon: Printer },
  { id: 'users',      label: 'จัดการผู้ใช้ (Admin)',   icon: UserCog },
  { id: 'audit',      label: 'ประวัติการใช้งาน (Admin)', icon: History },
];

/* ── Shared Components ── */
const H2 = ({ children }) => (
  <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
    <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#ea580c,#c2410c)' }} />
    {children}
  </h2>
);
const H3 = ({ children }) => (
  <h3 className="text-sm font-bold text-orange-800 mt-5 mb-2 flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />{children}
  </h3>
);
const Li = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-gray-600 mb-1.5 leading-snug">
    <CheckCircle size={13} className="text-orange-400 mt-0.5 flex-shrink-0" />{children}
  </li>
);
const Warn = ({ children }) => (
  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 my-3">
    <AlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
    <p className="text-sm text-amber-700">{children}</p>
  </div>
);
const Step = ({ n, children }) => (
  <div className="flex items-start gap-3 mb-2">
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
      style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>{n}</div>
    <p className="text-sm text-gray-600 leading-snug pt-0.5">{children}</p>
  </div>
);
const Chip = ({ children, color = 'orange' }) => {
  const map = { orange: 'bg-orange-100 text-orange-700 border-orange-200', green: 'bg-green-100 text-green-700 border-green-200', blue: 'bg-blue-100 text-blue-700 border-blue-200', red: 'bg-red-100 text-red-700 border-red-200', gray: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[color]}`}>{children}</span>;
};
const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-2xl border border-orange-100 mb-4 shadow-sm">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          {headers.map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
            {r.map((c, j) => <td key={j} className="px-4 py-2.5 text-gray-700 text-sm">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const FieldRequired = ({ name, note }) => (
  <div className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-700 flex-1">{name}</span>
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${note === 'บังคับ' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{note}</span>
  </div>
);

/* ══════════════════════════════════════════════
   CONTENT
══════════════════════════════════════════════ */
const CONTENT = {

  /* ─ ภาพรวม ─ */
  intro: (
    <div>
      <H2>ภาพรวมระบบ PWDs Database</H2>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed">
        <strong>ระบบฐานข้อมูลคนพิการ มจธ. (PWDs Database)</strong> คือระบบจัดการข้อมูลผู้เข้าร่วมโครงการ
        ฝึกอบรม-ฝึกงานสำหรับคนพิการ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี ครอบคลุมตั้งแต่การบันทึกข้อมูลส่วนตัว
        ไปจนถึงการออกรายงานและติดตามผล
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: Layers,         label: 'จัดการรุ่น',        desc: 'แบ่งผู้เข้าร่วมเป็นรุ่น/ปี ติดตามแยกรุ่น' },
          { icon: Users,          label: 'ข้อมูลคนพิการ',     desc: 'ข้อมูลส่วนตัว ที่อยู่ ความพิการ รูปถ่าย' },
          { icon: GraduationCap,  label: 'การอบรม & ฝึกงาน', desc: 'ประวัติหลักสูตร ทักษะที่ได้รับ' },
          { icon: TrendingUp,     label: 'ประเมินทักษะ',      desc: 'Pre/Post test + Soft Skills 4 ด้าน' },
          { icon: Target,         label: 'ติดตามผล',          desc: 'สถานะงาน รายได้ ความพึงพอใจ' },
          { icon: Building2,      label: 'สถานประกอบการ',     desc: 'ข้อมูลบริษัท การเชื่อมโยงกับผู้เข้าร่วม' },
          { icon: LayoutDashboard,label: 'Dashboard',         desc: 'กราฟสถิติ 6 มิติ + สถานะรุ่นปัจจุบัน' },
          { icon: Printer,        label: 'ออกรายงาน',         desc: 'รายชื่อ พฤติกรรม ประเมินรายวิชา Cert บริษัท' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-2xl border border-orange-100 bg-orange-50/30 p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
              <Icon size={16} color="white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>URL ระบบ</H3>
      <div className="bg-gray-900 rounded-2xl px-5 py-3.5 font-mono text-sm text-orange-400 font-bold tracking-wide mb-4">
        https://kmutt-pwd-db.vercel.app
      </div>

      <H3>ระบบผู้ใช้งาน 3 ระดับ</H3>
      <div className="flex gap-2 flex-wrap">
        <Chip color="red">ADMIN — ผู้ดูแลระบบ</Chip>
        <Chip color="orange">STAFF — เจ้าหน้าที่</Chip>
        <Chip color="blue">VIEWER — ผู้ดูข้อมูล</Chip>
      </div>
    </div>
  ),

  /* ─ Login ─ */
  login: (
    <div>
      <H2>การเข้าสู่ระบบ</H2>
      <p className="text-sm text-gray-600 mb-4">เข้าระบบด้วย Email และ Password ที่ได้รับจากผู้ดูแลระบบ</p>

      <H3>ขั้นตอนการเข้าสู่ระบบ</H3>
      <div className="mb-4">
        <Step n="1">เปิดเบราว์เซอร์ไปที่ <span className="font-mono text-orange-600 font-bold">https://kmutt-pwd-db.vercel.app</span></Step>
        <Step n="2">กรอก <strong>Email</strong> และ <strong>Password</strong></Step>
        <Step n="3">กดปุ่ม <strong>"เข้าสู่ระบบ"</strong></Step>
        <Step n="4">ระบบจะพาไปหน้า Dashboard อัตโนมัติ</Step>
      </div>

      <H3>บัญชีเริ่มต้น (Admin)</H3>
      <Table
        headers={['Email', 'Password', 'หมายเหตุ']}
        rows={[['admin@kmutt.ac.th', 'admin1234', 'ควรเปลี่ยนรหัสผ่านหลังใช้งานครั้งแรก']]}
      />
      <Warn>Session มีอายุ 8 ชั่วโมง หลังจากนั้นระบบจะ logout อัตโนมัติ ต้องเข้าสู่ระบบใหม่</Warn>

      <H3>การออกจากระบบ</H3>
      <ul>
        <Li>กดไอคอน <strong>logout</strong> (ลูกศรออก) มุมล่างซ้ายของ Sidebar</Li>
      </ul>
    </div>
  ),

  /* ─ Roles ─ */
  roles: (
    <div>
      <H2>สิทธิ์ผู้ใช้งาน 3 ระดับ</H2>
      <p className="text-sm text-gray-600 mb-4">แต่ละระดับมีความสามารถต่างกัน ผู้ใช้ที่ไม่มีสิทธิ์จะไม่เห็นปุ่ม เพิ่ม / แก้ไข / ลบ</p>

      <div className="space-y-4 mb-2">
        {[
          { role: 'ADMIN', label: 'ผู้ดูแลระบบ', color: 'red',
            desc: 'สิทธิ์สูงสุด ทำได้ทุกอย่างรวมถึงจัดการบัญชีผู้ใช้',
            can: ['เพิ่ม / แก้ไข / ลบ ข้อมูลทุกประเภท','จัดการบัญชีผู้ใช้งาน (เพิ่ม/แก้ไข/เปิด-ปิด/ลบ)','ดูและออกรายงานทุกประเภท','ดู Dashboard สถิติทั้งหมด'] },
          { role: 'STAFF', label: 'เจ้าหน้าที่', color: 'orange',
            desc: 'จัดการข้อมูลคนพิการและกิจกรรมต่างๆ ได้ แต่ไม่สามารถจัดการผู้ใช้งาน',
            can: ['เพิ่ม / แก้ไข / ลบ ข้อมูลคนพิการ','บันทึกประวัติอบรม, ประสบการณ์งาน, ทักษะ, ติดตามผล','อัปโหลดรูปถ่าย','จัดการสถานประกอบการ','ออกรายงาน'] },
          { role: 'VIEWER', label: 'ผู้ดูข้อมูล', color: 'blue',
            desc: 'ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขหรือลบข้อมูลใดๆ',
            can: ['ดูข้อมูลคนพิการทั้งหมด','ดูประวัติทุกประเภท','ดู Dashboard และออกรายงาน','ไม่มีปุ่ม เพิ่ม / แก้ไข / ลบ'] },
        ].map(({ role, label, color, desc, can }) => {
          const borderMap = { red: 'border-red-200 bg-red-50/50', orange: 'border-orange-200 bg-orange-50/50', blue: 'border-blue-200 bg-blue-50/50' };
          return (
            <div key={role} className={`rounded-2xl border p-4 ${borderMap[color]}`}>
              <div className="flex items-center gap-2 mb-2">
                <Chip color={color}>{role}</Chip>
                <span className="font-bold text-gray-800 text-sm">{label}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{desc}</p>
              <ul>{can.map(c => <Li key={c}>{c}</Li>)}</ul>
            </div>
          );
        })}
      </div>
    </div>
  ),

  /* ─ Dashboard ─ */
  dashboard: (
    <div>
      <H2>Dashboard — สถิติภาพรวม</H2>
      <p className="text-sm text-gray-600 mb-4">หน้าแรกที่แสดงสถิติรวมของระบบ เพิ่ม/แก้/ลบข้อมูลแล้วตัวเลขอัปเดตทันที</p>

      <H3>ข้อมูลที่แสดงใน Dashboard</H3>
      <Table
        headers={['ส่วน', 'เนื้อหา']}
        rows={[
          ['การ์ดสถิติ (3 ช่อง)', 'คนพิการทั้งหมด / สถานประกอบการ / ผู้เข้าอบรม (คนที่อยู่ในรุ่น หรือมีประวัติอบรม)'],
          ['สถานะรุ่นการฝึกอบรม', 'รุ่นล่าสุด 4 รุ่น พร้อมสถานะ กำลังดำเนินการ / เสร็จสิ้น'],
          ['ถึงรอบติดตามผล', 'คนที่ถึงรอบติดตาม 3 เดือน / 6 เดือน / 1 ปี (ขึ้นเฉพาะตอนมีคนต้องตาม) — ดูหัวข้อ "ติดตามผล"'],
          ['กราฟ: ภูมิภาคที่อยู่อาศัย', 'แท่งแนวนอน ครบ 6 ภาค'],
          ['กราฟ: วุฒิการศึกษา', 'แท่งแนวนอน เรียงจากมากไปน้อย'],
          ['กราฟ: ช่วงอายุ', 'แท่งแนวตั้ง แบ่งตามกลุ่มอายุ'],
          ['กราฟ: แยกตามเพศ', 'ตัวเลข % ชาย / หญิง พร้อมแถบสัดส่วน'],
          ['กราฟ: ประเภทความพิการ', 'แท่งแนวนอน แยกตามประเภท'],
          ['กราฟ: สถานะการมีงานทำ', 'นับเป็น "คน" จากผลติดตามครั้งล่าสุดของแต่ละคน (คนเดียวตามหลายรอบ นับครั้งเดียว)'],
        ]}
      />

      <H3>กลุ่มอายุที่ใช้ในระบบ</H3>
      <div className="flex flex-wrap gap-2 mb-4">
        {['ต่ำกว่า 15 ปี', '15–25 ปี', '26–35 ปี', '36–45 ปี', '46 ปีขึ้นไป'].map(a => <Chip key={a}>{a}</Chip>)}
      </div>

      <H3>ภูมิภาคที่ระบบจัดกลุ่ม</H3>
      <div className="flex flex-wrap gap-2">
        {['กรุงเทพฯ (ปริมณฑล)', 'ภาคกลาง', 'ภาคเหนือ', 'ภาคอีสาน', 'ภาคตะวันออก', 'ภาคใต้'].map(r => <Chip key={r} color="blue">{r}</Chip>)}
      </div>
    </div>
  ),

  /* ─ Batch ─ */
  batch: (
    <div>
      <H2>จัดการรุ่น (Batch)</H2>
      <p className="text-sm text-gray-600 mb-4">
        ระบบแบ่งผู้เข้าร่วมโครงการออกเป็น <strong>"รุ่น"</strong> ตามปีหรือรอบการอบรม
        ทำให้ติดตามและออกรายงานแยกแต่ละรุ่นได้ง่าย
      </p>

      <Warn>ต้อง<strong>สร้างรุ่นก่อน</strong> จึงจะเพิ่มข้อมูลคนพิการได้ เพราะช่อง "รุ่นที่เข้าร่วม" เป็นช่อง<strong className="text-red-600">บังคับ</strong> <span className="text-red-500 font-bold">*</span></Warn>

      <H3>การเพิ่มรุ่นใหม่</H3>
      <div className="mb-4">
        <Step n="1">ไปที่เมนู <strong>"จัดการรุ่น"</strong></Step>
        <Step n="2">กดปุ่ม <strong>"+ เพิ่มรุ่น"</strong></Step>
        <Step n="3">กรอก <strong>รุ่นที่</strong> (เช่น 1, 2, 3) และ <strong>ปี พ.ศ.</strong> (บังคับ)</Step>
        <Step n="4">เลือก <strong>สถานะ</strong> และระบุช่วงวันที่ (ถ้ามี)</Step>
        <Step n="5">กด <strong>"บันทึก"</strong></Step>
      </div>

      <H3>สถานะของรุ่น</H3>
      <div className="flex gap-2 flex-wrap mb-4">
        <Chip color="green">กำลังดำเนินการ (ACTIVE)</Chip>
        <Chip color="gray">เสร็จสิ้น (COMPLETED)</Chip>
      </div>
      <Warn>รุ่นที่ตั้งสถานะ <strong>"กำลังดำเนินการ"</strong> จะถูกใช้เป็น <strong>รุ่นปัจจุบัน</strong> แสดงสถิติเด่นบนหน้า Dashboard</Warn>

      <H3>การกรอก วันที่ — รูปแบบไทย</H3>
      <div className="bg-gray-900 rounded-xl px-4 py-3 font-mono text-orange-400 text-sm mb-3">
        วว/ดด/ปปปป (พ.ศ.) — เช่น 01/06/2568
      </div>

      <H3>ดูรายชื่อแยกตามรุ่น</H3>
      <ul>
        <Li>ในหน้า <strong>ข้อมูลคนพิการ</strong> มี<strong>แถบเลือกรุ่น</strong> (pills) กรองรายชื่อเฉพาะรุ่นนั้น</Li>
        <Li>ในหน้า <strong>ออกรายงาน</strong> เลือกรุ่นเพื่อออกรายงานเฉพาะคนในรุ่นได้</Li>
      </ul>
    </div>
  ),

  /* ─ Persons ─ */
  persons: (
    <div>
      <H2>ข้อมูลคนพิการ</H2>
      <p className="text-sm text-gray-600 mb-4">หน้าหลักของระบบ ใช้บันทึกและจัดการข้อมูลส่วนตัวผู้เข้าร่วมโครงการ</p>

      <H3>การค้นหา</H3>
      <ul className="mb-4">
        <Li>พิมพ์ชื่อ-นามสกุล หรือเลขบัตรประชาชนในช่องค้นหา แล้วกด <strong>"ค้นหา"</strong> หรือกด Enter</Li>
        <Li>กด <strong>"ล้าง"</strong> เพื่อแสดงรายการทั้งหมด</Li>
      </ul>

      <H3>การเพิ่มข้อมูลคนพิการใหม่</H3>
      <div className="mb-4">
        <Step n="1">กดปุ่ม <strong>"+ เพิ่มคนพิการ"</strong> มุมขวาบน</Step>
        <Step n="2">อัปโหลดรูปถ่าย 1 นิ้ว (ถ้ามี)</Step>
        <Step n="3">กรอก<strong>ข้อมูลส่วนตัว</strong> ที่บังคับกรอกให้ครบ (มีเครื่องหมาย <span className="text-red-500 font-bold">*</span>)</Step>
        <Step n="4">กรอก<strong>ที่อยู่ปัจจุบัน</strong> ให้ครบ</Step>
        <Step n="5">กรอก<strong>ข้อมูลติดต่อ</strong> (มือถือหรือโทรศัพท์อย่างน้อย 1 ช่อง)</Step>
        <Step n="6">กดปุ่ม <strong>"บันทึกข้อมูล"</strong></Step>
      </div>

      <H3>ช่องที่บังคับกรอก <span className="text-red-500">*</span></H3>
      <div className="rounded-2xl border border-orange-100 bg-white overflow-hidden mb-4 shadow-sm">
        <div className="px-4 py-2 text-xs font-bold text-orange-400 uppercase tracking-wide bg-orange-50 border-b border-orange-100">ข้อมูลส่วนตัว</div>
        <div className="px-4 py-2 divide-y divide-gray-50">
          {[
            ['ชื่อ-นามสกุล', 'บังคับ'], ['เลขบัตรประชาชน / บัตรคนพิการ', 'บังคับ (13 หลัก)'],
            ['วันเกิด', 'บังคับ (ต้องเป็นอดีต)'], ['ระดับการศึกษา', 'บังคับ'],
            ['ประเภทความพิการ', 'บังคับ (สำหรับเพิ่มใหม่)'],
            ['รุ่นที่เข้าร่วม', 'บังคับ'],
          ].map(([n, note]) => <FieldRequired key={n} name={n} note={note} />)}
        </div>
        <div className="px-4 py-2 text-xs font-bold text-orange-400 uppercase tracking-wide bg-orange-50 border-y border-orange-100">ที่อยู่ & ติดต่อ</div>
        <div className="px-4 py-2 divide-y divide-gray-50">
          {[
            ['จังหวัด', 'บังคับ'], ['มือถือ หรือ โทรศัพท์บ้าน', 'บังคับ (อย่างน้อย 1)'],
          ].map(([n, note]) => <FieldRequired key={n} name={n} note={note} />)}
        </div>
      </div>

      <Warn>หากกด "บันทึก" แล้วมีช่องที่ยังไม่กรอก กล่องสีแดงจะแสดงรายการที่ขาด และ border ช่องนั้นจะเปลี่ยนเป็นสีแดง</Warn>

      <H3>ข้อมูลที่อยู่ (ระบุให้ครบ)</H3>
      <Table
        headers={['ช่อง', 'ตัวอย่าง']}
        rows={[
          ['เลขที่', '123/45'], ['หมู่ที่', '5'], ['ชื่ออาคาร / หมู่บ้าน', 'บ้านสวน'],
          ['ชั้นที่', '3'], ['ซอย', 'สุขุมวิท 101'], ['ถนน', 'สุขุมวิท'],
          ['แขวง / ตำบล', 'บางนา'], ['เขต / อำเภอ', 'บางนา'],
          ['จังหวัด', 'กรุงเทพมหานคร (บังคับ)'], ['รหัสไปรษณีย์', '10260'],
        ]}
      />

      <H3>วันเกิด — รูปแบบการกรอก</H3>
      <div className="bg-gray-900 rounded-xl px-4 py-3 font-mono text-orange-400 text-sm mb-3">
        วว/ดด/ปปปป (พ.ศ.) — เช่น 15/06/2540
      </div>
      <Warn>ปีต้องเป็นอดีตเท่านั้น — ถ้ากรอกปีปัจจุบัน (2568) หรืออนาคต ระบบจะล้างค่าทิ้งอัตโนมัติ</Warn>

      <H3>รายละเอียดคนพิการ (7 แท็บ)</H3>
      <Table
        headers={['แท็บ', 'เนื้อหา']}
        rows={[
          ['ข้อมูลพื้นฐาน', 'ข้อมูลส่วนตัว ที่อยู่ละเอียด ข้อมูลความพิการ'],
          ['การอบรม', 'ประวัติหลักสูตรอบรม / ฝึกงาน วันที่ ผลประเมิน'],
          ['ประสบการณ์งาน', 'ประวัติการทำงาน รายได้ ผลลัพธ์'],
          ['ทักษะ', 'tag ทักษะพร้อมระดับ (เริ่มต้น / ปานกลาง / เชี่ยวชาญ)'],
          ['ประเมินทักษะ', 'Pre/Post test + Soft Skills 4 ด้าน แยกตามรุ่น'],
          ['ติดตามผล', 'สถานะงานหลังจบ ความพึงพอใจ ปัญหา'],
          ['สถานประกอบการ', 'ความสัมพันธ์กับองค์กรที่ฝึกงาน/ทำงาน เงินสนับสนุน'],
        ]}
      />
    </div>
  ),

  /* ─ Photo ─ */
  photo: (
    <div>
      <H2>รูปถ่าย 1 นิ้ว</H2>
      <p className="text-sm text-gray-600 mb-4">ระบบรองรับการอัปโหลดรูปถ่ายของคนพิการ เก็บไว้บนเซิร์ฟเวอร์และแสดงในรายละเอียด</p>

      <H3>ข้อกำหนดของไฟล์รูป</H3>
      <Table
        headers={['รายการ', 'ค่า']}
        rows={[
          ['ชนิดไฟล์', 'JPG / JPEG / PNG / WebP'],
          ['ขนาดไฟล์สูงสุด', '20 MB — ระบบย่อรูปให้อัตโนมัติก่อนอัปโหลด (รูปจากมือถือใช้ได้เลย)'],
          ['ความละเอียดแนะนำ', '600×800 px ขึ้นไป'],
          ['อัตราส่วน', '3:4 (แนวตั้ง) ตามมาตรฐานรูป 1 นิ้ว'],
        ]}
      />

      <H3>วิธีอัปโหลดรูป — ในฟอร์มเพิ่ม/แก้ไขคนพิการ</H3>
      <div className="mb-4">
        <Step n="1">กดปุ่ม <strong>"เพิ่มคนพิการ"</strong> หรือ กดแก้ไข (ดินสอ)</Step>
        <Step n="2">ด้านบนสุดของฟอร์มมีกรอบรูป — กดที่กรอบ หรือกด <strong>"เลือกรูปภาพ"</strong></Step>
        <Step n="3">เลือกไฟล์รูปจากเครื่อง</Step>
        <Step n="4">รูปจะแสดง Preview ทันที</Step>
        <Step n="5">กด <strong>"บันทึกข้อมูล"</strong> เพื่อบันทึกพร้อมกับข้อมูลคนพิการ</Step>
      </div>

      <H3>วิธีเปลี่ยนรูป — ในหน้ารายละเอียด</H3>
      <div className="mb-4">
        <Step n="1">ไปที่หน้ารายละเอียดคนพิการ (กดปุ่มตา หรือกดชื่อในตาราง)</Step>
        <Step n="2"><strong>Hover</strong> เมาส์บนรูปที่มุมซ้ายบน จะเห็นไอคอนกล้อง</Step>
        <Step n="3">กดไอคอนกล้อง แล้วเลือกไฟล์รูปใหม่</Step>
        <Step n="4">รูปจะอัปเดตทันที</Step>
      </div>

      <H3>วิธีลบรูป</H3>
      <ul>
        <Li>ในฟอร์ม: กดปุ่ม <strong>"ลบรูป"</strong> (สีแดง) ที่อยู่ใต้ preview</Li>
        <Li>ในหน้ารายละเอียด: กดปุ่ม <Chip color="red">🗑</Chip> มุมบนขวาของรูป</Li>
      </ul>

      <Warn>ไม่ต้องบีบอัดรูปเอง — ระบบย่อรูปให้อัตโนมัติ (ด้านยาวสุด 1,200 px) ถ้าไฟล์ใหญ่เกิน 20MB หรือไม่ใช่ไฟล์รูป ระบบจะแจ้งเตือน</Warn>
    </div>
  ),

  /* ─ Training ─ */
  training: (
    <div>
      <H2>การอบรม & ฝึกงาน</H2>
      <p className="text-sm text-gray-600 mb-4">บันทึกประวัติการอบรมและฝึกงานของผู้เข้าร่วมโครงการ</p>

      <H3>หน้า "การอบรม & ฝึกงาน" (เมนูซ้าย) — มี 2 แท็บ</H3>
      <ul className="mb-4">
        <Li><strong>ตามรุ่นอบรม</strong> — ทุกคนที่อยู่ในรุ่น พร้อมรุ่น หลักสูตร ช่วงเวลา สถานะรุ่น และคะแนนก่อน → หลังอบรม (ถ้าบันทึกไว้ในแท็บประเมินทักษะ) · เลือกดูทีละรุ่นได้ที่มุมขวา</Li>
        <Li><strong>ประวัติอบรมรายคน</strong> — การอบรมอื่นๆ ที่บันทึกไว้ในแท็บ "การอบรม" ของแต่ละคน</Li>
        <Li>กดชื่อคนในตารางเพื่อไปหน้ารายละเอียดของคนนั้น</Li>
      </ul>

      <H3>การเพิ่มประวัติอบรมของแต่ละคน</H3>
      <div className="mb-4">
        <Step n="1">ไปที่ <strong>ข้อมูลคนพิการ</strong> → กดดูรายละเอียด (ตา)</Step>
        <Step n="2">กดแท็บ <strong>"การอบรม"</strong></Step>
        <Step n="3">กดปุ่ม <strong>"+ เพิ่ม"</strong></Step>
        <Step n="4">กรอกชื่อหลักสูตร (บังคับ) และข้อมูลอื่นๆ</Step>
        <Step n="5">กด <strong>"บันทึก"</strong></Step>
      </div>

      <H3>แก้ไข / ลบรายการ</H3>
      <ul className="mb-4">
        <Li>กดปุ่ม <strong>ดินสอ</strong> ท้ายแถว → หน้าต่างเปิดพร้อมข้อมูลเดิม แก้แล้วกด "บันทึก"</Li>
        <Li>ใช้ได้กับ การอบรม · ประสบการณ์งาน · ติดตามผล · สถานประกอบการ (ทักษะใช้ลบแล้วเพิ่มใหม่)</Li>
        <Li>ช่องวันที่พิมพ์เป็น วว/ดด/ปปปป <strong>พ.ศ.</strong> — ถ้าวันที่ผิด (เช่น 31/02) หรือเผลอพิมพ์ปี ค.ศ. ระบบจะเตือนใต้ช่องและไม่ให้บันทึก</Li>
      </ul>

      <H3>รูปแบบการอบรม</H3>
      <Table
        headers={['รูปแบบ', 'ความหมาย']}
        rows={[['TRAIN — อบรม', 'การอบรมในห้องเรียน'],['LEARN — เรียนรู้', 'การเรียนรู้ด้วยตนเอง'],['EARN — ฝึกงาน', 'การฝึกงานในสถานประกอบการจริง']]}
      />
    </div>
  ),

  /* ─ Assessment ─ */
  assessment: (
    <div>
      <H2>ประเมินทักษะ (Pre / Post / Soft Skills)</H2>
      <p className="text-sm text-gray-600 mb-4">
        บันทึกผลการประเมินทักษะของผู้เข้าร่วม <strong>แยกตามรุ่น</strong> เพื่อวัดพัฒนาการก่อน-หลังการอบรม
        อยู่ในแท็บ <strong>"ประเมินทักษะ"</strong> ในหน้ารายละเอียดคนพิการ
      </p>

      <H3>คะแนนที่บันทึกได้</H3>
      <Table
        headers={['รายการ', 'คะแนนเต็ม', 'ความหมาย']}
        rows={[
          ['Pre-test', '100', 'คะแนนทดสอบก่อนอบรม'],
          ['Post-test', '100', 'คะแนนทดสอบหลังอบรม'],
          ['Soft Skills — 4 ด้าน', '5 ต่อด้าน', 'ประเมินทักษะทางสังคม (ดูด้านล่าง)'],
        ]}
      />

      <H3>Soft Skills 4 ด้าน (ด้านละ 0–5 คะแนน)</H3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          ['การสื่อสาร', 'orange'], ['การบริหารเวลา', 'blue'],
          ['การจูงใจตนเอง', 'red'], ['การทำงานตามหน้าที่', 'green'],
        ].map(([n, c]) => (
          <div key={n} className="rounded-xl border border-orange-100 bg-orange-50/30 px-3.5 py-2.5">
            <Chip color={c}>{n}</Chip>
          </div>
        ))}
      </div>

      <H3>วิธีบันทึกผลประเมิน</H3>
      <div className="mb-4">
        <Step n="1">ไปที่ <strong>ข้อมูลคนพิการ</strong> → ดูรายละเอียด → แท็บ <strong>"ประเมินทักษะ"</strong></Step>
        <Step n="2">เลือก <strong>รุ่น</strong> ที่ต้องการบันทึก (ค่าเริ่มต้น = รุ่นที่คนนั้นสังกัด)</Step>
        <Step n="3">กรอกคะแนน <strong>Pre-test / Post-test</strong> และ <strong>Soft Skills</strong> 4 ด้าน</Step>
        <Step n="4">กด <strong>"บันทึก"</strong> — แต่ละคน 1 ผลประเมินต่อ 1 รุ่น</Step>
      </div>

      <Warn>ถ้ากรอกคะแนนเกินคะแนนเต็ม ระบบจะปรับให้อยู่ในช่วงที่ถูกต้องอัตโนมัติ (Pre/Post 0–100, Soft Skills 0–5)</Warn>

      <H3>การดูพัฒนาการ</H3>
      <ul>
        <Li>ประวัติการประเมินจะแสดง <strong>ส่วนต่าง Pre → Post</strong> (พัฒนาการ +/- คะแนน)</Li>
        <Li>แสดงคะแนน Soft Skills รวมของแต่ละด้าน</Li>
      </ul>
    </div>
  ),

  /* ─ FollowUp ─ */
  followup: (
    <div>
      <H2>ติดตามผล</H2>
      <p className="text-sm text-gray-600 mb-4">บันทึกสถานะการทำงานหลังสำเร็จการฝึกงาน ใช้ติดตามความก้าวหน้าของผู้เข้าร่วม</p>

      <H3>สถานะที่บันทึกได้</H3>
      <div className="flex gap-2 flex-wrap mb-4">
        <Chip color="green">มีงานทำ (EMPLOYED)</Chip>
        <Chip color="gray">ว่างงาน (UNEMPLOYED)</Chip>
        <Chip color="blue">ศึกษาต่อ (STUDYING)</Chip>
      </div>

      <H3>ข้อมูลที่บันทึกในการติดตาม</H3>
      <Table
        headers={['ช่อง', 'ความสำคัญ']}
        rows={[
          ['วันที่ติดตาม', 'บังคับ'],
          ['สถานะงาน', 'บังคับ'],
          ['ประเภทงาน', 'ไม่บังคับ'],
          ['รายได้ (บาท)', 'ไม่บังคับ'],
          ['ทักษะตรงสาย?', 'ตรง / ไม่ตรง'],
          ['ความพึงพอใจ', 'ไม่บังคับ'],
          ['ปัญหา / ข้อเสนอแนะ', 'ไม่บังคับ'],
        ]}
      />

      <H3>การเพิ่มข้อมูลติดตามผล</H3>
      <div>
        <Step n="1">ไปที่ <strong>ข้อมูลคนพิการ</strong> → เลือกคน → แท็บ <strong>"ติดตามผล"</strong></Step>
        <Step n="2">กด <strong>"+ เพิ่ม"</strong> กรอกวันที่และสถานะ</Step>
        <Step n="3">กด <strong>"บันทึก"</strong></Step>
      </div>

      <H3>แจ้งเตือนครบรอบติดตามผล (3 เดือน / 6 เดือน / 1 ปี)</H3>
      <p className="text-sm text-gray-600 mb-3">
        ระบบคำนวณให้เองว่าใครถึงรอบต้องติดตาม แสดงที่ <strong>Dashboard</strong> (5 คนแรก) และบนสุดของหน้า <strong>ติดตามผล</strong> (ทั้งหมด)
      </p>
      <ul className="mb-3">
        <Li>นับจาก <strong>วันสิ้นสุดของรุ่น</strong> ที่คนนั้นสังกัด — รอบ 3 เดือน, 6 เดือน และ 1 ปี</Li>
        <Li>แต่ละรอบเริ่มเตือนก่อนครบกำหนด 1 เดือน — บันทึกติดตามผลที่ลงวันที่ในช่วงของรอบไหน ถือว่าทำรอบนั้นแล้ว รายชื่อจะหายไปเอง</Li>
        <Li><Chip color="orange">อีก X วัน</Chip> = ใกล้ถึงกำหนด · <Chip color="red">เลยกำหนด X วัน</Chip> = ควรรีบติดตาม</Li>
        <Li>ชิป <Chip color="green">3ด</Chip> <Chip color="gray">6ด</Chip> <Chip color="orange">1ปี</Chip> บอกความคืบหน้า: เขียว = ตามแล้ว, ขีดฆ่า = ขาด, ขอบส้ม = รอบปัจจุบัน</Li>
        <Li>กดเบอร์โทรเพื่อโทรออกได้ทันที (บนมือถือ) · กดชื่อเพื่อเปิดหน้ารายละเอียดแล้วบันทึกผล</Li>
      </ul>
      <Warn>ถ้าขึ้นกล่องสีเหลือง "ยังไม่ได้ใส่วันสิ้นสุดอบรม" ให้ไปที่ <strong>จัดการรุ่น</strong> → แก้ไขรุ่นนั้น → ใส่วันสิ้นสุด ระบบจึงจะคำนวณรอบติดตามผลได้ (รุ่นที่ยังอบรมอยู่ไม่ต้องใส่)</Warn>
    </div>
  ),

  /* ─ Orgs ─ */
  orgs: (
    <div>
      <H2>สถานประกอบการ</H2>
      <p className="text-sm text-gray-600 mb-4">จัดการข้อมูลบริษัท / หน่วยงาน ที่รับนักศึกษาฝึกงานหรือจ้างงาน และเป็นบริษัทสนับสนุนโครงการ</p>

      <H3>การเพิ่มสถานประกอบการ</H3>
      <div className="mb-4">
        <Step n="1">ไปที่เมนู <strong>"สถานประกอบการ"</strong></Step>
        <Step n="2">กดปุ่ม <strong>"+ เพิ่มองค์กร"</strong></Step>
        <Step n="3">กรอกชื่อองค์กร (บังคับ) ประเภทธุรกิจ ที่อยู่ ผู้ติดต่อ</Step>
        <Step n="4">กด <strong>"บันทึก"</strong></Step>
      </div>

      <H3>การเชื่อมคนพิการกับสถานประกอบการ</H3>
      <ul className="mb-4">
        <Li>ไปที่ <strong>รายละเอียดคนพิการ → แท็บ "สถานประกอบการ"</strong></Li>
        <Li>เลือกองค์กรจาก dropdown และระบุบทบาท</Li>
        <Li>ใส่ช่วงเวลาและเงินสนับสนุน (ถ้ามี)</Li>
      </ul>

      <H3>บทบาทที่เลือกได้</H3>
      <div className="flex gap-2 flex-wrap">
        <Chip>ฝึกงาน (INTERNSHIP)</Chip>
        <Chip>จ้างงาน (EMPLOYMENT)</Chip>
        <Chip color="gray">อื่นๆ (OTHER)</Chip>
      </div>
    </div>
  ),

  /* ─ Report ─ */
  report: (
    <div>
      <H2>ออกรายงาน</H2>
      <p className="text-sm text-gray-600 mb-4">ระบบออกรายงาน 5 ประเภท สามารถพิมพ์หรือบันทึกเป็น PDF ได้ และเลือกกรองตามรุ่นได้</p>

      <H3>ประเภทรายงาน</H3>
      <div className="space-y-3 mb-5">
        {[
          { icon: FileText, label: '1. รายชื่อคนพิการ', color: '#ea580c',
            desc: 'ตารางรายชื่อพร้อมข้อมูลพื้นฐาน: ชื่อ อายุ วันเกิด เลขบัตร ประเภทความพิการ จังหวัด เบอร์โทร',
            use: 'ใช้สำหรับสรุปรายชื่อผู้เข้าร่วมโครงการ' },
          { icon: Users, label: '2. แบบสังเกตพฤติกรรมรายบุคคล', color: '#06b6d4',
            desc: 'ตารางพร้อมช่องรูปภาพ: ชื่อ อายุ ประเภทความพิการ วุฒิการศึกษา ทักษะคอมพิวเตอร์ สาเหตุความพิการ',
            use: 'ส่งให้วิทยากรก่อนการอบรม' },
          { icon: Layers, label: '3. แบบประเมินรายวิชา', color: '#0ea5e9',
            desc: 'ตารางให้คะแนน 5 หัวข้อ รวม 25 คะแนน พร้อมช่องรูปภาพผู้เข้าร่วม สำหรับวิทยากรประเมินรายวิชา',
            use: 'ให้วิทยากรกรอกคะแนนรายวิชา' },
          { icon: Award, label: '4. ใบ Certificate', color: '#10b981',
            desc: 'ออกใบรับรองผลการอบรมของ มจธ. ชื่อผู้รับ หลักสูตร รุ่นที่ วันที่ ลายเซ็น (ไม่มีตราโลโก้ — ปั๊มเอง)',
            use: 'พิมพ์แยกใบ 1 ใบต่อ 1 คน' },
          { icon: Building2, label: '5. รายงานส่งบริษัท', color: '#8b5cf6',
            desc: 'สรุปผลการดำเนินงาน รุ่นที่ วันที่ หลักสูตร งบประมาณ บริษัทสนับสนุน รายชื่อผู้เข้าร่วม',
            use: 'ส่งบริษัทสนับสนุนโครงการ' },
        ].map(({ icon: Icon, label, color, desc, use }) => (
          <div key={label} className="rounded-2xl border border-orange-100 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color }}>
              <Icon size={16} color="white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm mb-0.5">{label}</p>
              <p className="text-xs text-gray-500 mb-1 leading-snug">{desc}</p>
              <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded-full">{use}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>วิธีใช้งานหน้าออกรายงาน</H3>
      <div className="mb-4">
        <Step n="1">ไปที่เมนู <strong>"ออกรายงาน"</strong></Step>
        <Step n="2">เลือกประเภทรายงาน (5 ปุ่มด้านบน)</Step>
        <Step n="3">เลือก <strong>รุ่น</strong> ที่ต้องการ (ถ้าต้องการกรองเฉพาะรุ่น)</Step>
        <Step n="4">กรอกข้อมูลตั้งค่า (สำหรับ Certificate / ประเมินรายวิชา / รายงานบริษัท)</Step>
        <Step n="5">เลือกรายชื่อที่ต้องการ — หรือกด <strong>"เลือกทั้งหมด"</strong></Step>
        <Step n="6">กดปุ่ม <strong>"พิมพ์ / บันทึก PDF"</strong> มุมขวาบน</Step>
        <Step n="7">เบราว์เซอร์จะเปิด Print Dialog → เลือก <strong>"Save as PDF"</strong></Step>
      </div>

      <H3>การเลือกรายชื่อ</H3>
      <ul>
        <Li>ค้นหาชื่อในช่องค้นหา</Li>
        <Li>กดชื่อเพื่อเลือก/ยกเลิก (สีส้ม = เลือกแล้ว)</Li>
        <Li>กด <strong>"เลือกทั้งหมด"</strong> เพื่อเลือกทุกคน</Li>
        <Li>กด <strong>"ล้าง"</strong> เพื่อยกเลิกการเลือกทั้งหมด</Li>
        <Li>ถ้าไม่เลือกใคร — ระบบจะแสดงทุกคนในรายงาน</Li>
      </ul>
    </div>
  ),

  /* ─ Users ─ */
  users: (
    <div>
      <H2>จัดการผู้ใช้งาน (Admin Only)</H2>
      <p className="text-sm text-gray-600 mb-4">เฉพาะ Admin เท่านั้นที่เข้าถึงหน้านี้ได้ ไปที่เมนู <strong>"จัดการผู้ใช้"</strong></p>

      <H3>การเพิ่มผู้ใช้ใหม่</H3>
      <div className="mb-4">
        <Step n="1">กดปุ่ม <strong>"+ เพิ่มผู้ใช้"</strong></Step>
        <Step n="2">กรอกชื่อ, Email, Password และเลือก <strong>บทบาท</strong></Step>
        <Step n="3">กด <strong>"เพิ่มผู้ใช้"</strong></Step>
      </div>

      <H3>การแก้ไขผู้ใช้</H3>
      <ul className="mb-4">
        <Li>กดไอคอนดินสอ เพื่อแก้ไขชื่อ Email บทบาท</Li>
        <Li>ช่องรหัสผ่าน: เว้นว่างถ้าไม่ต้องการเปลี่ยน</Li>
      </ul>

      <H3>การเปิด/ปิดบัญชี</H3>
      <ul className="mb-4">
        <Li>กดที่ badge <Chip color="green">ใช้งาน</Chip> หรือ <Chip color="gray">ปิดใช้งาน</Chip> เพื่อสลับสถานะ</Li>
        <Li>บัญชีที่ปิดใช้งานจะไม่สามารถเข้าสู่ระบบได้</Li>
      </ul>

      <H3>ข้อจำกัด</H3>
      <ul>
        <Li>ไม่สามารถลบหรือปิดบัญชีของตัวเองได้</Li>
        <Li>ควรเปลี่ยนรหัสผ่านเริ่มต้น <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">admin123</code> หลังเริ่มใช้งานระบบ</Li>
      </ul>

      <H3>บทบาทที่สร้างได้</H3>
      <Table
        headers={['บทบาท', 'ใช้สำหรับ']}
        rows={[
          ['ADMIN', 'ผู้ดูแลระบบ — สำหรับ IT / ผู้รับผิดชอบระบบ'],
          ['STAFF', 'เจ้าหน้าที่ — สำหรับผู้กรอกข้อมูลและดูแลโครงการ'],
          ['VIEWER', 'ผู้ดูข้อมูล — สำหรับผู้บริหารหรือผู้ที่ต้องการดูสถิติ'],
        ]}
      />
    </div>
  ),

  /* ─ Audit ─ */
  audit: (
    <div>
      <H2>ประวัติการใช้งาน (Admin Only)</H2>
      <p className="text-sm text-gray-600 mb-4">
        ดูได้ว่า <strong>ใคร เพิ่ม / แก้ไข / ลบ ข้อมูลอะไร เมื่อไหร่</strong> — ระบบบันทึกให้อัตโนมัติ ไปที่เมนู <strong>"ประวัติการใช้งาน"</strong> (ใต้ "จัดการผู้ใช้")
      </p>

      <H3>สิ่งที่ระบบบันทึก</H3>
      <ul className="mb-4">
        <Li>เพิ่ม / แก้ไข / ลบ ข้อมูลคนพิการ และข้อมูลทุกแท็บ (ความพิการ อบรม งาน ทักษะ ติดตามผล รูปถ่าย ผลประเมิน)</Li>
        <Li>สถานประกอบการ, รุ่น / หลักสูตร, บัญชีผู้ใช้, การนำเข้า Excel และการรีเซ็ตระบบ</Li>
        <Li>การเข้าสู่ระบบ ทั้งที่สำเร็จ และที่ <Chip color="red">ล็อกอินไม่สำเร็จ</Chip> (ใช้ดูว่ามีคนพยายามเดารหัสผ่านไหม)</Li>
        <Li>แต่ละรายการมี: เวลา, ผู้ใช้, การกระทำ, ประเภทข้อมูล, ชื่อรายการ และ IP</Li>
      </ul>

      <H3>การค้นหา</H3>
      <ul className="mb-4">
        <Li>พิมพ์ชื่อคนพิการหรือชื่อผู้ใช้ในช่องค้นหา</Li>
        <Li>กรองตามการกระทำ (เพิ่ม / แก้ไข / ลบ ...), ผู้ใช้ และช่วงวันที่</Li>
        <Li>กดชื่อคนพิการในรายการเพื่อเปิดหน้ารายละเอียด</Li>
      </ul>

      <Warn>ประวัติจะถูกเก็บไว้แม้ข้อมูลหรือผู้ใช้คนนั้นจะถูกลบไปแล้ว และ <strong>ไม่ถูกล้าง</strong> ตอนกดรีเซ็ตระบบ · ระบบไม่บันทึกเนื้อหาข้อมูลส่วนตัวหรือรหัสผ่านลงในประวัติ</Warn>
    </div>
  ),
};

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function Help() {
  const [active, setActive] = useState('intro');

  const activeSection = sections.find(s => s.id === active);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <BookOpen size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black page-title leading-tight">คู่มือการใช้งาน</h1>
          <p className="text-gray-400 text-sm mt-0.5">ระบบฐานข้อมูลคนพิการ มจธ. — อัปเดต ต.ค. 2569</p>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col gap-3">
        {/* Horizontal scroll nav */}
        <div className="overflow-x-auto bg-white rounded-2xl border border-orange-100 shadow-sm">
          <div className="flex gap-1 px-2 py-2 min-w-max">
            {sections.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActive(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                  ${active === id ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-orange-50'}`}
                style={active === id ? { background: 'linear-gradient(135deg,#ea580c,#c2410c)' } : {}}>
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Active section label */}
        {activeSection && (
          <div className="flex items-center gap-2 px-1">
            <activeSection.icon size={14} className="text-orange-500" />
            <span className="text-sm font-bold text-gray-700">{activeSection.label}</span>
          </div>
        )}

        {/* Content full width */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 pb-8">
          {CONTENT[active]}
        </div>
      </div>

      {/* ── Desktop layout (unchanged) ── */}
      <div className="hidden md:flex flex-1 min-h-0 gap-4" style={{ height: 'calc(100vh - 56px - 140px)' }}>
        {/* Left nav */}
        <div className="w-52 flex-shrink-0 bg-white rounded-3xl border border-orange-100 overflow-auto py-3 shadow-sm">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-all
                ${active === id
                  ? 'text-orange-700 font-bold'
                  : 'text-gray-400 hover:text-gray-700 font-medium hover:bg-orange-50/50'
                }`}
              style={active === id ? { background: 'linear-gradient(90deg,rgba(234,88,12,0.08),transparent)', borderRight: '2px solid #ea580c' } : {}}>
              <Icon size={14} className={active === id ? 'text-orange-500' : 'text-gray-300'} />
              <span className="flex-1 leading-snug text-xs">{label}</span>
              {active === id && <ChevronRight size={12} className="text-orange-400" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white rounded-3xl border border-orange-100 overflow-auto p-6 shadow-sm">
          {CONTENT[active]}
        </div>
      </div>
    </div>
  );
}
