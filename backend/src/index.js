const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { authenticate } = require('./middleware/auth');
const prisma = require('./prismaClient');
const authRouter = require('./routes/auth');
const personsRouter = require('./routes/persons');
const trainingRouter = require('./routes/training');
const workexpRouter = require('./routes/workexp');
const followupRouter = require('./routes/followup');
const skillsRouter = require('./routes/skills');
const organizationsRouter = require('./routes/organizations');
const dashboardRouter = require('./routes/dashboard');
const usersRouter = require('./routes/users');
const personorgRouter = require('./routes/personorg');
const photosRouter = require('./routes/photos');
const aggregateRouter = require('./routes/aggregate');
const batchesRouter = require('./routes/batches');
const assessmentsRouter = require('./routes/assessments');
const systemRouter = require('./routes/system');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'https://kmutt-pwd-db.vercel.app'];

// อยู่หลัง nginx — ต้องเชื่อ X-Forwarded-For ไม่งั้นจะเห็นทุกคนเป็น IP เดียวกัน (127.0.0.1)
// แล้ว rate limit จะบล็อกทุกคนพร้อมกันตอนมีใครยิงถี่
app.set('trust proxy', 1);

// security headers พื้นฐาน (กัน clickjacking, MIME sniffing ฯลฯ)
// ปิด CSP เพราะหน้าเว็บเสิร์ฟจาก nginx ไม่ได้ผ่าน express — ตั้งที่นี่จะไม่มีผลและกวนของเดิม
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(compression());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── จำกัดอัตราการเรียก API ──
const msg = (error) => ({ error });

// ทั้งระบบ: กันยิงถล่ม แต่ตั้งหลวมพอให้ทั้งสำนักงานใช้พร้อมกันได้ (หลายคนอาจออกเน็ต IP เดียวกัน)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',   // health check ต้องเรียกได้เสมอ
  message: msg('เรียกใช้งานระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'),
});

// หน้าล็อกอิน: เข้มกว่ามาก เพราะเป็นช่องให้เดารหัสผ่าน
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,            // ล็อกอินถูกไม่นับ นับเฉพาะที่ผิด
  message: msg('ลองเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'),
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// เสิร์ฟไฟล์รูปถ่ายที่เก็บบนดิสก์ (ชื่อไฟล์เป็นรหัสสุ่ม เดาไม่ได้)
// cache 7 วัน — ชื่อไฟล์เปลี่ยนทุกครั้งที่อัปโหลดใหม่ จึงไม่ค้างรูปเก่า
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  fallthrough: true,
  index: false,
  dotfiles: 'deny',
}));

app.use('/api/auth', authRouter);

app.use('/api/persons', authenticate, personsRouter);
app.use('/api/persons', authenticate, trainingRouter);
app.use('/api/persons', authenticate, workexpRouter);
app.use('/api/persons', authenticate, followupRouter);
app.use('/api/persons', authenticate, skillsRouter);
app.use('/api/persons', authenticate, personorgRouter);
app.use('/api/persons', authenticate, photosRouter);
app.use('/api/data', authenticate, aggregateRouter);
app.use('/api/organizations', authenticate, organizationsRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/system', systemRouter);
app.use('/api/batches', authenticate, batchesRouter);
app.use('/api/persons', authenticate, assessmentsRouter);

// ping เบา ๆ สำหรับ keep-alive (ไม่แตะ DB) — ให้ Neon auto-suspend ได้ ประหยัดโควต้า compute
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;   // ยืนยันว่า DB พร้อมด้วย ไม่ใช่แค่ server ตื่น
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db_not_ready' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
