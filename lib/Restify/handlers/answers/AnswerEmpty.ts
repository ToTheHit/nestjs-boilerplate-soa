import RequestResult from './RequestResult';

class AnswerEmpty extends RequestResult {
    async send(req, res, answer) {
        const result = await super.send(req, res, answer);

        if (result) {
            throw new Error('answer schema mismatch');
        }

        return res.answerSend();
    }

    describe() {
        return { action: 'empty' };
    }
}

export default AnswerEmpty;
