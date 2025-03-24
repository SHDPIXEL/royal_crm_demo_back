const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Form = sequelize.define(
  "Form",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("IN", "OUT"),
      allowNull: false,
    },
    whatsappSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false, // Default to false (not sent)
    },
  },
  {
    timestamps: true,
  }
);

Form.sync({ force: false });
console.log("The table for the Form model was just (re)created!");

module.exports = Form;
