import RequestResult from './RequestResult';

class AnswerRedirect extends RequestResult {
    async send(req, res, answer) {
        res.set({
            'Cache-Control': 'proxy-revalidate, max-age=3600'
        });

        return res.answerRedirect(await super.send(req, res, answer));
    }

    describe() {
        return { action: 'redirect' };
    }
}

export default AnswerRedirect;
