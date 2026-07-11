import axios from 'axios';
import { cached, invalidate, invalidatePrefix } from '../utils/apiCache';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// singleton rewarm — กัน spawn ซ้ำซ้อนเมื่อหลาย request fail พร้อมกัน
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
let _rewarmPromise = null;

function rewarm() {
  if (_rewarmPromise) return _rewarmPromise;
  window.dispatchEvent(new CustomEvent('api:reconnecting'));
  _rewarmPromise = axios.get(BASE_URL + '/health', { timeout: 30000 })
    .catch(() => {})
    .finally(() => {
      _rewarmPromise = null;
      window.dispatchEvent(new CustomEvent('api:reconnected'));
    });
  return _rewarmPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isLoginEndpoint = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginEndpoint) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(err);
    }
    // network error / timeout → rewarm (singleton) แล้ว retry ครั้งเดียว
    if (!err.response && !err.config?._retried) {
      err.config._retried = true;
      await rewarm();
      return api.request(err.config);
    }
    return Promise.reject(err);
  }
);

export const getHealth = () => api.get('/health');
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// persons list: cache 20 วิ (key แยกตาม params), invalidate เมื่อ mutate
export const getPersons = (params) => {
  const key = 'persons:' + JSON.stringify(params || {});
  return cached(key, () => api.get('/persons', { params }), 20_000);
};
export const getPerson = (id) => cached(`person:${id}`, () => api.get(`/persons/${id}`), 20_000);
export const createPerson = (data) => api.post('/persons', data).then(r => { invalidatePrefix('persons:'); return r; });
export const importPersons = (persons) => api.post('/persons/import', { persons }).then(r => { invalidatePrefix('persons:'); return r; });
export const updatePerson = (id, data) => api.put(`/persons/${id}`, data).then(r => { invalidatePrefix('persons:'); invalidate(`person:${id}`); return r; });
export const deletePerson = (id) => api.delete(`/persons/${id}`).then(r => { invalidatePrefix('persons:'); invalidate(`person:${id}`); return r; });

// disability types ไม่เปลี่ยนตลอด session — cache ไว้เลย
export const getDisabilityTypes = () => cached('disability-types', () => api.get('/persons/disability-types'), 10 * 60_000);
export const getDisabilityInfos = (id) => api.get(`/persons/${id}/disability`);
export const createDisabilityInfo = (id, data) => api.post(`/persons/${id}/disability`, data);
export const deleteDisabilityInfo = (id, did) => api.delete(`/persons/${id}/disability/${did}`);

export const getTraining = (id) => api.get(`/persons/${id}/training`);
export const createTraining = (id, data) => api.post(`/persons/${id}/training`, data);
export const updateTraining = (id, tid, data) => api.put(`/persons/${id}/training/${tid}`, data);
export const deleteTraining = (id, tid) => api.delete(`/persons/${id}/training/${tid}`);

export const getWorkExp = (id) => api.get(`/persons/${id}/workexp`);
export const createWorkExp = (id, data) => api.post(`/persons/${id}/workexp`, data);
export const updateWorkExp = (id, wid, data) => api.put(`/persons/${id}/workexp/${wid}`, data);
export const deleteWorkExp = (id, wid) => api.delete(`/persons/${id}/workexp/${wid}`);

export const getFollowUp = (id) => api.get(`/persons/${id}/followup`);
export const createFollowUp = (id, data) => api.post(`/persons/${id}/followup`, data);
export const updateFollowUp = (id, fid, data) => api.put(`/persons/${id}/followup/${fid}`, data);
export const deleteFollowUp = (id, fid) => api.delete(`/persons/${id}/followup/${fid}`);

export const getSkills = (id) => api.get(`/persons/${id}/skills`);
export const createSkill = (id, data) => api.post(`/persons/${id}/skills`, data);
export const deleteSkill = (id, sid) => api.delete(`/persons/${id}/skills/${sid}`);

export const getPersonOrgs = (id) => api.get(`/persons/${id}/personorg`);
export const createPersonOrg = (id, data) => api.post(`/persons/${id}/personorg`, data);
export const updatePersonOrg = (id, pid, data) => api.put(`/persons/${id}/personorg/${pid}`, data);
export const deletePersonOrg = (id, pid) => api.delete(`/persons/${id}/personorg/${pid}`);

// organizations: cache 30 วิ, invalidate เมื่อ mutate
export const getOrganizations = () => cached('organizations', () => api.get('/organizations'), 30_000);
export const getOrganization = (id) => api.get(`/organizations/${id}`);
export const createOrganization = (data) => api.post('/organizations', data).then(r => { invalidate('organizations'); return r; });
export const updateOrganization = (id, data) => api.put(`/organizations/${id}`, data).then(r => { invalidate('organizations'); return r; });
export const deleteOrganization = (id) => api.delete(`/organizations/${id}`).then(r => { invalidate('organizations'); return r; });

// dashboard: cache 60 วิ (server ก็ cache แล้ว, frontend cache ลด round-trip)
export const getDashboardStats = () => cached('dashboard-stats', () => api.get('/dashboard/stats'), 60_000);

export const getAllTraining = () => api.get('/data/training-all');
export const getAllFollowUp = () => api.get('/data/followup-all');

export const getPersonPhotos = (id) => api.get(`/persons/${id}/photos`);
export const uploadPersonPhoto = (id, data) => api.post(`/persons/${id}/photos`, data);
export const deletePersonPhoto = (id, pid) => api.delete(`/persons/${id}/photos/${pid}`);

// training batches (รุ่น)
export const getBatches = () => cached('batches', () => api.get('/batches'), 30_000);
export const getBatch = (id) => api.get(`/batches/${id}`);
export const createBatch = (data) => api.post('/batches', data).then(r => { invalidate('batches'); return r; });
export const updateBatch = (id, data) => api.put(`/batches/${id}`, data).then(r => { invalidate('batches'); return r; });
export const deleteBatch = (id) => api.delete(`/batches/${id}`).then(r => { invalidate('batches'); return r; });

// หลักสูตรในแต่ละรุ่น (1-4 หลักสูตร/รุ่น)
export const addCourse = (batchId, data) => api.post(`/batches/${batchId}/courses`, data).then(r => { invalidate('batches'); return r; });
export const updateCourse = (batchId, courseId, data) => api.put(`/batches/${batchId}/courses/${courseId}`, data).then(r => { invalidate('batches'); return r; });
export const deleteCourse = (batchId, courseId) => api.delete(`/batches/${batchId}/courses/${courseId}`).then(r => { invalidate('batches'); return r; });

// assessments (ประเมินทักษะ)
export const getAssessments = (personId) => api.get(`/persons/${personId}/assessments`);
export const saveAssessment = (personId, data) => api.post(`/persons/${personId}/assessments`, data);
export const deleteAssessment = (personId, aid) => api.delete(`/persons/${personId}/assessments/${aid}`);
