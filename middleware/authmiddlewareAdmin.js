const jwt = require('jsonwebtoken')
const Admin = require('../models/admin')

const authenticateAdmin = async (req, res ,next) =>{
    const token = req.header('Authorization')?.replace('Bearer', '').trim();
    if(!token){
        return res.status(401).json({error: 'Access denied.'})
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findOne({ where: {id: decoded.adminId}});


        if(!admin){
            return res.status(403).json({error: 'Acess Denied. Invalid admin'});
        }

        req.admin = admin;
        next();

    } catch(err){
        res.status(401).json({error: 'Invalid Token.',err});
    }
    
};

module.exports = {
    authenticateAdmin,
};