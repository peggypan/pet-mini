const { HEALING_EVENT_CATEGORY } = require('./mock');
const { displayPublishTime } = require('./relative-time');

function isHealingEvent(event) {
  return (event && event.category) === HEALING_EVENT_CATEGORY;
}

/** @param {'all' | 'healing'} plazaFilter */
function filterEventsForPlaza(events, plazaFilter) {
  const list = Array.isArray(events) ? events : [];
  if (plazaFilter === 'healing') {
    return list.filter(isHealingEvent);
  }
  return list;
}

function decorateEventPlazaRow(event) {
  const isHealing = isHealingEvent(event);
  const publishTime = displayPublishTime(event) || event.publishTime || '';
  return {
    ...event,
    isHealing,
    categoryLabel: event.category || (isHealing ? HEALING_EVENT_CATEGORY : ''),
    publishTime,
  };
}

function mapEventsForPlaza(events, plazaFilter) {
  return filterEventsForPlaza(events, plazaFilter).map(decorateEventPlazaRow);
}

module.exports = {
  isHealingEvent,
  filterEventsForPlaza,
  decorateEventPlazaRow,
  mapEventsForPlaza,
};
