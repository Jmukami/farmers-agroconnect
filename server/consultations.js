import { Router } from 'express';
import { createSkillBridgeClient } from './skillbridge.js';

const columns = `id, expert_id AS expertId, expert_name AS expertName, topic, appointment_at AS date,
  submission_state AS submissionState, partner_request_id AS requestId, partner_status AS partnerStatus, created_at AS createdAt`;

export function createConsultationRouter({ db, authenticate, ...options }) {
  const router = Router();
  const upstream = createSkillBridgeClient(options);
  router.use(authenticate);
  router.get('/', async (req, res) => {
    res.json({ consultations: await db.prepare(`SELECT ${columns} FROM consultations WHERE user_id = ? ORDER BY id DESC`).all(req.user.id) });
  });
  router.post('/', async (req, res) => {
    const { expertId } = req.body;
    const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
    const date = req.body.date;
    if (!Number.isSafeInteger(expertId) || expertId < 1 || topic.length < 3 || topic.length > 1000 || typeof date !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(date) || !Number.isFinite(Date.parse(date)) || Date.parse(date) <= Date.now()) {
      return res.status(422).json({ message: 'Provide an expert, a topic of 3–1000 characters, and a future date-time with an explicit timezone offset.' });
    }
    const appointment = new Date(date).toISOString();
    const [expert, skills] = await Promise.all([
      upstream(`/experts/${expertId}`, (x) => x && x.id === expertId && typeof x.name === 'string' && Array.isArray(x.skills) && x.skills.every((s) => typeof s === 'string')),
      upstream('/skills?tag=Agriculture', (x) => Array.isArray(x) && x.every((s) => s && typeof s.name === 'string' && typeof s.category === 'string')),
    ]);
    if (!expert.skills.some((name) => skills.some((s) => s.category.toLowerCase() === 'agriculture' && s.name.toLowerCase() === name.toLowerCase()))) return res.status(422).json({ message: 'Choose an agricultural expert.' });
    // Persist before sending. A crash or lost response must never cause an automatic duplicate POST.
    const claimed = await db.transaction(async () => {
      const existing = await db.prepare('SELECT id FROM consultations WHERE user_id = ? AND expert_id = ? AND appointment_at = ?').get(req.user.id, expertId, appointment);
      if (existing) return null;
      return (await db.prepare(`INSERT INTO consultations (user_id, expert_id, expert_name, topic, appointment_at, submission_state) VALUES (?, ?, ?, ?, ?, 'submitting')`).run(req.user.id, expertId, expert.name, topic, appointment)).lastInsertRowid;
    });
    if (!claimed) return res.status(409).json({ message: 'A request for this expert and time already exists. Check your consultation history before trying another time.' });
    let result;
    try {
      result = await upstream('/requests', (x) => x && Number.isSafeInteger(x.requestId) && x.requestId > 0 && typeof x.status === 'string' && x.status.length > 0, { method: 'POST', body: { farmerName: req.user.fullName, topic, expertId, date: appointment } });
    } catch (error) {
      const definiteRejection = [400, 404, 409, 422, 429].includes(error.status);
      await db.prepare('UPDATE consultations SET submission_state = ? WHERE id = ?').run(definiteRejection ? 'rejected' : 'unknown', claimed);
      return res.status(error.status || 503).json({ message: definiteRejection ? error.message : 'The booking outcome is unknown. SkillBridge may have received it. Check consultation history and contact SkillBridge before submitting another request.', consultationId: claimed });
    }
    await db.prepare(`UPDATE consultations SET submission_state = 'submitted', partner_request_id = ?, partner_status = ? WHERE id = ?`).run(result.requestId, result.status, claimed);
    res.status(201).json({ consultation: await db.prepare(`SELECT ${columns} FROM consultations WHERE id = ?`).get(claimed) });
  });
  router.use((error, _req, res, next) => {
    if (!error.status) return next(error);
    return res.status(error.status).json({ message: error.message });
  });
  return router;
}
