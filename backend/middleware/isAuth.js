import jwt from 'jsonwebtoken'

export const isAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token
    console.log("tokens " + token)

    if (!token) {
      return res.status(401).json({ message: 'Token not found' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log(decoded)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
