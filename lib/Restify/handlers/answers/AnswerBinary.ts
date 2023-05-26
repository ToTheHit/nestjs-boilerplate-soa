import RequestResult from './RequestResult';

class AnswerBinary extends RequestResult {
    private contentType: string; // TODO: add enum of allowed types

    constructor(contentType) {
        super();

        this.contentType = contentType;
    }

    async send(req, res, answer) {
        const result = await super.send(req, res, answer);

        res.set({
            'Content-Length': result.length,
            'Content-Type': this.contentType
        });

        return res.end(answer, 'binary');
    }

    describe() {
        return { action: 'binary' };
    }
}

export default AnswerBinary;
