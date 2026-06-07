const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');

router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id || req.user.user?.id });
    if (!kps || kps.length === 0) return res.json({ nodes: [], links: [] });
    const nodes = kps.map(kp => ({
      id: kp._id.toString(),
      name: kp.title,
      value: (kp.content || '').slice(0, 100),
      symbolSize: 20 + Math.min(((kp.content || '').length) / 50, 30),
      status: kp.status || 'not_started',
      reviewList: !!kp.reviewList,
      createdAt: kp.createdAt,
    }));
    const links = [];
    const titleMap = new Map(kps.map(kp => [kp.title, kp._id.toString()]));
    for (const source of kps) {
      for (const targetTitle of titleMap.keys()) {
        if (source.title === targetTitle) continue;
        if ((source.content || '').includes(targetTitle)) {
          links.push({ source: source._id.toString(), target: titleMap.get(targetTitle), label: { show: true, formatter: '引用' } });
        }
      }
    }

    const tagToIds = new Map();
    for (const kp of kps) {
      const tags = Array.isArray(kp.tags) ? kp.tags : [];
      for (const tag of tags) {
        const key = String(tag || '').trim();
        if (!key) continue;
        if (!tagToIds.has(key)) tagToIds.set(key, []);
        tagToIds.get(key).push(kp._id.toString());
      }
    }

    const linkKeySet = new Set(links.map(l => `${l.source}\u0000${l.target}\u0000${l.label?.formatter || ''}`));
    for (const [tag, ids] of tagToIds.entries()) {
      const uniqIds = Array.from(new Set(ids));
      if (uniqIds.length < 2) continue;
      const hub = uniqIds[0];
      for (let i = 1; i < uniqIds.length; i++) {
        const target = uniqIds[i];
        const key = `${hub}\u0000${target}\u0000${tag}`;
        if (linkKeySet.has(key)) continue;
        linkKeySet.add(key);
        links.push({ source: hub, target, label: { show: true, formatter: tag } });
      }
    }
    res.json({ nodes, links });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
