const getMethodToCheck = (Model, query) => (!Model.is('Archivable') || query.force
    ? 'delete'
    : 'archive');

const removeObject = (Model, req) => (getMethodToCheck(Model, req.query) === 'delete'
    ? req.currentObject.deleteObject(req.profile, req.query, req.baseObject)
    : req.currentObject.archiveObject(req.profile, req.query, req.baseObject));

const removeObjectsList = (Model, req) => (getMethodToCheck(Model, req.query) === 'delete'
    ? Model.deleteObjectsList(req.profile, req.query, req.baseObject)
    : Model.archiveObjectsList(req.profile, req.query, req.baseObject));

export { removeObjectsList, removeObject };
