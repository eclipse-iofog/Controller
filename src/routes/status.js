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
    },
  },
]