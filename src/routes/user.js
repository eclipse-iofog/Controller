module.exports = [
  {
    method: 'post',
    path: '/api/v3/user/login',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    },
  },
]