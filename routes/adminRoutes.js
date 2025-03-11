const express = require("express");
const { verifyAdminToken } = require("../controllers/authControllerAdmin");
const router = express.Router();
const {
  createForm,
  getAllForms,
} = require("../controllers/admincontroller");

router.use(verifyAdminToken);

router.post("/createForm", createForm);
router.get("/getData", getAllForms);

module.exports = router;
