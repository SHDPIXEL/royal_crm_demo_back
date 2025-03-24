require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");
const moment = require("moment-timezone");
const sequelize = require("../connection");
const Form = require("../models/form"); // Import the Admin model

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; // Replace with your actual access token
const WHATSAPP_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const sendWhatsAppMessage = async (mobile, templateName, parameters) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: mobile,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: parameters.map((param) => ({ type: "text", text: param })),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`WhatsApp message sent to ${mobile} using template: ${templateName}`);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error.response?.data || error.message);
  }
};


const createForm = async (req, res) => {
  try {
    const { name, mobile, remark, amount, type } = req.body;

    if (!name || !mobile || !amount || !type) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Allowed values: IN, OUT." });
    }

    let whatsappSent = false;
    const transactionDate = moment().tz("Asia/Kolkata").format("DD-MM-YYYY");

    // Determine template based on type
    const templateName = type === "IN" ? "royaltravel_trn_msg" : "royal_travel_trn_msg_out";

    try {
      await sendWhatsAppMessage(mobile, templateName, [name, transactionDate, amount]);
      whatsappSent = true; // Set to true if the message is sent successfully
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
    }

    const newForm = await Form.create({ name, mobile, remark, amount, type, whatsappSent });

    return res.status(201).json({ message: "Form submitted successfully!", form: newForm });
  } catch (error) {
    console.error("Error creating form:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const getAllForms = async (req, res) => {
  try {
    // Fetch all forms (only one query for fetching all)
    const forms = await Form.findAll({
      order: [["createdAt", "DESC"]],
    });

    // Get today's date in IST (start of day)
    const todayStart = moment().tz("Asia/Kolkata").startOf("day").toDate();

    // Single optimized query for all aggregate values
    const stats = await Form.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.literal("CASE WHEN type = 'IN' THEN 1 END")), "inCount"],
        [sequelize.fn("COUNT", sequelize.literal("CASE WHEN type = 'OUT' THEN 1 END")), "outCount"],
        [
          sequelize.literal(
            `SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END) - 
             SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END)`
          ),
          "totalAmount",
        ],
        [sequelize.fn("COUNT", sequelize.literal(`CASE WHEN type = 'IN' AND createdAt >= '${todayStart.toISOString()}' THEN 1 END`)), "todayInCount"],
        [sequelize.fn("COUNT", sequelize.literal(`CASE WHEN type = 'OUT' AND createdAt >= '${todayStart.toISOString()}' THEN 1 END`)), "todayOutCount"],
        [
          sequelize.literal(
            `SUM(CASE WHEN type = 'IN' AND createdAt >= '${todayStart.toISOString()}' THEN amount ELSE 0 END) - 
             SUM(CASE WHEN type = 'OUT' AND createdAt >= '${todayStart.toISOString()}' THEN amount ELSE 0 END)`
          ),
          "todaysTotalAmount",
        ],
        [
          sequelize.literal(
            `SUM(CASE WHEN type = 'IN' AND createdAt >= '${todayStart.toISOString()}' THEN amount ELSE 0 END)`
          ),
          "todayInAmount",
        ],
        [
          sequelize.literal(
            `SUM(CASE WHEN type = 'OUT' AND createdAt >= '${todayStart.toISOString()}' THEN amount ELSE 0 END)`
          ),
          "todayOutAmount",
        ],
      ],
      raw: true,
    });

    return res.status(200).json({
      message: "Forms fetched successfully!",
      forms,
      inCount: stats.inCount || 0,
      outCount: stats.outCount || 0,
      totalAmount: stats.totalAmount || 0, // Total across all days
      todayInCount: stats.todayInCount || 0,
      todayOutCount: stats.todayOutCount || 0,
      todaysTotalAmount: stats.todaysTotalAmount || 0, // Net amount for today only
      todayInAmount: stats.todayInAmount || 0, // Today's total IN amount
      todayOutAmount: stats.todayOutAmount || 0, // Today's total OUT amount
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

cron.schedule("0 0 * * *", async () => {
  try {
    const yesterdayStart = moment().tz("Asia/Kolkata").subtract(1, "day").startOf("day").toDate();
    const yesterdayEnd = moment().tz("Asia/Kolkata").subtract(1, "day").endOf("day").toDate();

    const stats = await Form.findOne({
      attributes: [
        [sequelize.literal(`SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END)`), "yesterdayInAmount"],
        [sequelize.literal(`SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END)`), "yesterdayOutAmount"],
      ],
      where: {
        createdAt: { [sequelize.Op.between]: [yesterdayStart, yesterdayEnd] },
      },
      raw: true,
    });

    const yesterdayInAmount = stats.yesterdayInAmount || 0;
    const yesterdayOutAmount = stats.yesterdayOutAmount || 0;
    const netBalance = yesterdayInAmount - yesterdayOutAmount;

    if (yesterdayInAmount > 0 || yesterdayOutAmount > 0) {
      const adminMobiles = ["+917229092225", "+917017923028", "+917300500939"]; // Replace with admin phone number
      const transactionDate = moment().tz("Asia/Kolkata").subtract(1, "day").format("DD-MM-YYYY");

      // Send WhatsApp message to each admin
      for (const mobile of adminMobiles) {
        await sendWhatsAppMessage(mobile, "royaltravel_trn_msg_admin", [
          "Admin", transactionDate, yesterdayInAmount, yesterdayOutAmount, netBalance
        ]);
      }

      console.log("Daily admin WhatsApp summary sent!");
    }
  } catch (error) {
    console.error("Error in daily WhatsApp summary:", error);
  }
});


module.exports = {
  createForm,
  getAllForms,
};


// inward
// {
//   "messaging_product": "whatsapp",    
//   "recipient_type": "individual",
//   "to": "+917229092225",
//   "type": "template",
//   "template": {
//       "name": "royaltravel_trn_msg",
//       "language": {
//           "code": "en"
//       },
//       "components": [
//           {
//               "type": "body",
//               "parameters": [
//                   {
//                       "type": "text",
//                       "text": "Shubham"
//                   },
//                   {
//                       "type": "text",
//                       "text": "18-03-2025"
//                   },
//                   {
//                       "type": "text",
//                       "text": "400"
//                   }
//               ]
//           }
//       ]
//   }
// }


// admin
// {
//   "messaging_product": "whatsapp",    
//   "recipient_type": "individual",
//   "to": "+917229092225",
//   "type": "template",
//   "template": {
//       "name": "royaltravel_trn_msg_admin ",
//       "language": {
//           "code": "en"
//       },
//       "components": [
//           {
//               "type": "body",
//               "parameters": [
//                   {
//                       "type": "text",
//                       "text": "Shubham"
//                   },
//                   {
//                       "type": "text",
//                       "text": "18-03-2025"
//                   },
//                   {
//                       "type": "text",
//                       "text": "400"
//                   },
//                   {
//                       "type": "text",
//                       "text": "200"
//                   },
//                                       {
//                       "type": "text",
//                       "text": "200"
//                   }
//               ]
//           }
//       ]
//   }
// }


// outward
// {
//   "messaging_product": "whatsapp",    
//   "recipient_type": "individual",
//   "to": "+917229092225",
//   "type": "template",
//   "template": {
//       "name": "royal_travel_trn_msg_out",
//       "language": {
//           "code": "en"
//       },
//       "components": [
//           {
//               "type": "body",
//               "parameters": [
//                   {
//                       "type": "text",
//                       "text": "Shubham"
//                   },
//                   {
//                       "type": "text",
//                       "text": "18-03-2025"
//                   },
//                   {
//                       "type": "text",
//                       "text": "400"
//                   }
//               ]
//           }
//       ]
//   }
// }