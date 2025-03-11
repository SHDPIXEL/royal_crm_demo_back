const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Admin = sequelize.define("Admin", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "User Id cannot be empty",
      },
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Name cannot be empty",
      },
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Password cannot be empty",
      },
      len: {
        args: [8, 100],
        msg: "Password must be between 8 and 100 characters.",
      },
    },
  },
},
{timestamps:true}
);

Admin.sync({force:false});
console.log("The table for the Admin model was just (re)created!")

module.exports = Admin;
