require('dotenv').config() // load .env file to process.env

const path = require('path')

module.exports = {
  s3: {
    client: {
      region: 'default',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
      },
    },
    bucket: 'sadeghmohebbi-site'
  },
  buildOutDir: path.join(__dirname, '../_site')
}