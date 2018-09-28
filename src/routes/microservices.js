module.exports = [
    {
        method: 'get',
        path: '/api/v3/iofog/microservices',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'post',
        path: '/api/v3/iofog/microservices',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'get',
        path: '/api/v3/iofog/microservices/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'patch',
        path: '/api/v3/iofog/microservices/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/iofog/microservices/:id',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'post',
        path: '/api/v3/iofog/microservices/:id/routes/:receiverId',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    },
    {
        method: 'delete',
        path: '/api/v3/iofog/microservices/:id/routes/:receiverId',
        middleware: (req, res) => {
            res
                .status(200)
                .send(req.body)
        }
    }
]