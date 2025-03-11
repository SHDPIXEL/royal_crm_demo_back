const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin'); // Import the Admin model

async function login(req, res) {
    try {
        const { user_id_ent, password_ent } = req.body;

        // Debug: Log request body
        console.log('Request Body:', req.body);

        // Validate request body
        if (!user_id_ent || !password_ent) {
            return res.status(400).json({ message: 'User ID and password are required' });
        }

        // Fetch admin details from the database
        const admin = await Admin.findOne({ where: { user_id: user_id_ent } });

        // Check if admin exists
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials (User ID)' });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password_ent, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials (Password)' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { adminId: admin.id, adminName: admin.name }, // Payload
            process.env.JWT_SECRET, // Secret
            { expiresIn: '1h' } // Options
        );

        // Successful response
        return res.status(200).json({ message: 'Login Successful', token });
    } catch (error) {
        console.error('Error during admin login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function verifyAdminToken(req, res, next) {
    try {
        // Get the token from the Authorization header
        const token = req.headers.authorization?.split(' ')[1]; // Assuming format: "Bearer <token>"
        console.log(token)
        if (!token) {
            return res.status(403).json({ message: 'Token is required' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
              return res.status(401).json({ error: 'Invalid or expired token' });
            }
            
            // Extract user ID (or other parameters) from the decoded token
            const id = decoded.adminId;
            console.log('decoded',decoded)
            const admin = await Admin.findByPk(id);
      
            if (!admin) {
              return res.status(404).json({ error: 'Admin not found' });
            }
      
            next();
          });
       
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

module.exports = {
    login,
    verifyAdminToken
};
