import app from '../app';
import connectDB from "../mongoDB/db";
import { createServer } from 'http';
import { registerLiveGameSummarySocket } from '../ws/liveGameSummarySocket';

const port = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    const server = createServer(app);
    registerLiveGameSummarySocket(server);

    server.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();





