const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const sample = require('./data/sample');

function ensureDb() {
  if (!fs.existsSync(DATA_PATH)) {
    writeDb(sample);
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/pills', (_, res) => {
  const data = readDb();
  res.json(data.pills);
});

app.post('/pills', (req, res) => {
  const data = readDb();
  const pill = {
    id: req.body.id || `pill-${Date.now()}`,
    name: req.body.name,
    color: req.body.color || '#ffffff',
    shape: req.body.shape || 'round',
    cartridgeIndex: req.body.cartridgeIndex ?? data.pills.length,
    maxDailyDose: req.body.maxDailyDose ?? 1,
    stockCount: req.body.stockCount ?? 0,
    lowStockThreshold: req.body.lowStockThreshold ?? 0,
    createdAt: Date.now(),
  };
  data.pills.push(pill);
  writeDb(data);
  res.status(201).json(pill);
});

app.put('/pills/:id', (req, res) => {
  const data = readDb();
  const index = data.pills.findIndex((pill) => pill.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Pill not found' });
  }
  data.pills[index] = { ...data.pills[index], ...req.body };
  writeDb(data);
  res.json(data.pills[index]);
});

app.delete('/pills/:id', (req, res) => {
  const data = readDb();
  const index = data.pills.findIndex((pill) => pill.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Pill not found' });
  }
  data.pills.splice(index, 1);
  writeDb(data);
  res.status(204).end();
});

app.get('/hardware-profiles', (_, res) => {
  const data = readDb();
  res.json(data.hardwareProfiles);
});

app.put('/hardware-profiles/:pillId', (req, res) => {
  const data = readDb();
  const payload = { ...req.body, pillId: req.params.pillId };
  const index = data.hardwareProfiles.findIndex((profile) => profile.pillId === req.params.pillId);
  if (index === -1) {
    data.hardwareProfiles.push(payload);
  } else {
    data.hardwareProfiles[index] = { ...data.hardwareProfiles[index], ...payload };
  }
  writeDb(data);
  res.json(payload);
});

app.delete('/hardware-profiles/:pillId', (req, res) => {
  const data = readDb();
  const index = data.hardwareProfiles.findIndex((profile) => profile.pillId === req.params.pillId);
  if (index === -1) {
    return res.status(404).json({ message: 'Hardware profile not found' });
  }
  data.hardwareProfiles.splice(index, 1);
  writeDb(data);
  res.status(204).end();
});

app.post('/seed', (_, res) => {
  writeDb(sample);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PillBox API listening on port ${PORT}`);
});

