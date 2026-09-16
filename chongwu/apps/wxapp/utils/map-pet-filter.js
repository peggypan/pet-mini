/** 点位宠物友好度：友好 / 不友好 / 毒点 */

const PET_FAB_ITEMS = [
  { id: 'friendly', name: '宠物友好', short: '友好', emoji: '🐾' },
  { id: 'unfriendly', name: '宠物不友好', short: '不友好', emoji: '🚫' },
  { id: 'danger', name: '宠物毒点', short: '毒点', emoji: '☠️' },
  { id: 'petHospital', name: '宠物医院', short: '医院', emoji: '🏥' },
  { id: 'petStore', name: '宠物门店', short: '门店', emoji: '🏪' },
];

function isPetServicePoint(point) {
  if (!point) return false;
  if (point.category === 'petHospital' || point.category === 'petStore') return true;
  const t = String(point.type || '');
  return t === '宠物医院' || t === '宠物门店' || t === '宠物店';
}

function getPetSentiment(point) {
  if (isPetServicePoint(point) || point.petFriendly === true) {
    return 'friendly';
  }
  const t = String((point && point.type) || '');
  if (point && (point.danger || t === '宠物毒点' || t.includes('毒') || t.includes('危险'))) {
    return 'danger';
  }
  if (t === '宠物不友好' || t.includes('不友好') || (point && point.allowPet === false)) {
    return 'unfriendly';
  }
  return 'friendly';
}

function filterPointsByPetSentiment(points, petFilter) {
  if (!petFilter) return points || [];
  if (petFilter === 'petHospital') {
    return (points || []).filter(
      (p) => p.category === 'petHospital' || p.type === '宠物医院' || String(p.type || '').includes('动物医院'),
    );
  }
  if (petFilter === 'petStore') {
    return (points || []).filter(
      (p) => p.category === 'petStore' || p.type === '宠物门店' || p.type === '宠物店' || String(p.type || '').includes('宠物用品'),
    );
  }
  return (points || []).filter((p) => getPetSentiment(p) === petFilter);
}

function getPetFabLabel(petFilter) {
  const item = PET_FAB_ITEMS.find((i) => i.id === petFilter);
  return item ? item.short : '筛选';
}

module.exports = {
  PET_FAB_ITEMS,
  getPetSentiment,
  filterPointsByPetSentiment,
  getPetFabLabel,
};
