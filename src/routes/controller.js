module.exports = [
    {
        method: 'get',
        path: '/api/v3/status',
        middleware: (req, res) => {
            res
                .status(200)
                .send({
                    "status": "ok",
                    "timestamp": Date.now(),
                })
        }
    },
    {
        method: 'get',
        path: '/api/v3/emailActivation',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/fogTypes',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    }
]