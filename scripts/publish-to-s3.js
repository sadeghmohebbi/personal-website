const { S3Client, HeadBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const { glob } = require('glob')
const cliProgress = require('cli-progress')
const mime = require('mime').default
const _async = require('async')
const fs = require('fs')
const path = require('path')
const config = require('./config')

const s3 = new S3Client(config.s3.client)
const progb = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

s3.send(new HeadBucketCommand({ Bucket: config.s3.bucket })).then((bucketExist) => {
  if (bucketExist) {
    console.log('> Connection initialized and Bucket exist')
    glob('**/*', { cwd: config.buildOutDir, nodir: true }).then((buildOutFiles) => {
      console.log('> Iterate over all files of output build directory')

      console.log('> Uploading...')
      progb.start(buildOutFiles.length, 0);

      _async.eachLimit(buildOutFiles, 1, (buildOutFile, cb) => {
        const buildOutFileAbsPath = path.join(config.buildOutDir, buildOutFile)

        const fileStream = fs.createReadStream(buildOutFileAbsPath);
        fileStream.on('error', function (err) {
          console.error('File Error', err)
        })
        const putParams = {
          Bucket: config.s3.bucket,
          Key: buildOutFile,
          ACL: 'public-read',
          Body: fileStream,
          ContentType: mime.getType(buildOutFileAbsPath) ?? 'text/plain'
        }
        s3.send(new PutObjectCommand(putParams)).then((putResult) => {
          progb.increment()
          cb()
        }).catch(err => console.error('PutObjectCommand Error', err))
      }, (err) => {
        if (err) {
          console.error('Operation Failed', err)
        } else {
          progb.stop()
          console.log('\n> FINISHED')
          process.exit(0)
        }
      })
    })
  }
}).catch(err => console.error('HeadBucketCommandError', err))