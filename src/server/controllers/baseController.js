import logger from '../utils/winstonLogs';

const mainPageEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  res.render("controller-status")
};

export default {
  mainPageEndPoint: mainPageEndPoint
};