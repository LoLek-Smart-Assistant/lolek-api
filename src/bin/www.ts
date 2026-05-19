import app from '../app';
import connectDB from "../mongoDB/db";

const port = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();





