module.exports = [
    {
        method: 'post',
        path: '/api/v3/iofog/:id/tunnel',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/iofog/:id/tunnel',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/iofog/:id/tunnel',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    }
]