const mongoose = require("mongoose");

async function connect(url) {
  return mongoose.connect(url);
}

module.exports = {
  connect,
};
