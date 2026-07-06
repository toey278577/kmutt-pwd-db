import { useEffect, useState } from 'react';
import { Printer, FileText, Award, Building2, Users, ChevronDown, X, Layers, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getPersons, getOrganizations, getBatches } from '../api';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${parseInt(y) + 543}`;
};

const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mo = today.getMonth() - birth.getMonth();
  if (mo < 0 || (mo === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const DISABILITY_ABBR = {
  'การมองเห็น': 'สายตา',
  'การได้ยิน': 'หู',
  'การเคลื่อนไหว': 'ร่างกาย',
  'จิตใจหรือพฤติกรรม': 'จิตใจ',
  'สติปัญญา': 'สติปัญญา',
  'การเรียนรู้': 'การเรียนรู้',
  'ออทิสติก': 'ออทิสติก',
};

const REPORT_TYPES = [
  { id: 'list', label: 'รายชื่อคนพิการ', icon: Users, desc: 'ตารางรายชื่อพร้อมข้อมูลพื้นฐาน' },
  { id: 'behavior', label: 'แบบสังเกตพฤติกรรมรายบุคคล', icon: FileText, desc: 'ส่งให้วิทยากรก่อนการอบรม' },
  { id: 'course_eval', label: 'แบบประเมินรายวิชา', icon: Layers, desc: 'ตารางให้คะแนน 5 หัวข้อ 25 คะแนน' },
  { id: 'certificate', label: 'ใบ Certificate', icon: Award, desc: 'ใบรับรองผลการอบรม มจธ.' },
  { id: 'company', label: 'รายงานส่งบริษัท', icon: Building2, desc: 'รายงานผลการดำเนินงาน' },
];

export default function ReportPage() {
  const [activeType, setActiveType] = useState('list');
  const [persons, setPersons] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState('');

  // แบบประเมินรายวิชา settings
  const [courseEvalForm, setCourseEvalForm] = useState({
    subject: '',
    teacher: '',
    date: '',
  });

  // Certificate settings
  const [certForm, setCertForm] = useState({
    certType: 'entered',
    courseName: 'การฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อมเข้าทำงานในสถานประกอบการ',
    courseSub: 'เจ้าหน้าที่ประจำสำนักงาน',
    batch: '',
    startDate: '',
    endDate: '',
    duration: '',
    signName: 'รศ.ดร.สุวิทย์ แซ่เตีย',
    signTitle: 'อธิการบดีมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',
  });
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);

  // Company report settings
  const [companyForm, setCompanyForm] = useState({
    batch: '',
    startDate: '',
    endDate: '',
    courseName: '',
    totalBudget: '',
    note: '',
  });
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);

  useEffect(() => {
    Promise.all([getPersons({ withPhotos: 'true' }), getOrganizations(), getBatches()])
      .then(([pRes, oRes, bRes]) => {
        setPersons(pRes.data);
        setOrgs(oRes.data);
        setBatches(bRes.data);
        setLoading(false);
      });
  }, []);

  const togglePerson = (id) => {
    setSelectedPersonIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleOrg = (id) => {
    setSelectedOrgIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllPersons = () => {
    setSelectedPersonIds(persons.map(p => p.id));
  };

  const clearPersons = () => setSelectedPersonIds([]);

  // เปลี่ยนรุ่น → ล้างรายชื่อที่เลือกไว้ กันค้างข้ามรุ่น
  const changeBatch = (b) => { setBatchFilter(b); setSelectedPersonIds([]); };

  // กรองตามรุ่นก่อน แล้วค่อยกรองตามรายชื่อที่เลือก
  const batchPersons = batchFilter
    ? persons.filter(p => String(p.batchId) === batchFilter)
    : persons;
  const filteredPersons = selectedPersonIds.length > 0
    ? batchPersons.filter(p => selectedPersonIds.includes(p.id))
    : batchPersons;

  const filteredOrgs = selectedOrgIds.length > 0
    ? orgs.filter(o => selectedOrgIds.includes(o.id))
    : orgs;

  const handlePrint = () => {
    window.print();
  };

  // ── Export เป็นไฟล์ Excel (.xlsx) ตามชนิดรายงานที่เลือกอยู่ ──
  const saveWorkbook = (rows, cols, sheetName, fileName) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (cols) ws['!cols'] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${fileName}-${stamp}.xlsx`);
  };

  const handleExportExcel = () => {
    if (activeType === 'course_eval') {
      const header = [
        '#', 'ชื่อ - สกุล',
        'ความตั้งใจ/ความสนใจ',
        'การตอบคำถาม/แสดงความคิดเห็น',
        'การทำงานร่วมกับผู้อื่น/มีส่วนร่วม',
        'ตรงต่อเวลา/ส่งงานครบมอบหมาย',
        'ผลงาน',
        'รวม (25 คะแนน)',
      ];
      const rows = [
        ['แบบประเมินรายวิชา — บันทึกพฤติกรรมการปฏิบัติงานรายบุคคล'],
        [`รายวิชา: ${courseEvalForm.subject || '-'}`, '', `วันที่: ${courseEvalForm.date || '-'}`,
          '', courseEvalForm.teacher ? `อาจารย์ผู้สอน: ${courseEvalForm.teacher}` : ''],
        [],
        header,
        ...filteredPersons.map((p, i) => [i + 1, p.fullName, '', '', '', '', '', '']),
      ];
      const cols = [{ wch: 4 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
      saveWorkbook(rows, cols, 'แบบประเมินรายวิชา', 'แบบประเมินรายวิชา');
      return;
    }

    if (activeType === 'behavior') {
      const header = ['#', 'ชื่อ - สกุล', 'ชื่อเล่น', 'อายุ', 'ประเภทความพิการ', 'วุฒิการศึกษา', 'ทักษะด้านคอมพิวเตอร์', 'สาเหตุความพิการ'];
      const rows = [
        ['แบบบันทึกพฤติกรรมการปฏิบัติงานรายบุคคล'],
        [],
        header,
        ...filteredPersons.map((p, i) => {
          const computerSkills = p.skills?.filter(s =>
            s.skillName.toLowerCase().includes('computer') ||
            s.skillName.includes('คอมพิวเตอร์') ||
            s.skillName.includes('word') ||
            s.skillName.includes('excel')
          ).map(s => s.skillName).join(', ') || '';
          return [
            i + 1,
            p.fullName,
            '',
            calcAge(p.birthDate) ?? '',
            p.disabilityInfos?.map(d => d.disabilityType?.typeName).join(', ') || '',
            p.educationLevel || '',
            computerSkills,
            '',
          ];
        }),
      ];
      const cols = [{ wch: 4 }, { wch: 26 }, { wch: 10 }, { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 20 }];
      saveWorkbook(rows, cols, 'แบบสังเกตพฤติกรรม', 'แบบสังเกตพฤติกรรมรายบุคคล');
      return;
    }

    // รายชื่อคนพิการ (list) และชนิดอื่น ๆ ใช้ตารางรายชื่อพื้นฐาน
    const header = ['#', 'ชื่อ-นามสกุล', 'อายุ', 'วัน/เดือน/ปีเกิด', 'เลขบัตรประชาชน', 'ความพิการ', 'จังหวัด', 'เบอร์โทร'];
    const rows = [
      header,
      ...filteredPersons.map((p, i) => [
        i + 1,
        p.fullName,
        calcAge(p.birthDate) ?? '',
        fmtDate(p.birthDate),
        p.thaiId || '',
        p.disabilityInfos?.map(d => d.disabilityType?.typeName).join(', ') || '',
        p.province || '',
        p.mobile || p.phone || '',
      ]),
    ];
    const cols = [{ wch: 4 }, { wch: 28 }, { wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 14 }];
    saveWorkbook(rows, cols, 'รายชื่อคนพิการ', 'รายชื่อคนพิการ');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Printer size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-black page-title leading-tight">ออกรายงาน / Report</h1>
            <p className="text-gray-400 text-sm mt-0.5">กด "พิมพ์ / บันทึก PDF" → เปลี่ยน Destination เป็น "Save as PDF" → Save</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(activeType === 'list' || activeType === 'behavior' || activeType === 'course_eval') && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 active:scale-95 transition-all shadow-sm">
              <FileSpreadsheet size={16} /> Excel
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm">
            <Printer size={16} /> พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 no-print">
        {REPORT_TYPES.map(({ id, label, icon: Icon, desc }) => (
          <button key={id}
            onClick={() => setActiveType(id)}
            className={`rounded-2xl p-4 text-left border transition-all ${
              activeType === id
                ? 'border-orange-400 bg-orange-50 shadow-md'
                : 'border-orange-100 bg-white hover:border-orange-300 hover:bg-orange-50/50'
            }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
              activeType === id ? 'bg-orange-500' : 'bg-orange-100'
            }`}>
              <Icon size={18} className={activeType === id ? 'text-white' : 'text-orange-500'} />
            </div>
            <p className={`font-bold text-sm ${activeType === id ? 'text-orange-700' : 'text-gray-700'}`}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Settings Panel */}
      <div className="no-print">

        {/* Course Eval Settings */}
        {activeType === 'course_eval' && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-5 shadow-sm">
            <p className="font-bold text-orange-950 text-sm mb-4">ตั้งค่าแบบประเมินรายวิชา</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อรายวิชา</label>
                <input className={inputCls} placeholder="เช่น การสื่อสารในองค์กร"
                  value={courseEvalForm.subject} onChange={e => setCourseEvalForm({...courseEvalForm, subject: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่ออาจารย์ผู้สอน</label>
                <input className={inputCls} placeholder="ชื่อ-นามสกุล"
                  value={courseEvalForm.teacher} onChange={e => setCourseEvalForm({...courseEvalForm, teacher: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">วันที่สอน</label>
                <input className={inputCls} placeholder="วว/ดด/ปปปป"
                  value={courseEvalForm.date} onChange={e => setCourseEvalForm({...courseEvalForm, date: e.target.value})} />
              </div>
            </div>
            <BatchFilter batches={batches} value={batchFilter} onChange={changeBatch} />
            <PersonSelector persons={batchPersons} selected={selectedPersonIds} onToggle={togglePerson} onAll={() => setSelectedPersonIds(batchPersons.map(p => p.id))} onClear={clearPersons} />
          </div>
        )}

        {/* Certificate Settings */}
        {activeType === 'certificate' && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-5 shadow-sm">
            <p className="font-bold text-orange-950 text-sm mb-4">ตั้งค่าใบ Certificate</p>

            {/* ประเภท Certificate */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-400 mb-2">ประเภทใบ Certificate</label>
              <div className="flex gap-3 flex-wrap">
                {[
                  { value: 'entered', label: 'ได้เข้าร่วมโครงการ' },
                  { value: 'passed', label: 'ได้ผ่านโครงการ' },
                ].map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
                      certForm.certType === opt.value
                        ? 'border-orange-400 bg-orange-50 text-orange-700 font-bold'
                        : 'border-gray-200 text-gray-500 hover:border-orange-200'
                    }`}>
                    <input type="radio" name="certType" value={opt.value}
                      checked={certForm.certType === opt.value}
                      onChange={() => setCertForm({...certForm, certType: opt.value})}
                      className="hidden" />
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${certForm.certType === opt.value ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อโครงการ (หลัก)</label>
                <input className={inputCls} value={certForm.courseName} onChange={e => setCertForm({...certForm, courseName: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อหลักสูตร (ย่อย)</label>
                <input className={inputCls} placeholder="เช่น เจ้าหน้าที่ประจำสำนักงาน" value={certForm.courseSub} onChange={e => setCertForm({...certForm, courseSub: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">รุ่นที่</label>
                <input className={inputCls} placeholder="เช่น 12" value={certForm.batch} onChange={e => setCertForm({...certForm, batch: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">ปี (พ.ศ.)</label>
                <input className={inputCls} placeholder="เช่น 2568" value={certForm.year} onChange={e => setCertForm({...certForm, year: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">วันที่เริ่มอบรม</label>
                <input className={inputCls} placeholder="เช่น ๑ พฤษภาคม พ.ศ. ๒๕๖๘" value={certForm.startDate} onChange={e => setCertForm({...certForm, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">วันที่สิ้นสุด</label>
                <input className={inputCls} placeholder="เช่น ๓๐ ตุลาคม พ.ศ. ๒๕๖๘" value={certForm.endDate} onChange={e => setCertForm({...certForm, endDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">รวมระยะเวลา</label>
                <input className={inputCls} placeholder="เช่น ๖ เดือน" value={certForm.duration} onChange={e => setCertForm({...certForm, duration: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อผู้ลงนาม</label>
                <input className={inputCls} value={certForm.signName} onChange={e => setCertForm({...certForm, signName: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">ตำแหน่งผู้ลงนาม</label>
                <input className={inputCls} value={certForm.signTitle} onChange={e => setCertForm({...certForm, signTitle: e.target.value})} />
              </div>
            </div>
            <PersonSelector persons={persons} selected={selectedPersonIds} onToggle={togglePerson} onAll={selectAllPersons} onClear={clearPersons} />
          </div>
        )}

        {/* Company Report Settings */}
        {activeType === 'company' && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-5 shadow-sm">
            <p className="font-bold text-orange-950 text-sm mb-4">ตั้งค่ารายงานส่งบริษัท</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">รุ่นที่</label>
                <input className={inputCls} placeholder="เช่น 12" value={companyForm.batch} onChange={e => setCompanyForm({...companyForm, batch: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">ปี (พ.ศ.)</label>
                <input className={inputCls} placeholder="เช่น 2568" value={companyForm.year} onChange={e => setCompanyForm({...companyForm, year: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">วันที่เริ่มอบรม</label>
                <input className={inputCls} placeholder="เช่น 1 มกราคม 2568" value={companyForm.startDate} onChange={e => setCompanyForm({...companyForm, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">วันที่สิ้นสุด</label>
                <input className={inputCls} placeholder="เช่น 31 มกราคม 2568" value={companyForm.endDate} onChange={e => setCompanyForm({...companyForm, endDate: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อหลักสูตร</label>
                <input className={inputCls} value={companyForm.courseName} onChange={e => setCompanyForm({...companyForm, courseName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">งบประมาณรวม (บาท)</label>
                <input className={inputCls} type="number" value={companyForm.totalBudget} onChange={e => setCompanyForm({...companyForm, totalBudget: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">หมายเหตุ</label>
                <input className={inputCls} value={companyForm.note} onChange={e => setCompanyForm({...companyForm, note: e.target.value})} />
              </div>
            </div>
            {/* บริษัทที่เลือก */}
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-400 mb-2">บริษัทสนับสนุน (เลือกได้หลายบริษัท)</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {orgs.map(o => (
                  <button key={o.id}
                    onClick={() => toggleOrg(o.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                      selectedOrgIds.includes(o.id)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}>
                    {o.orgName}
                  </button>
                ))}
              </div>
            </div>
            <PersonSelector persons={persons} selected={selectedPersonIds} onToggle={togglePerson} onAll={selectAllPersons} onClear={clearPersons} />
          </div>
        )}

        {/* Person selector for list/behavior — พร้อม batch filter */}
        {(activeType === 'list' || activeType === 'behavior') && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-5 shadow-sm">
            <BatchFilter batches={batches} value={batchFilter} onChange={changeBatch} />
            <PersonSelector persons={batchPersons} selected={selectedPersonIds} onToggle={togglePerson} onAll={() => setSelectedPersonIds(batchPersons.map(p => p.id))} onClear={clearPersons} />
          </div>
        )}
      </div>

      {/* ─── PRINT AREA ─── */}
      <div className="print-area bg-white rounded-2xl border border-orange-100 overflow-hidden">

        {/* Report 1: รายชื่อคนพิการ */}
        {activeType === 'list' && (
          <div>
            <div className="px-6 py-4 border-b border-orange-100 no-print">
              <p className="font-bold text-orange-950">ตัวอย่างรายงาน: รายชื่อคนพิการ ({filteredPersons.length} คน)</p>
            </div>
            <div className="p-6 print-page">
              <div className="text-center mb-4">
                <p className="text-base font-bold">รายชื่อคนพิการ</p>
                <p className="text-sm text-gray-500">โครงการฝึกอบรม-ฝึกงานคนพิการ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">#</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">ชื่อ-นามสกุล</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-10">ชื่อเล่น</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">อายุ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">วัน/เดือน/ปีเกิด</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-28">เลขบัตร</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">ความพิการ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-16">จังหวัด</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">เบอร์โทร</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((p, i) => {
                    const age = calcAge(p.birthDate);
                    const disType = p.disabilityInfos?.map(d => d.disabilityType?.typeName).join(', ') || '—';
                    return (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 px-2 py-1">{p.fullName}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">—</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{age ?? '—'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{fmtDate(p.birthDate)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center font-mono">{p.thaiId || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1">{disType}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{p.province || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{p.mobile || p.phone || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-4 text-right">พิมพ์วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* Report: แบบประเมินรายวิชา */}
        {activeType === 'course_eval' && (
          <div>
            <div className="px-6 py-4 border-b border-orange-100 no-print">
              <p className="font-bold text-orange-950">ตัวอย่างรายงาน: แบบประเมินรายวิชา ({filteredPersons.length} คน)</p>
            </div>
            <div className="p-6 print-page">
              {/* Header */}
              <div className="text-center mb-4">
                <p className="text-sm font-bold">แบบบันทึกพฤติกรรมการปฏิบัติงานรายบุคคล</p>
                <p className="text-xs text-gray-600">โครงการฝึกอบรม-ฝึกงาน เพื่อเตรียมความพร้อมเข้าสู่สถานประกอบการ</p>
                <p className="text-xs text-gray-600">หลักสูตร "เจ้าหน้าที่ที่ประจำสำนักงาน"</p>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span>รายวิชา <span className="font-bold underline">{courseEvalForm.subject || '..............................................................................................'}</span></span>
                <span>วันที่ <span className="font-bold underline">{courseEvalForm.date || '.............................'}</span></span>
              </div>
              {courseEvalForm.teacher && (
                <p className="text-xs mb-3">อาจารย์ผู้สอน <span className="font-bold">{courseEvalForm.teacher}</span></p>
              )}
              <p className="text-xs text-gray-500 mb-1">คำชี้แจง: โปรดระบุคะแนน 1-5 องค์ประกอบตรงกับพฤติกรรมที่เห็นจริง สามารถปรับเปลี่ยนตัวชี้ตัวเลขได้ เช่น "ขั้นงาน" ไม่มีการทำ "ขั้นนำเสนอ" ที่นั่งเรียน สามารถปรับรายละเอียดให้สอดคล้องกับเนื้อหาวิชาและการเรียนการสอน</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-2 text-center w-8">#</th>
                    <th className="border border-gray-300 px-1 py-2 text-center w-14">รูป</th>
                    <th className="border border-gray-300 px-2 py-2 text-left min-w-28">ชื่อ - สกุล</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-14">ความตั้งใจ/<br/>ความสนใจ</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-14">การตอบคำถาม/<br/>แสดงความคิดเห็น</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-14">การทำงาน<br/>ร่วมกับผู้อื่น/<br/>มีส่วนร่วม</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-14">ตรงต่อเวลา/<br/>ส่งงานครบ<br/>มอบหมาย</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-14">ขึ้น/<br/>ผลงาน</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-14">รวม<br/>(25 คะแนน)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((p, i) => (
                    <tr key={p.id} className="h-14">
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle">{i + 1}</td>
                      <td className="border border-gray-300 px-1 py-1 text-center align-middle">
                        {p.photos?.[0]?.filePath
                          ? <img src={p.photos[0].filePath} alt={p.fullName}
                              className="w-10 h-12 object-cover rounded mx-auto"
                              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                          : <div className="w-10 h-12 bg-gray-100 border border-gray-200 rounded mx-auto flex items-center justify-center text-gray-300 text-[8px]">ไม่มีรูป</div>
                        }
                      </td>
                      <td className="border border-gray-300 px-2 py-1 align-middle font-medium">{p.fullName}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle"></td>
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle"></td>
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle"></td>
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle"></td>
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle"></td>
                      <td className="border border-gray-300 px-2 py-1 text-center align-middle"></td>
                    </tr>
                  ))}
                  {filteredPersons.length === 0 && (
                    <tr><td colSpan={9} className="border border-gray-300 px-2 py-6 text-center text-gray-400">กรุณาเลือกรายชื่อ</td></tr>
                  )}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-4 text-right">พิมพ์วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* Report 2: แบบสังเกตพฤติกรรมรายบุคคล */}
        {activeType === 'behavior' && (
          <div>
            <div className="px-6 py-4 border-b border-orange-100 no-print">
              <p className="font-bold text-orange-950">ตัวอย่างรายงาน: แบบสังเกตพฤติกรรมรายบุคคล ({filteredPersons.length} คน)</p>
            </div>
            <div className="p-6 print-page">
              <div className="text-center mb-4">
                <p className="text-base font-bold">แบบบันทึกพฤติกรรมการปฏิบัติงานรายบุคคล</p>
                <p className="text-sm text-gray-600">โครงการฝึกอบรม-ฝึกงาน เพื่อเตรียมความพร้อมเข้าสู่สถานประกอบการ</p>
                <p className="text-sm text-gray-600">หลักสูตร "เจ้าหน้าที่ที่ประจำสำนักงาน"</p>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">#</th>
                    <th className="border border-gray-300 px-1 py-1.5 text-center w-14">รูป</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">ชื่อ - สกุล</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-10">ชื่อเล่น</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">อายุ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">ประเภทความพิการ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">วุฒิการศึกษา</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">ทักษะด้านคอมพิวเตอร์</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">สาเหตุความพิการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((p, i) => {
                    const age = calcAge(p.birthDate);
                    const disType = p.disabilityInfos?.map(d => d.disabilityType?.typeName).join(', ') || '—';
                    const computerSkills = p.skills?.filter(s =>
                      s.skillName.toLowerCase().includes('computer') ||
                      s.skillName.includes('คอมพิวเตอร์') ||
                      s.skillName.includes('word') ||
                      s.skillName.includes('excel')
                    ).map(s => s.skillName).join(', ') || '—';
                    return (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-2 py-2 text-center align-middle">{i + 1}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">
                          {p.photos?.[0]?.filePath
                            ? <img src={p.photos[0].filePath} alt={p.fullName} className="w-10 h-12 object-cover rounded mx-auto" />
                            : <div className="w-10 h-12 bg-gray-100 border border-gray-200 rounded mx-auto flex items-center justify-center text-gray-300 text-[9px]">ไม่มีรูป</div>
                          }
                        </td>
                        <td className="border border-gray-300 px-2 py-2 align-middle">{p.fullName}</td>
                        <td className="border border-gray-300 px-2 py-2 text-center align-middle">—</td>
                        <td className="border border-gray-300 px-2 py-2 text-center align-middle">{age ?? '—'}</td>
                        <td className="border border-gray-300 px-2 py-2 align-middle">{disType}</td>
                        <td className="border border-gray-300 px-2 py-2 align-middle">{p.educationLevel || '—'}</td>
                        <td className="border border-gray-300 px-2 py-2 align-middle">{computerSkills}</td>
                        <td className="border border-gray-300 px-2 py-2 align-middle"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-4 text-right">พิมพ์วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* Report 3: Certificate */}
        {activeType === 'certificate' && (
          <div>
            <div className="px-6 py-4 border-b border-orange-100 no-print">
              <p className="font-bold text-orange-950">ตัวอย่างรายงาน: ใบ Certificate ({filteredPersons.length} ใบ)</p>
              <p className="text-xs text-gray-400 mt-0.5">จะพิมพ์แยกใบ 1 ใบต่อ 1 คน</p>
            </div>
            <div className="divide-y divide-dashed divide-gray-300">
              {filteredPersons.map((p, i) => (
                <div key={p.id} className={`p-8 print-page ${i > 0 ? 'page-break' : ''}`}>
                  <CertificateTemplate person={p} certForm={certForm} />
                </div>
              ))}
              {filteredPersons.length === 0 && (
                <div className="p-8 text-center text-gray-400">กรุณาเลือกผู้เข้ารับใบ Certificate</div>
              )}
            </div>
          </div>
        )}

        {/* Report 4: รายงานส่งบริษัท */}
        {activeType === 'company' && (
          <div>
            <div className="px-6 py-4 border-b border-orange-100 no-print">
              <p className="font-bold text-orange-950">ตัวอย่างรายงาน: รายงานส่งผลการดำเนินงานให้กับบริษัท</p>
            </div>
            <div className="p-8 print-page">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="flex justify-center items-center gap-4 mb-3">
                  <img src="/logo.jpg" alt="KMUTT" className="h-14 object-contain" onError={e => { e.target.style.display='none'; }} />
                </div>
                <p className="text-base font-bold">รายงานส่งผลการดำเนินงาน</p>
                <p className="text-sm font-semibold">โครงการฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อมเข้าสู่สถานประกอบการ</p>
                {companyForm.batch && <p className="text-sm">รุ่นที่ {companyForm.batch} ประจำปี {companyForm.year || '—'}</p>}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="border rounded-lg p-3">
                  <p className="font-bold text-gray-600 mb-1">ข้อมูลการอบรม</p>
                  <p>หลักสูตร: {companyForm.courseName || '—'}</p>
                  <p>ระยะเวลา: {companyForm.startDate || '—'} ถึง {companyForm.endDate || '—'}</p>
                  <p>จำนวนผู้เข้าร่วม: {filteredPersons.length} คน</p>
                  {companyForm.totalBudget && <p>งบประมาณ: {Number(companyForm.totalBudget).toLocaleString()} บาท</p>}
                </div>
                <div className="border rounded-lg p-3">
                  <p className="font-bold text-gray-600 mb-1">บริษัทสนับสนุน</p>
                  {filteredOrgs.length > 0
                    ? filteredOrgs.map((o, i) => (
                        <p key={o.id}>{i + 1}. {o.orgName}</p>
                      ))
                    : <p className="text-gray-400">—</p>
                  }
                </div>
              </div>

              {/* Person Table */}
              <p className="font-bold text-sm mb-2">รายชื่อผู้เข้าร่วมโครงการ</p>
              <table className="w-full text-xs border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">#</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">ชื่อ-นามสกุล</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">อายุ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">ประเภทความพิการ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">วุฒิการศึกษา</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">เบอร์โทร</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((p, i) => {
                    const age = calcAge(p.birthDate);
                    const disType = p.disabilityInfos?.map(d => d.disabilityType?.typeName).join(', ') || '—';
                    return (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 px-2 py-1">{p.fullName}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{age ?? '—'}</td>
                        <td className="border border-gray-300 px-2 py-1">{disType}</td>
                        <td className="border border-gray-300 px-2 py-1">{p.educationLevel || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{p.mobile || p.phone || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {companyForm.note && (
                <div className="border rounded-lg p-3 text-sm">
                  <p className="font-bold text-gray-600 mb-1">หมายเหตุ</p>
                  <p>{companyForm.note}</p>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4 text-right">พิมพ์วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          .page-break { page-break-before: always; }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function BatchFilter({ batches, value, onChange }) {
  if (!batches || batches.length === 0) return null;
  return (
    <div className="mb-4 pb-4 border-b border-orange-50">
      <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
        <Layers size={13} className="text-orange-400" /> แยกตามรุ่น (ไม่บังคับ)
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onChange('')}
          className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
            !value ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
          }`}>
          ทุกรุ่น
        </button>
        {batches.map(b => (
          <button key={b.id} onClick={() => onChange(String(b.id))}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
              value === String(b.id) ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
            }`}>
            รุ่นที่ {b.batchNumber} ปี {b.year}
          </button>
        ))}
      </div>
    </div>
  );
}

function PersonSelector({ persons, selected, onToggle, onAll, onClear }) {
  const [search, setSearch] = useState('');
  const filtered = persons.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.thaiId || '').includes(search)
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400">เลือกรายชื่อ ({selected.length === 0 ? 'ทั้งหมด' : `${selected.length} คน`})</p>
        <div className="flex gap-2">
          <button onClick={onAll} className="text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-600 font-semibold hover:bg-orange-200 transition-colors">เลือกทั้งหมด</button>
          <button onClick={onClear} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold hover:bg-gray-200 transition-colors">ล้าง</button>
        </div>
      </div>
      <input
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
        placeholder="ค้นหาชื่อ..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
        {filtered.map(p => (
          <button key={p.id}
            onClick={() => onToggle(p.id)}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
              selected.includes(p.id)
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
            }`}>
            {p.fullName}
          </button>
        ))}
      </div>
    </div>
  );
}

function CertificateTemplate({ person, certForm }) {
  const certText = certForm.certType === 'passed' ? 'ได้ผ่านโครงการ' : 'ได้เข้าร่วมโครงการ';

  return (
    <div className="max-w-2xl mx-auto text-center py-10 px-14"
      style={{ fontFamily: 'Sarabun, serif', minHeight: '500px' }}>

      {/* เว้นพื้นที่ด้านบนสำหรับปั๊มตราโลโก้เอง */}
      <div className="h-24 mb-2" />

      {/* University */}
      <p className="text-xl font-black mb-1">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
      <p className="text-sm mb-6">วุฒิบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</p>

      {/* Person name */}
      <p className="text-2xl font-black mb-3">{person.fullName}</p>

      {/* Certificate type */}
      <p className="text-base mb-3">{certText}</p>

      {/* Course name */}
      <p className="text-base font-bold mb-1">{certForm.courseName}</p>

      {/* Sub course */}
      {certForm.courseSub && (
        <p className="text-sm mb-3">หลักสูตร "{certForm.courseSub}"</p>
      )}

      {/* Batch / year */}
      {certForm.batch && (
        <p className="text-sm mb-2">รุ่นที่ {certForm.batch}{certForm.year ? ` ประจำปี พ.ศ. ${certForm.year}` : ''}</p>
      )}

      {/* Date range */}
      {(certForm.startDate || certForm.endDate) && (
        <p className="text-sm mb-1">วันที่ {certForm.startDate} ถึงวันที่ {certForm.endDate}</p>
      )}

      {/* Duration */}
      {certForm.duration && (
        <p className="text-sm mb-1">รวมระยะเวลา {certForm.duration} และมีสัมฤทธิ์ผลตามเกณฑ์ของหลักสูตร</p>
      )}

      {/* Issued date */}
      {certForm.endDate && (
        <p className="text-sm mb-8">ให้ไว้ ณ วันที่ {certForm.endDate}</p>
      )}

      {/* Signature */}
      <div className="mt-6 flex justify-center">
        <div className="text-center">
          <div className="h-12" />
          <div className="border-b border-gray-700 w-56 mb-1 mx-auto" />
          <p className="text-sm">({certForm.signName})</p>
          <p className="text-xs text-gray-600 mt-0.5">{certForm.signTitle}</p>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all';
