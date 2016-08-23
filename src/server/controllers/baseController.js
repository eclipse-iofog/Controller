import express from 'express';
const router = express.Router();

import errorUtils from './../utils/errorUtils';

router.get('/', (req, res) => {
  res.render("controller-status")
});

export default router;
