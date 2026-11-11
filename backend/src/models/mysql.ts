import mysql from 'mysql2/promise'
import { config } from '../config/env.js'

export const mysqlPool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
})
