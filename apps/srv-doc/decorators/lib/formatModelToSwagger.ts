export default Model => {
    const typeSchema = Array.isArray(Model) ? 'array' : 'object';
    const schemaModel = Array.isArray(Model) ? Model[0]?.schema?.tree : Model?.schema?.tree;
    const properties = {};

    Object.keys(schemaModel).forEach(key => {
        if (!schemaModel[key]?.private) {
            let typeProp = schemaModel[key]?.type;
            let defaultProp = schemaModel[key]?.default;

            if ((typeof Model[key]?.type === 'function' || Model[key]?.type === undefined) &&
                !Array.isArray(typeProp)) {
                typeProp = schemaModel[key]?.type?.name;
            }

            if (Array.isArray(typeProp)) {
                if (schemaModel[key]?.type[0]?.obj) {
                    typeProp = {};
                    const temp = schemaModel[key]?.type[0]?.obj;

                    Object.keys(temp).forEach(t => {
                        const tempType = temp[t]?.$type || temp[t]?.type;

                        typeProp[t] = {
                            type: typeof tempType === 'function' ? tempType?.name : tempType,
                            description: temp[t]?.description,
                            default: temp[t]?.default
                        };
                    });
                } else if (Array.isArray(schemaModel[key]?.type)) {
                    const tempType = typeof schemaModel[key]?.type[0]?.type === 'function'
                        ? schemaModel[key]?.type[0]?.type?.name : schemaModel[key]?.type[0]?.type;

                    typeProp = {
                        type: tempType,
                        description: schemaModel[key]?.type[0]?.description,
                        default: schemaModel[key]?.type[0]?.default
                    };
                }
            }

            if (typeof defaultProp === 'function' && !Array.isArray(defaultProp)) {
                defaultProp = schemaModel[key]?.default?.name;
            }

            // if (Array.isArray(defaultProp)) {
            // defaultProp = schemaModel[key]?.default?.name;
            //   console.log('defaultProp #s2>>>', defaultProp, schemaModel[key]?.default, key);
            // }

            properties[key] = {
                type: typeProp || 'string',
                default: defaultProp || null,
                description: schemaModel[key]?.description || ''
            };
        }
    });

    return { type: typeSchema, properties };
};
