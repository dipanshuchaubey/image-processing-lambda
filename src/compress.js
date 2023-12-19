import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const handler = async (event) => {
	const client = new S3Client({ region: process.env.AWS_REGION });

	const bucket = event.Records[0].s3.bucket.name;
	const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
	
	const getCommand = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});

	let fileBuffer;
	try {
		const s3GetResponse = await client.send(getCommand);
		fileBuffer = s3GetResponse.Body.toString('utf-8');
	} catch (err) {
		throw new Error(err);
	}

	await sharp(fileBuffer)
	  .rotate()
	  .resize(200)
	  .jpeg({ mozjpeg: true })
	  .toBuffer()
	  .then( async (data) => {
		console.log('Image compressed!!');

		const command = new PutObjectCommand({
			Key: key,
			Bucket: bucket,
			Body: data,
		});
		
		try {
			const response = await client.send(command);
		} catch (err) {
			throw new Error(err);
		}
		
		if(!response.ETag) {
			return {
				statusCode: 500,
				body: JSON.stringify({
					message: 'Something went wrong',
					input: event
				}, null, 2)
			};
		}
	  })
	  .catch( err => {
			throw new Error(err);
	  });

	return {
		statusCode: 200,
		body: JSON.stringify({
			message: 'Image compression function executed successfully!',
			input: event
		}, null, 2),
	};
};
