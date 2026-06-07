// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 从自定义请求头或常用的 Authorization Bearer 里提取 token
  let token = req.header('x-auth-token');
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // 检查 token 是否存在
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded 的结构取决于 sign 时传入的 payload
    req.user = decoded; // 直接附加整个 payload，对后续路由可用
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};