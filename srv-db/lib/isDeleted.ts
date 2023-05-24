export default (Model, ignoreDeletion = false) =>
  Model.is('Deletable')
    ? {
        isDeleted: ignoreDeletion ? 'ignore' : false,
      }
    : {};
