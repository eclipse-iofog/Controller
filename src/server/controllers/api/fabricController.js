/**
 * @file fabricController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import express from 'express';
const router = express.Router();
 /**
   * @desc - if this end-point is hit it sends a timeStamp in milliseconds back to the client
   * (Used to check if the server is active)
   * @return - returns and appropriate response to the client
   */
router.get('/api/v2/status', (req, res) => {
	var milliseconds = new Date().getTime();
	res.status(200);
	res.send({
		"status": "ok",
		"timestamp": milliseconds
	});
});

export default router;