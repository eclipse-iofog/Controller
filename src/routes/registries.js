module.exports = [
    {
        method: 'post',
        path: '/api/v3/registries',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/registries',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/registries/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
]