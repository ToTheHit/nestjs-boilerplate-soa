import AnswerWithSchema from './AnswerWithSchema';

class AnswerRegular extends AnswerWithSchema {
    async send(req, res, answer) {
        return res.answerSend(await super.send(req, res, answer));
    }

    describe() {
        return {
            ...super.describe(),
            action: 'regular'
        };
    }
}

export default AnswerRegular;
