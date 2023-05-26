import { rest } from 'config';

import RequestResult from './RequestResult';

class AnswerRender extends RequestResult {
    private template: any;

    constructor(template) {
        super();

        this.template = template;
    }

    async send(req, res, answer) {
        const patched = (answer || {});

        Object.assign(patched, { config: { rest } });

        return res.render(this.template, await super.send(req, res, patched));
    }

    describe() {
        return {
            ...super.describe(),
            action: 'render'
        };
    }
}
export default AnswerRender;
