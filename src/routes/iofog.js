module.exports = [
  {
    method: 'post',
    path: '/api/v3/iofog/list',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/iofog',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/iofog/:id',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/iofog/:id',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:id',
    middleware: async (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:id/provisioning-key',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/iofog/:id/version/:versionCommand',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  }
];