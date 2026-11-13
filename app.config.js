const { expo } = require('./app.json');

// GitHub Pages project sites are served under /repository-name/.
// Local development keeps the root URL from app.json.
module.exports = {
  ...expo,
  experiments: {
    ...expo.experiments,
    ...(process.env.AQUARIUM_BASE_PATH ? { baseUrl: process.env.AQUARIUM_BASE_PATH } : {}),
  },
};
