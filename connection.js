const {Sequelize} = require('sequelize');

const sequelize = new Sequelize('royal_travel_crm','root','',{
    host: 'localhost',
    dialect: 'mysql'
});

sequelize.authenticate()
try{
    console.log('Database Connected Succesfully');
}catch(error){
    console.log('Unable to connect to the database:', error);
}

sequelize.authenticate().then(()=>console.log("Database Connected"))

module.exports = sequelize; 