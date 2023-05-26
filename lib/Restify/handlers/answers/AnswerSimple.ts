import { Injectable } from '@nestjs/common';
import RequestResult from './RequestResult';

@Injectable()
class AnswerSimple extends RequestResult {
    private datatype: any;

    constructor(datatype) {
        super();

        this.datatype = datatype;
    }

    async send(req, res, answer) {
        const result = await super.send(req, res, answer);

        const check = Array.isArray(this.datatype)
            ? this.datatype.every(datatype => result instanceof datatype)
            : result instanceof this.datatype;

        if (!check) {
            // throw new Error('answer schema mismatch'); // FIXME: реализовать валидацию ответа
        }

        return res.answerSend(result);
    }

    describe() {
        return {
            action: 'simple'
        };
    }
}
export default AnswerSimple;
