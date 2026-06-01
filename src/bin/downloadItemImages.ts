import mongoose from 'mongoose';
import connectDB from '../mongoDB/db';
import downloadItemImages from '../services/downloadItemImages';

async function main() {
  try {
    await connectDB();
    const result = await downloadItemImages();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
