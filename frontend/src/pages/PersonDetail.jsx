import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, GraduationCap, Briefcase, Star, Target, ChevronDown, Building2, Accessibility, Camera, ClipboardList, TrendingUp, Save } from 'lucide-react';
import {
  getPerson, getTraining, createTraining, updateTraining, deleteTraining,
  getWorkExp, createWorkExp, updateWorkExp, deleteWorkExp,
  getFollowUp, createFollowUp, updateFollowUp, deleteFollowUp,
  getSkills, createSkill, deleteSkill,
  getPersonOrgs, createPersonOrg, updatePersonOrg, deletePersonOrg,
  getOrganizations,
  getDisabilityTypes, createDisabilityInfo, deleteDisabilityInfo,
  getPersonPhotos, uploadPersonPhoto, deletePersonPhoto,
  getAssessments, saveAssessment, deleteAssessment, getBatches,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resizeImage } from '../utils/resizeImage';
import LoadError from '../components/LoadError';
import { useDiscardGuard } from '../utils/useDiscardGuard';
import DiscardBar from '../components/DiscardBar';
import { nameInitials } from '../utils/name';
import { useThaiDate } from '../utils/useThaiDate';
import { endBeforeStart } from '../utils/thaiDate';

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

const tabs = ['ข้อมูลพื้นฐาน', 'การอบรม', 'ประสบการณ์งาน', 'ทักษะ', 'ติดตามผล', 'สถานประกอบการ', 'ประเมินทักษะ'];

function calcAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const fmtDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${parseInt(y) + 543}`;
};

const DateRange = ({ start, end, noEndLabel = 'ปัจจุบัน' }) => (
  <div className="flex items-center gap-1.5 whitespace-nowrap">
    <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-orange-100">
      {fmtDate(start) || '—'}
    </span>
    <span className="text-gray-400 text-xs">→</span>
    <span className="bg-gray-50 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-lg border border-gray-100">
      {fmtDate(end) || noEndLabel}
    </span>
  </div>
);

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // ย้อนกลับไปหน้าที่มา (รายชื่อหน้าเดิม / ติดตามผล / ฯลฯ)
  // ถ้าเปิดลิงก์นี้ตรงๆ ไม่มีประวัติให้ย้อน ค่อยไปหน้ารายชื่อ
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/persons'));
  const { canEdit } = useAuth();
  const toast = useToast();
  const modalRef = useRef(null);
  const guard = useDiscardGuard(() => modalRef.current?.close());
  const [tab, setTab] = useState(0);
  const [person, setPerson] = useState(null);
  const [personError, setPersonError] = useState(null);   // null | 'notfound' | 'error'
  const [training, setTraining] = useState([]);
  const [workexp, setWorkexp] = useState([]);
  const [followup, setFollowup] = useState([]);
  const [skills, setSkills] = useState([]);
  const [personOrgs, setPersonOrgs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [disabilityTypes, setDisabilityTypes] = useState([]);
  const [dialogType, setDialogType] = useState('');
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);   // null = เพิ่มใหม่
  const [dialogNonce, setDialogNonce] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const photoInputRef = useRef(null);
  const [assessments, setAssessments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [assessBatchId, setAssessBatchId] = useState('');
  const [assessForm, setAssessForm] = useState({ preTestScore: '', postTestScore: '', softSkillComm: '', softSkillTime: '', softSkillMotiv: '', softSkillDuty: '' });
  const [assessSaving, setAssessSaving] = useState(false);

  const reloadAll = () => {
    // เดิมไม่มี catch → เปิดลิงก์ของคนที่ถูกลบไปแล้ว (เช่นจากหน้าประวัติการใช้งาน) หมุนค้างตลอด
    getPerson(id)
      .then((r) => { setPerson(r.data); setPersonError(null); })
      .catch((err) => setPersonError(err.response?.status === 404 ? 'notfound' : 'error'));
    getTraining(id).then((r) => setTraining(r.data));
    getWorkExp(id).then((r) => setWorkexp(r.data));
    getFollowUp(id).then((r) => setFollowup(r.data));
    getSkills(id).then((r) => setSkills(r.data));
    getPersonOrgs(id).then((r) => setPersonOrgs(r.data));
    getOrganizations().then((r) => setOrgs(r.data));
    getDisabilityTypes().then((r) => setDisabilityTypes(r.data));
    getPersonPhotos(id).then((r) => {
      const p = r.data.find(x => x.photoType === 'profile');
      setProfilePhoto(p || null);
    }).catch(() => {});
    getAssessments(id).then((r) => setAssessments(r.data)).catch(() => {});
    getBatches().then((r) => setBatches(r.data)).catch(() => {});
  };

  // default รุ่นในแท็บประเมิน = รุ่นที่คนนี้สังกัด
  useEffect(() => {
    if (person?.batchId) setAssessBatchId(String(person.batchId));
  }, [person?.batchId]);

  // prefill ฟอร์มประเมินจากผลที่บันทึกไว้ของรุ่นที่เลือก (auto sync เมื่อ assessments เปลี่ยน)
  useEffect(() => {
    if (!assessBatchId) {
      setAssessForm({ preTestScore: '', postTestScore: '', softSkillComm: '', softSkillTime: '', softSkillMotiv: '', softSkillDuty: '' });
      return;
    }
    const existing = assessments.find(a => String(a.batchId) === String(assessBatchId));
    setAssessForm(existing ? {
      preTestScore: existing.preTestScore ?? '',
      postTestScore: existing.postTestScore ?? '',
      softSkillComm: existing.softSkillComm ?? '',
      softSkillTime: existing.softSkillTime ?? '',
      softSkillMotiv: existing.softSkillMotiv ?? '',
      softSkillDuty: existing.softSkillDuty ?? '',
    } : { preTestScore: '', postTestScore: '', softSkillComm: '', softSkillTime: '', softSkillMotiv: '', softSkillDuty: '' });
  }, [assessBatchId, assessments]);

  const handleSaveAssessment = async () => {
    if (!assessBatchId) return toast.error('ยังไม่ได้เลือกรุ่น', 'กรุณาเลือกรุ่นก่อนบันทึกผลประเมิน');
    setAssessSaving(true);
    try {
      await saveAssessment(id, { batchId: Number(assessBatchId), ...assessForm });
      const r = await getAssessments(id);
      setAssessments(r.data);
      toast.success('บันทึกผลประเมินสำเร็จ!');
    } catch { toast.error('บันทึกไม่สำเร็จ', 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
    finally { setAssessSaving(false); }
  };

  const handleDeleteAssessment = async (aid) => {
    if (!(await toast.confirm({ title: 'ลบข้อมูลประเมินนี้?', message: 'ข้อมูลที่ลบแล้วกู้คืนไม่ได้' }))) return;
    try {
      await deleteAssessment(id, aid);
      getAssessments(id).then(r => setAssessments(r.data));
      toast.success('ลบสำเร็จ!');
    } catch { toast.error('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาด'); }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';   // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    let dataUrl;
    try {
      dataUrl = await resizeImage(file);   // ย่อให้อัตโนมัติ รูปมือถือใหญ่ๆ ก็ใช้ได้
    } catch (err) {
      return toast.error('ใช้รูปนี้ไม่ได้', err.message);
    }
    try {
      const { data } = await uploadPersonPhoto(id, { filePath: dataUrl, photoType: 'profile' });
      setProfilePhoto(data);
      toast.success('อัปโหลดรูปสำเร็จ!');
    } catch (err) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    }
  };

  const handleDeletePhoto = async () => {
    if (!profilePhoto) return;
    if (!(await toast.confirm({ title: 'ลบรูปนี้?', message: 'ลบรูปโปรไฟล์ของผู้เข้าร่วมคนนี้' }))) return;
    try {
      await deletePersonPhoto(id, profilePhoto.id);
      setProfilePhoto(null);
      toast.success('ลบรูปสำเร็จ!');
    } catch { toast.error('ลบรูปไม่สำเร็จ', 'เกิดข้อผิดพลาด'); }
  };

  useEffect(() => { reloadAll(); }, [id]);

  // record = รายการที่จะแก้ไข (ไม่ส่ง = เพิ่มใหม่) — เดิมเพิ่มได้อย่างเดียว พิมพ์ผิดต้องลบแล้วเพิ่มใหม่
  const openDialog = (type, record = null) => {
    const initial = record ? toEditForm(type, record) : {};
    setForm(initial);
    guard.arm(initial);
    setEditingId(record?.id ?? null);
    setDialogType(type);
    setDialogNonce((n) => n + 1);   // สร้างช่องในหน้าต่างใหม่ทุกครั้ง ไม่ให้ค่าที่พิมพ์ค้างจากรอบก่อนโผล่
    modalRef.current?.showModal();
  };

  const handleSave = async () => {
    const miss = (msg) => { toast.error('กรอกข้อมูลไม่ครบ', msg); return true; };
    if (dialogType === 'training' && !form.courseName?.trim()) return miss('กรุณากรอกชื่อหลักสูตร');
    if (dialogType === 'workexp' && !form.organizationName?.trim()) return miss('กรุณากรอกชื่อองค์กร');
    if (dialogType === 'workexp' && !form.workMode) return miss('กรุณาเลือกรูปแบบงาน');
    if (dialogType === 'followup' && !form.followUpDate) return miss('กรุณากรอกวันที่ติดตาม');
    if (dialogType === 'followup' && !form.employmentStatus) return miss('กรุณาเลือกสถานะงาน');
    if (dialogType === 'skill' && !form.skillName?.trim()) return miss('กรุณากรอกชื่อทักษะ');
    if (dialogType === 'skill' && !form.skillLevel) return miss('กรุณาเลือกระดับทักษะ');
    if (dialogType === 'personorg' && !form.orgId) return miss('กรุณาเลือกสถานประกอบการ');
    if (dialogType === 'personorg' && !form.roleType) return miss('กรุณาเลือกบทบาท');
    if (dialogType === 'disability' && !form.disabilityTypeId) return miss('กรุณาเลือกประเภทความพิการ');
    if (endBeforeStart(form.startDate, form.endDate)) return miss('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
    try {
      const eid = editingId;
      if (dialogType === 'training') { await (eid ? updateTraining(id, eid, form) : createTraining(id, form)); getTraining(id).then((r) => setTraining(r.data)); }
      else if (dialogType === 'workexp') { await (eid ? updateWorkExp(id, eid, form) : createWorkExp(id, form)); getWorkExp(id).then((r) => setWorkexp(r.data)); }
      else if (dialogType === 'followup') { await (eid ? updateFollowUp(id, eid, form) : createFollowUp(id, form)); getFollowUp(id).then((r) => setFollowup(r.data)); }
      else if (dialogType === 'personorg' && eid) { await updatePersonOrg(id, eid, form); getPersonOrgs(id).then((r) => setPersonOrgs(r.data)); }
      else if (dialogType === 'skill') { await createSkill(id, form); getSkills(id).then((r) => setSkills(r.data)); }
      else if (dialogType === 'personorg') { await createPersonOrg(id, form); getPersonOrgs(id).then((r) => setPersonOrgs(r.data)); }
      else if (dialogType === 'disability') { await createDisabilityInfo(id, form); getPerson(id).then((r) => setPerson(r.data)); }
      modalRef.current?.close();
      toast.success(editingId ? 'แก้ไขสำเร็จ!' : 'บันทึกสำเร็จ!');
    } catch (err) { toast.error('บันทึกไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
  };

  // ลบรายการ (มี popup ยืนยัน + toast)
  const delWith = async (label, doDelete, reload) => {
    if (!(await toast.confirm({ title: `ลบ${label}นี้?`, message: 'ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้' }))) return;
    try { await doDelete(); reload(); toast.success('ลบสำเร็จ!'); }
    catch (err) { toast.error('ลบไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  if (personError) return (
    <div>
      <LoadError
        message={personError === 'notfound' ? 'ไม่พบข้อมูลคนพิการคนนี้' : 'โหลดข้อมูลไม่สำเร็จ'}
        hint={personError === 'notfound' ? 'อาจถูกลบออกจากระบบไปแล้ว' : 'ตรวจสอบอินเทอร์เน็ต แล้วกดลองใหม่'}
        onRetry={personError === 'notfound' ? null : reloadAll} />
      <div className="text-center -mt-8">
        <button className="btn btn-ghost btn-sm gap-1 text-gray-500" onClick={goBack}><ArrowLeft size={15} /> กลับ</button>
      </div>
    </div>
  );

  if (!person) return <div className="flex items-center justify-center h-96"><span className="loading loading-spinner loading-lg text-primary" /></div>;

  const age = calcAge(person.birthDate);

  return (
    <div>
      <button className="btn btn-ghost btn-sm gap-1 mb-4 text-gray-500" onClick={goBack}>
        <ArrowLeft size={15} /> กลับ
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 mb-5 flex items-center gap-4">
        {/* รูปภาพ */}
        <div className="relative flex-shrink-0 group">
          <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-orange-200 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
            {profilePhoto?.filePath
              ? <img src={profilePhoto.filePath} alt="รูปถ่าย" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white text-lg font-black">
                  {nameInitials(person.fullName)}
                </div>
            }
          </div>
          {canEdit && (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={16} color="white" />
            </button>
          )}
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-xl font-extrabold text-orange-950">
              {person.fullName}
              {person.nickname && <span className="text-base font-semibold text-gray-500"> ({person.nickname})</span>}
            </h1>
            {/* โชว์เฉพาะคนที่เสียชีวิต — เดิมขึ้น "มีชีวิต" ทุกคน ไม่ได้บอกอะไร */}
            {person.lifeStatus === 'DECEASED' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">เสียชีวิต</span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {GENDER_LABELS[person.gender]} · {person.province || 'ไม่ระบุจังหวัด'}
            {age !== null && <> · <span className="font-semibold text-orange-600">{age} ปี</span></>}
          </p>
          {/* ปุ่มจริงแทน "hover ที่รูปเพื่อเปลี่ยน" — มือถือ hover ไม่ได้ เลยไม่รู้ว่าเปลี่ยนรูปได้ */}
          {canEdit && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              <button onClick={() => photoInputRef.current?.click()} className={SMALL_BTN}>
                <Camera size={13} /> {profilePhoto ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}
              </button>
              {profilePhoto && (
                <button onClick={handleDeletePhoto}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 transition-all">
                  <Trash2 size={13} /> ลบรูป
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {/* มือถือ: แท็บเรียงแถวเดียว ปัดซ้าย-ขวาได้ (เดิมซ้อน 3 บรรทัด และไม่มีขีดบอกว่าอยู่แท็บไหน) */}
      <div role="tablist" className="flex overflow-x-auto bg-white rounded-2xl shadow-sm border border-orange-100 px-2 mb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button key={i} role="tab" aria-selected={tab === i}
            className={`flex-shrink-0 whitespace-nowrap px-3.5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${tab === i ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-orange-600'}`}
            onClick={(e) => { setTab(i); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }}>
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
            ['วันเกิด', person.birthDate ? `${fmtDate(person.birthDate)} (${age} ปี)` : null],
            ['สัญชาติ', person.nationality],
            ['ศาสนา', person.religion],
            ['สถานภาพ', MARITAL_LABELS[person.maritalStatus] || person.maritalStatus],
            ['ระดับการศึกษา', person.educationLevel],
          ]} />
          <InfoCard title="ข้อมูลติดต่อ" items={[
            ['โทรศัพท์', person.phone],
            ['มือถือ', person.mobile],
            ['อีเมล', person.email],
            ['สถานที่ใกล้เคียง', person.landmark],
          ]} />
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
            <p className="font-bold text-orange-950 text-sm mb-3">ที่อยู่ปัจจุบัน</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              {[
                ['เลขที่', person.houseNo], ['หมู่ที่', person.moo],
                ['ชื่ออาคาร', person.building], ['ชั้นที่', person.floor],
                ['ซอย', person.soi], ['ถนน', person.road],
                ['แขวง/ตำบล', person.subDistrict], ['เขต/อำเภอ', person.district],
                ['จังหวัด', person.province], ['รหัสไปรษณีย์', person.postalCode],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm text-orange-950 font-medium">{val || <span className="text-gray-400">—</span>}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-orange-950 text-sm">ข้อมูลความพิการ</p>
              {canEdit && (
                <button className={SMALL_BTN} onClick={() => openDialog('disability')}>
                  <Plus size={13} /> เพิ่ม
                </button>
              )}
            </div>
            {person.disabilityInfos?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {person.disabilityInfos.map((d) => (
                  <div key={d.id} className="rounded-xl bg-orange-50 border border-orange-100 p-3 relative">
                    {canEdit && (
                      <button title="ลบ"
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => delWith('ข้อมูลความพิการ', () => deleteDisabilityInfo(id, d.id), () => getPerson(id).then(r => setPerson(r.data)))}>
                        <Trash2 size={13} />
                      </button>
                    )}
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 mb-2 mr-8">
                      {d.disabilityType?.typeName}
                    </span>
                    <p className="text-xs text-gray-600">ระดับ: {d.disabilityLevel || '—'}</p>
                    {d.assistiveDevice && <p className="text-xs text-gray-600">อุปกรณ์: {d.assistiveDevice}</p>}
                    {d.workLimitation && <p className="text-xs text-gray-600">ข้อจำกัดงาน: {d.workLimitation}</p>}
                    {d.accommodationNeed && <p className="text-xs text-gray-600">ความต้องการ: {d.accommodationNeed}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูลความพิการ</p>
            )}
          </div>
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
                  <td><DateRange start={t.startDate} end={t.endDate} noEndLabel="—" /></td>
                  <td>{t.trainingType && <span className="badge badge-sm bg-orange-100 text-orange-700 border-0">{t.trainingType}</span>}</td>
                  <td className="text-gray-600 max-w-xs truncate">{t.skillsGained || '—'}</td>
                  <td className="text-gray-600">{t.evaluationResult || '—'}</td>
                  {canEdit && <RowActions onEdit={() => openDialog('training', t)} onDelete={() => delWith('ประวัติอบรม', () => deleteTraining(id, t.id), () => getTraining(id).then(r => setTraining(r.data)))} />}
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
                  <td><DateRange start={w.startDate} end={w.endDate} noEndLabel="ปัจจุบัน" /></td>
                  <td className="text-gray-600 max-w-xs truncate">{w.outcome || '—'}</td>
                  {canEdit && <RowActions onEdit={() => openDialog('workexp', w)} onDelete={() => delWith('ประสบการณ์งาน', () => deleteWorkExp(id, w.id), () => getWorkExp(id).then(r => setWorkexp(r.data)))} />}
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
                      <button className="hover:text-red-500 transition-colors ml-1" onClick={() => delWith('ทักษะ', () => deleteSkill(id, s.id), () => getSkills(id).then(r => setSkills(r.data)))}>
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
                  <td className="text-orange-600 font-semibold text-xs">{fmtDate(f.followUpDate) || '—'}</td>
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
                  {canEdit && <RowActions onEdit={() => openDialog('followup', f)} onDelete={() => delWith('การติดตามผล', () => deleteFollowUp(id, f.id), () => getFollowUp(id).then(r => setFollowup(r.data)))} />}
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
                  <td><DateRange start={po.startDate} end={po.endDate} noEndLabel="—" /></td>
                  <td className="font-medium text-gray-700">{po.amount ? `฿${Number(po.amount).toLocaleString()}` : '—'}</td>
                  <td className="text-gray-600 text-xs max-w-xs truncate">{po.supportDetail || '—'}</td>
                  {canEdit && <RowActions onEdit={() => openDialog('personorg', po)} onDelete={() => delWith('สถานประกอบการ', () => deletePersonOrg(id, po.id), () => getPersonOrgs(id).then(r => setPersonOrgs(r.data)))} />}
                </tr>
              ))}
              {personOrgs.length === 0 && <EmptyRow cols={canEdit ? 6 : 5} />}
            </tbody>
          </table>
        </SubSection>
      )}

      {/* Tab 6: ประเมินทักษะ */}
      {tab === 6 && (
        <div className="space-y-5">
          {/* เลือกรุ่น + กรอกคะแนน */}
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-orange-50 flex items-center gap-2">
              <ClipboardList size={16} className="text-orange-500" />
              <p className="font-bold text-orange-950 text-sm">บันทึกผลการประเมิน</p>
            </div>
            <div className="p-5 space-y-4">
              {/* เลือกรุ่น */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">เลือกรุ่นการฝึกอบรม</label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                  value={assessBatchId}
                  onChange={e => setAssessBatchId(e.target.value)}>
                  <option value="">— เลือกรุ่น —</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>รุ่นที่ {b.batchNumber} ปี พ.ศ. {b.year} {b.status === 'ACTIVE' ? '(กำลังดำเนินการ)' : ''}</option>
                  ))}
                </select>
                {batches.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">ยังไม่มีรุ่นในระบบ — ไปเพิ่มรุ่นที่ "จัดการรุ่น" ก่อน</p>
                )}
              </div>

              {assessBatchId && (
                <>
                  {/* Pre / Post Test */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Pre-test</p>
                      <input type="number" min="0" max="100" placeholder="คะแนน (0-100)"
                        className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 bg-white"
                        value={assessForm.preTestScore}
                        onChange={e => setAssessForm({...assessForm, preTestScore: e.target.value})} />
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wide">Post-test</p>
                      <input type="number" min="0" max="100" placeholder="คะแนน (0-100)"
                        className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 bg-white"
                        value={assessForm.postTestScore}
                        onChange={e => setAssessForm({...assessForm, postTestScore: e.target.value})} />
                    </div>
                  </div>

                  {/* Soft Skills 4 ด้าน */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Soft Skills (0–5 คะแนน)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'softSkillComm',  label: 'การสื่อสาร',          card: 'bg-orange-50 border-orange-100', text: 'text-orange-600' },
                        { key: 'softSkillTime',  label: 'การบริหารเวลา',       card: 'bg-violet-50 border-violet-100', text: 'text-violet-600' },
                        { key: 'softSkillMotiv', label: 'การจูงใจตนเอง',       card: 'bg-pink-50 border-pink-100',     text: 'text-pink-600' },
                        { key: 'softSkillDuty',  label: 'การทำงานตามหน้าที่',  card: 'bg-cyan-50 border-cyan-100',     text: 'text-cyan-600' },
                      ].map(({ key, label, card, text }) => (
                        <div key={key} className={`rounded-xl p-3.5 border ${card}`}>
                          <p className={`text-xs font-semibold ${text} mb-2`}>{label}</p>
                          <input type="number" min="0" max="5" step="0.5" placeholder="0–5"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40 bg-white"
                            value={assessForm[key]}
                            onChange={e => setAssessForm({...assessForm, [key]: e.target.value})} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {canEdit && (
                    <button onClick={handleSaveAssessment} disabled={assessSaving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
                      <Save size={15} />
                      {assessSaving ? 'กำลังบันทึก...' : 'บันทึกผลการประเมิน'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ประวัติผลประเมินทุกรุ่น */}
          {assessments.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-orange-50 flex items-center gap-2">
                <TrendingUp size={16} className="text-orange-500" />
                <p className="font-bold text-orange-950 text-sm">ผลประเมินทุกรุ่น</p>
              </div>
              <div className="divide-y divide-gray-50">
                {assessments.map(a => {
                  const softTotal = [a.softSkillComm, a.softSkillTime, a.softSkillMotiv, a.softSkillDuty]
                    .filter(v => v != null).reduce((s, v) => s + v, 0);
                  const softCount = [a.softSkillComm, a.softSkillTime, a.softSkillMotiv, a.softSkillDuty].filter(v => v != null).length;
                  return (
                    <div key={a.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-sm text-gray-800">รุ่นที่ {a.batch?.batchNumber} ปี พ.ศ. {a.batch?.year}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.batch?.courseName}</p>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleDeleteAssessment(a.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {a.preTestScore != null && (
                          <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                            <p className="text-xs text-blue-500 font-semibold">Pre-test</p>
                            <p className="text-lg font-black text-blue-700">{a.preTestScore}</p>
                          </div>
                        )}
                        {a.postTestScore != null && (
                          <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                            <p className="text-xs text-emerald-500 font-semibold">Post-test</p>
                            <p className="text-lg font-black text-emerald-700">{a.postTestScore}</p>
                          </div>
                        )}
                        {softCount > 0 && (
                          <div className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                            <p className="text-xs text-orange-500 font-semibold">Soft Skills รวม</p>
                            <p className="text-lg font-black text-orange-700">{softTotal.toFixed(1)} / {softCount * 5}</p>
                          </div>
                        )}
                      </div>
                      {/* ส่วนต่าง Pre→Post (พัฒนาการ) */}
                      {a.preTestScore != null && a.postTestScore != null && (() => {
                        const diff = a.postTestScore - a.preTestScore;
                        const up = diff >= 0;
                        return (
                          <div className={`mt-3 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {up ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                            พัฒนาการ {up ? '+' : ''}{diff} คะแนน (Pre {a.preTestScore} → Post {a.postTestScore})
                          </div>
                        );
                      })()}
                      {softCount > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {[
                            { key: 'softSkillComm', label: 'สื่อสาร' },
                            { key: 'softSkillTime', label: 'บริหารเวลา' },
                            { key: 'softSkillMotiv', label: 'จูงใจตนเอง' },
                            { key: 'softSkillDuty', label: 'ทำงานตามหน้าที่' },
                          ].map(({ key, label }) => a[key] != null && (
                            <div key={key} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{label}</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${(a[key]/5)*100}%` }} />
                                </div>
                                <span className="font-bold text-gray-700 w-6 text-right">{a[key]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <dialog ref={modalRef} className="modal" onCancel={(e) => { e.preventDefault(); guard.request(form); }}>
        <div className="modal-box max-w-lg p-0 overflow-hidden bg-white shadow-2xl">
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#431407 0%,#c2410c 100%)' }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {dialogType === 'training' && <GraduationCap size={20} color="#fff" />}
              {dialogType === 'workexp' && <Briefcase size={20} color="#fff" />}
              {dialogType === 'followup' && <Target size={20} color="#fff" />}
              {dialogType === 'skill' && <Star size={20} color="#fff" />}
              {dialogType === 'personorg' && <Building2 size={20} color="#fff" />}
              {dialogType === 'disability' && <Accessibility size={20} color="#fff" />}
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">
                {dialogType === 'training' && (editingId ? 'แก้ไขการอบรม' : 'เพิ่มการอบรม')}
                {dialogType === 'workexp' && (editingId ? 'แก้ไขประสบการณ์งาน' : 'เพิ่มประสบการณ์งาน')}
                {dialogType === 'followup' && (editingId ? 'แก้ไขการติดตามผล' : 'บันทึกติดตามผล')}
                {dialogType === 'skill' && 'เพิ่มทักษะ'}
                {dialogType === 'personorg' && (editingId ? 'แก้ไขสถานประกอบการที่เกี่ยวข้อง' : 'เชื่อมสถานประกอบการ')}
                {dialogType === 'disability' && 'เพิ่มข้อมูลความพิการ'}
              </h3>
              <p className="text-orange-300/80 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบถ้วน</p>
            </div>
          </div>

          <div key={dialogNonce} className="p-5 grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            {dialogType === 'training' && <>
              <F12 label="ชื่อหลักสูตร *" value={form.courseName} onChange={v => setForm({...form, courseName: v})} />
              <F12 label="หน่วยงาน" value={form.organizer} onChange={v => setForm({...form, organizer: v})} />
              <ThaiDate label="วันเริ่ม" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
              <ThaiDate label="วันสิ้นสุด" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
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
              <ThaiDate label="วันเริ่ม" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
              <ThaiDate label="วันสิ้นสุด" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
              <F12 label="ผลลัพธ์ / ความสำเร็จ" value={form.outcome} onChange={v => setForm({...form, outcome: v})} />
            </>}

            {dialogType === 'followup' && <>
              <ThaiDate12 label="วันที่ติดตาม *" value={form.followUpDate} onChange={v => setForm({...form, followUpDate: v})} />
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
              <ThaiDate label="วันเริ่ม" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
              <ThaiDate label="วันสิ้นสุด" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
              <F label="เงินสนับสนุน (บาท)" type="number" value={form.amount} onChange={v => setForm({...form, amount: v})} />
              <F label="หมายเหตุ" value={form.note} onChange={v => setForm({...form, note: v})} />
              <F12 label="รายละเอียดการสนับสนุน" value={form.supportDetail} onChange={v => setForm({...form, supportDetail: v})} />
            </>}

            {dialogType === 'disability' && <>
              <SelData12 label="ประเภทความพิการ *" value={form.disabilityTypeId} onChange={v => setForm({...form, disabilityTypeId: v})}
                options={[['','— เลือกประเภทความพิการ —'], ...disabilityTypes
                  .filter(t => !(person.disabilityInfos || []).some(d => d.disabilityTypeId === t.id))   // ไม่ให้เลือกประเภทที่มีอยู่แล้ว
                  .map(t => [String(t.id), t.typeName])]} />
              <F12 label="ระดับความพิการ" value={form.disabilityLevel} onChange={v => setForm({...form, disabilityLevel: v})} />
              <F12 label="อุปกรณ์ช่วยเหลือ" value={form.assistiveDevice} onChange={v => setForm({...form, assistiveDevice: v})} />
              <F12 label="ข้อจำกัดด้านงาน" value={form.workLimitation} onChange={v => setForm({...form, workLimitation: v})} />
              <F12 label="ความต้องการพิเศษ" value={form.accommodationNeed} onChange={v => setForm({...form, accommodationNeed: v})} />
            </>}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            {guard.asking ? <DiscardBar guard={guard} /> : (<>
              <button className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-colors" onClick={() => guard.request(form)}>ยกเลิก</button>
              <button className="px-6 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }} onClick={handleSave}>บันทึก</button>
            </>)}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button type="button" onClick={() => guard.request(form)}>close</button></form>
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

function ThaiDate({ label, value = '', onChange }) {
  const { display, onInput, msg } = useThaiDate(value, onChange);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="text" inputMode="numeric" placeholder="วว/ดด/ปปปป (พ.ศ.)" maxLength={10}
        className={`${inputCls} ${msg?.type === 'error' ? '!border-red-400' : ''}`} value={display} onChange={onInput} />
      {msg && <p className={`text-xs mt-1 ${msg.type === 'error' ? 'text-red-500' : 'text-gray-400'}`}>{msg.text}</p>}
    </div>
  );
}
const ThaiDate12 = (p) => <div className="col-span-2"><ThaiDate {...p} /></div>;

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

// ปุ่มเล็กสีส้มอ่อน (เพิ่ม / เปลี่ยนรูป) — เดิมเป็นกรอบส้มเข้มแข็งๆ ของ DaisyUI
const SMALL_BTN = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all';

const DelBtn = ({ onClick }) => (
  <button className="btn btn-ghost btn-xs text-red-400 hover:bg-red-50" title="ลบ" onClick={onClick}><Trash2 size={13} /></button>
);
const EditBtn = ({ onClick }) => (
  <button className="btn btn-ghost btn-xs text-amber-500 hover:bg-amber-50" title="แก้ไข" onClick={onClick}><Pencil size={13} /></button>
);
const RowActions = ({ onEdit, onDelete }) => (
  <td className="whitespace-nowrap text-right"><EditBtn onClick={onEdit} /><DelBtn onClick={onDelete} /></td>
);

// รายการจากฐานข้อมูล → ค่าในฟอร์มแก้ไข (เอาเฉพาะช่องที่ฟอร์มมี วันที่ตัดเหลือ YYYY-MM-DD ตัวเลขเป็นข้อความ)
const day = (v) => (v ? String(v).slice(0, 10) : '');
const txt = (v) => (v == null ? '' : String(v));
const EDIT_FIELDS = {
  training: ['courseName', 'organizer', 'startDate', 'endDate', 'trainingType', 'evaluationResult', 'skillsGained'],
  workexp: ['organizationName', 'jobType', 'workMode', 'income', 'startDate', 'endDate', 'outcome'],
  followup: ['followUpDate', 'employmentStatus', 'jobType', 'income', 'skillMatch', 'satisfaction', 'issues'],
  personorg: ['orgId', 'roleType', 'startDate', 'endDate', 'amount', 'note', 'supportDetail'],
};
function toEditForm(type, record) {
  return Object.fromEntries((EDIT_FIELDS[type] || []).map((k) => [k, /Date$/.test(k) ? day(record[k]) : txt(record[k])]));
}
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
            <p className="text-sm text-orange-950 font-medium">{value || <span className="text-gray-400">—</span>}</p>
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
          <button className={SMALL_BTN} onClick={onAdd}>
            <Plus size={13} /> เพิ่ม
          </button>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
