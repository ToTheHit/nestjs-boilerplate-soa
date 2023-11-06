import HandlersMap from '@db/RabbitMQ/HandlersMap';
import changePasswordRequest from './changePasswordRequest';
import bumpUserActivity from './bumpUserActivity';
import dropSession from './dropSession';

const eventsMap = new HandlersMap();

eventsMap.set('bumpUserActivity', bumpUserActivity);
eventsMap.set('changePasswordRequest', changePasswordRequest);
eventsMap.set('dropSession', dropSession);

export default eventsMap;
