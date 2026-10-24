export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/hello') {
      return Response.json({
        message: 'Hello from /hello!',
        time: new Date().toISOString(),
      });
    }

    return Response.json({
      message: 'Hello Worker!',
      time: new Date().toISOString(),
    });
  },
};
