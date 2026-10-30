import { Router } from 'express';

const fail = (status, message) => Object.assign(new Error(message), { status });
const validExpert = (x) => x && Number.isSafeInteger(x.id) && x.id > 0 && typeof x.name === 'string' && typeof x.estate === 'string' && Number.isFinite(x.rating) && (x.bio === undefined || typeof x.bio === 'string') && (x.latitude === undefined || Number.isFinite(x.latitude)) && (x.longitude === undefined || Number.isFinite(x.longitude)) && Array.isArray(x.skills) && x.skills.every((s) => typeof s === 'string');
const validSkill = (x) => x && Number.isInteger(x.id) && typeof x.name === 'string' && typeof x.category === 'string';
const listOf = (check) => (value) => Array.isArray(value) && value.every(check);
const validReviews = (x) => x && Number.isFinite(x.rating) && ['reviewCount', 'completedSessions'].every((k) => Number.isInteger(x[k]) && x[k] >= 0);
const validSlots = listOf((x) => x && typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && typeof x.startTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(x.startTime) && Number.isInteger(x.durationMinutes) && x.durationMinutes > 0);

export function createSkillBridgeClient({ baseUrl = process.env.SKILLBRIDGE_BASE_URL || 'https://skillbridge-api-p6s9.onrender.com/api', apiKey = process.env.SKILLBRIDGE_API_KEY, fetchImpl = fetch, timeoutMs = 12000, onFailure = (event) => console.error(JSON.stringify(event)) } = {}) {
  return async (path, validate, { method = 'GET', body } = {}) => {
    const started = Date.now();
    let upstreamStatus;
    try {
      if (!apiKey?.trim()) throw fail(503, 'SkillBridge integration credentials are not configured. Contact the AgroConnect team.');
      const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}${path}`, { method, headers: { Accept: 'application/json', 'X-API-Key': apiKey.trim(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
      upstreamStatus = response.status;
      if (!response.ok) {
        if ([401, 403].includes(response.status)) throw fail(503, 'SkillBridge integration credentials were rejected. Contact the AgroConnect team.');
        const status = [400, 404, 409, 422, 429].includes(response.status) ? response.status : 503;
        const messages = { 400: 'SkillBridge rejected the request.', 404: 'This SkillBridge resource could not be found.', 409: 'The consultation slot is no longer available.', 422: 'SkillBridge could not validate the consultation.', 429: 'SkillBridge is busy. Please try again later.' };
        throw fail(status, messages[status] || 'SkillBridge is temporarily unavailable. Please try again shortly.');
      }
      let data;
      try { data = await response.json(); } catch { throw fail(502, 'SkillBridge returned an invalid response.'); }
      if (!validate(data)) throw fail(502, 'SkillBridge returned an unexpected response.');
      // Project validated upstream data so extra fields never reach consumers.
      const fields = path.startsWith('/experts') && !/\/(reviews|availability)$/.test(path.split('?')[0])
        ? ['id', 'name', 'estate', 'rating', 'bio', 'latitude', 'longitude', 'skills', 'distanceKm']
        : path.startsWith('/skills') ? ['id', 'name', 'category']
          : path.endsWith('/reviews') ? ['rating', 'reviewCount', 'completedSessions']
            : path.endsWith('/availability') ? ['date', 'startTime', 'durationMinutes']
              : ['requestId', 'status'];
      const project = (item) => Object.fromEntries(fields.filter((key) => item[key] !== undefined).map((key) => [key, item[key]]));
      return Array.isArray(data) ? data.map(project) : project(data);
    } catch (error) {
      const result = error.status ? error : fail(503, 'SkillBridge is temporarily unavailable. Please try again shortly.');
      // Operational events intentionally exclude personal data and request bodies.
      onFailure({ integration: 'skillbridge', method, endpoint: path.split('?')[0], status: result.status, upstreamStatus, elapsedMs: Date.now() - started });
      throw result;
    }
  };
}

export function createSkillBridgeRouter(options = {}) {
  const router = Router();
  const get = createSkillBridgeClient(options);
  router.param('id', (req, _res, next, id) => {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return next(fail(400, 'Choose a valid expert.'));
    next();
  });
  const queryText = (value) => {
    if (value === undefined) return '';
    if (typeof value !== 'string') throw fail(400, 'Query parameters must be single text values.');
    return value.trim();
  };
  async function agriculture() {
    const skills = (await get('/skills?tag=Agriculture', listOf(validSkill))).filter((s) => s.category.toLowerCase() === 'agriculture');
    return skills;
  }
  router.get('/experts', async (req, res) => {
    const sort = queryText(req.query.sort) || 'rating';
    if (!['rating', 'proximity'].includes(sort)) throw fail(400, 'Sort must be rating or proximity.');
    const estateFilter = queryText(req.query.estate);
    const skill = queryText(req.query.skill).toLowerCase();
    const search = queryText(req.query.search).toLowerCase();
    const lat = queryText(req.query.lat);
    const lng = queryText(req.query.lng);
    if (sort === 'proximity' || lat || lng) {
      if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) throw fail(400, 'Provide valid latitude and longitude together.');
    }
    const params = new URLSearchParams({ sort });
    if (estateFilter) params.set('estate', estateFilter);
    if (lat && lng) { params.set('lat', lat); params.set('lng', lng); }
    const [experts, skills] = await Promise.all([get(`/experts?${params}`, listOf(validExpert)), agriculture()]);
    if (sort === 'proximity' && experts.some((e) => !Number.isFinite(e.distanceKm) || e.distanceKm < 0)) throw fail(502, 'SkillBridge omitted proximity distances.');
    const names = new Set(skills.map((s) => s.name.toLowerCase()));
    const relevant = experts.filter((e) => e.skills.some((s) => names.has(s.toLowerCase())));
    const estates = [...new Set(relevant.map((e) => e.estate))].sort();
    const filtered = relevant.filter((e) => (!skill || e.skills.some((s) => names.has(s.toLowerCase()) && s.toLowerCase() === skill)) && (!search || `${e.name} ${e.bio || ''} ${e.skills.join(' ')}`.toLowerCase().includes(search)));
    res.json({ experts: filtered.sort(sort === 'proximity' ? (a, b) => a.distanceKm - b.distanceKm : (a, b) => b.rating - a.rating), skills, estates });
  });
  router.get('/skills', async (req, res) => {
    const tag = queryText(req.query.tag);
    res.json({ skills: await get(`/skills${tag ? `?${new URLSearchParams({ tag })}` : ''}`, listOf(validSkill)) });
  });
  async function expertById(id) {
    const expert = await get(`/experts/${id}`, validExpert);
    if (expert.id !== Number(id)) throw fail(502, 'SkillBridge returned the wrong expert.');
    const skills = await agriculture();
    if (!expert.skills.some((name) => skills.some((s) => s.name.toLowerCase() === name.toLowerCase()))) throw fail(404, 'This expert does not offer agricultural skills.');
    return expert;
  }
  router.get('/experts/:id/reviews', async (req, res) => {
    await expertById(req.params.id);
    res.json({ reviews: await get(`/experts/${req.params.id}/reviews`, validReviews) });
  });
  router.get('/experts/:id/availability', async (req, res) => {
    await expertById(req.params.id);
    res.json({ availability: await get(`/experts/${req.params.id}/availability`, validSlots) });
  });
  router.get('/experts/:id', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id)) throw fail(400, 'Choose a valid expert.');
    const expert = await expertById(req.params.id);
    // Optional sections fail independently so an available profile stays usable.
    const [reviews, availability] = await Promise.allSettled([
      get(`/experts/${req.params.id}/reviews`, validReviews),
      get(`/experts/${req.params.id}/availability`, validSlots),
    ]);
    res.json({ expert, reviews: reviews.status === 'fulfilled' ? reviews.value : null, availability: availability.status === 'fulfilled' ? availability.value : null });
  });
  router.use((error, _req, res, _next) => {
    void _next;
    res.status(error.status || 502).json({ message: error.status ? error.message : 'SkillBridge is unavailable.' });
  });
  return router;
}
