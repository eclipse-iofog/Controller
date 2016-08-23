import express from 'express';
const router = express.Router();
import userManager from './../managers/userManager';
import errorUtils from './../utils/errorUtils';

router.post('/find-user-by-email', (req, res) => {
  let email = req.body.email;
  userManager.findByEmail(email)
  .then((existingUser) => {
    console.log(existingUser);

    if(null == existingUser){
      res.send("user not found");
      return;
    }
    res.send(existingUser);
  })
  .catch((error) => {
    res.render('confirm-registration', {error: 'internal server error'});
  });
});

router.get('/onboarding', (req, res) => {
  res.render('onboarding');
});


export default router;
