import RequestResult from './RequestResult';

class AnswerStream extends RequestResult {
    private contentType: string;

    constructor(contentType) {
        super();

        this.contentType = contentType;
    }

    async send(req, res, answer) {
        const result = await super.send(req, res, answer);

        res.set({
            'Content-Type': this.contentType
        });

        if (result) {
            result.pipe(res);
        } else {
            res.end();
        }
    }

    describe() {
        return { action: 'stream' };
    }
}

export default AnswerStream;
