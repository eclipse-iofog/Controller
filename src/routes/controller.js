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
    path: '/api/v3/email-activation',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/fog-types',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  }
];