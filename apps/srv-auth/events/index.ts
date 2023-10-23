import HandlersMap from '@db/RabbitMQ/HandlersMap';
import bumpUserActivity from './bumpUserActivity';

const eventsMap = new HandlersMap();

eventsMap.set('bumpUserActivity', bumpUserActivity);

export default eventsMap;
