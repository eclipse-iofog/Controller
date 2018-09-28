module.exports = [
    {
        method: 'post',
        path: '/api/v3/iofog/microservices/:id/imageSnapshot',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/iofog/microservices/:id/imageSnapshot',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'post',
        path: '/api/v3/iofog/microservices/:id/strace',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/iofog/microservices/:id/strace',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/iofog/microservices/:id/strace',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'put',
        path: '/api/v3/iofog/microservices/:id/strace',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    }
]