const express = require('express');
const { Log } = require('./logger');

const app = express();

function loggerMiddleware(req, res, next) {
  Log("backend", "info", "middleware", `${req.method} ${req.url} received`);
  next();
}

app.use(loggerMiddleware);

app.get('/', (req, res) => {
  res.send('Hello');
});

app.listen(3000, () => {
  Log("backend", "info", "service", "Server started on port 3000");
});