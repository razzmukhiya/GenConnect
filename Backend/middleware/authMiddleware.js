const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    let token = req.headers.authorization?.split(' ')[1];

    if (!token && req.cookies) {
        token = req.cookies.accessToken;
    }

    console.log('Authentication attempt:', {
        method: req.method,
        path: req.path,
        tokenPresent: !!token,
        tokenSource: req.headers.authorization ? 'header' : req.cookies?.accessToken ? 'cookie' : 'none'
    });

    if (!token) {
        console.log('No token provided, proceeding without authentication');
        req.user = null;
        return next();
    }

    try {
        console.log('Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Authentication successful for user:', {
            id: decoded.id,
            role: decoded.role,
            fullDecoded: decoded
        });
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Authentication failed:', {
            error: err.name,
            message: err.message,
            expiredAt: err.expiredAt,
            currentTime: new Date()
        });
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            errorCode: err.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_INVALID_TOKEN'
        });
    }
};


module.exports = {
    authenticate
};
