/** 云库 pets.species：1 猫 2 狗 3 其他 4 异宠 */
const SPECIES_BY_ID = {
  1: '猫',
  2: '狗',
  3: '其他',
  4: '异宠',
};

/** 选择器展示顺序：狗、猫、异宠、其他 */
const SPECIES_PICKER_CODES = [2, 1, 4, 3];
const SPECIES_OPTIONS = SPECIES_PICKER_CODES.map((code) => SPECIES_BY_ID[code]);
const SPECIES_MAX = 4;

function speciesLabel(species) {
  const n = Number(species);
  return SPECIES_BY_ID[n] || '';
}

function speciesPickerIndex(species) {
  const n = Number(species);
  const idx = SPECIES_PICKER_CODES.indexOf(n);
  return idx >= 0 ? idx : 0;
}

function speciesFromPickerIndex(index) {
  const i = Number(index);
  const code = SPECIES_PICKER_CODES[i];
  return code != null ? code : 2;
}

module.exports = {
  SPECIES_OPTIONS,
  SPECIES_MAX,
  speciesLabel,
  speciesPickerIndex,
  speciesFromPickerIndex,
};
