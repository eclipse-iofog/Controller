import express from 'express';
const router = express.Router();

import errorUtils from './../utils/errorUtils';

router.get('/', (req, res) => {
  res.render("io-landing")
});

router.get('/onboarding', (req, res) => {
  res.render('onboarding');
});


export default router;
