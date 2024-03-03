import HandlersMap from '@db/HandlersMap';
import createUserFs from '@srvMedia/events/createUserFs';

const eventsMap = new HandlersMap();

eventsMap.set('createUserFs', createUserFs);

export default eventsMap;
