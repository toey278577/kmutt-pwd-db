import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginEndpoint = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginEndpoint) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

export const getPersons = (params) => api.get('/persons', { params });
export const getPerson = (id) => api.get(`/persons/${id}`);
export const createPerson = (data) => api.post('/persons', data);
export const updatePerson = (id, data) => api.put(`/persons/${id}`, data);
export const deletePerson = (id) => api.delete(`/persons/${id}`);

export const getDisabilityTypes = () => api.get('/persons/disability-types');
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

export const getOrganizations = () => api.get('/organizations');
export const getOrganization = (id) => api.get(`/organizations/${id}`);
export const createOrganization = (data) => api.post('/organizations', data);
export const updateOrganization = (id, data) => api.put(`/organizations/${id}`, data);
export const deleteOrganization = (id) => api.delete(`/organizations/${id}`);

export const getDashboardStats = () => api.get('/dashboard/stats');
