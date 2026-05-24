const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authenticate } = require('./middleware/auth');
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

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);

app.use('/api/persons', authenticate, personsRouter);
app.use('/api/persons', authenticate, trainingRouter);
app.use('/api/persons', authenticate, workexpRouter);
app.use('/api/persons', authenticate, followupRouter);
app.use('/api/persons', authenticate, skillsRouter);
app.use('/api/persons', authenticate, personorgRouter);
app.use('/api/organizations', authenticate, organizationsRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
