const express = require("express");
const app = express();
const PORT = 7000;
const path = require("path");

const cors = require("cors");
app.use(cors());

const { connect } = require("./connect");
connect("mongodb://localhost:27017/wellnest")
  .then(() => console.log("mongo started"))
  .catch((err) => console.log(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// const { authMiddleware } = require("./middlewares/auth.js");
// app.use(authMiddleware);

const staticRoute = require("./routes/moneyRouter.js");
app.use("/pay", staticRoute);

const setwalletRoute = require("./routes/setWalletRouter.js");
app.use("/reward", setwalletRoute);

const organiseRoute = require("./routes/organiseRouter.js");
app.use("/organise", organiseRoute);

const participateRoute = require("./routes/participantsRouter.js");
app.use("/part", participateRoute);

const outbreakRoute = require("./routes/outbreakRouter.js");
app.use("/outbreak", outbreakRoute);

app.listen(PORT, () => console.log(`Server started at ${PORT}`));
