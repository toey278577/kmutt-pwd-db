import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GraduationCap, Briefcase, Star, Target, ChevronDown, Building2 } from 'lucide-react';
import {
  getPerson, getTraining, createTraining, deleteTraining,
  getWorkExp, createWorkExp, deleteWorkExp,
  getFollowUp, createFollowUp, deleteFollowUp,
  getSkills, createSkill, deleteSkill,
  getPersonOrgs, createPersonOrg, deletePersonOrg,
  getOrganizations,
} from '../api';
import { useAuth } from '../context/AuthContext';

const GENDER_LABELS = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' };
const MARITAL_LABELS = { SINGLE: 'โสด', MARRIED: 'สมรส', OTHER: 'อื่นๆ' };
const EMP_BADGE = { EMPLOYED: 'badge-success', UNEMPLOYED: 'badge-ghost', STUDYING: 'badge-info' };
const EMP_LABELS = { EMPLOYED: 'มีงานทำ', UNEMPLOYED: 'ว่างงาน', STUDYING: 'ศึกษาต่อ' };
const SKILL_COLOR = {
  BEGINNER: 'text-amber-500 bg-amber-50 border-amber-200',
  INTERMEDIATE: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  ADVANCED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};
const ROLE_TYPE_LABELS = { INTERNSHIP: 'ฝึกงาน', EMPLOYMENT: 'จ้างงาน', OTHER: 'อื่นๆ' };

const tabs = ['ข้อมูลพื้นฐาน', 'การอบรม', 'ประสบการณ์งาน', 'ทักษะ', 'ติดตามผล', 'สถานประกอบการ'];

function calcAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const modalRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [person, setPerson] = useState(null);
  const [training, setTraining] = useState([]);
  const [workexp, setWorkexp] = useState([]);
  const [followup, setFollowup] = useState([]);
  const [skills, setSkills] = useState([]);
  const [personOrgs, setPersonOrgs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [dialogType, setDialogType] = useState('');
  const [form, setForm] = useState({});

  const reloadAll = () => {
    getPerson(id).then((r) => setPerson(r.data));
    getTraining(id).then((r) => setTraining(r.data));
    getWorkExp(id).then((r) => setWorkexp(r.data));
    getFollowUp(id).then((r) => setFollowup(r.data));
    getSkills(id).then((r) => setSkills(r.data));
    getPersonOrgs(id).then((r) => setPersonOrgs(r.data));
    getOrganizations().then((r) => setOrgs(r.data));
  };

  useEffect(() => { reloadAll(); }, [id]);

  const openDialog = (type) => { setForm({}); setDialogType(type); modalRef.current?.showModal(); };

  const handleSave = async () => {
    if (dialogType === 'training' && !form.courseName?.trim())
      return alert('กรุณากรอกชื่อหลักสูตร');
    if (dialogType === 'workexp' && !form.organizationName?.trim())
      return alert('กรุณากรอกชื่อองค์กร');
    if (dialogType === 'workexp' && !form.workMode)
      return alert('กรุณาเลือกรูปแบบงาน');
    if (dialogType === 'followup' && !form.followUpDate)
      return alert('กรุณากรอกวันที่ติดตาม');
    if (dialogType === 'followup' && !form.employmentStatus)
      return alert('กรุณาเลือกสถานะงาน');
    if (dialogType === 'skill' && !form.skillName?.trim())
      return alert('กรุณากรอกชื่อทักษะ');
    if (dialogType === 'skill' && !form.skillLevel)
      return alert('กรุณาเลือกระดับทักษะ');
    if (dialogType === 'personorg' && !form.orgId)
      return alert('กรุณาเลือกสถานประกอบการ');
    if (dialogType === 'personorg' && !form.roleType)
      return alert('กรุณาเลือกบทบาท');
    try {
      if (dialogType === 'training') { await createTraining(id, form); getTraining(id).then((r) => setTraining(r.data)); }
      else if (dialogType === 'workexp') { await createWorkExp(id, form); getWorkExp(id).then((r) => setWorkexp(r.data)); }
      else if (dialogType === 'followup') { await createFollowUp(id, form); getFollowUp(id).then((r) => setFollowup(r.data)); }
      else if (dialogType === 'skill') { await createSkill(id, form); getSkills(id).then((r) => setSkills(r.data)); }
      else if (dialogType === 'personorg') { await createPersonOrg(id, form); getPersonOrgs(id).then((r) => setPersonOrgs(r.data)); }
      modalRef.current?.close();
    } catch (err) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  if (!person) return <div className="flex items-center justify-center h-96"><span className="loading loading-spinner loading-lg text-primary" /></div>;

  const age = calcAge(person.birthDate);

  return (
    <div>
      <button className="btn btn-ghost btn-sm gap-1 mb-4 text-gray-500" onClick={() => navigate('/persons')}>
        <ArrowLeft size={15} /> กลับ
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl text-white text-lg font-black flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
          {person.fullName?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-orange-950">{person.fullName}</h1>
          <p className="text-sm text-gray-400">
            {GENDER_LABELS[person.gender]} · {person.province || 'ไม่ระบุจังหวัด'}
            {age !== null && <> · <span className="font-semibold text-orange-600">{age} ปี</span></>}
          </p>
        </div>
        <span className={`badge badge-lg font-semibold ${person.lifeStatus === 'ALIVE' ? 'badge-success' : 'badge-ghost'}`}>
          {person.lifeStatus === 'ALIVE' ? 'มีชีวิต' : 'เสียชีวิต'}
        </span>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered bg-white rounded-2xl shadow-sm border border-orange-100 px-4 mb-5 flex-wrap">
        {tabs.map((t, i) => (
          <button key={i} role="tab"
            className={`tab text-sm font-semibold py-4 ${tab === i ? 'tab-active text-orange-600' : 'text-gray-400'}`}
            onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Info */}
      {tab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoCard title="ข้อมูลส่วนตัว" items={[
            ['เลขบัตรประชาชน', person.thaiId],
            ['เพศ', GENDER_LABELS[person.gender]],
            ['วันเกิด', person.birthDate ? `${person.birthDate.slice(0, 10)} (${age} ปี)` : null],
            ['สัญชาติ', person.nationality],
            ['ศาสนา', person.religion],
            ['สถานภาพ', MARITAL_LABELS[person.maritalStatus]],
            ['ระดับการศึกษา', person.educationLevel],
          ]} />
          <InfoCard title="ข้อมูลติดต่อ" items={[
            ['เบอร์โทร', person.phone],
            ['Email', person.email],
            ['จังหวัด', person.province],
            ['ที่อยู่', person.address],
          ]} />
          {person.disabilityInfos?.length > 0 && (
            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
              <p className="font-bold text-orange-950 text-sm mb-3">ข้อมูลความพิการ</p>
              <div className="grid grid-cols-2 gap-3">
                {person.disabilityInfos.map((d) => (
                  <div key={d.id} className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                    <span className="badge badge-sm bg-orange-100 text-orange-700 font-semibold border-0 mb-2">
                      {d.disabilityType?.typeName}
                    </span>
                    <p className="text-xs text-gray-600">ระดับ: {d.disabilityLevel || '—'}</p>
                    {d.assistiveDevice && <p className="text-xs text-gray-600">อุปกรณ์: {d.assistiveDevice}</p>}
                    {d.workLimitation && <p className="text-xs text-gray-600">ข้อจำกัดงาน: {d.workLimitation}</p>}
                    {d.accommodationNeed && <p className="text-xs text-gray-600">ความต้องการ: {d.accommodationNeed}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Training */}
      {tab === 1 && (
        <SubSection title="ประวัติการอบรม" icon={<GraduationCap size={16} />} onAdd={canEdit ? () => openDialog('training') : null}>
          <table className="table table-zebra w-full text-sm">
            <thead><tr className="bg-orange-50 text-orange-600 text-xs uppercase">
              <th>หลักสูตร</th><th>หน่วยงาน</th><th>ช่วงเวลา</th><th>รูปแบบ</th><th>ทักษะที่ได้</th><th>ผลประเมิน</th>{canEdit && <th></th>}
            </tr></thead>
            <tbody>
              {training.map((t) => (
                <tr key={t.id} className="hover:bg-orange-50/40">
                  <td className="font-semibold text-orange-950">{t.courseName}</td>
                  <td className="text-gray-500">{t.organizer || '—'}</td>
                  <td className="text-gray-500 text-xs">{t.startDate?.slice(0,10)} – {t.endDate?.slice(0,10) || '—'}</td>
                  <td>{t.trainingType && <span className="badge badge-sm bg-orange-100 text-orange-700 border-0">{t.trainingType}</span>}</td>
                  <td className="text-gray-600 max-w-xs truncate">{t.skillsGained || '—'}</td>
                  <td className="text-gray-600">{t.evaluationResult || '—'}</td>
                  {canEdit && <td><DelBtn onClick={() => deleteTraining(id, t.id).then(() => getTraining(id).then(r => setTraining(r.data)))} /></td>}
                </tr>
              ))}
              {training.length === 0 && <EmptyRow cols={canEdit ? 7 : 6} />}
            </tbody>
          </table>
        </SubSection>
      )}

      {/* Tab 2: Work */}
      {tab === 2 && (
        <SubSection title="ประสบการณ์ทำงาน" icon={<Briefcase size={16} />} onAdd={canEdit ? () => openDialog('workexp') : null}>
          <table className="table table-zebra w-full text-sm">
            <thead><tr className="bg-orange-50 text-orange-600 text-xs uppercase">
              <th>องค์กร</th><th>ประเภทงาน</th><th>รูปแบบ</th><th>รายได้</th><th>ช่วงเวลา</th><th>ผลลัพธ์</th>{canEdit && <th></th>}
            </tr></thead>
            <tbody>
              {workexp.map((w) => (
                <tr key={w.id} className="hover:bg-orange-50/40">
                  <td className="font-semibold text-orange-950">{w.organizationName}</td>
                  <td className="text-gray-500">{w.jobType || '—'}</td>
                  <td>{w.workMode && <span className="badge badge-sm bg-emerald-100 text-emerald-700 border-0">{w.workMode === 'INTERNSHIP' ? 'ฝึกงาน' : w.workMode === 'EMPLOYMENT' ? 'จ้างงาน' : 'Freelance'}</span>}</td>
                  <td className="font-medium text-gray-700">{w.income ? `฿${Number(w.income).toLocaleString()}` : '—'}</td>
                  <td className="text-gray-500 text-xs">{w.startDate?.slice(0,10)} – {w.endDate?.slice(0,10) || 'ปัจจุบัน'}</td>
                  <td className="text-gray-600 max-w-xs truncate">{w.outcome || '—'}</td>
                  {canEdit && <td><DelBtn onClick={() => deleteWorkExp(id, w.id).then(() => getWorkExp(id).then(r => setWorkexp(r.data)))} /></td>}
                </tr>
              ))}
              {workexp.length === 0 && <EmptyRow cols={canEdit ? 7 : 6} />}
            </tbody>
          </table>
        </SubSection>
      )}

      {/* Tab 3: Skills */}
      {tab === 3 && (
        <SubSection title="ทักษะ" icon={<Star size={16} />} onAdd={canEdit ? () => openDialog('skill') : null}>
          {skills.length === 0
            ? <p className="text-center py-8 text-gray-400 text-sm">ยังไม่มีทักษะ</p>
            : <div className="flex flex-wrap gap-2 p-4">
                {skills.map((s) => (
                  <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${SKILL_COLOR[s.skillLevel] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    <span>{s.skillName}</span>
                    <span className="text-xs opacity-60">({s.skillLevel === 'BEGINNER' ? 'เริ่มต้น' : s.skillLevel === 'INTERMEDIATE' ? 'ปานกลาง' : 'เชี่ยวชาญ'})</span>
                    {canEdit && (
                      <button className="hover:text-red-500 transition-colors ml-1" onClick={() => deleteSkill(id, s.id).then(() => getSkills(id).then(r => setSkills(r.data)))}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
          }
        </SubSection>
      )}

      {/* Tab 4: FollowUp */}
      {tab === 4 && (
        <SubSection title="ติดตามผล" icon={<Target size={16} />} onAdd={canEdit ? () => openDialog('followup') : null}>
          <table className="table table-zebra w-full text-sm">
            <thead><tr className="bg-orange-50 text-orange-600 text-xs uppercase">
              <th>วันที่</th><th>สถานะงาน</th><th>ประเภทงาน</th><th>รายได้</th><th>ทักษะตรง</th><th>ความพึงพอใจ</th><th>ปัญหา</th>{canEdit && <th></th>}
            </tr></thead>
            <tbody>
              {followup.map((f) => (
                <tr key={f.id} className="hover:bg-orange-50/40">
                  <td className="text-orange-600 font-semibold text-xs">{f.followUpDate?.slice(0,10)}</td>
                  <td><span className={`badge badge-sm font-semibold ${EMP_BADGE[f.employmentStatus]}`}>{EMP_LABELS[f.employmentStatus]}</span></td>
                  <td className="text-gray-500">{f.jobType || '—'}</td>
                  <td className="font-medium text-gray-700">{f.income ? `฿${Number(f.income).toLocaleString()}` : '—'}</td>
                  <td>
                    {f.skillMatch === 'MATCH' && <span className="badge badge-sm badge-success font-semibold">ตรง</span>}
                    {f.skillMatch === 'NOT_MATCH' && <span className="badge badge-sm badge-error font-semibold">ไม่ตรง</span>}
                    {!f.skillMatch && '—'}
                  </td>
                  <td className="text-gray-600 text-xs">{f.satisfaction || '—'}</td>
                  <td className="text-gray-600 text-xs max-w-xs truncate">{f.issues || '—'}</td>
                  {canEdit && <td><DelBtn onClick={() => deleteFollowUp(id, f.id).then(() => getFollowUp(id).then(r => setFollowup(r.data)))} /></td>}
                </tr>
              ))}
              {followup.length === 0 && <EmptyRow cols={canEdit ? 8 : 7} />}
            </tbody>
          </table>
        </SubSection>
      )}

      {/* Tab 5: PersonOrg */}
      {tab === 5 && (
        <SubSection title="สถานประกอบการที่เกี่ยวข้อง" icon={<Building2 size={16} />} onAdd={canEdit ? () => openDialog('personorg') : null}>
          <table className="table table-zebra w-full text-sm">
            <thead><tr className="bg-orange-50 text-orange-600 text-xs uppercase">
              <th>สถานประกอบการ</th><th>บทบาท</th><th>ช่วงเวลา</th><th>เงินสนับสนุน</th><th>รายละเอียด</th>{canEdit && <th></th>}
            </tr></thead>
            <tbody>
              {personOrgs.map((po) => (
                <tr key={po.id} className="hover:bg-orange-50/40">
                  <td className="font-semibold text-orange-950">{po.organization?.orgName}</td>
                  <td><span className="badge badge-sm bg-orange-100 text-orange-700 border-0">{ROLE_TYPE_LABELS[po.roleType] || po.roleType}</span></td>
                  <td className="text-gray-500 text-xs">{po.startDate?.slice(0,10)} – {po.endDate?.slice(0,10) || '—'}</td>
                  <td className="font-medium text-gray-700">{po.amount ? `฿${Number(po.amount).toLocaleString()}` : '—'}</td>
                  <td className="text-gray-600 text-xs max-w-xs truncate">{po.supportDetail || '—'}</td>
                  {canEdit && <td><DelBtn onClick={() => deletePersonOrg(id, po.id).then(() => getPersonOrgs(id).then(r => setPersonOrgs(r.data)))} /></td>}
                </tr>
              ))}
              {personOrgs.length === 0 && <EmptyRow cols={canEdit ? 6 : 5} />}
            </tbody>
          </table>
        </SubSection>
      )}

      {/* Modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-lg p-0 overflow-hidden bg-white shadow-2xl">
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#431407 0%,#c2410c 100%)' }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {dialogType === 'training' && <GraduationCap size={20} color="#fff" />}
              {dialogType === 'workexp' && <Briefcase size={20} color="#fff" />}
              {dialogType === 'followup' && <Target size={20} color="#fff" />}
              {dialogType === 'skill' && <Star size={20} color="#fff" />}
              {dialogType === 'personorg' && <Building2 size={20} color="#fff" />}
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">
                {dialogType === 'training' && 'เพิ่มการอบรม'}
                {dialogType === 'workexp' && 'เพิ่มประสบการณ์งาน'}
                {dialogType === 'followup' && 'บันทึกติดตามผล'}
                {dialogType === 'skill' && 'เพิ่มทักษะ'}
                {dialogType === 'personorg' && 'เชื่อมสถานประกอบการ'}
              </h3>
              <p className="text-orange-300/80 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบถ้วน</p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            {dialogType === 'training' && <>
              <F12 label="ชื่อหลักสูตร *" value={form.courseName} onChange={v => setForm({...form, courseName: v})} />
              <F12 label="หน่วยงาน" value={form.organizer} onChange={v => setForm({...form, organizer: v})} />
              <F label="วันเริ่ม" type="date" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
              <F label="วันสิ้นสุด" type="date" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
              <Sel label="รูปแบบ" value={form.trainingType} onChange={v => setForm({...form, trainingType: v})}
                options={[['','— เลือกรูปแบบ —'],['TRAIN','อบรม (Train)'],['LEARN','เรียนรู้ (Learn)'],['EARN','ฝึกงาน (Earn)']]} />
              <F label="ผลประเมิน" value={form.evaluationResult} onChange={v => setForm({...form, evaluationResult: v})} />
              <F12 label="ทักษะที่ได้รับ" value={form.skillsGained} onChange={v => setForm({...form, skillsGained: v})} />
            </>}

            {dialogType === 'workexp' && <>
              <F12 label="ชื่อองค์กร *" value={form.organizationName} onChange={v => setForm({...form, organizationName: v})} />
              <F label="ประเภทงาน" value={form.jobType} onChange={v => setForm({...form, jobType: v})} />
              <Sel label="รูปแบบงาน" value={form.workMode} onChange={v => setForm({...form, workMode: v})}
                options={[['','— เลือกรูปแบบ —'],['INTERNSHIP','ฝึกงาน'],['EMPLOYMENT','จ้างงาน'],['FREELANCE','Freelance']]} />
              <F label="รายได้ (บาท)" type="number" value={form.income} onChange={v => setForm({...form, income: v})} />
              <F label="วันเริ่ม" type="date" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
              <F label="วันสิ้นสุด" type="date" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
              <F12 label="ผลลัพธ์ / ความสำเร็จ" value={form.outcome} onChange={v => setForm({...form, outcome: v})} />
            </>}

            {dialogType === 'followup' && <>
              <F12 label="วันที่ติดตาม *" type="date" value={form.followUpDate} onChange={v => setForm({...form, followUpDate: v})} />
              <Sel12 label="สถานะงาน *" value={form.employmentStatus} onChange={v => setForm({...form, employmentStatus: v})}
                options={[['','— เลือกสถานะ —'],['EMPLOYED','มีงานทำ'],['UNEMPLOYED','ว่างงาน'],['STUDYING','ศึกษาต่อ']]} />
              <F label="ประเภทงาน" value={form.jobType} onChange={v => setForm({...form, jobType: v})} />
              <F label="รายได้ (บาท)" type="number" value={form.income} onChange={v => setForm({...form, income: v})} />
              <Sel label="ทักษะตรงสาย?" value={form.skillMatch} onChange={v => setForm({...form, skillMatch: v})}
                options={[['','— เลือก —'],['MATCH','ตรงสาย'],['NOT_MATCH','ไม่ตรงสาย']]} />
              <F label="ความพึงพอใจ" value={form.satisfaction} onChange={v => setForm({...form, satisfaction: v})} />
              <F12 label="ปัญหา / ข้อเสนอแนะ" value={form.issues} onChange={v => setForm({...form, issues: v})} />
            </>}

            {dialogType === 'skill' && <>
              <F12 label="ชื่อทักษะ *" value={form.skillName} onChange={v => setForm({...form, skillName: v})} />
              <Sel12 label="ระดับความสามารถ *" value={form.skillLevel} onChange={v => setForm({...form, skillLevel: v})}
                options={[['','— เลือกระดับ —'],['BEGINNER','Beginner — เริ่มต้น'],['INTERMEDIATE','Intermediate — ปานกลาง'],['ADVANCED','Advanced — เชี่ยวชาญ']]} />
            </>}

            {dialogType === 'personorg' && <>
              <SelData12 label="สถานประกอบการ *" value={form.orgId} onChange={v => setForm({...form, orgId: v})}
                options={[['','— เลือกสถานประกอบการ —'], ...orgs.map(o => [String(o.id), o.orgName])]} />
              <Sel12 label="บทบาท *" value={form.roleType} onChange={v => setForm({...form, roleType: v})}
                options={[['','— เลือกบทบาท —'],['INTERNSHIP','ฝึกงาน'],['EMPLOYMENT','จ้างงาน'],['OTHER','อื่นๆ']]} />
              <F label="วันเริ่ม" type="date" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
              <F label="วันสิ้นสุด" type="date" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
              <F label="เงินสนับสนุน (บาท)" type="number" value={form.amount} onChange={v => setForm({...form, amount: v})} />
              <F label="หมายเหตุ" value={form.note} onChange={v => setForm({...form, note: v})} />
              <F12 label="รายละเอียดการสนับสนุน" value={form.supportDetail} onChange={v => setForm({...form, supportDetail: v})} />
            </>}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            <button className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-colors" onClick={() => modalRef.current?.close()}>ยกเลิก</button>
            <button className="px-6 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }} onClick={handleSave}>บันทึก</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all';
const labelCls = 'block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide';

const F = ({ label, value = '', onChange, type = 'text' }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <input type={type} className={inputCls} value={value} onChange={e => onChange(e.target.value)} />
  </div>
);
const F12 = (p) => <div className="col-span-2"><F {...p} /></div>;

const Sel = ({ label, value = '', onChange, options }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <div className="relative">
      <select className={`${inputCls} appearance-none cursor-pointer pr-9`} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);
const Sel12 = (p) => <div className="col-span-2"><Sel {...p} /></div>;
const SelData12 = (p) => <div className="col-span-2"><Sel {...p} /></div>;

const DelBtn = ({ onClick }) => (
  <button className="btn btn-ghost btn-xs text-red-400 hover:bg-red-50" onClick={onClick}><Trash2 size={13} /></button>
);
const EmptyRow = ({ cols }) => (
  <tr><td colSpan={cols} className="text-center py-8 text-gray-400 text-sm">ไม่มีข้อมูล</td></tr>
);

function InfoCard({ title, items }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <p className="font-bold text-orange-950 text-sm mb-4">{title}</p>
      <div className="grid grid-cols-2 gap-x-4">
        {items.map(([label, value]) => (
          <div key={label} className="mb-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm text-orange-950 font-medium">{value || <span className="text-gray-200">—</span>}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubSection({ title, icon, onAdd, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
        <div className="flex items-center gap-2 text-orange-950 font-bold text-sm">
          <span className="text-orange-500">{icon}</span>{title}
        </div>
        {onAdd && (
          <button className="btn btn-outline btn-primary btn-xs gap-1" onClick={onAdd}>
            <Plus size={13} /> เพิ่ม
          </button>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
