class RequestResult {
    async send(req, res, answer) {
        res.set({ 'X-Date': `${Date.now()}` });

        return answer;
    }

    describe() {
        return null;
    }
}

export default RequestResult;
