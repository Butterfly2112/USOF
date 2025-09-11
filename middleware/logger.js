const chalk = require('chalk');

function logger(req, res, next) {
  const start = Date.now(); // Время начала запроса

  res.on('finish', () => {
    const duration = Date.now() - start;
    const methodColor =
      req.method === 'GET' ? chalk.green :
      req.method === 'POST' ? chalk.blue :
      req.method === 'PUT' ? chalk.yellow :
      req.method === 'DELETE' ? chalk.red :
      chalk.white;

    const statusColor =
      res.statusCode >= 500 ? chalk.red :
      res.statusCode >= 400 ? chalk.yellow :
      res.statusCode >= 300 ? chalk.cyan :
      chalk.green;

    console.log(
      `${chalk.gray(new Date().toISOString())} | ${methodColor(req.method)} ${req.originalUrl} | Status: ${statusColor(res.statusCode)} | ${chalk.magenta(duration + 'ms')}`
    );
  });

  next();
}

module.exports = logger;
