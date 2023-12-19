import path from 'path';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

export const handler = async (event) => {
  const client = new S3Client({ region: process.env.AWS_REGION });

  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  );

  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const s3GetResponse = await client.send(getCommand);
    // Transform body to Uint8Array for sharp
    const fileUnit8Array = await s3GetResponse.Body.transformToByteArray();

    await sharp(fileUnit8Array)
      .rotate()
      .resize(200)
      .jpeg({ mozjpeg: true })
      .toBuffer()
      .then(async (data) => {
        console.log('Image compressed!!');

        const command = new PutObjectCommand({
          Key: 'compressed/' + path.basename(key),
          Bucket: bucket,
          Body: data,
        });

        try {
          const response = await client.send(command);

          if (!response.ETag) {
            throw Error('Object not uploaded');
          }
        } catch (err) {
          throw Error(err);
        }
      })
      .catch((err) => {
        throw Error(err);
      });
  } catch (err) {
    throw Error(err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Image compression function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };
};
