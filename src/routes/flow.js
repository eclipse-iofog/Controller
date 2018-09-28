module.exports = [
    {
        method: 'get',
        path: '/api/v3/flow',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'post',
        path: '/api/v3/flow',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/flow/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'patch',
        path: '/api/v3/flow/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/flow/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    }
]