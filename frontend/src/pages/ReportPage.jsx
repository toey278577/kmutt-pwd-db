import { useEffect, useRef, useState } from 'react';
import { Printer, FileText, Award, Building2, Users, ChevronDown, X } from 'lucide-react';
import { getPersons, getTraining, getOrganizations } from '../api';

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
  { id: 'certificate', label: 'ใบ Certificate', icon: Award, desc: 'ใบรับรองผลการอบรม มจธ.' },
  { id: 'company', label: 'รายงานส่งบริษัท', icon: Building2, desc: 'รายงานผลการดำเนินงาน' },
];

export default function ReportPage() {
  const [activeType, setActiveType] = useState('list');
  const [persons, setPersons] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Certificate settings
  const [certForm, setCertForm] = useState({
    courseName: 'โครงการฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อมเข้าสู่สถานประกอบการ',
    batch: '',
    startDate: '',
    endDate: '',
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
    Promise.all([getPersons(), getOrganizations()])
      .then(([pRes, oRes]) => {
        setPersons(pRes.data);
        setOrgs(oRes.data);
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

  const filteredPersons = selectedPersonIds.length > 0
    ? persons.filter(p => selectedPersonIds.includes(p.id))
    : persons;

  const filteredOrgs = selectedOrgIds.length > 0
    ? orgs.filter(o => selectedOrgIds.includes(o.id))
    : orgs;

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5 rounded-2xl overflow-hidden relative shadow-md border border-orange-100"
        style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
        <div className="relative px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
              <Printer size={20} color="white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-orange-950">ออกรายงาน / Report</h1>
              <p className="text-xs text-orange-400 font-semibold mt-0.5">เลือกประเภทรายงานแล้วกด พิมพ์ / บันทึก PDF</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
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
        {/* Certificate Settings */}
        {activeType === 'certificate' && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-5 shadow-sm">
            <p className="font-bold text-orange-950 text-sm mb-4">ตั้งค่าใบ Certificate</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อหลักสูตร</label>
                <input className={inputCls} value={certForm.courseName} onChange={e => setCertForm({...certForm, courseName: e.target.value})} />
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
                <input className={inputCls} placeholder="เช่น 1 มกราคม" value={certForm.startDate} onChange={e => setCertForm({...certForm, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">วันที่สิ้นสุด</label>
                <input className={inputCls} placeholder="เช่น 31 มกราคม 2568" value={certForm.endDate} onChange={e => setCertForm({...certForm, endDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">ชื่อผู้ลงนาม</label>
                <input className={inputCls} value={certForm.signName} onChange={e => setCertForm({...certForm, signName: e.target.value})} />
              </div>
              <div>
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

        {/* Person selector for list/behavior */}
        {(activeType === 'list' || activeType === 'behavior') && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-5 shadow-sm">
            <PersonSelector persons={persons} selected={selectedPersonIds} onToggle={togglePerson} onAll={selectAllPersons} onClear={clearPersons} />
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
                    <th className="border border-gray-300 px-2 py-1.5 text-center">สายตาความพิการ</th>
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
                          <div className="w-10 h-12 bg-gray-100 border border-gray-200 rounded mx-auto flex items-center justify-center text-gray-300 text-xs">รูป</div>
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
          .print-area { border: none !important; box-shadow: none !important; }
          .page-break { page-break-before: always; }
          body { background: white !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
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
  return (
    <div className="max-w-2xl mx-auto border-4 border-double border-gray-800 p-8 text-center font-serif"
      style={{ minHeight: '400px' }}>
      <div className="flex justify-center items-center gap-6 mb-4">
        <img src="/logo.jpg" alt="KMUTT" className="h-16 object-contain" onError={e => { e.target.style.display='none'; }} />
      </div>
      <p className="text-lg font-bold mb-1">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
      <p className="text-sm mb-4">วุฒิบัตรนี้ให้ไว้เพื่อแสดงว่า</p>

      <div className="border-b-2 border-gray-800 mx-16 mb-2" />
      <p className="text-xl font-bold mb-1">{person.fullName}</p>
      <p className="text-sm mb-4">ได้สำเร็จการอบรม/ฝึกงาน</p>

      <p className="text-sm font-semibold mb-1">
        {certForm.courseName}
      </p>
      {certForm.batch && (
        <p className="text-sm mb-1">หลักสูตร "เจ้าหน้าที่ที่ประจำสำนักงาน" รุ่นที่ {certForm.batch} ประจำปี {certForm.year || ''}</p>
      )}
      {(certForm.startDate || certForm.endDate) && (
        <p className="text-sm mb-4">
          ในวันที่ {certForm.startDate} ถึงวันที่ {certForm.endDate}
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <div className="text-center">
          <div className="border-b border-gray-600 w-48 mb-1 mx-auto" />
          <p className="text-sm font-semibold">({certForm.signName})</p>
          <p className="text-xs text-gray-600">{certForm.signTitle}</p>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all';
