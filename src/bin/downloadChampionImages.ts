import mongoose from 'mongoose';
import connectDB from '../mongoDB/db';
import downloadChampionImages from '../services/downloadChampionImages';

async function main() {
  try {
    await connectDB();
    const result = await downloadChampionImages();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
