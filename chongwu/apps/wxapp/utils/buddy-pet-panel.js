/** 搭子详情 · 宠物信息区展示字段 */
function buildBuddyPetPanel(buddy) {
  const b = buddy || {};
  const name = (b.petName || '').trim() || '毛孩子';
  const species = (b.petSpecies || '').trim();
  const breed = (b.breed || '').trim();
  const age = (b.age || '').trim();

  const headlineParts = [name];
  const kindInHeadline = species || breed;
  if (kindInHeadline) headlineParts.push(kindInHeadline);
  if (age) headlineParts.push(age);

  let petBreedLine = '';
  if (breed && breed !== kindInHeadline) petBreedLine = breed;

  const petTags = [];
  const seen = new Set();
  const pushTag = (t) => {
    const s = String(t || '').trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    petTags.push(s);
  };
  (b.tags || []).forEach(pushTag);
  pushTag(b.personality);

  return {
    petHeadline: headlineParts.join(' · '),
    petBreedLine,
    petTags: petTags.slice(0, 8),
  };
}

module.exports = { buildBuddyPetPanel };
