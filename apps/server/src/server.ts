import { httpServer } from './app.js';
import { env } from './shared/config/env.js';

const PORT = env.PORT;

httpServer.listen(PORT, () => {
  console.log(`Odinum Server running on port ${PORT}`);
  console.log('Real-time Socket.io engine engaged over Websockets');
});
