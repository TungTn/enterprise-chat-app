import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // ramp-up to 50 users
    { duration: '1m', target: 200 },  // ramp-up to 200 active users
    { duration: '30s', target: 0 },   // ramp-down
  ],
  thresholds: {
    ws_connecting: ['p(95)<150'], // 95% connection handshake under 150ms
  },
};

export default function () {
  const url = 'ws://localhost:4000/chat';
  const params = {
    headers: {
      Authorization: 'Bearer mock-jwt-token',
    },
  };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      // Join general channel
      socket.send(
        JSON.stringify({
          event: 'conversation:join',
          data: { conversationId: 'c0000000-0000-0000-0000-000000000001' },
        })
      );

      // Periodically send message
      socket.setInterval(() => {
        socket.send(
          JSON.stringify({
            event: 'message:send',
            data: {
              conversationId: 'c0000000-0000-0000-0000-000000000001',
              content: `Load test ping at ${new Date().toISOString()}`,
            },
          })
        );
      }, 5000);
    });

    socket.on('message', (data) => {
      check(data, { 'message received': (d) => d.length > 0 });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 25000);
  });

  check(res, { 'connected successfully': (r) => r && r.status === 101 });
  sleep(1);
}
