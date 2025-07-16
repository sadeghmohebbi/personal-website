const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3')
const config = require('./config')

const s3 = new S3Client(config.s3.client)

const run = async () => {
  try {
      const bucketExist = await s3.send(
          new HeadBucketCommand({ 
              Bucket: config.s3.bucket
          })
      )
      if (bucketExist) {
        console.log('> connection initialized and bucket exist')

        
      }
  } catch (err) {
      console.error('HeadBucketCommandError', err)
  }
}
run()