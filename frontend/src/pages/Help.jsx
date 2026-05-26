import { useState } from 'react';
import {
  BookOpen, LogIn, Shield, Users, GraduationCap, Target,
  Building2, UserCog, Eye, ChevronRight, Info, CheckCircle,
} from 'lucide-react';

const sections = [
  { id: 'intro',    label: 'ภาพรวมระบบ',        icon: Info },
  { id: 'login',    label: 'การเข้าสู่ระบบ',      icon: LogIn },
  { id: 'roles',    label: 'สิทธิ์ผู้ใช้งาน',      icon: Shield },
  { id: 'persons',  label: 'ข้อมูลคนพิการ',       icon: Users },
  { id: 'training', label: 'การอบรม & ฝึกงาน',    icon: GraduationCap },
  { id: 'followup', label: 'ติดตามผล',            icon: Target },
  { id: 'orgs',     label: 'สถานประกอบการ',       icon: Building2 },
  { id: 'users',    label: 'จัดการผู้ใช้ (Admin)', icon: UserCog },
];

const Badge = ({ children, cls = 'bg-orange-100 text-orange-700' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{children}</span>
);

const H2 = ({ children }) => (
  <h2 className="text-lg font-extrabold text-orange-950 mb-4 flex items-center gap-2">
    <div className="w-1 h-5 rounded-full bg-orange-500" />{children}
  </h2>
);

const H3 = ({ children }) => (
  <h3 className="text-sm font-bold text-orange-800 mt-5 mb-2">{children}</h3>
);

const Li = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-gray-600 mb-1.5">
    <CheckCircle size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />{children}
  </li>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-orange-100 mb-4">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wide">
          {headers.map((h) => <th key={h} className="px-4 py-2.5 text-left font-bold">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
            {r.map((c, j) => <td key={j} className="px-4 py-2.5 text-gray-700">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CONTENT = {
  intro: (
    <div>
      <H2>ภาพรวมระบบ PWDs Database</H2>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        ระบบฐานข้อมูลคนพิการ มจธ. (PWDs Database) คือระบบจัดการข้อมูลผู้เข้าร่วมโครงการฝึกอบรม-ฝึกงาน
        สำหรับคนพิการของมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี ครอบคลุมตั้งแต่การบันทึกข้อมูลส่วนตัว
        ไปจนถึงการติดตามผลหลังสำเร็จการฝึกงาน
      </p>
      <H3>ฟีเจอร์หลักของระบบ</H3>
      <ul className="mb-4">
        <Li>บันทึกและจัดการข้อมูลส่วนตัวคนพิการ พร้อมข้อมูลความพิการ</Li>
        <Li>ติดตามประวัติการอบรม / ฝึกงาน ของแต่ละบุคคล</Li>
        <Li>บันทึกประสบการณ์ทำงานและทักษะที่มี</Li>
        <Li>ติดตามผลหลังสำเร็จการฝึกงาน (มีงานทำ / ว่างงาน / ศึกษาต่อ)</Li>
        <Li>จัดการข้อมูลสถานประกอบการที่รับนักศึกษาฝึกงาน</Li>
        <Li>Dashboard สถิติภาพรวมพร้อมกราฟ</Li>
        <Li>ระบบผู้ใช้งาน 3 ระดับสิทธิ์</Li>
      </ul>
      <H3>URL ระบบ</H3>
      <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm font-mono text-orange-700 font-bold">
        https://kmutt-pwd-db.vercel.app
      </div>
    </div>
  ),

  login: (
    <div>
      <H2>การเข้าสู่ระบบ</H2>
      <p className="text-sm text-gray-600 mb-4">เข้าระบบด้วย Email และ Password ที่ได้รับจากผู้ดูแลระบบ</p>
      <H3>ขั้นตอนการเข้าสู่ระบบ</H3>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-4 ml-1">
        <li>เปิดเบราว์เซอร์ไปที่ <span className="font-mono text-orange-600 font-bold">https://kmutt-pwd-db.vercel.app</span></li>
        <li>กรอก <strong>Email</strong> และ <strong>Password</strong></li>
        <li>กดปุ่ม <strong>"เข้าสู่ระบบ"</strong></li>
        <li>ระบบจะพาไปหน้า Dashboard อัตโนมัติ</li>
      </ol>
      <H3>บัญชีเริ่มต้น (Admin)</H3>
      <Table
        headers={['Email', 'Password', 'หมายเหตุ']}
        rows={[['admin@kmutt.ac.th', 'admin123', 'เปลี่ยนรหัสหลังเข้าครั้งแรก']]}
      />
      <H3>หมายเหตุ</H3>
      <ul>
        <Li>Session มีอายุ 8 ชั่วโมง หลังจากนั้นต้องเข้าสู่ระบบใหม่</Li>
        <Li>ถ้าบัญชีถูกปิดใช้งาน จะไม่สามารถเข้าสู่ระบบได้</Li>
      </ul>
    </div>
  ),

  roles: (
    <div>
      <H2>สิทธิ์ผู้ใช้งาน 3 ระดับ</H2>
      <p className="text-sm text-gray-600 mb-4">ระบบแบ่งสิทธิ์ผู้ใช้งานออกเป็น 3 ระดับ แต่ละระดับมีความสามารถต่างกัน</p>
      <div className="grid gap-4 mb-5">
        {[
          { role: 'ADMIN', label: 'ผู้ดูแลระบบ', cls: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-700',
            desc: 'สิทธิ์สูงสุด ทำได้ทุกอย่างรวมถึงจัดการผู้ใช้งาน',
            can: ['เพิ่ม / แก้ไข / ลบ ข้อมูลทุกประเภท', 'จัดการบัญชีผู้ใช้งาน (เพิ่ม/แก้ไข/ลบ/เปิด-ปิด)', 'ดูสถิติ Dashboard', 'เข้าถึงข้อมูลทั้งหมด'] },
          { role: 'STAFF', label: 'เจ้าหน้าที่', cls: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700',
            desc: 'จัดการข้อมูลคนพิการและกิจกรรมต่างๆ ได้ แต่ไม่สามารถจัดการผู้ใช้งาน',
            can: ['เพิ่ม / แก้ไข / ลบ ข้อมูลคนพิการ', 'บันทึกประวัติอบรม, งาน, ทักษะ, ติดตามผล', 'จัดการสถานประกอบการ', 'ดูสถิติ Dashboard'] },
          { role: 'VIEWER', label: 'ผู้ดูข้อมูล', cls: 'border-blue-200 bg-blue-50', badge: 'bg-blue-100 text-blue-700',
            desc: 'ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขหรือลบข้อมูลใดๆ',
            can: ['ดูข้อมูลคนพิการทั้งหมด', 'ดูประวัติอบรม, งาน, ทักษะ, ติดตามผล', 'ดูสถิติ Dashboard', 'ไม่มีปุ่ม เพิ่ม / แก้ไข / ลบ'] },
        ].map(({ role, label, cls, badge, desc, can }) => (
          <div key={role} className={`rounded-xl border p-4 ${cls}`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge cls={badge}>{role}</Badge>
              <span className="font-bold text-gray-800 text-sm">{label}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{desc}</p>
            <ul className="space-y-1">
              {can.map((c) => <Li key={c}>{c}</Li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  ),

  persons: (
    <div>
      <H2>ข้อมูลคนพิการ</H2>
      <p className="text-sm text-gray-600 mb-4">หน้าหลักของระบบ ใช้บันทึกและจัดการข้อมูลส่วนตัวของผู้เข้าร่วมโครงการ</p>
      <H3>การค้นหา</H3>
      <ul className="mb-4">
        <Li>พิมพ์ชื่อ-นามสกุล หรือเลขบัตรประชาชนในช่องค้นหา แล้วกด "ค้นหา" หรือกด Enter</Li>
        <Li>กด "ล้าง" เพื่อแสดงรายการทั้งหมด</Li>
      </ul>
      <H3>การเพิ่มข้อมูล (Staff / Admin)</H3>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 ml-1 mb-4">
        <li>กดปุ่ม <strong>"+ เพิ่มคนพิการ"</strong> มุมขวาบน</li>
        <li>กรอกข้อมูลส่วนตัว (ชื่อ-นามสกุลจำเป็นต้องกรอก)</li>
        <li>วันเกิดพิมพ์เป็น <strong>วว/ดด/ปปปป (พ.ศ.)</strong> เช่น 15/06/2540</li>
        <li>เลขบัตรประชาชน: ตัวเลขเท่านั้น สูงสุด 13 หลัก</li>
        <li>เบอร์โทร: ตัวเลขเท่านั้น สูงสุด 10 หลัก</li>
        <li>กดปุ่ม <strong>"บันทึก"</strong></li>
      </ol>
      <H3>รายละเอียดคนพิการ (6 แท็บ)</H3>
      <Table
        headers={['แท็บ', 'เนื้อหา']}
        rows={[
          ['ข้อมูลพื้นฐาน', 'ข้อมูลส่วนตัว ที่อยู่ ข้อมูลความพิการ'],
          ['การอบรม', 'ประวัติหลักสูตรอบรม / ฝึกงาน'],
          ['ประสบการณ์งาน', 'ประวัติการทำงาน รายได้ ผลลัพธ์'],
          ['ทักษะ', 'ทักษะพร้อมระดับ (เริ่มต้น / กลาง / เชี่ยวชาญ)'],
          ['ติดตามผล', 'สถานะงานหลังจบ ความพึงพอใจ ปัญหา'],
          ['สถานประกอบการ', 'ความสัมพันธ์กับองค์กรที่ฝึกงาน/ทำงาน'],
        ]}
      />
    </div>
  ),

  training: (
    <div>
      <H2>การอบรม & ฝึกงาน</H2>
      <p className="text-sm text-gray-600 mb-4">แสดงรายการอบรมทั้งหมดในระบบ เฉพาะคนที่มีข้อมูลการอบรมแล้วเท่านั้น</p>
      <H3>การดูข้อมูล</H3>
      <ul className="mb-4">
        <Li>หน้านี้รวมการอบรมของทุกคนไว้ในตารางเดียว</Li>
        <Li>กดชื่อคนในตารางเพื่อไปหน้ารายละเอียดของคนนั้น</Li>
      </ul>
      <H3>การเพิ่มประวัติอบรม</H3>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 ml-1 mb-4">
        <li>ไปที่หน้า <strong>ข้อมูลคนพิการ</strong> → กดดูรายละเอียดคนที่ต้องการ</li>
        <li>เลือกแท็บ <strong>"การอบรม"</strong></li>
        <li>กดปุ่ม <strong>"+ เพิ่ม"</strong></li>
        <li>กรอกชื่อหลักสูตร (จำเป็น) และข้อมูลอื่นๆ</li>
        <li>กด <strong>"บันทึก"</strong></li>
      </ol>
      <H3>รูปแบบการอบรม</H3>
      <Table
        headers={['รหัส', 'ความหมาย']}
        rows={[['TRAIN', 'อบรม'], ['LEARN', 'เรียนรู้'], ['EARN', 'ฝึกงาน (Earn)']]}
      />
    </div>
  ),

  followup: (
    <div>
      <H2>ติดตามผล</H2>
      <p className="text-sm text-gray-600 mb-4">บันทึกสถานะการทำงานหลังสำเร็จการฝึกงาน ใช้ติดตามว่าผู้เข้าร่วมโครงการมีความก้าวหน้าอย่างไร</p>
      <H3>สถานะที่บันทึกได้</H3>
      <Table
        headers={['สถานะ', 'ความหมาย']}
        rows={[['มีงานทำ (EMPLOYED)', 'ได้งานทำหลังสำเร็จการฝึกงาน'], ['ว่างงาน (UNEMPLOYED)', 'ยังไม่มีงานทำ'], ['ศึกษาต่อ (STUDYING)', 'เลือกศึกษาต่อ']]}
      />
      <H3>ข้อมูลที่บันทึกในการติดตาม</H3>
      <ul className="mb-4">
        <Li><strong>วันที่ติดตาม</strong> และ <strong>สถานะงาน</strong> — จำเป็นต้องกรอก</Li>
        <Li>ประเภทงาน, รายได้, ทักษะสอดคล้องกับที่เรียน</Li>
        <Li>ความพึงพอใจในงาน และปัญหาที่พบ</Li>
      </ul>
      <H3>การเพิ่มข้อมูลติดตามผล</H3>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 ml-1">
        <li>ไปที่หน้า <strong>ข้อมูลคนพิการ</strong> → เลือกคน → แท็บ <strong>"ติดตามผล"</strong></li>
        <li>กด <strong>"+ เพิ่ม"</strong> กรอกวันที่และสถานะ</li>
        <li>กด <strong>"บันทึก"</strong></li>
      </ol>
    </div>
  ),

  orgs: (
    <div>
      <H2>สถานประกอบการ</H2>
      <p className="text-sm text-gray-600 mb-4">จัดการข้อมูลบริษัท / หน่วยงาน ที่รับนักศึกษาฝึกงานหรือจ้างงาน</p>
      <H3>การเพิ่มสถานประกอบการ</H3>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 ml-1 mb-4">
        <li>ไปที่เมนู <strong>"สถานประกอบการ"</strong></li>
        <li>กดปุ่ม <strong>"+ เพิ่มองค์กร"</strong></li>
        <li>กรอกชื่อองค์กร (จำเป็น) และข้อมูลอื่นๆ</li>
        <li>กด <strong>"บันทึก"</strong></li>
      </ol>
      <H3>การเชื่อมคนพิการกับองค์กร</H3>
      <ul className="mb-4">
        <Li>ไปที่ <strong>รายละเอียดคนพิการ → แท็บ "สถานประกอบการ"</strong></Li>
        <Li>เลือกองค์กรจาก dropdown และระบุบทบาท (ฝึกงาน / จ้างงาน / อื่นๆ)</Li>
        <Li>ใส่ช่วงเวลาและเงินสนับสนุน (ถ้ามี)</Li>
      </ul>
    </div>
  ),

  users: (
    <div>
      <H2>จัดการผู้ใช้งาน (Admin Only)</H2>
      <p className="text-sm text-gray-600 mb-4">เฉพาะ Admin เท่านั้นที่เข้าถึงหน้านี้ได้ ใช้จัดการบัญชีผู้ใช้ทั้งหมดในระบบ</p>
      <H3>การเพิ่มผู้ใช้ใหม่</H3>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 ml-1 mb-4">
        <li>กดปุ่ม <strong>"+ เพิ่มผู้ใช้"</strong></li>
        <li>กรอกชื่อ, Email, Password และเลือก <strong>บทบาท</strong></li>
        <li>กด <strong>"เพิ่มผู้ใช้"</strong></li>
      </ol>
      <H3>การแก้ไขผู้ใช้</H3>
      <ul className="mb-4">
        <Li>กดไอคอนดินสอ เพื่อแก้ไขชื่อ Email บทบาท</Li>
        <Li>ช่องรหัสผ่านเว้นว่างถ้าไม่ต้องการเปลี่ยน</Li>
      </ul>
      <H3>การเปิด/ปิดบัญชี</H3>
      <ul className="mb-4">
        <Li>กดที่ badge <Badge cls="bg-green-100 text-green-700">ใช้งาน</Badge> หรือ <Badge cls="bg-gray-100 text-gray-500">ปิดใช้งาน</Badge> เพื่อสลับสถานะ</Li>
        <Li>ไม่สามารถปิดบัญชีของตัวเองได้</Li>
      </ul>
      <H3>หมายเหตุ</H3>
      <ul>
        <Li>ไม่สามารถลบบัญชีของตัวเองได้</Li>
        <Li>Admin ควรเปลี่ยนรหัสผ่าน admin123 หลังใช้งานครั้งแรก</Li>
      </ul>
    </div>
  ),
};

export default function Help() {
  const [active, setActive] = useState('intro');

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="mb-3 rounded-2xl overflow-hidden relative shadow-md border border-orange-100 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)' }}>
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
        <div className="relative px-8 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
            <BookOpen size={20} color="white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-px w-5 bg-orange-400 rounded-full" />
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">ช่วยเหลือ</span>
            </div>
            <h1 className="text-xl font-extrabold text-orange-950 leading-tight">คู่มือการใช้งาน</h1>
            <p className="text-xs text-orange-400 font-semibold mt-0.5">ระบบฐานข้อมูลคนพิการ มจธ.</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left nav */}
        <div className="w-52 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-orange-100 overflow-auto py-3">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-all
                ${active === id
                  ? 'bg-orange-50 text-orange-700 font-bold border-r-2 border-orange-500'
                  : 'text-gray-500 hover:bg-orange-50/60 hover:text-orange-600 font-medium'
                }`}>
              <Icon size={15} className={active === id ? 'text-orange-500' : 'text-gray-400'} />
              <span className="flex-1 leading-snug">{label}</span>
              {active === id && <ChevronRight size={13} className="text-orange-400" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-orange-100 overflow-auto p-6">
          {CONTENT[active]}
        </div>
      </div>
    </div>
  );
}
