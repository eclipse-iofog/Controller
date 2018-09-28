module.exports = [
    {
        method: 'get',
        path: '/api/v3/catalog/microservices',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'post',
        path: '/api/v3/catalog/microservices',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/catalog/microservices/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'patch',
        path: '/api/v3/catalog/microservices/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/catalog/microservices/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    }
]