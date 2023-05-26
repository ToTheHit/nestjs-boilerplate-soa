import AnswerWithSchema from './AnswerWithSchema';

class AnswerRawJson extends AnswerWithSchema {
    async send(req, res, answer) {
        const result = await super.send(req, res, answer);

        return typeof result === 'string'
            ? res.end(result)
            : res.json(result);
    }

    describe() {
        return {
            ...super.describe(),
            action: 'json'
        };
    }
}

export default AnswerRawJson;
